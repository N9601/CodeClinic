# SafetyNet PV — Pharmacovigilance Platform Assessment

**Prepared for:** Enterprise Architecture Review Board & Global Patient Safety, Vernova Pharmaceuticals Ltd.
**Prepared by:** Priya Natarajan, Principal Enterprise Architect, with Dr. Alain Dubois, Qualified Person for Pharmacovigilance (EU-QPPV)
**Document ID:** EA-ASMT-2026-021
**Classification:** Internal — Confidential (contains PV system details)
**Version:** 1.0 (final for review)
**Date:** 11 October 2026

---

## 1. Executive summary

SafetyNet is Vernova's **pharmacovigilance (PV) case management platform**, used by Global Patient Safety to intake, triage, assess, and submit **Individual Case Safety Reports (ICSRs)** for all marketed products across every operating region. The platform ingests adverse event reports from HCPs, patients, literature screening, and partner licensees; routes them for medical review; and submits regulatory **E2B(R3)** XML to FDA FAERS, EMA EudraVigilance, PMDA, Health Canada, TGA, and 14 other agencies.

The system is a vendor Oracle Argus Safety 7.0 deployment (commissioned 2014) with extensive in-house customisations: a Siebel-based intake portal, custom E2B(R3) gateway code, and a bespoke literature-screening workflow. The Argus application tier runs on Windows Server 2012 R2; the database is Oracle 11g R2. The gateway and portal run on JBoss EAP 6.4 on RHEL 6.

**PV is Vernova's most regulatorily-exposed system.** Missed or late submissions are directly inspectable; the EU-QPPV is personally liable under GVP Module I. An outage during a submission deadline is a reportable event.

SafetyNet is on the mandatory FY27 remediation list driven by three forces: Oracle 11g R2 and WebLogic/JBoss being out of support, an EMA Pharmacovigilance Inspection in Q2 FY27 flagging the IRT-equivalent gateway monitoring gaps, and the upcoming **ICH E2B(R3) regional profile updates** scheduled for H2 FY27 that will require application changes anyway.

**Headline numbers**
- ICSRs processed per year: ~48,000 (growing 12% YoY as marketed portfolio expands)
- Active users: ~220 safety physicians, scientists, and operations staff across 14 regions
- Databases: Argus Safety primary (~2.4 TB Oracle), Reports (~900 GB), Audit (~1.1 TB)
- Downstream submission endpoints: 20 regulatory agencies
- Release cadence: 2 to 3 months (quarterly) — compressed from 6 months in 2024
- Annual run cost: approximately €2.1M (Oracle Argus licences + Oracle DB + hosting + 24x7 managed service)

## 2. Business criticality and regulatory scope

**Criticality:** Tier-0 regulatory. An outage that prevents on-time submission of expedited (Day 15 / Day 7) ICSRs is a notifiable incident to EMA under GVP Module I §I.B.11, and comparable rules apply at FDA, PMDA, MHRA, Health Canada, TGA, and all other agencies.

- RTO: 2 hours (business hours), 4 hours (24x7).
- RPO: 15 minutes — enforced by Oracle Data Guard synchronous replication.
- Mandatory 24x7 on-call for Patient Safety operations.
- Backup EU-QPPV coverage required at all times.

**Regulatory scope:**
- **FDA 21 CFR Part 11** — audit trail, e-signatures on case lock
- **EU GMP Annex 11** — computerised systems
- **EU GVP (Good Pharmacovigilance Practices) Modules I, VI, IX, XVI** — case management, signal detection, risk management plans, additional monitoring
- **ICH E2B(R3)** — the regulatory messaging standard; current profile v3.0.1, regional profiles expected to update H2 FY27
- **ICH E2D** — post-approval expedited reporting
- **GDPR / HIPAA** — patient-identifiable data in ICSRs
- **GAMP 5** — Argus Safety classified as Cat 4 (configured product); customisations are Cat 5
- **US DSCSA / EU FMD** — not in scope for PV, mentioned here only because our serialization team uses adjacent infrastructure

## 3. Functional scope

- Case intake (web portal, email ingestion, direct literature pull, partner feeds)
- Automatic case duplicate detection
- Triage and assignment to case owner
- Medical assessment (seriousness, causality, expectedness)
- MedDRA auto-coding and reviewer override
- Narrative generation with templated AI-assisted drafts (added 2023; currently in review)
- Case lock with electronic signature
- E2B(R3) XML generation per regional profile
- Regulatory gateway submission + acknowledgement tracking (ACK1/ACK2/ACK3)
- Signal detection (quarterly PBRER / PSUR support, routine signal detection runs)
- Literature screening workflow (Embase + PubMed daily)
- Reconciliation with partner licensees (DSUR, PSUR exchange)
- Reconciliation with Clinical safety database (bi-directional with the Clinical Operations team's safety system)

**Out of scope for SafetyNet:** clinical trial SAE management (handled upstream in the Clinical Safety system, feeds in via nightly reconciliation).

## 4. Logical architecture

Classic Oracle Argus 7.0 three-tier with heavy customisation:

1. **Presentation tier (3 systems):**
   - Argus Safety thick-client (ActiveX, Windows-only, Internet Explorer 11 or Edge in IE Mode)
   - Siebel-based intake portal (Siebel 8.1) for external HCP/patient reporters
   - Custom web dashboards (ASP.NET MVC 5) for regional PV ops managers
2. **Business tier:**
   - Argus application services (Windows Server 2012 R2)
   - E2B gateway on JBoss EAP 6.4 (RHEL 6), handling bi-directional submission + ACK
   - Literature screening background workers (Python 3.6 + Celery, on separate Linux VMs)
3. **Data tier:**
   - Oracle 11g R2 RAC (primary + Data Guard DR)
   - MedDRA dictionary database (same Oracle instance, separate schema; refreshed semi-annually)

## 5. Physical architecture

Deployment is split across DC-EU-DUB (primary) and DC-US-RDU-COLO (DR):

| Role | Hosts | Spec |
|---|---|---|
| Argus App | 4 x Windows Server 2012 R2 | 16 vCPU, 64 GB RAM each |
| Oracle 11g RAC | 2-node cluster | 48 vCPU, 384 GB RAM, Fibre Channel SAN 5 TB |
| JBoss gateway | 2 x RHEL 6 | 8 vCPU, 32 GB RAM each |
| Siebel portal | 2 x Oracle Linux 6 | 16 vCPU, 48 GB RAM each |
| Dashboard web | 2 x Windows Server 2016 | 8 vCPU, 16 GB RAM each |
| Literature workers | 4 x RHEL 7 | 8 vCPU, 16 GB RAM each |

DR failover was last successfully tested in May 2025. The November 2025 drill failed when the DR Argus app servers were missing a 2024 security patch that broke E2B generation on failover.

## 6. Technology stack

| Component | Version | Vendor support status |
|---|---|---|
| Oracle Argus Safety | 7.0.2 (customised) | **End of standard support** (Oracle recommends 8.4+); extended support contract active until 2027 |
| Oracle Database Enterprise | 11g R2 | **End of life** (extended support ended Dec 2020; sustaining-support only, no patches) |
| Oracle Siebel CRM | 8.1 | **End of life** (support ended Dec 2019) |
| Microsoft Windows Server | 2012 R2 | **End of life** (ended Oct 2023) |
| JBoss EAP | 6.4 | **End of life** (ended Jun 2022) |
| Red Hat Enterprise Linux | 6 | **End of life** (maintenance support ended Jun 2024) |
| Oracle Linux | 6 | **End of life** |
| ASP.NET MVC | 5 (.NET 4.6.2) | Supported but frozen; .NET Framework 4.6.2 reached EOL Apr 2022 |
| Python | 3.6 (literature workers) | **End of life** (Dec 2021) |
| Internet Explorer 11 | n/a | **Retired** (Microsoft support ended Jun 2022); staff workaround is Edge IE Mode |

**SCA report (October 2026):** 62 critical and 189 high CVEs across the full dependency inventory. The JBoss and Oracle 11g findings are the highest priority.

## 7. Integrations

- **FDA ESG, EMA EV, PMDA, Health Canada, TGA, Swissmedic, ANVISA, CDSCO +12 other agencies** via E2B(R3) over AS2 and SOAP endpoints
- **Partner licensees (6 pharma companies)** — bi-directional ICSR exchange via E2B(R3) SFTP drops
- **Vernova Clinical Safety (ClinSafe)** — nightly bi-directional reconciliation ETL
- **Vernova Medical Information** — inbound case feed (customer-reported adverse events from the call centre)
- **Embase + PubMed APIs** — literature screening
- **MedDRA MSSO** — semi-annual MedDRA term update (manual process)
- **Corporate SSO (Active Directory + MFA via RSA SecurID)** — identity

The AS2 submission path to FDA ESG is the most sensitive integration. A failed submission that is not detected within 24 hours is a reportable regulatory event in itself.

## 8. Non-functional characteristics

**Performance:** Argus thick-client is adequate at the EU and US sites. India and Japan sites report >8 second case-open latency during month-end PBRER cycles.

**Availability:** 99.78% over the past 12 months (SLA target 99.9% — missed). Two outages during Day-15 submission windows triggered formal regulatory incident reports.

**Scalability:** Oracle 11g RAC is the bottleneck. ICSR volume is growing 12% per year and will exceed current throughput by FY29 without intervention.

**DR:** Oracle Data Guard SYNC replication is working. The DR app-tier gap identified in the November 2025 drill has been remediated but DR has not been re-tested since.

## 9. Operations and support

- 24x7 managed service by an external vendor (contract renewed 2024, expires 2027).
- Deployment: 2-3 months. 180+ page validation deliverable per release.
- Testing: approximately 650 OQ test cases, approximately 60% automated via a vendor test automation suite.
- Monitoring: enterprise Splunk + bespoke E2B submission dashboard.
- Backups: Oracle RMAN nightly to tape + daily snapshot to secondary SAN. 25-year retention.

## 10. Compliance posture

### Validation status
Validated under GAMP 5 Category 4 (Argus itself) with Category 5 modules (custom gateway, custom dashboards, literature workflow). URS, FS, DS last amended June 2026.

### 21 CFR Part 11
- Audit trail: implemented in Argus natively on 78 tables, extended to custom modules.
- E-signatures: on case-lock, case-unlock, assessment overrides. Backed by RSA SecurID MFA.
- Access controls: role-based, reviewed semi-annually by QA.
- MFA: enforced at login AND at e-signature events (unlike LabTrack).

### GVP Module I compliance posture
- EU-QPPV named: Dr. Alain Dubois.
- Deputy QPPV: Dr. Fatima El-Amrani.
- PSMF (Pharmacovigilance System Master File) maintained in a separate document system; SafetyNet is referenced throughout.

### Open audit findings
| ID | Severity | Open since | Description |
|---|---|---|---|
| PV-OBS-2024-012 | High | Mar 2024 | Submission gateway lacks automated detection of silent AS2 failures (reportable incident risk) |
| GXP-OBS-2025-101 | High | Oct 2025 | Oracle 11g R2 is sustaining-support only; no security patches available |
| EMA-INS-2026-003 | Critical | Mar 2026 | EMA Pharmacovigilance Inspection: lack of real-time monitoring for ACK3 negative acknowledgements |
| PV-OBS-2026-027 | Medium | Aug 2026 | DR Argus app tier not re-tested after November 2025 drill failure |

**EMA-INS-2026-003 is a formal inspection finding with a committed remediation date of 31 March 2027.** This is the hard deadline the modernization plan must respect.

### Signal detection and AI
Signal detection uses Argus's native tools (PRR, ROR, information component). The 2023 AI-assisted narrative drafter is implemented using Vernova's enterprise LLM gateway — review process is approved by QA; however, QA has not yet approved its use for GVP-reportable cases, only for internal medical review drafts.

## 11. Pain points

- **EU-QPPV (Dr. Dubois):** "If a submission fails silently I am personally liable. The EMA finding is non-negotiable. Any plan must deliver real-time gateway monitoring by Q1 FY27."
- **Head of Patient Safety:** "ICSR volume will exceed what the current platform can handle by FY29. We cannot allow a scalability-driven incident."
- **IT Service Owner (vendor):** "We need direction on Argus — stay on Argus 8.4 (incremental upgrade), move to another vendor (Veeva Vault Safety, Oracle Argus Cloud), or build. The managed-service contract renewal is in 2027."
- **Information Security:** "Oracle 11g R2 has had unpatched kernel-level CVEs for 18 months. The compensating controls are stretched."
- **Deputy QPPV:** "The literature screening workflow is 2010s technology. A Python 3.6 Celery farm is embarrassing."

## 12. Prior modernization attempts

- **2022:** POC on Veeva Vault Safety reached a working ICSR flow but was halted when the business case assumed too-aggressive user adoption and FY23 budget cut the project.
- **2024:** Argus 8.4 upgrade POC completed in sandbox; blocked by concerns about customisation portability (the custom gateway code depends on Argus 7.0 internal APIs that changed in 8.x).

## 13. Constraints

- **Non-negotiable deadline: 31 March 2027** for the EMA-INS-2026-003 finding — gateway monitoring in production.
- **Validation state must be continuous** — pharmacovigilance cannot run in an unvalidated state even briefly. Shadow-mode and parallel-run approaches only.
- **ICSR data residency:** EU subject data in the EU; US in the US; India in India (per DPDP + CDSCO guidance under consultation).
- **MedDRA dictionary refresh cadence** must be maintained semi-annually without disrupting live operations.
- **No downtime during Day-15 submission windows** (the 5-day pre-deadline window for each product).
- **Audit trail continuity for 25 years** per EMA retention guidance.
- **Budget envelope:** €4.5M to €5.5M across FY27 and FY28.
- **The managed-service contract expires December 2027** — must be renewed, replaced, or in-sourced by then.
- **24x7 on-call must be preserved** throughout migration.

## 14. Decision points for the modernization engagement

- **Target platform**: incremental Argus 8.x upgrade; migrate to Oracle Argus Cloud; migrate to Veeva Vault Safety; or (unlikely) in-house build.
- **Vendor managed-service**: renew, replace, or in-source.
- **AI drafter scope**: expand to GVP-reportable cases (requires QA sign-off and validation of the AI assurance process).
- **Gateway rebuild**: replace JBoss custom gateway with a cloud-managed AS2/SOAP gateway, OR extend the existing Argus-included gateway.
- **Partner licensee data exchange**: continue SFTP + E2B, or move to a managed B2B integration platform.

## 15. Expected outcomes of modernization

- Meet the 31 March 2027 EMA deadline for real-time gateway monitoring.
- Exit Oracle 11g R2 and all other EOL technology.
- Deliver scalability headroom to 100,000 ICSRs per year.
- Reduce release cycle from 2-3 months to monthly.
- Deliver a cost reduction of 20 to 30% versus current €2.1M annual run cost.
- Enable AI-assisted narrative drafter for GVP-reportable cases (pending QA process approval).
- Preserve 24x7 operations and validated state throughout.
