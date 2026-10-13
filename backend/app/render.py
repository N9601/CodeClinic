"""JSON -> Mermaid and Markdown. Claude never writes diagram syntax; it returns
nodes, edges and phases, and this module renders them, so diagrams can't break
on stage."""

import re
from datetime import date, timedelta

from .schemas import AssessmentReport, Component, Edge, Phase, TargetComponent

_SHAPES = {
    "database": ('[("', '")]'),
    "storage": ('[("', '")]'),
    "external": ('{{"', '"}}'),
    "frontend": ('(["', '"])'),
}


def _node_id(raw: str) -> str:
    return "n_" + re.sub(r"[^A-Za-z0-9_]", "_", raw)


def _text(raw: str) -> str:
    return raw.replace('"', "'").replace("\n", " ").strip()


def _flowchart(nodes: list[tuple[str, str, str, str]], edges: list[Edge]) -> str:
    """nodes: (id, title, subtitle, type)."""
    lines = ["flowchart LR"]
    known = set()
    for node_id, title, subtitle, node_type in nodes:
        open_, close = _SHAPES.get(node_type, ('["', '"]'))
        label = f"<b>{_text(title)}</b><br/><small>{_text(subtitle)}</small>"
        lines.append(f"  {_node_id(node_id)}{open_}{label}{close}")
        lines.append(f"  class {_node_id(node_id)} t_{node_type}")
        known.add(node_id)
    for edge in edges:
        if edge.source in known and edge.target in known:
            label = _text(edge.label).replace("|", "/")
            lines.append(f"  {_node_id(edge.source)} -->|{label}| {_node_id(edge.target)}")
    lines += [
        "  classDef t_frontend fill:#e0f2fe,stroke:#0284c7,color:#0c4a6e",
        "  classDef t_backend fill:#ede9fe,stroke:#7c3aed,color:#3b0764",
        "  classDef t_database fill:#fef3c7,stroke:#d97706,color:#78350f",
        "  classDef t_storage fill:#fef3c7,stroke:#d97706,color:#78350f",
        "  classDef t_integration fill:#dcfce7,stroke:#16a34a,color:#14532d",
        "  classDef t_batch fill:#fce7f3,stroke:#db2777,color:#831843",
        "  classDef t_reporting fill:#f1f5f9,stroke:#475569,color:#0f172a",
        "  classDef t_identity fill:#ffedd5,stroke:#ea580c,color:#7c2d12",
        "  classDef t_external fill:#f8fafc,stroke:#94a3b8,color:#334155,stroke-dasharray:4 3",
    ]
    return "\n".join(lines)


def current_state_diagram(components: list[Component], edges: list[Edge]) -> str:
    return _flowchart([(c.id, c.name, c.technology, c.type) for c in components], edges)


def target_state_diagram(components: list[TargetComponent], edges: list[Edge]) -> str:
    return _flowchart([(c.id, c.name, c.service, c.type) for c in components], edges)


def _gantt_text(raw: str) -> str:
    return re.sub(r"[:;#]", " ", raw).strip()


def roadmap_gantt(phases: list[Phase], start: date | None = None) -> str:
    start = start or _next_monday(date.today())
    lines = ["gantt", "  dateFormat YYYY-MM-DD", "  axisFormat %d %b", "  title Migration roadmap"]
    for i, phase in enumerate(sorted(phases, key=lambda p: p.start_week), start=1):
        begin = start + timedelta(weeks=max(0, phase.start_week))
        days = max(1, phase.duration_weeks) * 7
        lines.append(f"  section {_gantt_text(phase.name)}")
        lines.append(f"  {_gantt_text(phase.name)} :p{i}, {begin.isoformat()}, {days}d")
        end = begin + timedelta(days=days)
        for j, gate in enumerate(phase.validation_gates[:2], start=1):
            lines.append(f"  {_gantt_text(gate)} :milestone, m{i}_{j}, {end.isoformat()}, 0d")
    return "\n".join(lines)


def total_weeks(phases: list[Phase]) -> int:
    return max((p.start_week + p.duration_weeks for p in phases), default=0)


def _next_monday(day: date) -> date:
    return day + timedelta(days=(7 - day.weekday()) % 7 or 7)


def report_to_markdown(report: AssessmentReport) -> str:
    s, a, r, p = report.summary, report.architecture, report.readiness, report.plan
    out = [
        f"# CodeClinic assessment: {report.profile.name}",
        f"_Generated {report.generated_at} · target cloud: {report.target_cloud.upper()} · model: {report.model}_",
        "",
        "## Executive summary",
        f"**{s.headline}**",
        "",
        f"- Cloud readiness: **{s.readiness_score}/100 ({s.readiness_band})**",
        f"- Recommended strategy: **{s.overall_strategy.title()}**",
        f"- Estimated duration: **{s.total_weeks} weeks**",
        f"- GxP-critical: **{'Yes' if s.gxp_critical else 'No'}**",
        "",
        "## 1. Current architecture",
        f"_{a.architecture_style}_ — {a.summary}",
        "",
        "| Component | Type | Technology | Issues |",
        "|---|---|---|---|",
    ]
    out += [f"| {c.name} | {c.type} | {c.technology} | {'; '.join(c.issues)} |" for c in a.components]
    out += ["", "**Technology inventory**", "", "| Technology | Version | Support status | Note |", "|---|---|---|---|"]
    out += [f"| {t.name} | {t.version} | {t.support_status.replace('_', ' ')} | {t.note} |" for t in a.tech_inventory]
    out += ["", "**Technical debt**", ""] + [f"- {d}" for d in a.tech_debt]
    out += ["", "## 2. Cloud readiness", "", "| Dimension | Score | Rationale |", "|---|---|---|"]
    out += [f"| {d.label} | {d.score}/10 | {d.rationale} |" for d in r.dimensions]
    out += ["", "## 3. Risks", "", "| ID | Risk | Level | GxP | Mitigation |", "|---|---|---|---|---|"]
    out += [
        f"| {k.id} | {k.title} | {k.level} ({k.likelihood}×{k.impact}) | {'Yes' if k.gxp_related else ''} | {k.mitigation} |"
        for k in report.risks
    ]
    out += ["", "**Opportunities**", ""] + [f"- **{o.title}** ({o.effort} effort): {o.benefit}" for o in report.opportunities]
    out += ["", "## 4. Target architecture", "", p.target_summary, ""]
    out += [f"- **{pat.name}**: {pat.why}" for pat in p.patterns]
    out += ["", "| Component | Strategy | Target service | Rationale |", "|---|---|---|---|"]
    names = {c.id: c.name for c in a.components}
    out += [
        f"| {names.get(cs.component_id, cs.component_id)} | {cs.strategy.title()} | {cs.target_service} | {cs.rationale} |"
        for cs in p.component_strategies
    ]
    out += ["", "## 5. Migration roadmap", ""]
    for phase in sorted(p.roadmap, key=lambda x: x.start_week):
        out.append(f"### {phase.name} (weeks {phase.start_week}–{phase.start_week + phase.duration_weeks})")
        out += [f"- {act}" for act in phase.activities]
        if phase.validation_gates:
            out.append(f"- **Validation gates:** {', '.join(phase.validation_gates)}")
        out.append("")
    out += ["**Quick wins**", ""] + [f"- {w}" for w in p.quick_wins]
    return "\n".join(out) + "\n"
