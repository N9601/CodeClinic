"""Build demo-mode reports from hand-written or saved stage fixtures.

    python scripts/build_cached_reports.py

Reads samples/fixtures/<id>.stages.json + samples/profiles/<id>.json and writes
samples/reports/<id>.json. Re-run after editing a fixture or the scoring weights.
"""

import json
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from app.report import assemble  # noqa: E402
from app.schemas import AppProfile, ArchitectureAnalysis, ComplianceAnalysis, ModernizationPlan, ReadinessAssessment  # noqa: E402

SAMPLES = BACKEND / "samples"
MODEL = "claude-opus-5-5"


def main() -> None:
    for fixture_path in sorted((SAMPLES / "fixtures").glob("*.stages.json")):
        sample_id = fixture_path.name.removesuffix(".stages.json")
        fixture = json.loads(fixture_path.read_text(encoding="utf-8"))
        sample = json.loads((SAMPLES / "profiles" / f"{sample_id}.json").read_text(encoding="utf-8"))
        compliance = ComplianceAnalysis(**fixture["compliance"]) if fixture.get("compliance") else None
        report = assemble(
            profile=AppProfile(**sample["profile"]),
            target_cloud=fixture.get("target_cloud", "azure"),
            signals=fixture.get("signals", []),
            analysis=ArchitectureAnalysis(**fixture["analysis"]),
            assessment=ReadinessAssessment(**fixture["assessment"]),
            plan=ModernizationPlan(**fixture["plan"]),
            mode="cached",
            model=MODEL,
            compliance=compliance,
        )
        report.id = f"sample-{sample_id}"
        out = SAMPLES / "reports" / f"{sample_id}.json"
        out.write_text(report.model_dump_json(indent=2), encoding="utf-8")
        print(f"{sample_id}: {report.readiness.overall}/100 {report.readiness.band} -> {out.relative_to(BACKEND)}")


if __name__ == "__main__":
    main()
