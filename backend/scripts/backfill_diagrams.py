"""Rewrite diagrams in every saved report with the current renderer.

The Mermaid edge-label sanitiser was tightened; already-saved reports have the
old broken strings baked into report.diagrams.{current,target,roadmap}. This
walks data/reports/ (and samples/reports/) and rewrites those three fields in
place using the components/edges/phases that are already in the report.

    python scripts/backfill_diagrams.py
"""

import json
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from app import render  # noqa: E402
from app.schemas import AssessmentReport  # noqa: E402

TARGETS = [BACKEND / "data" / "reports", BACKEND / "samples" / "reports"]


def rewrite(path: Path) -> bool:
    try:
        report = AssessmentReport.model_validate_json(path.read_text(encoding="utf-8"))
    except Exception as exc:
        print(f"skip {path.name}: {exc}")
        return False
    report.diagrams.current = render.current_state_diagram(report.architecture.components, report.architecture.edges)
    report.diagrams.target = render.target_state_diagram(report.plan.target_components, report.plan.target_edges)
    report.diagrams.roadmap = render.roadmap_gantt(report.plan.roadmap)
    path.write_text(report.model_dump_json(indent=2), encoding="utf-8")
    return True


def main() -> None:
    total = fixed = 0
    for folder in TARGETS:
        if not folder.exists():
            continue
        for path in sorted(folder.glob("*.json")):
            total += 1
            if rewrite(path):
                fixed += 1
    print(f"Rewrote {fixed}/{total} reports")


if __name__ == "__main__":
    main()
