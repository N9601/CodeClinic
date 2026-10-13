# LabTrack LIMS — Current-State Architecture Assessment

**Prepared for:** Enterprise Architecture Review Board, Vernova Pharmaceuticals Ltd.
**Prepared by:** Priya Natarajan, Principal Enterprise Architect — IT Strategy & Architecture
**Document ID:** EA-ASMT-2026-014
**Classification:** Internal — Confidential
**Version:** 2.1 (final)
**Date:** 28 September 2026

---

## Document control

| Version | Date | Author | Changes |
|---|---|---|---|
| 0.1 | 2026-07-14 | P. Natarajan | Initial draft from discovery workshops |
| 1.0 | 2026-08-05 | P. Natarajan | Reviewed by QC IT Lead and QA Validation Manager |
| 1.5 | 2026-09-02 | P. Natarajan | Added FY27 risk register inputs, updated audit findings |
| 2.0 | 2026-09-22 | P. Natarajan | Incorporated feedback from Information Security review |
| 2.1 | 2026-09-28 | P. Natarajan | Final — approved for distribution to the EA Review Board |

**Reviewers / contributors:** Fergal O'Donnell (QC IT Lead, Ireland), Dr. Meena Krishnan (QA Validation Manager), Thomas Weber (Infrastructure Services), Aisha Rahman (Information Security), Carlos Mendes (SAP Integration Lead), Ravi Shankar (LabTrack Lead Developer — one of two subject-matter experts remaining).

---

## 1. Executive summary

LabTrack is Vernova Pharmaceuticals' primary Laboratory Information Management System (LIMS) for Quality Control (QC) release testing of finished drug product. It is deployed at three manufacturing sites — Pune (India), Cork (Ireland) and Research Triangle Park (United States) — and is used by approximately 350 QC analysts, reviewers and QA personnel to track samples from receipt through analytical testing, results review, electronic approval and Certificate of Analysis (CoA) generation. LabTrack decisions directly feed batch disposition and product release; the system is therefore **GxP-critical** and validated under GAMP 5.

The platform was commissioned in 2013 and has not been materially re-architected since. Every core technology layer is now at or past vendor end-of-support, including Windows Server 2012 R2, SQL Server 2012 Standard and the .NET Framework 4.5 target. In February 2026 the Information Security team raised LabTrack as a **high** audit finding owing to unpatchable operating system and database platforms. A recent FDA Form 483 observation at a sister site — not involving LabTrack directly — has drawn QA attention to the robustness of validated computerised systems across the Vernova estate.

This document captures the current-state architecture, operations, compliance posture, known issues and constraints of LabTrack. It is intended as the input for a modernization assessment, from which a target architecture and migration roadmap will be developed in a subsequent engagement.

**Headline numbers**

- Users: ~350 named QC/QA users across three manufacturing sites.
- Transactions: ~18,000 sample results approved per month; peak during month-end batch release.
- Database size: ~600 GB; growing at ~70 GB/year.
- Code base: ~90,000 lines of C# and ASP.NET markup; ~400 stored procedures in T-SQL.
- Release cadence: quarterly, each release followed by 2–3 weeks of validation activities.
- Annual run cost (hosting + licences + support): approximately €620,000.

---

## 2. Business context and criticality

### 2.1 Business function

LabTrack is the system of record for QC analytical testing of **finished drug product** across all three Vernova manufacturing sites. Analysts enter sample identification data on receipt, record instrument results (either manually or via automated file ingest from chromatography systems), submit results for review and electronically approve them. A reviewer confirms results against specifications and, where applicable, triggers Out-Of-Specification (OOS) investigations. On successful approval of all required tests for a batch, LabTrack generates the Certificate of Analysis (CoA) that accompanies the batch into warehouse release and ultimately to the customer.

### 2.2 Criticality and dependencies

LabTrack is on the shortlist of **Tier-1 Business-Critical Applications** in the Vernova IT application portfolio (classification VPL-APP-TIER1-016). The following downstream processes cannot proceed without LabTrack:

- Batch disposition decisions in SAP ECC (QM module).
- Issuance of the Certificate of Analysis to customers.
- Stability study programme (LabTrack holds stability pull schedules and results).
- Site-level product release meetings held every weekday morning.

RTO: 4 hours. RPO: 24 hours (currently tape-based nightly full backup; see § 9).

### 2.3 Regulatory scope

LabTrack is subject to:

- **FDA 21 CFR Part 11** — electronic records and electronic signatures.
- **EU GMP Annex 11** — computerised systems in GMP environments.
- **FDA 21 CFR Parts 210/211** — current Good Manufacturing Practice.
- **ICH Q10** — Pharmaceutical Quality System.
- **GAMP 5 (2nd ed.)** — Category 4 configured system with Category 5 customisations.
- **GDPR** — limited (analyst identity data only; no patient data).

LabTrack holds electronic records with a retention requirement of ten years from the last date of distribution of the batch (per Vernova SOP VQM-SOP-0217). Audit trails are implemented in-database (per-table `AuditTrail` entries) and are considered part of the GxP record.

---

## 3. Functional scope

LabTrack supports the following functional capabilities today. Modules marked (†) include validated calculations whose output is used directly in batch release decisions.

- Sample login and chain of custody.
- Specification management and specification versioning (†).
- Test method assignment and scheduling.
- Manual result entry.
- Instrument result ingestion (currently from Waters Empower CDS; see § 6.2).
- Specification check and OOS flagging (†).
- Result review and electronic approval with 21 CFR Part 11 electronic signature (†).
- Investigation workflow (OOS, deviations, retests).
- Certificate of Analysis generation (†).
- Stability study scheduling and results tracking.
- QC analyst training record check (binary gate: analyst may/may not approve a given test).
- Reporting (trending, OOS statistics, batch yield).
- System administration (users, specifications, master data).
- Audit trail viewing.

Out of scope for LabTrack (handled by other systems): environmental monitoring (handled by a vendor EM platform at Cork and Pune), microbiology bioburden (BioAssure, out of scope here), raw-material release (performed in SAP QM via Vernova customisations), stability storage chamber control (Thermo Scientific chambers with their own control software).

---

## 4. Logical architecture

LabTrack is a classical three-tier web application. The three logical layers are:

1. **Presentation tier** — ASP.NET WebForms (.aspx + code-behind) with jQuery 1.8 and a small amount of custom JavaScript. Server-side rendering; client-side logic limited to date pickers and dynamic grids. UI is accessed exclusively from internal corporate workstations through Internet Explorer 11 (compatibility mode) and increasingly Microsoft Edge in IE Mode.

2. **Business logic tier** — C# business services called from code-behind. However, a very substantial portion of business logic — including the specification check, OOS flagging logic, electronic signature verification, audit-trail population, and all CoA formatting rules — is implemented in **T-SQL stored procedures** on the database. Approximately 400 stored procedures were enumerated in the latest inventory (July 2026), of which 112 are considered to implement validated business rules.

3. **Data tier** — Microsoft SQL Server 2012 Standard Edition. Single primary instance per site cluster. See § 6.3.

A separate **Windows Service** (LabTrack.InstrumentService.exe) runs on a dedicated integration server at each site and polls a Server Message Block (SMB) share every five minutes for new instrument result files. See § 7.

A **Crystal Reports 13 runtime** is co-hosted on each IIS web server and is used to render the CoA (and six other validated report templates). The Crystal Reports runtime is 32-bit; this pins reporting workload to the IIS hosts.

---

## 5. Physical architecture and deployment topology

LabTrack is deployed independently at each manufacturing site (Pune, Cork, RTP). The sites do not share databases; data is physically separated for data residency and for operational independence. The topology at each site is:

| Role | Host(s) | OS | Specification |
|---|---|---|---|
| Load balancer | F5 BIG-IP (shared appliance) | n/a | VIP routing with source-IP sticky sessions |
| Web / app servers (x2) | labwebNN-{site}01, labwebNN-{site}02 | Windows Server 2012 R2 Standard | 8 vCPU, 32 GB RAM, 200 GB OS + app, local SSD |
| Database server (clustered) | labdbNN-{site}-cl01 (2 nodes) | Windows Server 2012 R2 Datacenter | 16 vCPU, 128 GB RAM, SAN-attached storage ~1 TB |
| Instrument integration server | labintNN-{site}01 | Windows Server 2012 R2 Standard | 4 vCPU, 16 GB RAM |
| File share for instrument drop | labfsNN-{site}01 | Windows Server 2012 R2 Standard | 10 TB SAN-attached volume |
| Build/release server | ea-build01 (shared) | Windows Server 2016 | Jenkins 2.277, used only for compilation |

All servers are hosted in Vernova's two primary data centres (DC-EU-DUB, DC-APAC-PNQ) and the US site colocation (DC-US-RDU-COLO). Virtualization is VMware vSphere 6.5 (also out of mainstream support).

Sticky sessions are required because session state is stored **in process** (`sessionState mode="InProc"` in `web.config`). This has historically prevented horizontal scaling and complicates planned maintenance (a web server reboot invalidates in-flight sessions).

Backups are performed nightly to tape (LTO-7), retained on site for 30 days and shipped to an off-site vault for 10 years. Restores from tape have been successfully tested annually; the mean restore time in the last DR exercise (April 2026) was **9 hours** for the full LabTrack database, which exceeds the stated RTO of 4 hours.

---

## 6. Technology stack

### 6.1 Application platform

| Component | Version | Vendor support status |
|---|---|---|
| Microsoft Windows Server (web, db, int) | 2012 R2 | Extended support ended October 2023 — unsupported |
| Microsoft SQL Server Standard | 2012 | Extended support ended July 2022 — unsupported |
| Microsoft .NET Framework (target) | 4.5 | Support for 4.5.2 and below ended April 2022 |
| Microsoft IIS | 8.5 | Lifecycle tied to Windows Server 2012 R2 |
| ASP.NET WebForms | 4.5 | Supported with .NET Framework 4.8 only; frozen technology |
| jQuery | 1.8.3 | Known XSS vulnerabilities (CVE-2020-11022 and others fixed only in 3.5+) |
| SAP Crystal Reports runtime | 13 (32-bit) | Vendor support status to be confirmed |
| log4net | 1.2.10 | Several majors behind |
| Newtonsoft.Json | 6.0.4 | Several majors behind |
| VMware vSphere | 6.5 | General support ended October 2022 |

### 6.2 Data platform

- Primary engine: Microsoft SQL Server 2012 Standard (Windows cluster, two nodes, active-passive). Database size: ~600 GB per site (Cork is the largest at 820 GB).
- Approximately 400 stored procedures (as of July 2026 inventory). Of these, 112 are tagged in Vernova's internal register as implementing validated business rules; the remainder are utility/CRUD.
- Specification tables are maintained manually by QA Validation Analysts via LabTrack's own admin UI; there is no automated specification synchronisation with Veeva Vault.
- No read-replica, no automated point-in-time restore beyond tape, and no built-in high availability beyond the Windows failover cluster.

### 6.3 Code base

The LabTrack solution comprises three Visual Studio projects:

| Project | Language | Lines of code (approx.) | Notes |
|---|---|---|---|
| LabTrack.Web | C# / ASP.NET WebForms | ~62,000 | UI and application services |
| LabTrack.InstrumentService | C# (Windows Service) | ~8,500 | Polling, parsing of Empower CSV exports |
| LabTrack.Shared | C# | ~4,500 | DTOs, utilities |
| T-SQL stored procedures | SQL | ~18,000 | 400 procedures across the database |

Original source control was Visual SourceSafe (through 2017), migrated to Team Foundation Server, and migrated again in 2022 to Azure DevOps Repos (git). Full historical commit history prior to 2017 is lost. The build is performed on a shared Jenkins instance (`ea-build01`), which produces an unsigned deployable artefact packaged as a `.zip`.

Of the original seven-person development team, **two developers remain** (Ravi Shankar — lead, 11 years tenure; Krishna Patel — 4 years tenure). Both are based in Pune.

### 6.4 Dependencies and libraries of concern

An automated software composition analysis performed in June 2026 identified the following items of concern in the third-party dependency inventory:

- jQuery 1.8.3 (CVE-2020-11022, CVE-2020-11023, CVE-2015-9251) — reflected XSS, several surfaces.
- log4net 1.2.10 (CVE-2018-1285) — remote code execution via crafted XML config.
- Newtonsoft.Json 6.0.4 — multiple deserialization CVEs post-2017.
- jQuery UI 1.9.2 — XSS via vulnerable `.position()` calls.

Information Security has graded the overall LabTrack software composition risk as **High**.

---

## 7. Integrations

LabTrack exchanges data with the following systems. All integrations are file-based or protocol-based; there is no central integration bus.

### 7.1 Empower CDS (Waters) — inbound, file drop

Analytical chromatography results are produced by Waters Empower 3 on dedicated instrument acquisition workstations in each lab. At the end of each sample run, the analyst exports a results CSV file to an SMB share (`\\labfs01\instrument_drop\empower\`). The LabTrack Instrument Integration Service polls this folder every five minutes and loads the file.

**Known gaps:**
- No cryptographic hash or signature is captured; files are trusted as-is. This is an open data-integrity observation against **ALCOA+** (originality / completeness) in Vernova's own internal data integrity assessment (QDI-RPT-2025-004).
- Files can, in principle, be opened, altered or deleted on the SMB share before ingestion.
- The service is single-instance; if the integration server is down, files accumulate until it returns.

### 7.2 SAP ECC — inbound, nightly flat file

Batch and material master data flows from SAP ECC into LabTrack via a nightly file drop produced by SAP (`\\sapfs01\exports\batches.txt`), loaded by a Windows Task Scheduler job (`sap_batch_import.bat`) which invokes `sqlcmd` against the LabTrack database.

- Overnight latency means batches created in SAP during the day are not visible in LabTrack until the next morning. This has been a repeated QC complaint.
- Credentials for the import are embedded in the batch file (Windows integrated authentication). The job's SQL connection string is also present in plaintext configuration.

### 7.3 Active Directory — authentication (Windows Integrated)

Users authenticate via Windows Integrated Authentication (Kerberos / NTLM) against Vernova's corporate AD forest (`corp.vernova.com`). Analysts' AD samAccountName is used as the LabTrack user identity. Multi-factor authentication is **not** enforced for LabTrack login or for electronic signatures at the point of result approval — a point of contention with Information Security.

### 7.4 SMTP relay — outbound notifications

LabTrack sends notification emails (sample ready for review, OOS raised, CoA issued) via an on-premises Postfix relay (`smtp.corp.vernova.com`, 10.20.1.25).

### 7.5 Veeva Vault QualityDocs — manual (not integrated)

CoA PDFs are placed, manually, into Veeva Vault QualityDocs by a QA Associate after the CoA is generated by LabTrack. There is no API integration; this takes approximately 12 minutes per CoA.

### 7.6 Site-to-site file replication

A legacy robocopy-based file replication job copies finalised CoA PDFs between the three sites' file shares for business continuity. The job has, on three occasions in the past 18 months, failed silently.

---

## 8. Non-functional characteristics

### 8.1 Performance

Day-to-day performance is adequate for the Pune and RTP sites (average page response under 2 seconds). Cork reports periodic slowness around month-end batch release windows (25th–end of each month); page response can exceed 10 seconds during peak. Root cause investigation in Q2 2026 attributed this to table-scan behaviour on the `Result` and `AuditTrail` tables as they have grown beyond 400 million and 1.1 billion rows respectively, with missing indexes that cannot be added easily owing to validation implications.

### 8.2 Availability

Availability over the past 12 months (October 2025 – September 2026):

- Pune: 99.72% (two unplanned outages, both database failovers).
- Cork: 99.41% (one outage of 11 hours due to a SAN controller failure).
- RTP: 99.68%.

The service-level target is 99.5% during business hours; all sites meet it, though Cork is marginal.

### 8.3 Scalability

Horizontal scalability of the web tier is blocked by in-process session state. Vertical scalability has been exercised — the Pune web servers were upgraded from 4 vCPU / 16 GB to 8 vCPU / 32 GB in 2023 to accommodate growth. The database tier would require moving to SQL Server Enterprise Edition to adopt partitioning or online index rebuilds, which has been resisted on cost grounds.

### 8.4 Disaster recovery

A DR exercise is conducted annually with the Infrastructure team. The April 2026 exercise restored the Cork site database from tape to a staging environment in 9 hours; this exceeds the stated RTO of 4 hours. The deviation has been accepted by the business owner for the current year pending modernization planning.

---

## 9. Operations and support

**Deployment:** manual, scheduled quarterly, outside batch-release windows. The deployment runbook (document ID OPS-RUN-LABTRACK-004) is 38 pages. Deployments are executed by two Infrastructure Services engineers under the observation of a QA Validation Analyst, who signs paper IQ evidence as each step completes.

**Change control:** Every change — including hotfixes — passes through the Vernova Change Advisory Board (CAB) and a QA review. Average lead time from code commit to production for a non-trivial change: **9 to 14 weeks**. Approximately 60% of this is validation work; the remaining 40% is CAB queueing.

**Testing:** There are no automated unit tests, integration tests, or end-to-end tests. Regression testing before each release is executed by two QA Validation Analysts against a scripted test suite of approximately 300 Operational Qualification (OQ) test cases. Each OQ cycle takes about seven working days.

**Monitoring:** Minimal. ServiceNow receives tickets filed by QC users. Infrastructure Services monitors host CPU, memory and disk via Nagios 4. There is no application performance monitoring (APM) and no centralised log aggregation; log4net writes rolling text files to each web server's local disk.

**Backup:** nightly full backup of the SQL databases to local disk, swept to tape nightly, retained for 10 years per the SOP. No transaction log backups.

**Support hours:** Pune team provides L2/L3 support 06:00–22:00 India Standard Time, Monday to Friday. Infrastructure Services provides 24/7 on-call for infrastructure (not application) issues.

---

## 10. Compliance posture

### 10.1 Validation status

LabTrack is currently in a validated state at all three sites. The system was initially validated in 2013 under GAMP 5 (1st edition), with revalidation performed after each quarterly release. The following validation artefacts are current:

- Validation Plan (VP-LABTRACK-2024-001) — approved July 2024, scheduled for review July 2027.
- User Requirements Specification (URS-LABTRACK-004) — last amended March 2024.
- Functional Specification (FS-LABTRACK-004) — last amended March 2024.
- Design Specification (DS-LABTRACK-004) — last amended March 2024.
- Risk Assessment (RA-LABTRACK-004) — annual review, current cycle due November 2026.
- IQ, OQ, PQ reports for each quarterly release.
- Traceability matrix.

### 10.2 21 CFR Part 11

Part 11 implementation:

- **Unique user IDs:** mapped to AD samAccountName; no shared accounts (verified by annual periodic review).
- **Password policy:** inherited from AD (12 characters minimum, 90-day rotation). MFA not enforced at Part 11 e-signature event (see § 7.3).
- **Audit trail:** implemented in-database on 47 tables; cannot be disabled at the application level; is included in annual periodic review of audit trails.
- **Electronic signatures:** re-authentication required at point of approval; meaning of signature is captured ("Reviewed", "Approved", "Rejected"); signatures are linked to records via foreign key.
- **System access controls:** role-based within LabTrack; role matrix reviewed by QA every six months.

### 10.3 Known gaps and observations

The following items are open in the Vernova internal GxP audit tracker as of September 2026:

| ID | Severity | Open since | Description |
|---|---|---|---|
| GXP-OBS-2024-087 | Medium | May 2024 | Multi-factor authentication not enforced at electronic signature step |
| GXP-OBS-2025-022 | High | Feb 2025 | Underlying operating system (Windows Server 2012 R2) is out of vendor support |
| GXP-OBS-2025-044 | Medium | June 2025 | Instrument-drop files not cryptographically protected prior to ingestion (ALCOA+) |
| GXP-OBS-2026-011 | Medium | Mar 2026 | Audit trail review for stored procedure changes is partially manual |
| GXP-OBS-2026-019 | Low | July 2026 | Validated backup/restore RTO (9 hours) exceeds stated RTO (4 hours) |

GXP-OBS-2025-022 is the most significant and is the primary driver for this modernization assessment.

### 10.4 Data residency

- EU subject data (QC analyst personal data for European users) is held exclusively in the Cork database; it does not leave the EU.
- US and APAC analyst personal data is in the respective local databases.
- A future consolidated deployment must preserve this separation.

---

## 11. Pain points and risks

Pain points raised by stakeholders during discovery (July–August 2026 workshops):

- **QA Validation Manager (Dr. M. Krishnan):** "We spend close to half of each release cycle re-executing OQ by hand. Any solution that keeps the quarterly release cadence but automates OQ will transform our team's workload."
- **QC IT Lead, Ireland (F. O'Donnell):** "Cork cannot continue to miss the month-end response time. If we're planning migration, the Cork database is the one to move first."
- **Lead Developer (R. Shankar):** "If Krishna or I leave, there is nobody who understands the OOS calculation stored procedures. Priority is to get those documented and under tests before anything else happens."
- **Infrastructure Services (T. Weber):** "The physical servers at Cork come out of hardware warranty in Q2 2027. We cannot renew for another cycle."
- **Information Security (A. Rahman):** "LabTrack is on the top-10 critical remediation list for FY27. We will push for compensating controls to be put in place within the next two quarters regardless of modernization timeline."
- **SAP Integration Lead (C. Mendes):** "The overnight SAP file hand-off is embarrassing. It is the single biggest driver of 'please manually refresh the batch list' tickets."

Headline risks (also present in the FY27 corporate risk register):

- End-of-life platform risk (Risk IT-04-2026) — **High**.
- Key-person dependency on two Pune developers — **Medium-High**.
- Instrument file integrity gap (ALCOA+) — **Medium**.
- Business continuity if Cork hardware fails outside warranty — **Medium**.

---

## 12. Prior modernization attempts

Two prior modernization attempts have been made:

- **2019:** A planned migration to SQL Server 2017 was descoped mid-project owing to stored-procedure incompatibilities and a frozen release calendar during the launch of Vernova's biosimilars pipeline.
- **2022:** A proof-of-concept to containerise the application on Docker (on Windows Server) was executed by the Pune team and demonstrated a working deployment. It was shelved because (a) the Crystal Reports 13 runtime proved difficult to containerise, and (b) no business sponsor was identified to fund the full migration.

Lessons from these attempts are documented in `EA-RETRO-2019-003` and `EA-RETRO-2022-011`; both are available on request.

---

## 13. Constraints affecting modernization

Any future modernization effort must respect the following constraints:

- **Validated state preservation:** at no point may LabTrack be used for GxP release decisions in an unvalidated or partially validated state. A risk-based re-validation plan agreed with QA is a prerequisite.
- **Cutover windows:** no cutover may occur during a batch-release window (last five business days and first two business days of each calendar month) or during a stability pull week.
- **Data residency:** EU user and specification data must remain in the European Union; APAC data in India; US data within the United States.
- **Audit-trail continuity:** full audit trail must survive migration — complete, readable, and unaltered — and this must be demonstrable to an FDA/EMA inspector.
- **Business continuity:** no outage longer than 4 hours during business hours, and no data loss greater than 24 hours, at any point during the migration.
- **Budget:** indicative capital envelope for FY27–FY28 modernization: €2.0M–€2.5M across hosting, licences, implementation and validation.
- **Timing:** target initial production go-live before Q4 FY28 (September 2028) to avoid the Cork hardware warranty expiry window.

---

## 14. Decision points for the modernization engagement

The following decisions will be made in the modernization planning phase that follows this assessment:

- Preferred target cloud platform (incumbent enterprise agreements with Microsoft and AWS; Microsoft is currently preferred for GxP workloads based on existing Vernova Azure landing zone, but AWS remains an option).
- Degree of refactoring vs. replatforming (initial preference leans toward replatforming for speed and lower re-validation scope; refactoring of instrument ingestion and reporting is a separate consideration).
- Whether to consolidate the three site databases into one multi-tenant deployment or retain three separate instances for data residency and operational independence.
- Whether to retain Crystal Reports templates in the first phase (lowest validation disruption) or move reporting to a modern paginated reporting tool in parallel.
- Whether the on-premises SAP integration should remain as a scheduled file hand-off or be redesigned as a near-real-time integration.

---

## 15. Expected outcomes of modernization

The modernization engagement is expected to deliver, at minimum:

- Faster, more frequent architecture assessments of similar applications across the Vernova portfolio.
- A clear and defensible migration strategy for LabTrack suitable for presentation to the Vernova Executive Committee.
- Reduced risk of regulatory, operational or cybersecurity incident during and after transformation.
- Improved scalability of LabTrack to accommodate the planned addition of a fourth site (Hyderabad, FY28).
- Improved maintainability and reduced key-person dependency.
- Accelerated adoption of Vernova's wider cloud strategy, in which LabTrack is on the second wave.

---

## Appendix A — Component inventory

| Component | Role | Technology | Version | Support status |
|---|---|---|---|---|
| LabTrack Web Portal | Presentation | ASP.NET WebForms on IIS 8.5 | 4.5 | OS EOL Oct 2023 |
| LabTrack Core Business Services | Application | C# class library | 4.5 | Framework support ended Apr 2022 |
| LabTrack Database | Data | Microsoft SQL Server Standard | 2012 | EOL July 2022 |
| LabTrack Instrument Integration Service | Integration | Windows Service (C#) | 4.5 | OS EOL Oct 2023 |
| CoA Report Engine | Reporting | SAP Crystal Reports 13 (32-bit) | 13 | Vendor status TBC |
| Instrument Drop Share | Storage | Windows SMB file share | n/a | OS EOL Oct 2023 |
| Load balancer | Infrastructure | F5 BIG-IP (shared appliance) | 15.1 | Supported |
| Active Directory | Identity | Microsoft AD DS | 2019 forest | Supported |
| SMTP relay | Integration | Postfix on RHEL 7 | 3.5 | RHEL 7 maintenance support ended June 2024 |
| VMware vSphere | Infrastructure | VMware vSphere | 6.5 | General support ended Oct 2022 |

## Appendix B — Glossary

- **ALCOA+** — Attributable, Legible, Contemporaneous, Original, Accurate (+ Complete, Consistent, Enduring, Available). FDA/MHRA data-integrity principles.
- **CoA** — Certificate of Analysis.
- **CSA** — Computer Software Assurance; FDA's risk-based successor to CSV.
- **CSV** — Computer System Validation.
- **GAMP 5** — ISPE's good automated manufacturing practice framework (2nd edition, 2022).
- **GCP** — Good Clinical Practice. Not applicable to LabTrack (not a clinical system).
- **GMP** — Good Manufacturing Practice.
- **GxP** — Umbrella term for the various "good practice" quality guidelines.
- **IQ / OQ / PQ** — Installation / Operational / Performance Qualification. Validation stages.
- **LIMS** — Laboratory Information Management System.
- **OOS** — Out-Of-Specification.
- **PQ** — Performance Qualification.
- **TMF** — Trial Master File. (Not applicable to LabTrack.)

## Appendix C — Reference documents

- VP-LABTRACK-2024-001 — Validation Plan.
- VQM-SOP-0217 — Record Retention SOP.
- QDI-RPT-2025-004 — Data Integrity Assessment.
- EA-RETRO-2019-003 — 2019 SQL Server migration retrospective.
- EA-RETRO-2022-011 — 2022 Containerisation PoC retrospective.
- IT-04-2026 — Corporate risk register entry: End-of-life platform risk.
- OPS-RUN-LABTRACK-004 — Deployment runbook.

**— End of document —**
