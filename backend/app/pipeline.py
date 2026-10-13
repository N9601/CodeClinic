"""The live Claude pipeline: analyze -> (assess || recommend) -> assemble.

Each stage is one structured-output call (client.messages.parse with a Pydantic
model), so responses are always schema-valid JSON. Assess and recommend only
depend on the analysis, so they run in parallel: two model round-trips total."""

import asyncio
import base64
import json
import os
from collections.abc import Awaitable, Callable

import anthropic

from . import prompts
from .report import assemble
from .schemas import (
    ArchitectureAnalysis,
    AssessmentReport,
    AssessRequest,
    ExtractionResult,
    ModernizationPlan,
    ReadinessAssessment,
)

MODEL = os.getenv("CODECLINIC_MODEL", "claude-opus-5-5")
EFFORT = os.getenv("CODECLINIC_EFFORT", "medium")
USE_FALLBACKS = os.getenv("CODECLINIC_FALLBACKS", "1") == "1"
MAX_TOKENS = 20000  # stays under the SDK's non-streaming limit; thinking counts toward it

CLOUD_NAMES = {"aws": "AWS", "azure": "Microsoft Azure", "gcp": "Google Cloud"}

Emit = Callable[[str, str], Awaitable[None]]


class PipelineError(Exception):
    """A failure with a message that is safe to show in the UI."""


_client: anthropic.AsyncAnthropic | None = None


def has_credentials() -> bool:
    return bool(os.getenv("ANTHROPIC_API_KEY") or os.getenv("ANTHROPIC_AUTH_TOKEN"))


def _get_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic(max_retries=2)
    return _client


async def _run_stage(name: str, instructions: str, payload: dict, schema: type, *, document: bytes | None = None, document_name: str | None = None):
    # Server-side fallback re-runs a declined request on another model inside the same call.
    extra = (
        {"extra_headers": {"anthropic-beta": "server-side-fallback-2026-07-01"}, "extra_body": {"fallbacks": "default"}}
        if USE_FALLBACKS
        else {}
    )
    content: list[dict] = []
    if document is not None:
        content.append({
            "type": "document",
            "source": {"type": "base64", "media_type": "application/pdf", "data": base64.b64encode(document).decode("ascii")},
            "title": document_name or "assessment.pdf",
        })
    content.append({"type": "text", "text": f"{instructions}\n\n<input>\n{json.dumps(payload, indent=1)}\n</input>"})
    try:
        response = await _get_client().messages.parse(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            system=[{"type": "text", "text": prompts.system_prompt(), "cache_control": {"type": "ephemeral"}}],
            messages=[{"role": "user", "content": content}],
            output_format=schema,
            output_config={"effort": EFFORT},
            **extra,
        )
    except anthropic.AuthenticationError as exc:
        raise PipelineError("Claude API rejected the API key - check ANTHROPIC_API_KEY in backend/.env") from exc
    except anthropic.RateLimitError as exc:
        raise PipelineError("Claude API rate limit hit - wait a few seconds and retry") from exc
    except anthropic.BadRequestError as exc:
        raise PipelineError(f"Claude API rejected the {name} request: {exc.message}") from exc
    except anthropic.APIStatusError as exc:
        raise PipelineError(f"Claude API error during {name} ({exc.status_code}) - retry shortly") from exc
    except anthropic.APIConnectionError as exc:
        raise PipelineError("Cannot reach the Claude API - check the network connection") from exc

    if response.stop_reason == "refusal":
        raise PipelineError(f"Claude declined the {name} stage for this input")
    if response.stop_reason == "max_tokens":
        raise PipelineError(f"The {name} stage ran out of output tokens - try a shorter profile")
    if response.parsed_output is None:
        raise PipelineError(f"The {name} stage returned no structured output")
    return response.parsed_output


async def extract(document: bytes, document_name: str, emit: Emit) -> ExtractionResult:
    """Stage 0: read the uploaded assessment PDF and return the extracted profile + first-pass analysis."""
    await emit("extract", "started")
    payload = {"document_filename": document_name}
    result: ExtractionResult = await _run_stage(
        "extract", prompts.EXTRACT, payload, ExtractionResult, document=document, document_name=document_name,
    )
    await emit("extract", "done")
    return result


async def run(request: AssessRequest, emit: Emit) -> AssessmentReport:
    base = {
        "application_profile": request.profile.model_dump(),
        "scanner_signals": [s.model_dump() for s in request.signals],
    }

    if request.extraction is not None:
        # Document was ingested upstream - skip the analyze stage, use its analysis.
        analysis = request.extraction.analysis
        base["extracted_from_document"] = request.extraction.document_title
    else:
        await emit("analyze", "started")
        analysis = await _run_stage("analyze", prompts.ANALYZE, base, ArchitectureAnalysis)
        await emit("analyze", "done")

    with_analysis = base | {"architecture_analysis": analysis.model_dump()}

    async def assess() -> ReadinessAssessment:
        await emit("assess", "started")
        result = await _run_stage("assess", prompts.ASSESS, with_analysis, ReadinessAssessment)
        await emit("assess", "done")
        return result

    async def recommend() -> ModernizationPlan:
        await emit("recommend", "started")
        instructions = prompts.RECOMMEND.format(cloud=CLOUD_NAMES[request.target_cloud])
        result = await _run_stage("recommend", instructions, with_analysis, ModernizationPlan)
        await emit("recommend", "done")
        return result

    assessment, plan = await asyncio.gather(assess(), recommend())

    await emit("assemble", "started")
    report = assemble(
        profile=request.profile,
        target_cloud=request.target_cloud,
        signals=request.signals,
        analysis=analysis,
        assessment=assessment,
        plan=plan,
        mode="live",
        model=MODEL,
    )
    await emit("assemble", "done")
    return report
