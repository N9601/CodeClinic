"""Static artifact scanner: reads an uploaded .zip in memory (never extracts to
disk) and emits Signals - grounded evidence that Claude cites and the UI shows.

Rules are plain regex/heuristics so the scan is instant, offline and
explainable. Add a rule by appending to MANIFEST_RULES or CONTENT_RULES.
"""

import io
import re
import zipfile
from collections import Counter
from pathlib import PurePosixPath

from .schemas import ScanResult, Signal

MAX_FILES = 5000
MAX_FILE_BYTES = 512 * 1024
MAX_TOTAL_BYTES = 40 * 1024 * 1024
MAX_SIGNALS = 60

LANGUAGES = {
    ".cs": "C#", ".vb": "VB.NET", ".java": "Java", ".kt": "Kotlin", ".py": "Python", ".php": "PHP",
    ".js": "JavaScript", ".ts": "TypeScript", ".rb": "Ruby", ".go": "Go", ".sql": "SQL",
    ".pls": "PL/SQL", ".pkb": "PL/SQL", ".pks": "PL/SQL", ".frm": "VB6", ".bas": "VB6", ".cls": "VB6",
    ".aspx": "ASP.NET WebForms", ".jsp": "JSP", ".xhtml": "JSF", ".cbl": "COBOL", ".cob": "COBOL",
}
TEXT_SUFFIXES = set(LANGUAGES) | {
    ".xml", ".config", ".json", ".yml", ".yaml", ".properties", ".ini", ".txt", ".gradle", ".csproj",
    ".vbproj", ".sln", ".bat", ".cmd", ".ps1", ".sh", ".tf", ".bicep", ".html", ".cshtml", ".conf", ".env",
    ".toml", ".lock", ".vbp", ".asax", ".asmx", ".svc", ".wsdl", ".md",
}

# (filename regex, kind, name, detail, severity)
MANIFEST_RULES: list[tuple[str, str, str, str, str]] = [
    (r"(^|/)pom\.xml$", "framework", "Maven build", "Java project built with Maven", "info"),
    (r"(^|/)build\.xml$", "practice", "Apache Ant build", "Legacy Ant build scripts", "warning"),
    (r"(^|/)build\.gradle(\.kts)?$", "framework", "Gradle build", "Java/Kotlin project built with Gradle", "info"),
    (r"\.csproj$|\.vbproj$", "framework", ".NET project", ".NET project file", "info"),
    (r"(^|/)packages\.config$", "dependency", "NuGet packages.config", "Legacy NuGet package format (pre-SDK-style projects)", "info"),
    (r"(^|/)web\.config$", "config", "web.config", "ASP.NET / IIS configuration", "info"),
    (r"(^|/)global\.asax$", "framework", "ASP.NET Global.asax", "Classic ASP.NET application lifecycle", "info"),
    (r"(^|/)weblogic(-application)?\.xml$", "app_server", "Oracle WebLogic", "WebLogic deployment descriptor - commercial app server lock-in", "warning"),
    (r"(^|/)jboss-web\.xml$|(^|/)standalone\.xml$", "app_server", "JBoss / WildFly", "JBoss deployment descriptor", "info"),
    (r"(^|/)ejb-jar\.xml$", "framework", "EJB", "Enterprise JavaBeans descriptor - heavyweight Java EE coupling", "warning"),
    (r"(^|/)web\.xml$", "framework", "Java EE web.xml", "Servlet deployment descriptor", "info"),
    (r"(^|/)faces-config\.xml$", "framework", "JSF", "JavaServer Faces UI framework", "warning"),
    (r"(^|/)struts(-config)?\.xml$", "framework", "Apache Struts", "Struts MVC framework (Struts 1 is long EOL)", "critical"),
    (r"(^|/)package\.json$", "framework", "Node.js / npm", "JavaScript dependencies via npm", "info"),
    (r"(^|/)requirements\.txt$|(^|/)pyproject\.toml$", "framework", "Python packages", "Python dependency manifest", "info"),
    (r"(^|/)composer\.json$", "framework", "PHP Composer", "PHP dependency manifest", "info"),
    (r"\.vbp$", "framework", "Visual Basic 6", "VB6 project - unsupported IDE and toolchain", "critical"),
    (r"\.rpt$", "dependency", "Crystal Reports", "Crystal Reports templates", "warning"),
    (r"(^|/)Dockerfile$|(^|/)docker-compose\.ya?ml$", "practice", "Containerised", "Container definitions already exist", "info"),
    (r"(^|/)\.github/workflows/|(^|/)Jenkinsfile$|(^|/)azure-pipelines\.ya?ml$|(^|/)\.gitlab-ci\.yml$", "practice", "CI/CD pipeline", "Automated build pipeline present", "info"),
    (r"\.tf$|\.bicep$|(^|/)cloudformation", "practice", "Infrastructure as code", "IaC templates present", "info"),
    (r"\.wsdl$|\.asmx$|\.svc$", "dependency", "SOAP / WCF services", "SOAP-based service interfaces", "warning"),
    (r"(^|/)(test|tests|__tests__)/|Tests?\.(cs|java)$|_test\.py$|\.spec\.(ts|js)$", "practice", "Automated tests", "Test code present", "info"),
]

CONFIG_SUFFIXES = {".config", ".xml", ".properties", ".ini", ".yml", ".yaml", ".env", ".json", ".conf", ".toml"}

# (content regex, kind, name, detail, severity) - matched against text files.
# Rules listed in CONFIG_ONLY run on config files only, to avoid code false positives.
CONFIG_ONLY = {"Hard-coded credential"}
CONTENT_RULES: list[tuple[str, str, str, str, str]] = [
    (r"<TargetFrameworkVersion>\s*v?(4\.[0-6](\.\d)?|[23]\.\d)\s*<", "framework", ".NET Framework {0}", "Targets .NET Framework {0} - out of support", "critical"),
    (r"<TargetFrameworkVersion>\s*v?(4\.[78](\.\d)?)\s*<", "framework", ".NET Framework {0}", "Targets .NET Framework {0} - supported but frozen", "warning"),
    (r'targetFramework="(4\.[0-6](\.\d)?)"', "framework", ".NET Framework {0}", "web.config targets .NET Framework {0} - out of support", "critical"),
    (r"<TargetFramework>\s*(net\d+\.\d+)\s*<", "framework", "Modern .NET ({0})", "SDK-style project targeting {0}", "info"),
    (r"<(?:maven\.compiler\.(?:source|target)|java\.version)>\s*1\.([4-7])\s*<", "language", "Java 1.{0}", "Compiles for Java 1.{0} - long out of support", "critical"),
    (r"<(?:maven\.compiler\.(?:source|target)|java\.version)>\s*(1\.8|8)\s*<", "language", "Java 8", "Compiles for Java 8 - legacy", "warning"),
    (r"jdbc:oracle:", "database", "Oracle Database", "Oracle JDBC connection", "info"),
    (r"jdbc:sqlserver:|Data Source=[^;\"']+;\s*(Initial Catalog|Database)=", "database", "SQL Server", "SQL Server connection string", "info"),
    (r"jdbc:mysql:|mysqli?_connect\(|new PDO\(['\"]mysql", "database", "MySQL", "MySQL connection", "info"),
    (r"jdbc:postgresql:", "database", "PostgreSQL", "PostgreSQL connection", "info"),
    (r"(?i)(?:password|pwd)\s*[=:]\s*[^;\"'\s<>{}$()]{3,}(?=[;\"'\s<]|$)", "risk", "Hard-coded credential", "Plain-text password in configuration", "critical"),
    (r'sessionState\s+mode="InProc"', "risk", "In-process session state", "Sessions stored in server memory - needs sticky sessions", "warning"),
    (r"HttpSession|Session\[\"|\$_SESSION", "risk", "Server-side session state", "Session state tied to the app server", "warning"),
    (r"\\\\\\\\[A-Za-z0-9_.-]{2,}\\\\[A-Za-z0-9_$.-]{2,}|\\\\[A-Za-z0-9_.-]{2,}\\[A-Za-z0-9_$.-]{2,}", "risk", "UNC file share path", "Hard-coded network share - file-based integration", "warning"),
    (r"(?<![A-Za-z])[C-H]:\\\\?[A-Za-z]", "risk", "Local Windows path", "Hard-coded local disk path", "warning"),
    (r"(?<!ersion=)(?<!ersion=\")\b(?:10\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])|192\.168)\.\d{1,3}\.\d{1,3}\b", "risk", "Hard-coded private IP", "Hard-coded internal IP address", "warning"),
    (r"(?i)org\.quartz|CronTrigger|schtasks|ScheduledTask", "dependency", "Scheduled batch jobs", "Cron/Quartz/Windows scheduled jobs", "info"),
    (r"(?i)ftp://|sftp|FtpWebRequest", "dependency", "FTP/SFTP transfer", "File transfer integration", "warning"),
    (r"(?i)jquery[-.]?[12]\.\d+|id=\"jquery\"\s+version=\"[12]\.|\"jquery\":\s*\"[~^]?[12]\.", "dependency", "jQuery 1.x/2.x", "Old jQuery with known XSS CVEs", "warning"),
    (r"(?i)angular(\.min)?\.js|\"angular\":\s*\"[~^]?1\.", "dependency", "AngularJS 1.x", "AngularJS reached end of life Dec 2021", "critical"),
    (r"(?i)CrystalDecisions", "dependency", "Crystal Reports", "Crystal Reports runtime dependency", "warning"),
    (r"(?i)log4j-1\.|log4j:log4j|<artifactId>log4j</artifactId>", "risk", "Log4j 1.x", "Log4j 1.x is EOL with known CVEs", "critical"),
    (r"(?i)audit_?trail|AuditTrail|e-?signature|ElectronicSignature", "practice", "Audit trail / e-signature code", "Part 11 relevant code paths detected", "info"),
]

_compiled_manifests = [(re.compile(p, re.IGNORECASE), k, n, d, s) for p, k, n, d, s in MANIFEST_RULES]
_compiled_content = [(re.compile(p), k, n, d, s) for p, k, n, d, s in CONTENT_RULES]


def _is_text(path: str) -> bool:
    p = PurePosixPath(path)
    return p.suffix.lower() in TEXT_SUFFIXES or p.name in {"Dockerfile", "Jenkinsfile"}


def scan_zip(data: bytes) -> ScanResult:
    try:
        archive = zipfile.ZipFile(io.BytesIO(data))
    except zipfile.BadZipFile as exc:
        raise ValueError("Upload is not a valid .zip file") from exc

    languages: Counter[str] = Counter()
    found: dict[tuple[str, str], Signal] = {}
    files_scanned = 0
    total_bytes = 0
    has_ci = has_tests = False

    for info in archive.infolist()[:MAX_FILES]:
        if info.is_dir() or "__MACOSX" in info.filename or "/node_modules/" in f"/{info.filename}":
            continue
        path = info.filename.replace("\\", "/")
        files_scanned += 1
        lang = LANGUAGES.get(PurePosixPath(path).suffix.lower())
        if lang:
            languages[lang] += 1

        for rx, kind, name, detail, severity in _compiled_manifests:
            if rx.search(path):
                has_ci |= name == "CI/CD pipeline"
                has_tests |= name == "Automated tests"
                found.setdefault((kind, name), Signal(kind=kind, name=name, detail=detail, file=path, severity=severity))

        if not _is_text(path) or info.file_size > MAX_FILE_BYTES or total_bytes + info.file_size > MAX_TOTAL_BYTES:
            continue
        total_bytes += info.file_size
        text = archive.read(info).decode("utf-8", errors="ignore")
        is_config = PurePosixPath(path).suffix.lower() in CONFIG_SUFFIXES
        for rx, kind, name, detail, severity in _compiled_content:
            if name in CONFIG_ONLY and not is_config:
                continue
            match = rx.search(text)
            if not match:
                continue
            groups = [g for g in match.groups() if g] or [""]
            label = name.format(*groups)
            found.setdefault(
                (kind, label),
                Signal(kind=kind, name=label, detail=detail.format(*groups), file=path, severity=severity),
            )

    if files_scanned and not has_ci:
        found[("practice", "No CI/CD")] = Signal(
            kind="practice", name="No CI/CD pipeline", detail="No pipeline definition found - manual builds/deploys likely",
            file="(repository)", severity="warning",
        )
    if files_scanned and not has_tests:
        found[("practice", "No tests")] = Signal(
            kind="practice", name="No automated tests", detail="No test code found - validation relies on manual scripts",
            file="(repository)", severity="warning",
        )

    order = {"critical": 0, "warning": 1, "info": 2}
    signals = sorted(found.values(), key=lambda s: (order[s.severity], s.kind, s.name))[:MAX_SIGNALS]
    return ScanResult(signals=signals, files_scanned=files_scanned, languages=dict(languages.most_common()))
