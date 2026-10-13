"""CodeClinic API.

    uvicorn app.main:app --reload --port 8000      (run from backend/)

Modes: "live" runs the Claude pipeline; "cached" serves a pre-built sample
report (demo mode). With mode="auto" we go live when an API key is configured
and fall back to the cached sample if the live run fails, so the demo can't die.
"""

import asyncio
import json
import os
import uuid
from pathlib import Path

from dotenv import load_dotenv

BACKEND = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND / ".env")

from fastapi import FastAPI, File, HTTPException, UploadFile  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.responses import PlainTextResponse, StreamingResponse  # noqa: E402

from . import pipeline, render  # noqa: E402
from .scanner import scan_zip  # noqa: E402
from .schemas import AppProfile, AssessmentReport, AssessRequest, ScanResult  # noqa: E402

SAMPLES = BACKEND / "samples"
REPORTS_DIR = BACKEND / "data" / "reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)
DEMO_MODE = os.getenv("CODECLINIC_DEMO_MODE", "0") == "1"
MAX_UPLOAD_BYTES = 25 * 1024 * 1024
CACHED_STAGE_DELAY = 0.7  # seconds per stage when replaying a cached report

STAGE_LABELS = {
    "scan": "Scanning artifacts",
    "analyze": "Analyzing architecture",
    "assess": "Assessing readiness & risks",
    "recommend": "Designing target architecture & roadmap",
    "assemble": "Compiling report",
}

app = FastAPI(title="CodeClinic API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------------------------------- data


def _load_samples() -> dict[str, dict]:
    samples = {}
    for path in sorted((SAMPLES / "profiles").glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        samples[data["id"]] = data
    return samples


SAMPLE_DATA = _load_samples()


def _cached_report(sample_id: str | None) -> AssessmentReport | None:
    if not sample_id:
        return None
    path = SAMPLES / "reports" / f"{sample_id}.json"
    if not path.exists():
        return None
    return AssessmentReport.model_validate_json(path.read_text(encoding="utf-8"))


def _save(report: AssessmentReport) -> None:
    (REPORTS_DIR / f"{report.id}.json").write_text(report.model_dump_json(indent=2), encoding="utf-8")


def _load_report(report_id: str) -> AssessmentReport:
    path = REPORTS_DIR / f"{report_id}.json"
    if path.exists():
        return AssessmentReport.model_validate_json(path.read_text(encoding="utf-8"))
    if report_id.startswith("sample-") and (cached := _cached_report(report_id.removeprefix("sample-"))):
        return cached
    raise HTTPException(404, f"Report {report_id} not found")


# --------------------------------------------------------------------------- core


async def _noop_emit(stage: str, status: str) -> None:
    return None


async def _serve_cached(request: AssessRequest, cached: AssessmentReport, emit) -> AssessmentReport:
    for stage in ("analyze", "assess", "recommend", "assemble"):
        await emit(stage, "started")
        await asyncio.sleep(CACHED_STAGE_DELAY)
        await emit(stage, "done")
    report = cached.model_copy(deep=True)
    report.id = uuid.uuid4().hex[:12]
    report.mode = "cached"
    if request.signals:
        report.signals = request.signals
    return report


async def produce_report(request: AssessRequest, emit=_noop_emit) -> AssessmentReport:
    if request.signals:
        await emit("scan", "started")
        await emit("scan", "done")

    cached = _cached_report(request.sample_id)
    want_cached = request.mode == "cached" or DEMO_MODE or (request.mode == "auto" and not pipeline.has_credentials())

    if want_cached:
        if cached:
            report = await _serve_cached(request, cached, emit)
        elif pipeline.has_credentials() and request.mode != "cached":
            report = await pipeline.run(request, emit)
        else:
            raise pipeline.PipelineError(
                "No cached report for this application and no ANTHROPIC_API_KEY configured - "
                "pick a sample with a cached report or add a key to backend/.env for live analysis"
            )
    elif not pipeline.has_credentials():
        raise pipeline.PipelineError("Live mode needs ANTHROPIC_API_KEY in backend/.env")
    else:
        try:
            report = await pipeline.run(request, emit)
        except pipeline.PipelineError:
            if request.mode == "auto" and cached:
                report = await _serve_cached(request, cached, emit)
            else:
                raise

    _save(report)
    return report


# --------------------------------------------------------------------------- routes


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "live": pipeline.has_credentials() and not DEMO_MODE, "demo_mode": DEMO_MODE, "model": pipeline.MODEL}


@app.get("/api/samples")
def list_samples() -> list[dict]:
    return [
        {
            "id": sid,
            "name": data["profile"]["name"],
            "tagline": data["tagline"],
            "gxp_relevant": data["profile"].get("gxp_relevant", False),
            "has_cached_report": (SAMPLES / "reports" / f"{sid}.json").exists(),
        }
        for sid, data in SAMPLE_DATA.items()
    ]


@app.get("/api/samples/{sample_id}")
def get_sample(sample_id: str) -> dict:
    data = SAMPLE_DATA.get(sample_id)
    if not data:
        raise HTTPException(404, f"Sample {sample_id} not found")
    return {
        "id": sample_id,
        "tagline": data["tagline"],
        "profile": AppProfile(**data["profile"]).model_dump(),
        "has_cached_report": (SAMPLES / "reports" / f"{sample_id}.json").exists(),
    }


@app.post("/api/scan")
async def scan(file: UploadFile = File(...)) -> ScanResult:
    data = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "Upload is larger than 25 MB")
    try:
        return scan_zip(data)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.post("/api/assess")
async def assess(request: AssessRequest) -> AssessmentReport:
    try:
        return await produce_report(request)
    except pipeline.PipelineError as exc:
        raise HTTPException(502, str(exc)) from exc


def _sse(event: str, data) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


@app.post("/api/assess/stream")
async def assess_stream(request: AssessRequest) -> StreamingResponse:
    queue: asyncio.Queue = asyncio.Queue()

    async def emit(stage: str, status: str) -> None:
        await queue.put(("stage", {"stage": stage, "status": status, "label": STAGE_LABELS[stage]}))

    async def worker() -> None:
        try:
            report = await produce_report(request, emit)
            await queue.put(("report", report.model_dump(mode="json")))
        except pipeline.PipelineError as exc:
            await queue.put(("error", {"message": str(exc)}))
        except Exception as exc:  # last-resort guard so the stream always terminates
            await queue.put(("error", {"message": f"Unexpected error: {exc}"}))
        finally:
            await queue.put(None)

    async def events():
        task = asyncio.create_task(worker())
        try:
            while True:
                try:
                    item = await asyncio.wait_for(queue.get(), timeout=15)
                except asyncio.TimeoutError:
                    yield ": keep-alive\n\n"
                    continue
                if item is None:
                    break
                yield _sse(*item)
        finally:
            task.cancel()

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/api/reports/{report_id}")
def get_report(report_id: str) -> AssessmentReport:
    return _load_report(report_id)


@app.get("/api/reports/{report_id}/markdown")
def get_report_markdown(report_id: str) -> PlainTextResponse:
    report = _load_report(report_id)
    slug = "".join(ch if ch.isalnum() else "-" for ch in report.profile.name.lower()).strip("-")
    return PlainTextResponse(
        render.report_to_markdown(report),
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="codeclinic-{slug}.md"'},
    )
