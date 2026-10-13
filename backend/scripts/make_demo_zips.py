"""Zip each folder in samples/demo-repos/ into samples/demo-repos/<name>.zip
for the upload demo, then print what the scanner finds in it.

    python scripts/make_demo_zips.py
"""

import sys
import zipfile
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from app.scanner import scan_zip  # noqa: E402

REPOS = BACKEND / "samples" / "demo-repos"


def main() -> None:
    for repo in sorted(p for p in REPOS.iterdir() if p.is_dir()):
        out = REPOS / f"{repo.name}.zip"
        with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as archive:
            for file in sorted(repo.rglob("*")):
                if file.is_file():
                    archive.write(file, f"{repo.name}/{file.relative_to(repo).as_posix()}")
        result = scan_zip(out.read_bytes())
        print(f"{out.name}: {result.files_scanned} files, {len(result.signals)} signals, languages={result.languages}")
        for s in result.signals:
            print(f"  {s.severity:8} {s.name:34} {s.file}")


if __name__ == "__main__":
    main()
