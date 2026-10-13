"""Deterministic scoring. Claude rates each dimension 1-10 with evidence; this
module owns the weights, the 0-100 roll-up, bands and risk levels, so the same
inputs always produce the same score."""

from .schemas import DimensionScore, Readiness, Risk, ScoredDimension, ScoredRisk

DIMENSIONS: dict[str, tuple[str, float]] = {
    "technology_currency": ("Technology currency", 0.15),
    "modularity": ("Modularity & coupling", 0.15),
    "scalability": ("Statelessness & scalability", 0.15),
    "data_portability": ("Data portability", 0.15),
    "integration_complexity": ("Integration complexity", 0.10),
    "compliance_burden": ("Compliance & validation", 0.15),
    "devops_maturity": ("DevOps maturity", 0.15),
}


def _clamp(value: int, low: int, high: int) -> int:
    return max(low, min(high, int(value)))


def band_for(score: int) -> str:
    if score >= 70:
        return "Cloud-ready"
    if score >= 40:
        return "Needs remediation"
    return "Not ready"


def score_readiness(dimensions: list[DimensionScore]) -> Readiness:
    by_key = {d.key: d for d in dimensions}
    scored: list[ScoredDimension] = []
    total = 0.0
    for key, (label, weight) in DIMENSIONS.items():
        dim = by_key.get(key)
        score = _clamp(dim.score, 1, 10) if dim else 5
        total += weight * score
        scored.append(
            ScoredDimension(
                key=key,
                label=label,
                score=score,
                weight=weight,
                rationale=dim.rationale if dim else "Not assessed - defaulted to neutral.",
                evidence=dim.evidence if dim else [],
            )
        )
    overall = round(total * 10)
    return Readiness(overall=overall, band=band_for(overall), dimensions=scored)


def risk_level(score: int) -> str:
    if score >= 15:
        return "critical"
    if score >= 10:
        return "high"
    if score >= 5:
        return "medium"
    return "low"


def score_risks(risks: list[Risk]) -> list[ScoredRisk]:
    scored = []
    for risk in risks:
        likelihood = _clamp(risk.likelihood, 1, 5)
        impact = _clamp(risk.impact, 1, 5)
        score = likelihood * impact
        data = risk.model_dump() | {"likelihood": likelihood, "impact": impact}
        scored.append(ScoredRisk(**data, id="", score=score, level=risk_level(score)))
    scored.sort(key=lambda r: (r.score, r.gxp_related), reverse=True)
    for i, risk in enumerate(scored, start=1):
        risk.id = f"R{i:02d}"
    return scored
