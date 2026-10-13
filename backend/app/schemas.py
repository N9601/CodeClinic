"""The CodeClinic data contract.

Three groups of models live here:
  1. Intake      - what the user gives us (AppProfile, Signal, AssessRequest)
  2. LLM stages  - what Claude returns, one model per pipeline stage (structured outputs)
  3. Report      - the final AssessmentReport the frontend renders

Stage models avoid numeric constraints (ge/le) on purpose: structured outputs
guarantees shape, and scoring.py clamps numbers deterministically.
Change this file only with the whole team's agreement - the frontend types mirror it.
"""

from typing import Literal

from pydantic import BaseModel, Field

# --------------------------------------------------------------------------- enums

CloudProvider = Literal["aws", "azure", "gcp"]
RStrategy = Literal["retire", "retain", "rehost", "relocate", "replatform", "repurchase", "refactor"]
ComponentType = Literal[
    "frontend", "backend", "database", "integration", "batch", "reporting", "storage", "identity", "external"
]
DimensionKey = Literal[
    "technology_currency",
    "modularity",
    "scalability",
    "data_portability",
    "integration_complexity",
    "compliance_burden",
    "devops_maturity",
]
RiskCategory = Literal["technical", "data", "compliance", "security", "operational", "organizational", "vendor"]
SupportStatus = Literal["supported", "nearing_eol", "end_of_life", "unknown"]
Effort = Literal["low", "medium", "high"]
Severity = Literal["info", "warning", "critical"]

# --------------------------------------------------------------------------- intake


class AppProfile(BaseModel):
    """Intake form. Everything is free text so the form stays forgiving."""

    name: str
    business_function: str = ""
    description: str = ""
    tech_stack: str = ""
    database: str = ""
    hosting: str = ""
    integrations: str = ""
    users: str = ""
    data_classification: str = ""
    gxp_relevant: bool = False
    pain_points: str = ""
    constraints: str = ""


class Signal(BaseModel):
    """A deterministic finding from scanner.py - the evidence behind the scores."""

    kind: Literal["language", "framework", "database", "app_server", "platform", "dependency", "config", "practice", "risk"]
    name: str
    detail: str
    file: str
    severity: Severity = "info"


class ScanResult(BaseModel):
    signals: list[Signal]
    files_scanned: int
    languages: dict[str, int]


class AssessRequest(BaseModel):
    profile: AppProfile
    sample_id: str | None = None
    signals: list[Signal] = Field(default_factory=list)
    target_cloud: CloudProvider = "azure"
    mode: Literal["auto", "live", "cached"] = "auto"
    extraction: "ExtractionResult | None" = Field(
        default=None,
        description="Set when the request originated from a document ingest; the pipeline reuses "
        "its ArchitectureAnalysis instead of re-running the analyze stage.",
    )


# --------------------------------------------------------------------------- stage 0: extract (PDF ingest)


class ExtractedProfile(AppProfile):
    """AppProfile the extractor produced, with provenance so the UI can show
    where each field came from in the uploaded report."""

    source_pages: dict[str, str] = Field(
        default_factory=dict,
        description="map of AppProfile field name -> short page/section citation, e.g. 'business_function' -> 'p.3 §2.1'",
    )
    confidence: Literal["high", "medium", "low"] = "medium"
    confidence_notes: str = ""


class ExtractionResult(BaseModel):
    """Output of stage 0 when the user uploads an assessment document.
    The analysis is a first pass straight from the document - the assess and
    recommend stages still run on top of it."""

    document_title: str
    document_summary: str = Field(description="2-3 sentences summarising what the report covers.")
    pages_estimated: int = Field(description="estimated page count of the uploaded document, best effort")
    profile: ExtractedProfile
    analysis: "ArchitectureAnalysis"


# --------------------------------------------------------------------------- stage 1: analyze


class Component(BaseModel):
    id: str = Field(description="short snake_case slug, unique, e.g. 'web_app'")
    name: str
    type: ComponentType
    technology: str
    description: str
    issues: list[str]


class Edge(BaseModel):
    source: str = Field(description="component id")
    target: str = Field(description="component id")
    label: str = Field(description="protocol or data flow, 2-5 words")


class TechItem(BaseModel):
    name: str
    version: str
    category: Literal["language", "framework", "database", "app_server", "os", "library", "tool"]
    support_status: SupportStatus
    note: str


class ArchitectureAnalysis(BaseModel):
    architecture_style: str = Field(description="e.g. '3-tier monolith on Windows/IIS'")
    summary: str
    components: list[Component]
    edges: list[Edge]
    tech_inventory: list[TechItem]
    tech_debt: list[str]
    regulated_data: str = Field(description="which GxP / patient / regulated records the app creates or holds, or 'none'")


# --------------------------------------------------------------------------- stage 2: assess


class DimensionScore(BaseModel):
    key: DimensionKey
    score: int = Field(description="1-10, where 10 = most cloud-ready")
    rationale: str
    evidence: list[str]


class Risk(BaseModel):
    title: str
    category: RiskCategory
    likelihood: int = Field(description="1-5")
    impact: int = Field(description="1-5")
    gxp_related: bool
    description: str
    mitigation: str


class Opportunity(BaseModel):
    title: str
    benefit: str
    effort: Effort


class ReadinessAssessment(BaseModel):
    dimensions: list[DimensionScore]
    risks: list[Risk]
    opportunities: list[Opportunity]


# --------------------------------------------------------------------------- stage 3: recommend


class PatternChoice(BaseModel):
    name: str
    why: str


class ComponentStrategy(BaseModel):
    component_id: str
    strategy: RStrategy
    rationale: str
    target_service: str


class TargetComponent(BaseModel):
    id: str
    name: str
    type: ComponentType
    service: str = Field(description="concrete managed service on the target cloud")
    description: str


class Phase(BaseModel):
    name: str
    start_week: int = Field(description="0-based week offset from project start")
    duration_weeks: int
    objectives: list[str]
    activities: list[str]
    deliverables: list[str]
    validation_gates: list[str] = Field(description="GxP/CSV gates, e.g. 'OQ sign-off'; empty if not regulated")


class ModernizationPlan(BaseModel):
    headline: str = Field(description="one-sentence recommendation")
    overall_strategy: RStrategy
    patterns: list[PatternChoice]
    component_strategies: list[ComponentStrategy]
    target_summary: str
    target_components: list[TargetComponent]
    target_edges: list[Edge]
    roadmap: list[Phase]
    quick_wins: list[str]


# --------------------------------------------------------------------------- final report


class ScoredDimension(BaseModel):
    key: DimensionKey
    label: str
    score: int
    weight: float
    rationale: str
    evidence: list[str]


class Readiness(BaseModel):
    overall: int
    band: Literal["Not ready", "Needs remediation", "Cloud-ready"]
    dimensions: list[ScoredDimension]


class ScoredRisk(Risk):
    id: str
    score: int
    level: Literal["low", "medium", "high", "critical"]


class Diagrams(BaseModel):
    current: str
    target: str
    roadmap: str


class Summary(BaseModel):
    headline: str
    readiness_score: int
    readiness_band: str
    overall_strategy: RStrategy
    total_weeks: int
    gxp_critical: bool
    top_risks: list[str]
    strategy_mix: dict[str, int]


class AssessmentReport(BaseModel):
    id: str
    generated_at: str
    mode: Literal["live", "cached"]
    model: str
    target_cloud: CloudProvider
    profile: AppProfile
    signals: list[Signal]
    summary: Summary
    architecture: ArchitectureAnalysis
    readiness: Readiness
    risks: list[ScoredRisk]
    opportunities: list[Opportunity]
    plan: ModernizationPlan
    diagrams: Diagrams
    source_document: str | None = Field(
        default=None,
        description="Original filename of the uploaded assessment document, if the report came from an ingest.",
    )
    extraction_confidence: Literal["high", "medium", "low"] | None = None
    compliance: "ComplianceAnalysis | None" = None


# --------------------------------------------------------------------------- stage 4: compliance (optional)


class ComplianceGap(BaseModel):
    id: str = Field(description="short slug, e.g. 'audit_trail_migration'")
    title: str
    description: str
    severity: Literal["minor", "major", "critical"]
    gxp_related: bool
    frameworks: list[str] = Field(description="e.g. ['21 CFR Part 11', 'EU GMP Annex 11']")
    clauses: list[str] = Field(description="exact clause IDs from the knowledge base, e.g. ['21 CFR 11.10(e)', 'Annex 11 §9']")
    linked_risk_ids: list[str] = Field(default_factory=list, description="ScoredRisk.id values this gap maps to")
    linked_component_ids: list[str] = Field(default_factory=list, description="architecture.components ids involved")
    mitigation: str = Field(description="concrete action to close the gap")
    validation_activity: str = Field(description="GxP validation step that evidences closure, e.g. 'IQ for the new audit log store'")


class ComplianceControl(BaseModel):
    name: str = Field(description="short title, e.g. 'Audit-log immutability'")
    description: str
    frameworks: list[str]
    clauses: list[str]


class ComplianceAnalysis(BaseModel):
    headline: str = Field(description="one sentence summarising compliance posture of the proposed modernization")
    overall_posture: Literal["low_risk", "manageable", "elevated_risk"]
    gaps: list[ComplianceGap]
    required_controls: list[ComplianceControl] = Field(
        description="controls the target architecture MUST implement to stay compliant; cite clauses"
    )
    validation_strategy: str = Field(
        description="2-4 sentences describing the recommended risk-based CSA / IQ-OQ-PQ approach for this migration"
    )


AssessRequest.model_rebuild()
ExtractionResult.model_rebuild()
AssessmentReport.model_rebuild()
