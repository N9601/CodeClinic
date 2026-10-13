"""Portfolio / wave-planning view.

Given a set of AssessmentReports, rank them, bucket into Now / Next / Later
migration waves, and emit aggregate stats + a combined Mermaid Gantt that
sequences each app's own phases on one timeline. All deterministic - no LLM
needed. The ranking rule is explainable: high-risk + GxP-critical first, then
by readiness score, so remediation goes before cloud-ready apps that can wait.
"""

from __future__ import annotations

import re
from collections import Counter
from datetime import date, timedelta

from pydantic import BaseModel

from .render import _gantt_text, _next_monday
from .schemas import AssessmentReport, RStrategy

WAVE_LABELS = {"now": "Wave 1 – Now", "next": "Wave 2 – Next 12 months", "later": "Wave 3 – Later"}


class PortfolioAppSummary(BaseModel):
    report_id: str
    name: str
    tagline: str
    target_cloud: str
    readiness: int
    readiness_band: str
    strategy: RStrategy
    weeks: int
    gxp_critical: bool
    critical_risks: int
    high_risks: int
    wave: str
    wave_label: str
    priority_score: float
    rationale: str


class PortfolioStats(BaseModel):
    apps: int
    gxp_apps: int
    avg_readiness: int
    total_weeks: int
    strategy_mix: dict[str, int]
    wave_counts: dict[str, int]
    cloud_mix: dict[str, int]
    total_critical_risks: int


class PortfolioView(BaseModel):
    stats: PortfolioStats
    apps: list[PortfolioAppSummary]
    waves: dict[str, list[str]]  # wave_key -> report_ids in order
    gantt: str
    headline: str


# ------------------------------------------------------------------ ranking


def _priority(report: AssessmentReport) -> float:
    """Higher score = tackle sooner. Weighs regulatory urgency, risk and tech debt."""
    critical = sum(1 for r in report.risks if r.level == "critical")
    high = sum(1 for r in report.risks if r.level == "high")
    gxp = 15 if report.summary.gxp_critical else 0
    debt = (100 - report.readiness.overall) * 0.3
    return gxp + critical * 10 + high * 4 + debt


def _wave_for(index: int, total: int) -> str:
    """Three roughly equal buckets, with the first being the smallest (focused Wave 1)."""
    now_cutoff = max(1, total // 3)
    next_cutoff = max(now_cutoff + 1, (total * 2) // 3 + 1)
    if index < now_cutoff:
        return "now"
    if index < next_cutoff:
        return "next"
    return "later"


def _rationale(report: AssessmentReport, wave: str) -> str:
    bits = []
    if report.summary.gxp_critical:
        bits.append("GxP-critical")
    critical = sum(1 for r in report.risks if r.level == "critical")
    high = sum(1 for r in report.risks if r.level == "high")
    if critical:
        bits.append(f"{critical} critical risk{'s' if critical != 1 else ''}")
    elif high:
        bits.append(f"{high} high-level risk{'s' if high != 1 else ''}")
    bits.append(f"readiness {report.readiness.overall}/100")
    wave_rationale = {
        "now": "address immediately",
        "next": "schedule within 12 months",
        "later": "defer behind higher-priority apps",
    }[wave]
    return f"{', '.join(bits)} — {wave_rationale}."


# ------------------------------------------------------------------ gantt


def combined_gantt(apps: list[PortfolioAppSummary], reports: dict[str, AssessmentReport], start: date | None = None) -> str:
    """One Gantt with a section per app. Each app's roadmap is anchored at an offset
    based on its wave, so Wave 1 apps run first, Wave 2 next, Wave 3 later."""
    start = start or _next_monday(date.today())
    wave_offsets_weeks = {"now": 0, "next": 26, "later": 52}  # 0, ~6 months, ~12 months
    lines = ["gantt", "  dateFormat YYYY-MM-DD", "  axisFormat %b %Y", "  title Portfolio migration plan"]
    for i, app in enumerate(apps, start=1):
        report = reports[app.report_id]
        wave_start = start + timedelta(weeks=wave_offsets_weeks[app.wave])
        lines.append(f"  section {_gantt_text(app.name)} ({app.wave.upper()})")
        for j, phase in enumerate(sorted(report.plan.roadmap, key=lambda p: p.start_week), start=1):
            begin = wave_start + timedelta(weeks=max(0, phase.start_week))
            days = max(1, phase.duration_weeks) * 7
            tag = re.sub(r"\s+", "_", app.name.lower())[:12]
            lines.append(f"  {_gantt_text(phase.name)} :{tag}{i}_{j}, {begin.isoformat()}, {days}d")
    return "\n".join(lines)


# ------------------------------------------------------------------ build


def build(reports: list[AssessmentReport]) -> PortfolioView:
    if not reports:
        raise ValueError("Portfolio needs at least one report")

    ranked = sorted(reports, key=_priority, reverse=True)
    report_by_id = {r.id: r for r in reports}
    total = len(ranked)

    apps: list[PortfolioAppSummary] = []
    for i, report in enumerate(ranked):
        wave = _wave_for(i, total)
        critical = sum(1 for r in report.risks if r.level == "critical")
        high = sum(1 for r in report.risks if r.level == "high")
        apps.append(
            PortfolioAppSummary(
                report_id=report.id,
                name=report.profile.name,
                tagline=report.profile.business_function[:120] or report.architecture.architecture_style[:120],
                target_cloud=report.target_cloud,
                readiness=report.readiness.overall,
                readiness_band=report.readiness.band,
                strategy=report.plan.overall_strategy,
                weeks=report.summary.total_weeks,
                gxp_critical=report.summary.gxp_critical,
                critical_risks=critical,
                high_risks=high,
                wave=wave,
                wave_label=WAVE_LABELS[wave],
                priority_score=round(_priority(report), 1),
                rationale=_rationale(report, wave),
            )
        )

    waves: dict[str, list[str]] = {"now": [], "next": [], "later": []}
    for app in apps:
        waves[app.wave].append(app.report_id)

    stats = PortfolioStats(
        apps=total,
        gxp_apps=sum(1 for a in apps if a.gxp_critical),
        avg_readiness=round(sum(a.readiness for a in apps) / total),
        total_weeks=max((len(waves[w]) and 26 * {"now": 1, "next": 2, "later": 3}[w] for w in waves), default=0) + max(a.weeks for a in apps),
        strategy_mix=dict(Counter(a.strategy for a in apps)),
        wave_counts={w: len(ids) for w, ids in waves.items()},
        cloud_mix=dict(Counter(a.target_cloud for a in apps)),
        total_critical_risks=sum(a.critical_risks for a in apps),
    )

    headline = _headline(apps, stats)
    return PortfolioView(
        stats=stats,
        apps=apps,
        waves=waves,
        gantt=combined_gantt(apps, report_by_id),
        headline=headline,
    )


def _headline(apps: list[PortfolioAppSummary], stats: PortfolioStats) -> str:
    first = apps[0]
    gxp_part = f"{stats.gxp_apps} of {stats.apps} are GxP-critical" if stats.gxp_apps else "none GxP-critical"
    now_count = stats.wave_counts["now"]
    return (
        f"Across {stats.apps} applications ({gxp_part}, {stats.total_critical_risks} critical risks total), "
        f"start Wave 1 with {now_count} app{'s' if now_count != 1 else ''} — {first.name} first "
        f"({first.strategy.title()}, {first.weeks} weeks)."
    )
