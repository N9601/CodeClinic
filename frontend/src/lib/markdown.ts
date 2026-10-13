// Client-side Markdown export, used only when /api/reports/{id}/markdown is unreachable
// (offline demo). The backend's render.py is the primary implementation.
import type { AssessmentReport } from '../types'
import { CLOUD_LONG_LABEL, pct, strategyStyle, SUPPORT_STYLE, titleCase } from './format'

const esc = (s: string) => s.replace(/\|/g, '\\|').replace(/\n+/g, ' ')

function table(headers: string[], rows: string[][]): string {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((r) => `| ${r.map(esc).join(' | ')} |`),
  ].join('\n')
}

const bullets = (items: string[]) => (items.length ? items.map((i) => `- ${i}`).join('\n') : '_None_')

export function reportToMarkdown(r: AssessmentReport): string {
  const compName = new Map(r.architecture.components.map((c) => [c.id, c.name]))
  const out: string[] = []

  out.push(`# CodeClinic diagnosis: ${r.profile.name}`)
  out.push(
    `_Generated ${r.generated_at} · ${r.mode === 'live' ? `live analysis (${r.model})` : 'cached report'} · target cloud: ${CLOUD_LONG_LABEL[r.target_cloud] ?? r.target_cloud}_`,
  )
  out.push(`> ${r.summary.headline}`)
  out.push(
    table(
      ['Readiness', 'Overall strategy', 'Duration', 'GxP-critical'],
      [
        [
          `${r.summary.readiness_score}/100 (${r.summary.readiness_band})`,
          strategyStyle(r.summary.overall_strategy).label,
          `${r.summary.total_weeks} weeks`,
          r.summary.gxp_critical ? 'Yes' : 'No',
        ],
      ],
    ),
  )

  out.push('## 1. Current architecture')
  out.push(`**Style:** ${r.architecture.architecture_style}\n\n${r.architecture.summary}`)
  out.push('```mermaid\n' + r.diagrams.current + '\n```')
  out.push(
    table(
      ['Component', 'Type', 'Technology', 'Issues'],
      r.architecture.components.map((c) => [c.name, titleCase(c.type), c.technology, c.issues.join('; ') || '-']),
    ),
  )
  out.push('### Technology inventory')
  out.push(
    table(
      ['Technology', 'Version', 'Status', 'Note'],
      r.architecture.tech_inventory.map((t) => [t.name, t.version, SUPPORT_STYLE[t.support_status]?.label ?? t.support_status, t.note]),
    ),
  )
  out.push('### Technical debt\n' + bullets(r.architecture.tech_debt))
  out.push(`### Regulated data\n${r.architecture.regulated_data}`)

  out.push('## 2. Cloud-readiness score')
  out.push(`**${r.readiness.overall}/100 - ${r.readiness.band}**`)
  out.push(
    table(
      ['Dimension', 'Score', 'Weight', 'Rationale'],
      r.readiness.dimensions.map((d) => [d.label, `${d.score}/10`, pct(d.weight), d.rationale]),
    ),
  )

  out.push('## 3. Risks and opportunities')
  out.push(
    table(
      ['ID', 'Risk', 'Category', 'L x I', 'Level', 'GxP', 'Mitigation'],
      r.risks.map((k) => [
        k.id,
        k.title,
        titleCase(k.category),
        `${k.likelihood} x ${k.impact} = ${k.score}`,
        titleCase(k.level),
        k.gxp_related ? 'Yes' : '',
        k.mitigation,
      ]),
    ),
  )
  out.push('### Opportunities\n' + r.opportunities.map((o) => `- **${o.title}** (${o.effort} effort) - ${o.benefit}`).join('\n'))

  out.push('## 4. Target architecture and 7R strategy')
  out.push(r.plan.patterns.map((p) => `- **${p.name}** - ${p.why}`).join('\n'))
  out.push('```mermaid\n' + r.diagrams.target + '\n```')
  out.push(
    table(
      ['Component', 'Strategy', 'Target service', 'Rationale'],
      r.plan.component_strategies.map((s) => [
        compName.get(s.component_id) ?? s.component_id,
        strategyStyle(s.strategy).label,
        s.target_service,
        s.rationale,
      ]),
    ),
  )
  out.push(r.plan.target_summary)

  out.push('## 5. Migration roadmap')
  out.push('```mermaid\n' + r.diagrams.roadmap + '\n```')
  for (const p of [...r.plan.roadmap].sort((a, b) => a.start_week - b.start_week)) {
    out.push(`### ${p.name} (weeks ${p.start_week + 1}-${p.start_week + p.duration_weeks})`)
    out.push(`**Objectives**\n${bullets(p.objectives)}`)
    out.push(`**Activities**\n${bullets(p.activities)}`)
    out.push(`**Deliverables**\n${bullets(p.deliverables)}`)
    if (p.validation_gates.length) out.push(`**Validation gates**\n${bullets(p.validation_gates)}`)
  }
  out.push('### Quick wins\n' + bullets(r.plan.quick_wins))

  return out.join('\n\n') + '\n'
}

export function downloadText(filename: string, text: string, type = 'text/markdown') {
  const blob = new Blob([text], { type: `${type};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'report'
  )
}
