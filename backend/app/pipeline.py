"""The pipeline: extract/analyze -> (assess || recommend) -> compliance.

Each stage returns a Pydantic-validated structured output. The provider is
picked at request time: Gemini if GEMINI_API_KEY is set (free tier, works for
any PDF), otherwise Claude, otherwise the caller falls back to demo mode."""

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
    ComplianceAnalysis,
    ExtractionResult,
    ModernizationPlan,
    ReadinessAssessment,
)

try:
    from google import genai as google_genai
    _HAS_GEMINI_SDK = True
except Exception:
    _HAS_GEMINI_SDK = False

MODEL = os.getenv("CODECLINIC_MODEL", "claude-opus-5-5")
EFFORT = os.getenv("CODECLINIC_EFFORT", "medium")
USE_FALLBACKS = os.getenv("CODECLINIC_FALLBACKS", "1") == "1"
MAX_TOKENS = 20000  # stays under the SDK's non-streaming limit; thinking counts toward it

# Gemini pipeline chain. Lite handles our structured-output stages fine and has
# the best free-tier availability; the full flash is the fallback for complex
# reasoning if lite returns a truncated schema.
GEMINI_PIPELINE_CHAIN = [
    os.getenv("CODECLINIC_GEMINI_PIPELINE_MODEL") or "gemini-flash-lite-latest",
    "gemini-flash-latest",
    "gemini-2.5-flash",
]

CLOUD_NAMES = {"aws": "AWS", "azure": "Microsoft Azure", "gcp": "Google Cloud"}

Emit = Callable[[str, str], Awaitable[None]]


class PipelineError(Exception):
    """A failure with a message that is safe to show in the UI."""


_client: anthropic.AsyncAnthropic | None = None


def has_credentials() -> bool:
    """True when at least one live LLM provider (Gemini or Claude) is configured."""
    return bool(os.getenv("GEMINI_API_KEY") or os.getenv("ANTHROPIC_API_KEY") or os.getenv("ANTHROPIC_AUTH_TOKEN"))


def has_claude() -> bool:
    return bool(os.getenv("ANTHROPIC_API_KEY") or os.getenv("ANTHROPIC_AUTH_TOKEN"))


def has_gemini() -> bool:
    return _HAS_GEMINI_SDK and bool(os.getenv("GEMINI_API_KEY"))


def pipeline_provider() -> str:
    """Which provider the next pipeline run will use. Surfaced in /api/health."""
    if has_gemini():
        return "gemini"
    if has_claude():
        return "claude"
    return "demo"


def _get_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic(max_retries=2)
    return _client


# ---------------------------------------------------------------------------- Gemini stage runner


def _gemini_schema(schema: type) -> dict:
    """Convert a Pydantic model to a JSON schema Gemini Developer API accepts.
    Needs care: `title`/`default`/etc. are schema-level keywords, but a property
    can ALSO be *named* `title` (e.g. Opportunity.title). We only strip these
    when they're used as schema metadata, not when they're property names."""

    raw = schema.model_json_schema()
    defs = raw.get("$defs", {})
    # Schema-level keywords Gemini rejects or doesn't use.
    STRIP_KEYS = {"additionalProperties", "$defs", "examples", "title", "description", "default", "const"}

    def _resolve_schema(node):
        if isinstance(node, list):
            return [_resolve_schema(x) for x in node]
        if not isinstance(node, dict):
            return node
        # Inline $ref
        if "$ref" in node:
            ref = node["$ref"].rsplit("/", 1)[-1]
            if ref in defs:
                return _resolve_schema(defs[ref])
            return node
        out: dict = {}
        for k, v in node.items():
            if k in STRIP_KEYS:
                continue
            if k == "anyOf" and isinstance(v, list):
                # Gemini rejects nullable unions; collapse Optional[X] -> X
                non_null = [x for x in v if not (isinstance(x, dict) and x.get("type") == "null")]
                if len(non_null) == 1:
                    inlined = _resolve_schema(non_null[0])
                    for sk, sv in inlined.items():
                        out.setdefault(sk, sv)
                    continue
            if k == "format" and isinstance(v, str) and v not in ("date-time", "date", "enum"):
                continue
            if k == "properties" and isinstance(v, dict):
                # Property NAMES are preserved as-is; their value schemas are resolved.
                out["properties"] = {pname: _resolve_schema(pschema) for pname, pschema in v.items()}
                continue
            if k == "items":
                out["items"] = _resolve_schema(v)
                continue
            out[k] = _resolve_schema(v)
        return out

    cleaned = _resolve_schema(raw)
    # Gemini requires every `required` entry to appear in `properties`.
    def _prune_required(node):
        if isinstance(node, list):
            return [_prune_required(x) for x in node]
        if not isinstance(node, dict):
            return node
        if "properties" in node and isinstance(node.get("required"), list):
            prop_names = set(node["properties"].keys())
            node["required"] = [r for r in node["required"] if r in prop_names]
        for k, v in node.items():
            node[k] = _prune_required(v)
        return node

    return _prune_required(cleaned)


async def _run_stage_gemini(name: str, instructions: str, payload: dict, schema: type, *, document: bytes | None = None, document_name: str | None = None):
    """Structured-output call via Gemini. Rotates through the model chain on
    503/UNAVAILABLE so one throttled model doesn't drop us to demo mode."""
    client = google_genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    system_text = prompts.system_prompt() + "\n\n" + instructions
    parts: list = []
    if document is not None:
        parts.append({"inline_data": {"mime_type": "application/pdf", "data": base64.b64encode(document).decode("ascii")}})
    parts.append({"text": f"<input>\n{json.dumps(payload, indent=1)}\n</input>"})
    contents = [{"role": "user", "parts": parts}]
    response_schema = _gemini_schema(schema)

    last_err: Exception | None = None
    for model in GEMINI_PIPELINE_CHAIN:
        try:
            response = await client.aio.models.generate_content(
                model=model,
                contents=contents,
                config={
                    "system_instruction": system_text,
                    "response_mime_type": "application/json",
                    "response_schema": response_schema,
                    "max_output_tokens": MAX_TOKENS,
                    "temperature": 0.2,
                },
            )
            raw = (getattr(response, "text", None) or "").strip()
            if not raw:
                last_err = PipelineError(f"{model} returned no content for {name}")
                continue
            try:
                return schema.model_validate_json(raw)
            except Exception as exc:
                last_err = PipelineError(f"{model} returned schema-invalid JSON for {name}: {str(exc)[:150]}")
                continue
        except Exception as exc:
            last_err = exc
            continue

    msg = str(last_err) if last_err else "no response"
    raise PipelineError(f"Gemini pipeline failed for {name}: {msg[:200]}")


# ---------------------------------------------------------------------------- Claude stage runner


async def _run_stage_claude(name: str, instructions: str, payload: dict, schema: type, *, document: bytes | None = None, document_name: str | None = None):
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


# ---------------------------------------------------------------------------- dispatcher


async def _run_stage(name: str, instructions: str, payload: dict, schema: type, *, document: bytes | None = None, document_name: str | None = None):
    """Pick a provider at request time: Gemini first (free tier, our default now),
    Claude fallback. Each raises PipelineError on failure for the caller to catch."""
    if has_gemini():
        try:
            return await _run_stage_gemini(name, instructions, payload, schema, document=document, document_name=document_name)
        except PipelineError:
            if has_claude():
                return await _run_stage_claude(name, instructions, payload, schema, document=document, document_name=document_name)
            raise
    if has_claude():
        return await _run_stage_claude(name, instructions, payload, schema, document=document, document_name=document_name)
    raise PipelineError("No live LLM provider configured - set GEMINI_API_KEY or ANTHROPIC_API_KEY in backend/.env")


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
        compliance=None,
    )
    if request.extraction is not None:
        report.source_document = request.extraction.document_title
        report.extraction_confidence = request.extraction.profile.confidence
    await emit("assemble", "done")

    # Stage 4 (optional): compliance gap analysis for GxP / regulated apps.
    if _needs_compliance(report):
        try:
            await emit("compliance", "started")
            compliance = await _run_stage(
                "compliance", prompts.COMPLIANCE, {"report": report.model_dump(mode="json")}, ComplianceAnalysis,
            )
            report.compliance = compliance
            await emit("compliance", "done")
        except PipelineError:
            # Non-fatal: the report is already complete without the compliance tab.
            await emit("compliance", "done")

    return report


def _needs_compliance(report: AssessmentReport) -> bool:
    return report.profile.gxp_relevant or report.summary.gxp_critical or any(r.gxp_related for r in report.risks)
