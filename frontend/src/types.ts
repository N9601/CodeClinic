// Mirrors backend/app/schemas.py - the backend is the source of truth.
// Keep field names and literal unions in sync with that file.

// ------------------------------------------------------------------ enums

export type CloudProvider = 'aws' | 'azure' | 'gcp'
export type RStrategy = 'retire' | 'retain' | 'rehost' | 'relocate' | 'replatform' | 'repurchase' | 'refactor'
export type ComponentType =
  | 'frontend'
  | 'backend'
  | 'database'
  | 'integration'
  | 'batch'
  | 'reporting'
  | 'storage'
  | 'identity'
  | 'external'
export type DimensionKey =
  | 'technology_currency'
  | 'modularity'
  | 'scalability'
  | 'data_portability'
  | 'integration_complexity'
  | 'compliance_burden'
  | 'devops_maturity'
export type RiskCategory = 'technical' | 'data' | 'compliance' | 'security' | 'operational' | 'organizational' | 'vendor'
export type SupportStatus = 'supported' | 'nearing_eol' | 'end_of_life' | 'unknown'
export type Effort = 'low' | 'medium' | 'high'
export type Severity = 'info' | 'warning' | 'critical'
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'
export type ReadinessBand = 'Not ready' | 'Needs remediation' | 'Cloud-ready'
export type AssessMode = 'auto' | 'live' | 'cached'

// ------------------------------------------------------------------ intake

export interface AppProfile {
  name: string
  business_function: string
  description: string
  tech_stack: string
  database: string
  hosting: string
  integrations: string
  users: string
  data_classification: string
  gxp_relevant: boolean
  pain_points: string
  constraints: string
}

export type SignalKind =
  | 'language'
  | 'framework'
  | 'database'
  | 'app_server'
  | 'platform'
  | 'dependency'
  | 'config'
  | 'practice'
  | 'risk'

export interface Signal {
  kind: SignalKind
  name: string
  detail: string
  file: string
  severity: Severity
}

export interface ScanResult {
  signals: Signal[]
  files_scanned: number
  languages: Record<string, number>
}

export interface AssessRequest {
  profile: AppProfile
  sample_id?: string | null
  signals: Signal[]
  target_cloud: CloudProvider
  mode: AssessMode
}

// ------------------------------------------------------------------ stage 1: analyze

export interface Component {
  id: string
  name: string
  type: ComponentType
  technology: string
  description: string
  issues: string[]
}

export interface Edge {
  source: string
  target: string
  label: string
}

export interface TechItem {
  name: string
  version: string
  category: 'language' | 'framework' | 'database' | 'app_server' | 'os' | 'library' | 'tool'
  support_status: SupportStatus
  note: string
}

export interface ArchitectureAnalysis {
  architecture_style: string
  summary: string
  components: Component[]
  edges: Edge[]
  tech_inventory: TechItem[]
  tech_debt: string[]
  regulated_data: string
}

// ------------------------------------------------------------------ stage 2: assess

export interface Risk {
  title: string
  category: RiskCategory
  likelihood: number
  impact: number
  gxp_related: boolean
  description: string
  mitigation: string
}

export interface Opportunity {
  title: string
  benefit: string
  effort: Effort
}

// ------------------------------------------------------------------ stage 3: recommend

export interface PatternChoice {
  name: string
  why: string
}

export interface ComponentStrategy {
  component_id: string
  strategy: RStrategy
  rationale: string
  target_service: string
}

export interface TargetComponent {
  id: string
  name: string
  type: ComponentType
  service: string
  description: string
}

export interface Phase {
  name: string
  start_week: number
  duration_weeks: number
  objectives: string[]
  activities: string[]
  deliverables: string[]
  validation_gates: string[]
}

export interface ModernizationPlan {
  headline: string
  overall_strategy: RStrategy
  patterns: PatternChoice[]
  component_strategies: ComponentStrategy[]
  target_summary: string
  target_components: TargetComponent[]
  target_edges: Edge[]
  roadmap: Phase[]
  quick_wins: string[]
}

// ------------------------------------------------------------------ final report

export interface ScoredDimension {
  key: DimensionKey
  label: string
  score: number
  weight: number
  rationale: string
  evidence: string[]
}

export interface Readiness {
  overall: number
  band: ReadinessBand
  dimensions: ScoredDimension[]
}

export interface ScoredRisk extends Risk {
  id: string
  score: number
  level: RiskLevel
}

export interface Diagrams {
  current: string
  target: string
  roadmap: string
}

export interface Summary {
  headline: string
  readiness_score: number
  readiness_band: string
  overall_strategy: RStrategy
  total_weeks: number
  gxp_critical: boolean
  top_risks: string[]
  strategy_mix: Record<string, number>
}

export interface AssessmentReport {
  id: string
  generated_at: string
  mode: 'live' | 'cached'
  model: string
  target_cloud: CloudProvider
  profile: AppProfile
  signals: Signal[]
  summary: Summary
  architecture: ArchitectureAnalysis
  readiness: Readiness
  risks: ScoredRisk[]
  opportunities: Opportunity[]
  plan: ModernizationPlan
  diagrams: Diagrams
}

// ------------------------------------------------------------------ API envelopes (not in schemas.py)

export interface HealthResponse {
  status: 'ok' | string
  live: boolean
  demo_mode: boolean
  model: string
}

export interface SampleSummary {
  id: string
  name: string
  tagline: string
  gxp_relevant: boolean
  has_cached_report: boolean
}

export interface SampleDetail {
  id: string
  tagline: string
  profile: AppProfile
  has_cached_report: boolean
}

export type StageName = 'scan' | 'analyze' | 'assess' | 'recommend' | 'assemble'
export type StageStatus = 'started' | 'done'

export interface StageEvent {
  stage: StageName
  status: StageStatus
  label: string
}

export const EMPTY_PROFILE: AppProfile = {
  name: '',
  business_function: '',
  description: '',
  tech_stack: '',
  database: '',
  hosting: '',
  integrations: '',
  users: '',
  data_classification: '',
  gxp_relevant: false,
  pain_points: '',
  constraints: '',
}
