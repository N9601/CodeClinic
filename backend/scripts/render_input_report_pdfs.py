"""Render every samples/input-reports/*.md as a styled PDF via headless Chrome.

    python scripts/render_input_report_pdfs.py

Outputs <name>.pdf next to each source Markdown. We render to PDF to show the
feasibility of the ingest-a-document flow with a document that looks like a real
internal assessment artefact.
"""

import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import markdown

BACKEND = Path(__file__).resolve().parents[1]
INPUT_DIR = BACKEND / "samples" / "input-reports"

CHROME_CANDIDATES = [
    os.environ.get("CHROME_BIN"),
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    shutil.which("chrome"),
    shutil.which("msedge"),
    shutil.which("chromium"),
]

CSS = """
  @page { size: A4; margin: 18mm 16mm 20mm 16mm; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; color: #1f2937;
         font-size: 10.5pt; line-height: 1.5; }
  .cover { padding: 6mm 0 10mm; border-bottom: 2px solid #0f766e; margin-bottom: 10mm; }
  .cover .brand { font-size: 9pt; color: #0f766e; letter-spacing: 0.18em;
                  text-transform: uppercase; font-weight: 600; }
  h1 { color: #0f172a; font-size: 20pt; font-weight: 700; margin: 2mm 0 2mm; line-height: 1.25; }
  h2 { color: #0f766e; font-size: 13pt; margin: 10mm 0 2mm; border-bottom: 1px solid #cbd5e1;
       padding-bottom: 2mm; page-break-after: avoid; }
  h3 { color: #0f172a; font-size: 11.5pt; margin: 6mm 0 2mm; page-break-after: avoid; }
  p { margin: 0 0 3mm; }
  ul, ol { margin: 0 0 3mm 6mm; padding: 0; }
  li { margin: 0 0 1mm; }
  strong { color: #0f172a; }
  code { font-family: 'Consolas', 'Courier New', monospace; font-size: 9.5pt;
         background: #f1f5f9; padding: 0 2px; border-radius: 2px; }
  table { width: 100%; border-collapse: collapse; margin: 2mm 0 5mm;
          font-size: 9.5pt; page-break-inside: avoid; }
  th, td { border: 1px solid #cbd5e1; padding: 2mm 3mm; text-align: left; vertical-align: top; }
  th { background: #f1f5f9; color: #0f172a; font-weight: 600; }
  hr { border: 0; border-top: 1px solid #e2e8f0; margin: 8mm 0; }
  blockquote { border-left: 3px solid #0f766e; margin: 2mm 0; padding: 1mm 4mm;
               background: #f0fdfa; color: #134e4a; }
  table + table { page-break-before: auto; }
  h2, h3 { break-after: avoid; }
"""


def _find_chrome() -> str:
    for cand in CHROME_CANDIDATES:
        if cand and Path(cand).exists():
            return cand
    sys.exit("No Chrome/Edge/Chromium found. Set CHROME_BIN to the executable path.")


def _html(title: str, body_md: str) -> str:
    html_body = markdown.markdown(body_md, extensions=["extra", "tables", "sane_lists"])
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>{title}</title>
<style>{CSS}</style>
</head>
<body>
<div class="cover">
  <div class="brand">Vernova Pharmaceuticals Ltd. — Enterprise Architecture</div>
</div>
{html_body}
</body>
</html>
"""


def render(source: Path, chrome: str) -> Path:
    text = source.read_text(encoding="utf-8")
    title = next((line.lstrip("# ").strip() for line in text.splitlines() if line.startswith("# ")), source.stem)
    out_pdf = source.with_suffix(".pdf")
    with tempfile.TemporaryDirectory() as tmp:
        html_path = Path(tmp) / f"{source.stem}.html"
        html_path.write_text(_html(title, text), encoding="utf-8")
        profile = Path(tmp) / "profile"
        subprocess.run(
            [chrome, "--headless=new", "--disable-gpu", "--no-sandbox",
             f"--user-data-dir={profile}", "--no-pdf-header-footer",
             f"--print-to-pdf={out_pdf}", html_path.as_uri()],
            check=True, capture_output=True, timeout=120,
        )
    return out_pdf


def main() -> None:
    sources = sorted(INPUT_DIR.glob("*.md"))
    if not sources:
        sys.exit(f"No Markdown files in {INPUT_DIR}")
    chrome = _find_chrome()
    for source in sources:
        pdf = render(source, chrome)
        print(f"{source.name} -> {pdf.name} ({pdf.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
