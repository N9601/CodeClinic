# CodeClinic frontend

React + Vite + TypeScript + Tailwind v4. Single page: **Intake → Running → Report**.

## Run

```bash
npm install
npm run dev        # http://localhost:5173  (proxies /api -> http://127.0.0.1:8000)
npm run build      # type-check + production build into dist/
```

Start the backend on port 8000 for live/cached reports. Without it the app runs in a
clearly labelled **offline demo mode**: the sample list and profiles come from
`src/mock/`, and running the LabTrack LIMS sample replays the bundled report.

- `http://localhost:5173/?demo` opens the bundled LabTrack report directly (presenter safety net).
- Print / PDF renders all six report sections stacked, then opens the browser print dialog.

## Layout

- `src/types.ts` - mirrors `backend/app/schemas.py`
- `src/api.ts` - API client, including the POST-based SSE parser for `/api/assess/stream`
- `src/lib/runAssessment.ts` - stream → `POST /api/assess` → bundled mock fallback chain
- `src/screens/` - `Intake`, `Running`, `Report` and the six report tabs in `report/`
- `src/components/` - Mermaid renderer, radar, gauge, risk heat map, shared UI
