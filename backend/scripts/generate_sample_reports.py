"""Run the live Claude pipeline for each sample app and save the result as its
cached demo-mode report. Needs ANTHROPIC_API_KEY in backend/.env.

    python scripts/generate_sample_reports.py                 # samples without a cached report
    python scripts/generate_sample_reports.py --all           # regenerate every sample
    python scripts/generate_sample_reports.py repconnect      # one sample

Samples with a demo repo in samples/demo-repos/<id>.zip are scanned first, so
their reports include scanner evidence.
"""

import asyncio
import json
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))
load_dotenv(BACKEND / ".env")

from app import pipeline  # noqa: E402
from app.scanner import scan_zip  # noqa: E402
from app.schemas import AppProfile, AssessRequest  # noqa: E402

SAMPLES = BACKEND / "samples"
DEFAULT_CLOUD = {"labtrack-lims": "azure", "trialhub-ctms": "aws", "repconnect": "aws"}


async def generate(sample_id: str) -> None:
    sample = json.loads((SAMPLES / "profiles" / f"{sample_id}.json").read_text(encoding="utf-8"))
    demo_zip = SAMPLES / "demo-repos" / f"{sample_id}.zip"
    signals = scan_zip(demo_zip.read_bytes()).signals if demo_zip.exists() else []
    request = AssessRequest(
        profile=AppProfile(**sample["profile"]),
        sample_id=sample_id,
        signals=signals,
        target_cloud=DEFAULT_CLOUD.get(sample_id, "azure"),
        mode="live",
    )
    started = time.monotonic()

    async def emit(stage: str, status: str) -> None:
        print(f"  [{time.monotonic() - started:5.1f}s] {sample_id}: {stage} {status}")

    report = await pipeline.run(request, emit)
    report.id = f"sample-{sample_id}"
    out = SAMPLES / "reports" / f"{sample_id}.json"
    out.write_text(report.model_dump_json(indent=2), encoding="utf-8")
    print(f"{sample_id}: {report.readiness.overall}/100, {report.plan.overall_strategy}, {report.summary.total_weeks} weeks -> {out.relative_to(BACKEND)}")


async def main(args: list[str]) -> None:
    if not pipeline.has_credentials():
        sys.exit("Set ANTHROPIC_API_KEY in backend/.env first")
    all_ids = sorted(p.stem for p in (SAMPLES / "profiles").glob("*.json"))
    if "--all" in args:
        ids = all_ids
    elif args:
        ids = args
    else:
        ids = [i for i in all_ids if not (SAMPLES / "reports" / f"{i}.json").exists()]
    if not ids:
        print("Every sample already has a cached report (use --all to regenerate)")
        return
    await asyncio.gather(*(generate(i) for i in ids))


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1:]))
