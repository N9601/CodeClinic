import {
  CalendarClock,
  Cloud,
  Database,
  Download,
  FileText,
  Gauge,
  LayoutDashboard,
  Network,
  Printer,
  RotateCcw,
  Route,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  WifiOff,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { fetchMarkdown } from '../api'
import { TrustBand } from '../components/brand/TrustBand'
import { ReadinessGauge } from '../components/ReadinessGauge'
import { Badge, Button, cx } from '../components/ui'
import { CLOUD_LONG_LABEL, strategyStyle } from '../lib/format'
import { downloadText, reportToMarkdown, slugify } from '../lib/markdown'
import type { ReportSource } from '../lib/runAssessment'
import type { AssessmentReport } from '../types'
import { ArchitectureTab } from './report/ArchitectureTab'
import { ComplianceTab } from './report/ComplianceTab'
import { OverviewTab } from './report/OverviewTab'
import { ReadinessTab } from './report/ReadinessTab'
import { RisksTab } from './report/RisksTab'
import { RoadmapTab } from './report/RoadmapTab'
import { TargetTab } from './report/TargetTab'
import { ChatPanel } from '../components/chat/ChatPanel'

type TabKey = 'overview' | 'architecture' | 'readiness' | 'risks' | 'target' | 'roadmap' | 'compliance'

interface TabDef {
  key: TabKey
  label: string
  caption: string
  printTitle: string
  icon: LucideIcon
  render: (report: AssessmentReport, opts: { animate: boolean }) => ReactNode
}

const TABS: TabDef[] = [
  {
    key: 'overview',
    label: 'Overview',
    caption: 'Summary',
    printTitle: 'Executive summary',
    icon: LayoutDashboard,
    render: (r, o) => <OverviewTab report={r} animate={o.animate} />,
  },
  {
    key: 'architecture',
    label: 'Architecture',
    caption: 'Objective 1',
    printTitle: 'Objective 1 · Current architecture analysis',
    icon: Network,
    render: (r) => <ArchitectureTab report={r} />,
  },
  {
    key: 'readiness',
    label: 'Readiness',
    caption: 'Objective 2',
    printTitle: 'Objective 2 · Cloud-readiness score',
    icon: Gauge,
    render: (r, o) => <ReadinessTab report={r} animate={o.animate} />,
  },
  {
    key: 'risks',
    label: 'Risks',
    caption: 'Objective 3',
    printTitle: 'Objective 3 · Risks & opportunities',
    icon: ShieldAlert,
    render: (r) => <RisksTab report={r} />,
  },
  {
    key: 'target',
    label: 'Target',
    caption: 'Objective 4',
    printTitle: 'Objective 4 · Target architecture & 7R strategy',
    icon: Target,
    render: (r) => <TargetTab report={r} />,
  },
  {
    key: 'roadmap',
    label: 'Roadmap',
    caption: 'Objective 5',
    printTitle: 'Objective 5 · Migration roadmap',
    icon: Route,
    render: (r) => <RoadmapTab report={r} />,
  },
  {
    key: 'compliance',
    label: 'Compliance',
    caption: 'Objective 6',
    printTitle: 'Objective 6 · Regulatory gap analysis',
    icon: ShieldCheck,
    render: (r) => <ComplianceTab report={r} />,
  },
]

function usePrintAll() {
  const [printAll, setPrintAll] = useState(false)

  useEffect(() => {
    if (!printAll) return
    let cancelled = false
    const started = Date.now()
    let timer: number

    // Wait for freshly mounted Mermaid diagrams to finish rendering (max ~6s), then print.
    const tick = () => {
      if (cancelled) return
      const pending = document.querySelector('[data-mermaid-loading]')
      if (pending && Date.now() - started < 6000) {
        timer = window.setTimeout(tick, 120)
        return
      }
      window.print()
    }
    timer = window.setTimeout(tick, 400)

    const after = () => setPrintAll(false)
    window.addEventListener('afterprint', after)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      window.removeEventListener('afterprint', after)
    }
  }, [printAll])

  return [printAll, setPrintAll] as const
}

export function Report({
  report,
  source,
  onNew,
}: {
  report: AssessmentReport
  source: ReportSource
  onNew: () => void
}) {
  const [tab, setTab] = useState<TabKey>('overview')
  const [printAll, setPrintAll] = usePrintAll()
  const [downloading, setDownloading] = useState(false)
  const [offlineDismissed, setOfflineDismissed] = useState(false)
  const anchorRef = useRef<HTMLDivElement>(null)

  const s = report.summary
  const strat = strategyStyle(s.overall_strategy)
  const availableTabs = TABS.filter((t) => (t.key === 'compliance' ? !!report.compliance : true))
  const active = availableTabs.find((t) => t.key === tab) ?? availableTabs[0]

  function selectTab(key: TabKey) {
    setTab(key)
    // The tab bar is sticky, so measure a non-sticky anchor placed just above it.
    const anchor = anchorRef.current
    if (anchor) {
      const top = anchor.getBoundingClientRect().top + window.scrollY - 64
      if (window.scrollY > top) requestAnimationFrame(() => window.scrollTo({ top }))
    }
  }

  async function downloadMarkdown() {
    setDownloading(true)
    const filename = `${slugify(report.profile.name)}-codeclinic-report.md`
    let text: string
    try {
      text = await fetchMarkdown(report.id)
    } catch {
      text = reportToMarkdown(report)
    }
    downloadText(filename, text)
    setDownloading(false)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8 cc-fade-in">
      {source === 'mock' && !offlineDismissed && (
        <div className="no-print mb-4 flex items-start gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          <WifiOff className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
          <span className="flex-1">
            <span className="font-semibold">Offline demo.</span> Showing the bundled LabTrack LIMS sample report (target:
            Azure) without the backend. Start the API to run live diagnoses.
          </span>
          <button
            type="button"
            onClick={() => setOfflineDismissed(true)}
            className="rounded p-0.5 text-amber-700 hover:bg-amber-100"
            aria-label="Dismiss"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Report header */}
      <section className="avoid-break mb-6 overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-col gap-6 p-5 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="annotation">Modernization Report</span>
              <span className="text-xs text-slate-400">Generated {report.generated_at}</span>
            </div>
            <h1 className="font-display text-4xl font-bold uppercase leading-[0.95] tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
              {report.profile.name}
            </h1>
            {report.profile.business_function && (
              <p className="mt-1.5 max-w-3xl text-sm text-slate-600 sm:text-base">{report.profile.business_function}</p>
            )}
            {report.source_document && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge className="bg-slate-50 px-3 py-1 text-sm text-slate-700 ring-slate-200" icon={FileText}>
                  Extracted from: {report.source_document}
                </Badge>
                {report.extraction_confidence && (
                  <Badge
                    className={cx(
                      'px-3 py-1 text-sm capitalize',
                      report.extraction_confidence === 'high' && 'bg-emerald-50 text-emerald-700 ring-emerald-200',
                      report.extraction_confidence === 'medium' && 'bg-amber-50 text-amber-800 ring-amber-200',
                      report.extraction_confidence === 'low' && 'bg-red-50 text-red-700 ring-red-200',
                    )}
                    title={`${report.extraction_confidence} extraction confidence`}
                  >
                    {report.extraction_confidence} confidence
                  </Badge>
                )}
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge className={cx(strat.badge, 'px-3 py-1 text-sm')} title={strat.hint}>
                Strategy: {strat.label}
              </Badge>
              <Badge className="bg-slate-50 px-3 py-1 text-sm text-slate-700 ring-slate-200" icon={CalendarClock}>
                {s.total_weeks} weeks
              </Badge>
              {s.gxp_critical && (
                <Badge className="bg-violet-50 px-3 py-1 text-sm text-violet-700 ring-violet-200" icon={ShieldCheck}>
                  GxP-critical
                </Badge>
              )}
              <Badge className="bg-sky-50 px-3 py-1 text-sm text-sky-700 ring-sky-200" icon={Cloud}>
                {CLOUD_LONG_LABEL[report.target_cloud] ?? report.target_cloud}
              </Badge>
              {source === 'mock' ? (
                <Badge className="bg-amber-50 px-3 py-1 text-sm text-amber-800 ring-amber-200" icon={WifiOff}>
                  Offline demo
                </Badge>
              ) : report.mode === 'live' ? (
                <Badge className="bg-emerald-50 px-3 py-1 text-sm text-emerald-700 ring-emerald-200" icon={Sparkles} title={report.model}>
                  Live · {report.model}
                </Badge>
              ) : (
                <Badge className="bg-slate-100 px-3 py-1 text-sm text-slate-600 ring-slate-200" icon={Database} title={report.model}>
                  Cached report
                </Badge>
              )}
            </div>
            <div className="no-print mt-5 flex flex-wrap gap-2">
              <Button icon={RotateCcw} onClick={onNew}>
                New diagnosis
              </Button>
              <Button icon={Download} onClick={downloadMarkdown} disabled={downloading}>
                {downloading ? 'Preparing...' : 'Download Markdown'}
              </Button>
              <Button icon={Printer} onClick={() => setPrintAll(true)} disabled={printAll}>
                {printAll ? 'Preparing print...' : 'Print / PDF'}
              </Button>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-center gap-1 self-center rounded-2xl bg-slate-50 px-6 py-4 ring-1 ring-inset ring-slate-200/70">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cloud readiness</span>
            <ReadinessGauge score={s.readiness_score} />
          </div>
        </div>
      </section>

      {printAll ? (
        <div className="space-y-10">
          {availableTabs.map((t) => (
            <section key={t.key} className="print-section">
              <h2 className="mb-4 flex items-center gap-2 border-b border-slate-200 pb-2 text-xl font-bold text-slate-900">
                <t.icon className="size-5 text-teal-600" aria-hidden />
                {t.printTitle}
              </h2>
              {t.render(report, { animate: false })}
            </section>
          ))}
        </div>
      ) : (
        <>
          <div ref={anchorRef} aria-hidden />
          <div
            className="no-print sticky top-16 z-20 -mx-4 mb-6 border-b border-slate-200 bg-slate-50/90 px-4 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
          >
            <div role="tablist" aria-label="Report sections" className="no-scrollbar -mb-px flex gap-1 overflow-x-auto">
              {availableTabs.map((t) => {
                const selected = t.key === tab
                return (
                  <button
                    key={t.key}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls={`panel-${t.key}`}
                    onClick={() => selectTab(t.key)}
                    className={cx(
                      'group flex shrink-0 items-center gap-2.5 border-b-2 px-3 py-3 text-left transition-colors sm:px-4',
                      selected
                        ? 'border-teal-600 text-teal-700'
                        : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800',
                    )}
                  >
                    <t.icon className={cx('size-4.5', selected ? 'text-teal-600' : 'text-slate-400 group-hover:text-slate-600')} aria-hidden />
                    <span className="flex flex-col leading-tight">
                      <span className="text-sm font-semibold">{t.label}</span>
                      <span
                        className={cx(
                          'text-[10px] font-semibold uppercase tracking-wider',
                          selected ? 'text-teal-600/80' : 'text-slate-400',
                        )}
                      >
                        {t.caption}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div id={`panel-${active.key}`} role="tabpanel" key={active.key} className="cc-fade-in">
            {active.render(report, { animate: true })}
          </div>
        </>
      )}
      <div className="mx-[-1rem] mt-12 sm:mx-[-1.5rem] lg:mx-[-2rem]">
        <TrustBand />
      </div>
      <ChatPanel report={report} />
    </div>
  )
}
