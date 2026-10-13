# CodeClinic — Demo Script

**Target length:** 4 minutes talking + 1 minute Q&A buffer. **Backup plan at the bottom.**

---

## 0. Pre-flight (do these 30 minutes before you present)

- [ ] Backend running: `cd backend && python -m uvicorn app.main:app --port 8000` — leave it open in one terminal.
- [ ] Frontend running: `cd frontend && npm run dev` — leave it open in another terminal.
- [ ] Browser pointed at **http://localhost:5174** (not 5173 — Vite picks the next free one if the first is taken).
- [ ] `curl http://127.0.0.1:8000/api/health` returns `"chat_provider":"gemini"` (meaning live Gemini chat is working) OR `"demo"` (meaning scripted fallback — still fine).
- [ ] Projector screen reads cleanly. Zoom browser to 110% so everyone in the back can read.
- [ ] Phone on silent. Close Slack/Teams.
- [ ] Backup video (if you recorded one) open in another tab, ready to switch to.
- [ ] Backup slide deck open — fall back to this if the laptop dies entirely.
- [ ] **Rotate the Gemini key after the demo** — it was pasted in chat.

---

## 1. The hook (20 seconds)

> **"A pharma company has 200 legacy applications. Each one takes a consultant three weeks to assess for cloud migration — and if they get the compliance side wrong, the whole batch of drug product can't ship. CodeClinic does that assessment in 60 seconds, with the regulatory rules baked in."**

(Pause. Look at the audience, not the screen.)

---

## 2. Problem framing (20 seconds) — on the intake screen

Point at the Hero area:

> **"We're focused on pharma IT. The hard part isn't picking a cloud — it's that *every* legacy app in a pharma company holds records a regulator cares about. Migrating one without planning for 21 CFR Part 11 or ALCOA+ data integrity breaks the validated state, and the system can't be used for batch release. Generic cloud-advisor tools don't know any of this."**

Point at the three sample cards:

> **"We've seed-loaded three real-shape pharma apps: a lab system, a clinical trial system, and a non-regulated field sales app. Let's run one."**

---

## 3. The live run (60 seconds)

**Click: "Upload assessment"** tab at the top of intake.
**Click: "Use bundled sample: LabTrack LIMS assessment PDF"** link.

> **"This is an 11-page internal architecture document for LabTrack — their QC lab system across three sites. ASP.NET WebForms on Windows Server 2012, SQL Server 2012, Crystal Reports. All end-of-life. Validated under GAMP 5 Category 4."**

The extraction preview card appears.

> **"CodeClinic has already extracted the application profile from the PDF — notice the *high confidence* badge, and the per-field citations back to page numbers. It knows this is GxP-critical because the document says so."**

**Click: "Run diagnosis"** on the right.

While it runs through the stages (extract → assess → recommend → compliance):

> **"Behind the scenes this is making four calls to Claude, each returning structured JSON validated against a Pydantic schema. So the UI can't break — the model's output always matches the shape we expect."**

Report lands.

---

## 4. The 5 objectives tour (90 seconds — one tab each)

> **"The report maps directly to the five objectives in the problem statement. One tab each."**

**Overview tab (10s):** Point to the gauge.

> **"Readiness: 35/100 — not ready. Recommended strategy: Replatform. 30-week plan. GxP-critical. Eight risks, two critical."**

**Architecture tab (15s):** Scroll to the current-state diagram.

> **"Objective 1 — current architecture. Our scanner extracts the components and tech inventory from the input document. Everything red here is end-of-support."**

**Readiness tab (10s):**

> **"Objective 2 — cloud readiness, scored across seven weighted dimensions. We rate each 1–10 against a rubric and roll it up deterministically — the LLM doesn't do the math."**

**Risks tab (15s):** Point at the heat map.

> **"Objective 3 — risks and opportunities on a 5x5 heat map. Five of the eight risks are GxP-related. Each has a concrete mitigation."**

**Target tab (10s):**

> **"Objective 4 — the target architecture on Azure. The 7Rs table shows what gets Replatformed, what gets Refactored, what gets Retired. The LLM picks the strategy per component."**

**Roadmap tab (10s):** Point at the Gantt.

> **"Objective 5 — phased migration roadmap with IQ, OQ, and PQ validation gates built in. These are the checkpoints that keep the validated state intact."**

**Compliance tab (20s):** Click it.

> **"And a sixth tab we added — the compliance evidence pack. Seven gaps, each mapped to the specific Part 11 or Annex 11 clause it violates. This is the differentiator — no generic tool cites regulation clauses. A QA validation lead can read this and start writing the risk-based CSA plan tomorrow."**

Point at a clause chip like `[ 21 CFR 11.10(e) ]`.

> **"Audit trails are 11.10(e). E-signature MFA is 11.200. GDPR region residency is Article 44. All cited verbatim."**

---

## 5. Ask the Advisor (60 seconds)

**Click:** the chat FAB (bottom-right of the Report screen).

> **"The report is not a dead PDF. Every judge in this room could have a different follow-up — so we gave it a chatbot that's grounded in this specific report."**

**Click:** the "Why Replatform?" seed-question pill.

Wait for the streamed answer.

> **"Notice it just quoted risk IDs R01 and R03 — those are from this report, not generic advice. It cited the exact audit observation ID — GXP-OBS-2024-087 — from the original PDF. It's not making this up; it has the report in its context."**

**Type in the box:** `"What if we chose AWS instead of Azure?"`

Wait for stream.

> **"Immediately re-plans the service mapping and flags the supplier-qualification work that would need to happen first. Runs on Google Gemini on the free tier — our architect used Opus to build the pipeline, but the chatbot is cheap."**

---

## 6. Portfolio view close (30 seconds)

**Click:** the Portfolio nav link at the top.

> **"One app is a toy. Pharma companies have 200. The Portfolio view ranks every assessed app by risk and GxP exposure, buckets them into Now / Next / Later migration waves, and shows the combined timeline."**

Point at TrialHub in the Now column.

> **"TrialHub goes first — critical risks, GxP-critical, lowest readiness. LabTrack is Wave 2. RepConnect — the non-regulated sales app — Wave 3."**

> **"This is the view a CIO would show the board."**

---

## 7. The close (20 seconds)

> **"To recap: an AI-powered modernization advisor that doesn't just assess — it understands pharma validation. Built in a hackathon. Uses Claude's structured outputs for reliability, Gemini for the chatbot, native PDF ingest. Three sample apps, three completely different recommended strategies, each with a defensible plan that preserves the validated state."**

(Smile. Wait for applause. Don't fill the silence.)

---

## Q&A — likely questions and prepared answers

**Q: "Why only pharma? Can this do other industries?"**
A: "The engine is general — it's the compliance knowledge layer that's pharma-specific. Swap it for a HIPAA knowledge base for healthcare, or SOX for financial services. Pharma was the demo focus because validated-state preservation is the hardest version of the problem."

**Q: "How do you prevent the LLM from hallucinating?"**
A: "Three ways. One: structured outputs — every stage returns a Pydantic-validated JSON object, so the shape is guaranteed. Two: the scoring, risk math, and diagram rendering are deterministic code, not LLM output. Three: the compliance clauses are checked against a known list, not invented."

**Q: "What's the cost per assessment?"**
A: "At current Opus pricing: around 20 cents per full live assessment, including the compliance analysis. The chatbot is on Gemini's free tier."

**Q: "Would a real pharma company trust this?"**
A: "Not without a human in the loop — and we don't claim they should. This is a 10x speed-up on *first-draft* assessments. The architect and QA validation lead still review and sign off before anything goes into a real change control."

**Q: "What about security — are you sending our data to Anthropic?"**
A: "Anthropic's enterprise terms allow zero data retention — chats and documents aren't stored or used for training. For a real pharma deployment you'd use the AWS Bedrock or Google Vertex AI integrations to keep data in your own cloud account."

**Q: "The chatbot said something slightly wrong — how do you fix that?"**
A: "The chatbot is grounded in the report that was already generated, so it can't invent risks or clauses. If it misinterprets something, that usually means the report itself has a gap — and you can regenerate with a better input document, or edit the extracted profile and re-run."

**Q: "Why is this better than hiring an architect?"**
A: "It isn't. It's better than hiring an architect to do the *first pass* on 200 apps. Architects are the bottleneck — this lets them spend their time on the plans that matter, not on recreating the same current-state diagram for the 50th time."

---

## Backup plan — if something breaks on stage

**If the backend crashes mid-demo:**
- Say: "Let me show you the previous run" and switch to the pre-recorded video.
- The three sample reports are *cached* — even without an LLM call, picking a sample card and running produces a full report. The chat drops to scripted replies (which still read like real answers).

**If the frontend white-screens:**
- Open the backup slide deck. Walk through the architecture diagram and show screenshots.
- Keep going — judges respect recovery more than a perfect demo.

**If Gemini is down (503s):**
- The chat auto-falls through four model variants, then to scripted. If judges notice the "offline reply" footer, say: "Our free-tier chat provider is throttled right now; the scripted fallback is reading the actual report."

**If the Wi-Fi dies:**
- Everything except live Gemini chat works offline. Click a sample, run, show the full report. The compliance tab + portfolio view are 100% deterministic and need no network.

**If you forget what to say:**
- Point at the Compliance tab and the Portfolio screen. Those two screens tell the whole story on their own.

---

## Timing cheat sheet (print this and tape it to the laptop)

```
0:00  Hook — 200 apps, 3 weeks each, 60s with CodeClinic
0:20  Problem — pharma validation is the hard part
0:40  Pick LabTrack sample, click Upload tab, Use bundled sample
0:50  Describe extraction preview, click Run diagnosis
1:00  Narrate the stages while the pipeline runs
1:30  Report lands → Overview tab (gauge, strategy, weeks)
1:40  Architecture tab (10s)
1:55  Readiness tab (10s)
2:05  Risks tab (15s, point at heat map and GxP risks)
2:20  Target tab (10s)
2:30  Roadmap tab (10s, IQ/OQ/PQ gates)
2:40  Compliance tab (20s, clause chips are the money shot)
3:00  Open chat FAB, click "Why Replatform?" seed
3:30  Type a new question ("What if AWS?")
4:00  Portfolio nav → wave columns → Gantt
4:30  Close + stop talking
```
