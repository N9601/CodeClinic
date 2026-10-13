"""Assemble the final AssessmentReport from the three stage outputs."""

import uuid
from collections import Counter
from datetime import datetime, timezone

from . import render, scoring
from .schemas import (
    AppProfile,
    ArchitectureAnalysis,
    AssessmentReport,
    CloudProvider,
    ComplianceAnalysis,
    Diagrams,
    ModernizationPlan,
    ReadinessAssessment,
    Signal,
    Summary,
)


def assemble(
    *,
    profile: AppProfile,
    target_cloud: CloudProvider,
    signals: list[Signal],
    analysis: ArchitectureAnalysis,
    assessment: ReadinessAssessment,
    plan: ModernizationPlan,
    mode: str,
    model: str,
    compliance: ComplianceAnalysis | None = None,
) -> AssessmentReport:
    readiness = scoring.score_readiness(assessment.dimensions)
    risks = scoring.score_risks(assessment.risks)
    gxp_critical = profile.gxp_relevant or any(r.gxp_related for r in risks)

    summary = Summary(
        headline=plan.headline,
        readiness_score=readiness.overall,
        readiness_band=readiness.band,
        overall_strategy=plan.overall_strategy,
        total_weeks=render.total_weeks(plan.roadmap),
        gxp_critical=gxp_critical,
        top_risks=[r.title for r in risks[:3]],
        strategy_mix=dict(Counter(cs.strategy for cs in plan.component_strategies)),
    )
    diagrams = Diagrams(
        current=render.current_state_diagram(analysis.components, analysis.edges),
        target=render.target_state_diagram(plan.target_components, plan.target_edges),
        roadmap=render.roadmap_gantt(plan.roadmap),
    )
    return AssessmentReport(
        id=uuid.uuid4().hex[:12],
        generated_at=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        mode=mode,
        model=model,
        target_cloud=target_cloud,
        profile=profile,
        signals=signals,
        summary=summary,
        architecture=analysis,
        readiness=readiness,
        risks=risks,
        opportunities=assessment.opportunities,
        plan=plan,
        diagrams=diagrams,
        compliance=compliance,
    )
