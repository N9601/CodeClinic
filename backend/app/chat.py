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
    """Scripted fallback when no API key is configured. Keeps the demo path alive."""
    last = messages[-1].content if messages else ""
    low = last.lower()
    strategy = report.plan.overall_strategy
    top_risk = report.summary.top_risks[0] if report.summary.top_risks else "(no risks)"

    if any(k in low for k in ("why", "strategy", "replatform", "refactor", "repurchase")):
        return (
            f"The report picks **{strategy.title()}** because:\n\n"
            f"- Readiness is **{report.readiness.overall}/100** ({report.readiness.band}); the weakest dimensions "
            f"are {', '.join(d.label for d in sorted(report.readiness.dimensions, key=lambda x: x.score)[:3])}.\n"
            f"- The dominant tech-debt drivers would need re-work under any heavier refactor and the GxP validation scope would balloon.\n"
            f"- {len(report.plan.component_strategies)} components are already mapped to concrete services on {report.target_cloud.upper()}.\n\n"
            f"_(Demo mode reply - configure ANTHROPIC_API_KEY for live, grounded answers.)_"
        )
    if any(k in low for k in ("risk", "biggest", "worst")):
        risks = report.risks[:3]
        bullets = "\n".join(f"- **{r.id} · {r.title}** · {r.level} ({r.likelihood}×{r.impact}) — {r.mitigation}" for r in risks)
        return f"The top three risks in this report:\n\n{bullets}\n\n_(Demo mode reply.)_"
    if any(k in low for k in ("compliance", "gxp", "part 11", "annex 11", "gamp", "clause", "iq", "oq", "pq")):
        if not report.compliance:
            return "This application is not flagged as GxP in the current report, so no compliance analysis was produced. If that is wrong, mark it GxP-relevant and re-run.\n\n_(Demo mode reply.)_"
        g = report.compliance.gaps[0]
        return (
            f"The most critical compliance gap is **{g.title}** ({g.severity}).\n\n"
            f"Cited clauses: {', '.join(g.clauses)}.\n\n"
            f"Mitigation: {g.mitigation}\n\nValidation activity: _{g.validation_activity}_.\n\n_(Demo mode reply.)_"
        )
    if any(k in low for k in ("cost", "money", "budget", "cheaper", "expensive")):
        return (
            "The current report doesn't quote dollar figures. Rough shape: a Replatform at this scale typically runs 60–90% of a Refactor, with annual run cost dropping once managed services replace on-prem hosting. Add a cost model as a follow-on module for firm numbers.\n\n_(Demo mode reply.)_"
        )
    return (
        f"The plan is **{strategy.title()}** over **{report.summary.total_weeks} weeks** across {len(report.plan.roadmap)} phases, "
        f"with top risk **{top_risk}**. Ask me about the strategy choice, specific risks, the roadmap, or compliance.\n\n_(Demo mode reply.)_"
    )


async def stream_reply(report: AssessmentReport, messages: list[ChatMessage]) -> AsyncIterator[str]:
    """Yield text deltas from Claude. In demo mode, yields a scripted answer in chunks."""
    if not pipeline.has_credentials() or os.getenv("CODECLINIC_DEMO_MODE", "0") == "1":
        for word in _demo_reply(report, messages).split(" "):
            yield word + " "
        return

    client = anthropic.AsyncAnthropic(max_retries=1)
    anthropic_messages = [{"role": m.role, "content": m.content} for m in messages]
    try:
        async with client.messages.stream(
            model=pipeline.MODEL,
            max_tokens=MAX_CHAT_TOKENS,
            system=_system_prompt(report),
            messages=anthropic_messages,
            output_config={"effort": "low"},  # chat should feel fast
        ) as stream:
            async for text in stream.text_stream:
                yield text
    except anthropic.APIError as exc:
        yield f"\n\n_[Chat error: {getattr(exc, 'message', str(exc))}]_"
