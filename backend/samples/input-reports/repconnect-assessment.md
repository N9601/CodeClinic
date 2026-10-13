# RepConnect — Current-State Assessment (brief)

**Prepared for:** Commercial IT Portfolio Review, Vernova Pharmaceuticals Ltd.
**Prepared by:** Thomas Weber, Infrastructure Services Lead (acting owner — see §4 below)
**Document ID:** CIT-ASMT-2026-042
**Classification:** Internal
**Date:** 8 October 2026

---

## 1. Overview

RepConnect is a field-force reporting web app used by ~600 medical sales representatives and 40 regional managers in India to log Healthcare Professional (HCP) visits, plan visit schedules, and generate weekly activity reports. It is **not** a GxP system — no patient data, no quality records, no regulatory submissions.

The business owner left Vernova in March 2026. Day-to-day support has been covered by Infrastructure Services on a best-effort basis. There is no roadmap and no scheduled changes.

## 2. Business criticality

- Non-critical. An outage affects sales reporting cadence but no patient safety or product release.
- Users work around outages by emailing reports to managers directly.
- Historical availability: 94% (approximately — the monitoring itself is unreliable).

## 3. Architecture

Single on-premises Linux VM running everything:
- **Web app:** PHP 5.6 with a home-grown MVC framework. jQuery and Bootstrap 3 on the client.
- **Database:** MySQL 5.6, approximately 40 GB.
- **Web server:** Apache 2.2.
- **Email:** Postfix on the same VM for weekly report delivery.
- **Deployment:** Manual FTP from the (former) developer's laptop.

Hosting: 1 Linux VM on VMware vSphere 6.5 at DC-APAC-PNQ.

## 4. Known issues

- PHP 5.6 is end-of-life (Dec 2018). The repo has 23 critical CVEs open.
- MySQL 5.6 is end-of-life (Feb 2021).
- CentOS 6 is end-of-life (Nov 2020).
- No version control. The last known copy of the source code is on the former developer's laptop (now returned, awaiting IT retrieval).
- No tests. No monitoring. No automated backups verified.
- Single point of failure (one VM for everything).
- Not mobile-friendly. Reps complain the UI is unusable on their phones.
- No offline mode — a frequent complaint from reps in low-connectivity regions.

## 5. Data

- Approximately 600 HCP contact records (names, affiliations, visit history).
- Approximately 15,000 call-logs per month.
- Monthly CSV export to the commercial data warehouse.
- Classification: Business confidential. HCP data is personal data under India's DPDP Act (2023) but is not patient data.

## 6. Integrations

- Monthly CSV extract to the commercial data warehouse (fragile, has silently failed twice).
- Outbound email via local Postfix.
- No other integrations.

## 7. Pain points

- Field sales lead: "Our reps hate the mobile experience. A real mobile app would double call-logging compliance overnight."
- Regional manager: "I want real-time dashboards, not weekly CSV emails that are always out of date."
- Infrastructure Services (acting owner): "I don't want to own this. It needs to be either properly maintained or replaced with a SaaS CRM."

## 8. Constraints

- Budget: tight — this is Commercial IT, not Technology Services. Target under €200k capital.
- Timeline: want improvement visible to field reps within 6 months (Q2 FY27).
- Preference stated by Commercial IT: evaluate commercial life-sciences SaaS CRM (Veeva CRM, Salesforce Life Sciences Cloud) before any custom work.

## 9. What this document is NOT

This is a brief, not a full architecture document. Key things not covered that a full assessment would include:
- Formal URS, FS, DS artefacts (never produced for this system).
- Load / performance baseline.
- Full dependency inventory beyond the PHP packages listed above.
- Formal risk assessment.
- Any analysis of whether a Veeva CRM migration preserves current reporting cadence.

The next step is a 3-week engagement with Commercial IT to run a fit-gap workshop against the shortlisted SaaS CRMs.

## 10. Expected outcomes of modernization

- Retire the PHP 5.6 / CentOS 6 / MySQL 5.6 stack.
- Give reps a mobile-first experience with offline support.
- Give managers real-time dashboards instead of weekly CSV reports.
- Reduce total cost of ownership versus continuing to patch the legacy VM.
- Done by Q2 FY27.
