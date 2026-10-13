// Offline fallback data. Copied verbatim from backend/samples so the demo
// still works if the API is unreachable.
import type { AssessmentReport, SampleDetail, SampleSummary } from '../types'
import labtrackReport from './labtrack-lims.report.json'
import labtrackProfile from './labtrack-lims.profile.json'
import trialhubProfile from './trialhub-ctms.profile.json'
import repconnectProfile from './repconnect.profile.json'

export const MOCK_REPORT = labtrackReport as unknown as AssessmentReport

/** Sample id whose report is bundled for offline demo mode. */
export const MOCK_REPORT_SAMPLE_ID = 'labtrack-lims'

type RawSample = Omit<SampleDetail, 'has_cached_report'>

const RAW_SAMPLES = [labtrackProfile, trialhubProfile, repconnectProfile] as RawSample[]

export const MOCK_SAMPLE_DETAILS: SampleDetail[] = RAW_SAMPLES.map((s) => ({
  ...s,
  has_cached_report: s.id === MOCK_REPORT_SAMPLE_ID,
}))

export const MOCK_SAMPLES: SampleSummary[] = MOCK_SAMPLE_DETAILS.map((s) => ({
  id: s.id,
  name: s.profile.name,
  tagline: s.tagline,
  gxp_relevant: s.profile.gxp_relevant,
  has_cached_report: s.has_cached_report,
}))
