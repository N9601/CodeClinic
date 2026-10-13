"""Loads knowledge/*.yaml into one text block for the system prompt.

The knowledge base is small enough to sit in context (no vector DB), and it is
identical across requests, so it is prompt-cached."""

from functools import lru_cache
from pathlib import Path

KNOWLEDGE_DIR = Path(__file__).resolve().parents[1] / "knowledge"


@lru_cache(maxsize=1)
def knowledge_text() -> str:
    sections = []
    for path in sorted(KNOWLEDGE_DIR.glob("*.yaml")):
        sections.append(f'<knowledge file="{path.name}">\n{path.read_text(encoding="utf-8").strip()}\n</knowledge>')
    return "\n\n".join(sections)
