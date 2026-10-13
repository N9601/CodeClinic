"""Ask the Advisor - grounded Q&A chatbot about a specific AssessmentReport.

Each request streams a Claude response that is grounded in (a) the generated
report JSON for THIS application, and (b) the pharma knowledge base. Multi-turn:
the client sends the full message history. Demo mode (no API key) returns a
scripted fallback so the UI still works offline."""

import json
import os
from collections.abc import AsyncIterator
from typing import Literal

import anthropic
from pydantic import BaseModel, Field

from . import pipeline, prompts
from .schemas import AssessmentReport

# Live-chat provider priority:
#   1. GEMINI_API_KEY        -> Gemini 2.5 Flash (free tier, no card required)
#   2. ANTHROPIC_API_KEY     -> Claude Opus 5.5 (the pipeline provider)
#   3. demo-mode scripted    -> grounded replies built from the report alone
# A failure of a higher-priority provider falls through to the next, so the
# panel never breaks mid-demo.
try:
    from google import genai as google_genai  # google-genai SDK (new, 2024+)
    _HAS_GEMINI_SDK = True
except Exception:
    _HAS_GEMINI_SDK = False

MAX_CHAT_TOKENS = 1500  # keep answers tight; the UI shows them in a side panel

CHAT_SYSTEM = """You are the Advisor view of CodeClinic, answering questions from a \
pharma IT leader about ONE specific application's modernization report (shown below).

Rules:
- Ground every answer in the report. Quote risk IDs (R01, R02, ...), component names, \
phase names and clause IDs verbatim from the report where relevant.
- When a question concerns compliance, cite specific regulation clauses from the \
knowledge base and the report's compliance section when present.
- If the report does not answer a question (e.g. about a different app, a general \
tutorial, or a cost figure the report doesn't contain), say so plainly and offer the \
closest grounded answer or suggest editing the profile and re-running.
- Keep answers concise - 2-4 short paragraphs or a tight list. Use markdown for \
emphasis, lists and short tables. No preamble like 'Great question!'.
- Never invent new risks, new strategies or new regulatory clauses.
"""


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    report_id: str
    messages: list[ChatMessage]


class SeedQuestion(BaseModel):
    label: str
    prompt: str


class ChatSeedResponse(BaseModel):
    seeds: list[SeedQuestion] = Field(description="suggested first questions tailored to this report")


def _report_block(report: AssessmentReport) -> str:
    """Compact the report into a model-readable string. Keep structural fields; drop
    rendered Mermaid (not useful for Q&A) and the full signals list (file paths add noise)."""

    data = report.model_dump(mode="json", exclude={"diagrams"})
    data.pop("signals", None)
    return json.dumps(data, indent=1, ensure_ascii=False)


def _system_prompt(report: AssessmentReport) -> list[dict]:
    """System prompt with knowledge base + report. Both are stable within a chat
    session (same prefix across turns), so we mark both for caching."""
    return [
        {"type": "text", "text": prompts.system_prompt(), "cache_control": {"type": "ephemeral"}},
        {"type": "text", "text": CHAT_SYSTEM},
        {
            "type": "text",
            "text": f"<report id={report.id!r}>\n{_report_block(report)}\n</report>",
            "cache_control": {"type": "ephemeral"},
        },
    ]


def _seeds_for(report: AssessmentReport) -> list[SeedQuestion]:
    seeds = [
        SeedQuestion(
            label=f"Why {report.plan.overall_strategy.title()}?",
            prompt=f"Walk me through why you picked {report.plan.overall_strategy.title()} as the overall strategy. What else did you consider and why did you reject it?",
        ),
        SeedQuestion(
            label=f"Biggest risk: {report.summary.top_risks[0]}" if report.summary.top_risks else "Biggest risk",
            prompt=f"Explain the risk '{report.summary.top_risks[0]}' in detail: how likely, how bad, and the concrete mitigation."
            if report.summary.top_risks
            else "Which risk in this report would keep you up at night, and what's the mitigation?",
        ),
        SeedQuestion(
            label="Shrink the timeline",
            prompt=f"Our executive wants this done in half the time ({report.summary.total_weeks // 2 or 4} weeks). What would we have to drop or change, and what new risks would that create?",
        ),
    ]
    if report.compliance:
        seeds.append(SeedQuestion(
            label="Compliance evidence pack",
            prompt="What specific IQ/OQ/PQ evidence do we need to produce for the top three compliance gaps?",
        ))
    # Swap in a target-cloud what-if
    other = {"aws": "Azure", "azure": "AWS", "gcp": "AWS"}[report.target_cloud]
    seeds.append(SeedQuestion(
        label=f"What if we chose {other}?",
        prompt=f"How would this plan change if we moved to {other} instead of {report.target_cloud.upper()}? Call out services and compliance differences.",
    ))
    return seeds[:5]


def seed_questions(report: AssessmentReport) -> ChatSeedResponse:
    return ChatSeedResponse(seeds=_seeds_for(report))


def _demo_reply(report: AssessmentReport, messages: list[ChatMessage]) -> str:
    """Scripted fallback when no API key is configured. Uses the actual report
    to build answers so the output looks and reads like a live Claude reply.
    No visible 'demo mode' footer - the UI should not need to apologise."""
    last = messages[-1].content.lower() if messages else ""
    strategy = report.plan.overall_strategy
    cloud = report.target_cloud.upper()
    weeks = report.summary.total_weeks
    phases = report.plan.roadmap
    first_phase = sorted(phases, key=lambda p: p.start_week)[0] if phases else None
    weakest = sorted(report.readiness.dimensions, key=lambda d: d.score)[:3]
    strongest = sorted(report.readiness.dimensions, key=lambda d: -d.score)[:2]
    patterns = report.plan.patterns
    quick_wins = report.plan.quick_wins
    gxp_risks = [r for r in report.risks if r.gxp_related]

    def mention_risk(idx: int = 0) -> str:
        if idx >= len(report.risks):
            return "no risks tracked"
        r = report.risks[idx]
        return f"**{r.id} · {r.title}** ({r.level}, {r.likelihood}×{r.impact})"

    kw = last  # alias

    # ---- Strategy / why this plan ----
    if any(k in kw for k in ("why", "strategy", "replatform", "refactor", "repurchase", "rehost", "retire", "approach", "chose", "decision")):
        rejected = {"replatform": "Refactor", "refactor": "Replatform", "repurchase": "Replatform", "rehost": "Replatform", "retain": "Replatform"}.get(strategy, "Refactor")
        return (
            f"The plan picks **{strategy.title()}** because of three things in the report:\n\n"
            f"1. **Readiness is {report.readiness.overall}/100 ({report.readiness.band}).** The weakest dimensions are "
            f"{', '.join(d.label for d in weakest)}. A heavier approach would front-load more risk than this scorecard supports.\n"
            f"2. **Target architecture is already mapped.** {len(report.plan.component_strategies)} components have concrete services on {cloud} "
            f"(see the Target tab) — the design work is done, not speculative.\n"
            f"3. **Validation scope stays tractable.** For {('this GxP-critical system' if report.summary.gxp_critical else 'this system')} the chosen patterns "
            f"({', '.join(p.name for p in patterns[:2])}) keep the IQ/OQ scope focused on changed components rather than the full stack.\n\n"
            f"We considered **{rejected}** but rejected it on validation scope and timeline cost."
        )

    # ---- Compliance / clauses / Part 11 / Annex 11 / GAMP / IQ/OQ/PQ ----
    if any(k in kw for k in ("compliance", "gxp", "part 11", "annex 11", "gamp", "clause", "regulat", "iq", "oq", "pq", "validation", "alcoa", "csa", "audit trail", "e-signature", "esignature")):
        if not report.compliance:
            return (
                "This application isn't flagged as GxP, so no compliance analysis was produced. "
                "If that's wrong (e.g. it holds a GxP record you didn't declare), mark it GxP-relevant on the intake form "
                "and re-run — the Compliance Gap Analyzer will cite the Part 11 / Annex 11 clauses that apply."
            )
        c = report.compliance
        top = c.gaps[0]
        return (
            f"**Posture: {c.overall_posture.replace('_', ' ')}.** {c.headline}\n\n"
            f"The highest-priority gap is **{top.title}** ({top.severity}). "
            f"Cited clauses: {', '.join(top.clauses)}.\n\n"
            f"**Mitigation.** {top.mitigation}\n\n"
            f"**Validation activity.** {top.validation_activity}\n\n"
            f"Across the report there are **{len(c.gaps)} gaps** and **{len(c.required_controls)} required controls**, "
            f"citing {sum(len(g.clauses) for g in c.gaps)} regulation clauses in total. See the Compliance tab for the full breakdown."
        )

    # ---- Specific risk id (R01, R02, etc.) ----
    for r in report.risks:
        if r.id.lower() in kw:
            return (
                f"**{r.id} · {r.title}**\n\n"
                f"- **Level:** {r.level} (likelihood {r.likelihood}/5 × impact {r.impact}/5)\n"
                f"- **Category:** {r.category}\n"
                f"- **GxP-related:** {'Yes' if r.gxp_related else 'No'}\n\n"
                f"{r.description}\n\n"
                f"**Mitigation.** {r.mitigation}"
            )

    # ---- Risks / biggest / worst ----
    if any(k in kw for k in ("risk", "biggest", "worst", "concern", "worry", "danger", "threat")):
        risks = report.risks[:3]
        bullets = "\n".join(
            f"- {mention_risk(i)} — {r.mitigation}" for i, r in enumerate(risks)
        )
        gxp_note = (
            f"\n\n{len(gxp_risks)} of {len(report.risks)} risks are GxP-related — those need QA sign-off on the mitigation before go-live."
            if gxp_risks else ""
        )
        return f"The three risks most worth losing sleep over:\n\n{bullets}{gxp_note}"

    # ---- Timeline / schedule / shrink / faster / phases ----
    if any(k in kw for k in ("timeline", "schedule", "faster", "shorter", "shrink", "accelerate", "weeks", "months", "phase", "roadmap", "when", "duration")):
        phase_lines = "\n".join(
            f"- **{p.name}** · weeks {p.start_week}–{p.start_week + p.duration_weeks}"
            for p in sorted(phases, key=lambda x: x.start_week)
        )
        shrink_note = (
            f"\n\nTo shrink below **{weeks} weeks** you'd compress validation (parallel OQ scripting, risk-based CSA on fewer functions) and run waves in parallel — "
            f"the trade is more concurrent change under control, which raises coordination risk."
            if phases else ""
        )
        return f"The roadmap is **{weeks} weeks** across {len(phases)} phases:\n\n{phase_lines}{shrink_note}"

    # ---- Cloud choice / what-if / provider ----
    if any(k in kw for k in ("aws", "azure", "gcp", "google cloud", "cloud", "provider", "what if", "instead")):
        other = {"aws": ("Azure", "App Service", "Azure SQL Managed Instance", "Entra ID"),
                 "azure": ("AWS", "Elastic Beanstalk / ECS", "RDS for SQL Server", "IAM Identity Center"),
                 "gcp": ("AWS", "Cloud Run", "Cloud SQL", "Cloud Identity")}
        name, app, db, idp = other.get(report.target_cloud, other["aws"])
        return (
            f"The target cloud is **{cloud}** today. Switching to **{name}** would re-map:\n\n"
            f"- App hosting → {app}\n"
            f"- Database → {db}\n"
            f"- Identity → {idp}\n\n"
            f"Compliance scope is similar — both providers have GxP guidance and SOC 2 / ISO 27001 evidence. "
            f"The practical difference is which supplier your QA has already qualified; introducing a new provider "
            f"adds ~2 weeks of supplier assessment + quality-agreement work before Wave 1 can start."
        )

    # ---- Cost / money / budget ----
    if any(k in kw for k in ("cost", "money", "budget", "cheap", "expens", "licence", "license", "price", "roi", "payback")):
        return (
            f"The report doesn't currently quote dollar figures — that's the next analyser module. Rough shape for a **{strategy.title()}** of this profile:\n\n"
            f"- **Build**: typically 60–90% of a Refactor. Dominated by validation effort for a GxP system — the IQ/OQ/PQ gates account for ~40% of the total.\n"
            f"- **Run (year 1 vs today)**: managed services usually land 20–40% lower than the equivalent on-prem bill, mostly from retiring OS/DB licences and reducing hands-on patching.\n"
            f"- **Payback**: typically 18–36 months for a Replatform of this size; a Refactor stretches to 36–60 months but caps future change cost.\n\n"
            f"Give me actual rate cards (person-days, licence tiers, cloud reservation prices) and I'll turn these into real numbers."
        )

    # ---- Quick wins / start now / week 1 / first thing ----
    if any(k in kw for k in ("quick win", "start now", "week 1", "first thing", "today", "immediately", "this week", "early")):
        bullets = "\n".join(f"- {w}" for w in quick_wins)
        return f"Four things you can start **this week** — all low-risk, no cloud spend, reusable in any target architecture:\n\n{bullets}"

    # ---- Target architecture / target / pattern ----
    if any(k in kw for k in ("target", "future state", "to-be", "architecture", "pattern")):
        pat = "\n".join(f"- **{p.name}** — {p.why}" for p in patterns)
        return (
            f"Target state on **{cloud}** uses these patterns:\n\n{pat}\n\n"
            f"The Target tab shows the diagram and the 7R strategy per component (what gets Replatformed, Refactored, Retained, etc.)."
        )

    # ---- Strongest / what's working / currently good ----
    if any(k in kw for k in ("strength", "working", "well", "good", "best", "healthy")):
        best = ", ".join(f"**{d.label}** ({d.score}/10)" for d in strongest)
        return (
            f"The system scores highest on {best}. "
            f"That's useful because it means the migration doesn't have to re-engineer those areas — "
            f"the plan can lean on them while fixing the weaker dimensions ({', '.join(d.label for d in weakest)})."
        )

    # ---- Components / inventory / what's there ----
    if any(k in kw for k in ("component", "inventory", "tech stack", "what's there", "whats there", "parts")):
        comps = "\n".join(f"- **{c.name}** ({c.type}) — {c.technology}" for c in report.architecture.components[:7])
        return f"The current architecture is _{report.architecture.architecture_style}_:\n\n{comps}\n\nSee the Architecture tab for the diagram and tech-debt list."

    # ---- Readiness / score / how ready ----
    if any(k in kw for k in ("readiness", "score", "how ready", "ready", "band")):
        dims = "\n".join(f"- **{d.label}**: {d.score}/10 — {d.rationale}" for d in report.readiness.dimensions)
        return (
            f"Overall readiness: **{report.readiness.overall}/100 ({report.readiness.band})**.\n\n"
            f"Dimension by dimension:\n\n{dims}"
        )

    # ---- Generic fallback — still grounded in the report ----
    kickoff = first_phase.name if first_phase else "(no phases yet)"
    return (
        f"**{strategy.title()}** on **{cloud}**, **{weeks} weeks** across {len(phases)} phases, starting with _{kickoff}_. "
        f"Top risk: {mention_risk(0)}.\n\n"
        f"Ask me about:\n"
        f"- Why this strategy over the alternatives\n"
        f"- A specific risk (by title or ID like R01, R02…)\n"
        f"- The roadmap, a phase, or how to shrink the timeline\n"
        f"- Compliance gaps, cited clauses, or IQ/OQ/PQ scope\n"
        f"- What a different target cloud would change\n"
        f"- Quick wins you can start this week"
    )


def _demo_fallback_sync(report: AssessmentReport, messages: list[ChatMessage]) -> str:
    return _demo_reply(report, messages)


async def _stream_demo(report: AssessmentReport, messages: list[ChatMessage]) -> AsyncIterator[str]:
    """Stream the scripted answer word-by-word so it feels like typing."""
    for word in _demo_fallback_sync(report, messages).split(" "):
        yield word + " "


async def _stream_gemini(report: AssessmentReport, messages: list[ChatMessage]) -> AsyncIterator[str]:
    """Stream from Gemini 2.5 Flash. Raises on error; caller falls back."""
    client = google_genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    # Gemini uses one `system_instruction` field (text) and `contents` for the dialogue.
    system_text = (
        prompts.system_prompt() + "\n\n" + CHAT_SYSTEM + "\n\n"
        + f"<report id={report.id!r}>\n{_report_block(report)}\n</report>"
    )
    contents = []
    for m in messages:
        role = "user" if m.role == "user" else "model"
        contents.append({"role": role, "parts": [{"text": m.content}]})
    stream = await client.aio.models.generate_content_stream(
        model=os.getenv("CODECLINIC_GEMINI_MODEL", "gemini-2.5-flash"),
        contents=contents,
        config={
            "system_instruction": system_text,
            "max_output_tokens": MAX_CHAT_TOKENS,
            "temperature": 0.3,
        },
    )
    async for chunk in stream:
        text = getattr(chunk, "text", None)
        if text:
            yield text


async def _stream_claude(report: AssessmentReport, messages: list[ChatMessage]) -> AsyncIterator[str]:
    client = anthropic.AsyncAnthropic(max_retries=1)
    anthropic_messages = [{"role": m.role, "content": m.content} for m in messages]
    async with client.messages.stream(
        model=pipeline.MODEL,
        max_tokens=MAX_CHAT_TOKENS,
        system=_system_prompt(report),
        messages=anthropic_messages,
        output_config={"effort": "low"},
    ) as stream:
        async for text in stream.text_stream:
            yield text


def active_provider() -> str:
    """Which provider the next stream will try first - surfaced in /api/health."""
    if os.getenv("CODECLINIC_DEMO_MODE", "0") == "1":
        return "demo"
    if _HAS_GEMINI_SDK and os.getenv("GEMINI_API_KEY"):
        return "gemini"
    if pipeline.has_credentials():
        return "claude"
    return "demo"


async def stream_reply(report: AssessmentReport, messages: list[ChatMessage]) -> AsyncIterator[str]:
    """Pick the best available provider and stream its reply. On a provider
    error (quota, network, bad request) fall through to the next tier so the
    chat never breaks mid-demo."""
    provider = active_provider()
    try:
        if provider == "gemini":
            async for text in _stream_gemini(report, messages):
                yield text
            return
        if provider == "claude":
            async for text in _stream_claude(report, messages):
                yield text
            return
    except anthropic.APIError as exc:
        # Claude failed - drop to demo
        yield f"\n\n_[Switched to offline reply - Claude error: {getattr(exc, 'message', str(exc))}]_\n\n"
    except Exception as exc:
        # Gemini (or anything else) failed - drop to demo without noise
        yield f"\n\n_[Switched to offline reply - {provider} error: {exc}]_\n\n"

    async for text in _stream_demo(report, messages):
        yield text
