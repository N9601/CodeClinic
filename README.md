# CodeClinic 🩺

**Diagnose legacy pharma apps. Prescribe a compliant cloud migration plan.**

CodeClinic is an AI-powered application modernization advisor for pharma IT. Describe a legacy application (or pick a sample, or upload its source as a `.zip`) and get, in about a minute, a modernization report that knows about GxP, 21 CFR Part 11 and validated state.

| # | Objective | What CodeClinic produces |
|---|---|---|
| 1 | Analyze existing architecture | Current-state component diagram, tech inventory with end-of-support flags, tech-debt list, regulated-data summary |
| 2 | Evaluate cloud readiness | 0–100 score across 7 weighted dimensions, each with rationale and evidence |
| 3 | Identify risks & opportunities | 5×5 risk heat map, risk register with GxP flags and mitigations, opportunities |
| 4 | Recommend target architecture | 7R strategy per component, architecture patterns, target-state diagram on AWS / Azure / GCP |
| 5 | Generate migration roadmap | Phased Gantt with IQ/OQ/PQ validation gates, quick wins, Markdown/PDF export |

## How it works

```
React UI ──POST /api/assess/stream (SSE)──▶ FastAPI
                                             ├─ scanner.py   zip → evidence signals (versions, hard-coded creds/IPs/paths, session state, CI/tests…)
                                             ├─ pipeline.py  Claude (claude-opus-5-5) with structured outputs
                                             │    ① analyze ──▶ ② assess (readiness, risks)        ┐ parallel
                                             │               ③ recommend (7R, target, roadmap)  ┘
                                             ├─ scoring.py   deterministic weights, bands, risk = likelihood × impact
                                             ├─ render.py    JSON → Mermaid diagrams + Gantt + Markdown
                                             └─ knowledge/   7Rs, patterns, GxP regulations, EOL dates, cloud service map (prompt-cached)
```

Design choices that keep the demo reliable:
- **Structured outputs** (`client.messages.parse` + Pydantic) — Claude's output always matches the schema.
- **Claude never writes diagram syntax** — it returns nodes/edges/phases and `render.py` draws them.
- **Scores are computed in code** from Claude's per-dimension ratings — consistent and explainable.
- **Demo mode** — sample apps have cached reports; with no API key (or if a live call fails) the cached report is served.

## Quick start

**Backend** (Python 3.10+):

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env        # then put your ANTHROPIC_API_KEY in .env (optional - demo mode works without it)
python -m uvicorn app.main:app --reload --port 8000
```

**Frontend** (Node 20+):

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The header pill shows **Live · Claude** when a key is configured, otherwise **Demo mode**.

### Modes
- **Live** — `ANTHROPIC_API_KEY` set: every assessment runs the Claude pipeline (~1 minute at `CODECLINIC_EFFORT=medium`).
- **Demo** — no key, or `CODECLINIC_DEMO_MODE=1`: sample apps with a cached report replay it with stage-by-stage progress.
- **Auto fallback** — if a live run fails and the sample has a cached report, the cached report is served.

### Pre-generating demo reports
LabTrack LIMS ships with a hand-built cached report. Once you have a key, cache the other samples so the whole demo works offline:

```bash
cd backend
python scripts/generate_sample_reports.py
```

Other scripts: `scripts/build_cached_reports.py` (rebuild reports from `samples/fixtures/`), `scripts/make_demo_zips.py` (rebuild the upload-demo zips and print what the scanner finds).

## Demo script (3 minutes)
1. **Problem (20 s)** — assessing one legacy pharma app takes weeks of consultant time, and migration must not break the validated state.
2. **Live run (30 s)** — pick **LabTrack LIMS**, upload `backend/samples/demo-repos/labtrack-lims.zip`, choose Azure, **Run diagnosis**.
3. **Five tabs = five objectives (90 s)** — linger on the GxP risk "Loss of validated state" and the roadmap's IQ/OQ/PQ gates.
4. **Evidence (25 s)** — scanner findings: hard-coded credential in `web.config`, in-process session state, UNC share paths, no CI/tests.
5. **Export (15 s)** — Download Markdown / Print to PDF; close on the expected outcomes.

## Repository layout
```
backend/
  app/            main.py (API) · pipeline.py · prompts.py · schemas.py (the contract) · scanner.py · scoring.py · render.py · report.py · knowledge.py
  knowledge/      YAML knowledge base injected into the system prompt
  samples/        profiles/ · fixtures/ · reports/ (cached) · demo-repos/ (upload demo)
  scripts/        cached-report and demo-zip builders
frontend/         React + Vite + TypeScript + Tailwind, Recharts, Mermaid
```

## Team split
| Role | Owns |
|---|---|
| AI lead | `prompts.py`, `pipeline.py`, `schemas.py`, output quality across samples |
| Backend | `main.py`, `scanner.py`, `scoring.py`, `render.py`, demo mode |
| Frontend | `frontend/` — intake, progress, report dashboard |
| Domain & pitch | `knowledge/*.yaml`, sample profiles, demo repos, slides, demo script |
