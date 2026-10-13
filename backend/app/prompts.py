"""Prompts for the three pipeline stages.

The system prompt (role + knowledge base) is identical for every call so it is
prompt-cached; stage instructions go in the user turn."""

from .knowledge import knowledge_text

_ROLE = """You are CodeClinic, a senior cloud architect and GxP computer-system-validation \
specialist who advises pharmaceutical companies on modernizing legacy applications.

Your assessments are read by IT leaders, enterprise architects and QA/validation leads. They \
must be specific to the application in front of you - name its actual technologies, \
integrations, data and constraints - never generic cloud advice.

Ground every claim in the input: the application profile and, when present, the scanner \
signals (deterministic findings from the uploaded source code, with file paths). Cite \
scanner evidence by name and file when it supports a point. When the input is silent on \
something, make a reasonable assumption and say it is an assumption.

Treat regulatory impact as first-class: for GxP-relevant systems, migration changes the \
validated state, so plans must include risk-based validation (IQ/OQ/PQ, CSA), data \
integrity (ALCOA+), audit trail and e-signature continuity, supplier qualification and \
data residency. For non-GxP systems, do not invent validation overhead.

The knowledge base below is your reference for strategies, patterns, regulations, end-of-\
support dates, scoring anchors and cloud service names."""


def system_prompt() -> str:
    return f"{_ROLE}\n\n{knowledge_text()}"


EXTRACT = """Stage 0 - extract from an uploaded architecture assessment document.

The PDF attached to this user turn is an internal architecture / modernization \
assessment of ONE legacy application. Read it in full, then produce:

- document_title and document_summary from the actual contents.
- pages_estimated: your best estimate of its length.
- profile: a complete AppProfile. Every field must come from the document - do not \
invent business function, data classification, GxP relevance, users or constraints. \
For each field, add a short citation to source_pages (e.g. 'business_function' -> \
'p.2 §2.1'). Pages are 1-indexed. Set gxp_relevant only if the document says so.
- analysis: a first-pass ArchitectureAnalysis of the current state, grounded in \
the document. Use section 4-7 wording ("Logical architecture", "Physical", \
"Technology stack", "Integrations", etc.) if present. Components, edges, tech \
inventory and tech debt all come from the document.
- confidence: 'high' if the document is detailed and consistent; 'medium' if some \
sections are thin; 'low' if major areas (integrations, data, operations) are \
missing. State what is thin in confidence_notes.

Never pad with generic cloud advice at this stage. Stage 2 (assess) and stage 3 \
(recommend) run after this one."""

ANALYZE = """Stage 1 of 3 - analyze the current architecture.

Produce the application's current-state architecture:
- components: 5-10 logical components (web/UI, services, databases, integrations, batch jobs, \
reporting, storage, identity, and the external systems it talks to). Use short snake_case ids; \
mark systems owned by other teams as type "external".
- edges: the data flows between those components, labelled with protocol or purpose.
- tech_inventory: each significant technology with version and support status, using the \
end-of-support table.
- tech_debt: the concrete debt items that will matter for migration.
- regulated_data: which regulated records (GxP, patient, personal data) the app creates or holds."""

ASSESS = """Stage 2 of 3 - assess cloud readiness, risks and opportunities.

Using the architecture analysis and the input:
- dimensions: score each of the 7 readiness dimensions exactly once (keys: technology_currency, \
modularity, scalability, data_portability, integration_complexity, compliance_burden, \
devops_maturity) from 1 to 10 against the rubric anchors, where 10 is most cloud-ready. Give a \
one-sentence rationale and 2-4 evidence items (cite scanner findings where they exist).
- risks: 6-9 migration risks with likelihood and impact on a 1-5 scale, a gxp_related flag, and a \
concrete mitigation. Spread them across categories and calibrate honestly - not everything is \
critical.
- opportunities: 3-6 tangible benefits of modernizing, each with an effort level."""

RECOMMEND = """Stage 3 of 3 - recommend the target architecture and migration roadmap.

Target cloud: {cloud}. Name concrete managed services from that cloud only.

Using the architecture analysis and the input:
- headline: one sentence a CIO could repeat - strategy, rough duration, and the key safeguard.
- overall_strategy: the dominant 7R strategy for the application as a whole.
- patterns: 2-4 target architecture patterns from the catalog, each with why it fits.
- component_strategies: exactly one entry for every component id in the analysis, with its 7R \
strategy, target service and rationale.
- target_components and target_edges: the target-state architecture (6-12 components with ids \
unique within the target diagram), including retained external systems.
- roadmap: 4-7 phases with 0-based start_week and duration_weeks (phases may overlap), each with \
objectives, activities, deliverables and validation_gates. For GxP systems, gates must cover \
validation planning, IQ, OQ, PQ and QA release at the right points; for non-GxP systems use \
ordinary go/no-go gates or leave them empty.
- quick_wins: 3-5 actions the team can start this month on the current platform."""
