# TrialHub CTMS — Current-State Architecture Assessment

**Prepared for:** Enterprise Architecture Review Board, Vernova Pharmaceuticals Ltd.
**Prepared by:** Priya Natarajan, Principal Enterprise Architect — IT Strategy & Architecture
**Document ID:** EA-ASMT-2026-017
**Classification:** Internal — Confidential
**Version:** 1.3 (final)
**Date:** 2 October 2026

---

## 1. Executive summary

TrialHub is Vernova's in-house Clinical Trial Management System (CTMS), used by Clinical Operations to plan and run approximately 120 active clinical studies across 25 countries. The platform was commissioned in 2011 as a Java EE monolith and has not been materially re-architected since. It is a Good Clinical Practice (GCP) critical system subject to 21 CFR Part 11, EU GMP Annex 11, and GDPR (special-category subject data). Every core technology layer is now past vendor end-of-support.

TrialHub supports ~1,800 users: Clinical Operations staff, Clinical Research Associates (CRAs), and investigator-site users. It integrates with the Electronic Data Capture (EDC) system via SOAP, the IRT/randomisation vendor via SFTP, the safety database via a nightly ETL, and SharePoint TMF. The release cadence is currently 6 months — driven almost entirely by the need to re-validate the full EAR for any change.

The system is on the FY27 modernization shortlist. A European Medicines Agency inspection in Q4 FY26 raised an observation about the 25-year TMF archive readability drill not having been performed since 2023; this has elevated the modernization priority.

**Headline numbers**
- Users: ~1,800 across 25 countries.
- Active studies: ~120.
- Database size: ~1.2 TB (Oracle 11g R2).
- Code base: ~180,000 lines of Java 7 across a single EAR.
- Release cadence: 6 months.
- Annual run cost (hosting + Oracle + WebLogic licences + support): approximately €1.4M.

## 2. Business context

TrialHub is the system of record for clinical trial operations:
- Study planning, protocols, and amendments
- Investigator-site management and qualification
- Subject enrolment milestone tracking
- Monitoring visit planning, reports, and action items
- Trial Master File (TMF) document references (actual files live in SharePoint)
- Inspection readiness evidence

RTO: 8 hours. RPO: 24 hours.

Regulatory scope:
- **FDA 21 CFR Part 11** — electronic records / e-signatures
- **EU GMP Annex 11** — computerised systems
- **ICH E6(R2) GCP** — Good Clinical Practice guidelines
- **GDPR** — pseudonymised subject data is Article 9 special category
- **GAMP 5** — Category 5 (custom-built)
- **TMF Reference Model** — document taxonomy

## 3. Logical architecture

Three-tier Java EE monolith:
1. **Presentation**: JSF 1.2 + RichFaces 3, server-rendered. IE 11 compatibility mode still required for ~30% of users.
2. **Business logic**: EJB 3.0 stateless session beans, Hibernate 3 for persistence. ~180k LOC in a single EAR deployed on WebLogic.
3. **Data**: Oracle Database 11g R2 Enterprise. Heavy use of PL/SQL packages for business logic — approximately 85 packages, 42 of which are tagged as holding validated clinical rules (randomisation, subject-status transitions, visit-window calculations).

A separate Quartz-based scheduler runs inside the EAR for nightly batch ETL to the safety database.

## 4. Physical architecture

**On-premises deployment at DC-EU-DUB (primary) and DC-US-RDU-COLO (DR):**

| Role | Host | Spec |
|---|---|---|
| WebLogic cluster | 4-node (web001–web004) | 16 vCPU, 64 GB RAM each, RHEL 6 |
| Oracle database | 2-node Oracle RAC | 32 vCPU, 256 GB RAM, SAN 2 TB |
| Admin / batch node | 1 node (adm001) | 8 vCPU, 32 GB RAM |
| HSM for e-signatures | 2 x Thales nShield 500 | hardware |

APAC sites hit DC-EU-DUB over the corporate WAN with ~250 ms RTT, causing complaints.

## 5. Technology stack

| Component | Version | Vendor support status |
|---|---|---|
| Java | 7 (OpenJDK) | **End of life** (Oracle premier support ended 2015, extended 2022) |
| WebLogic Server | 10.3.6 | **End of life** (ended Dec 2021) |
| Oracle Database Enterprise | 11g R2 | **End of life** (extended support ended Dec 2020) |
| Red Hat Enterprise Linux | 6 | **End of life** (maintenance support ended June 2024) |
| JSF | 1.2 | **Obsolete** (Jakarta EE moved to Faces 4.x; namespace change javax → jakarta required) |
| RichFaces | 3.3.4 | **End of life** (project retired in 2016) |
| Hibernate | 3.6 | Several majors behind (current 6.x) |
| Apache Ant | 1.8 | Legacy build tool, no dependency management |
| Quartz Scheduler | 1.8 | Several majors behind (current 2.3) |

**Software composition risk:** The Information Security team's SCA scan from July 2026 flagged 47 critical and 118 high CVEs across these dependencies.

## 6. Integrations

### 6.1 EDC (Medidata Rave) — bi-directional, SOAP
Subject enrolment and visit data flows in; TrialHub posts site-status changes out. The SOAP contract is tightly coupled to EJB method signatures — a Rave API change in Q2 FY26 required a 3-week emergency patch.

### 6.2 IRT/Randomisation vendor — inbound, SFTP
Daily batch files land in a landing directory for Quartz to pick up. No cryptographic verification of file contents. This is an open data integrity observation (GCP-OBS-2025-033) — fails ALCOA+ "Original" criterion.

### 6.3 Safety database (Argus Safety) — outbound, ETL
Nightly Quartz job extracts safety-relevant data and loads into Argus via DB-link. Failures surface only in Quartz logs — no monitoring, no retries. Has silently dropped data on three occasions in the past 18 months.

### 6.4 SharePoint TMF — outbound, document links
TrialHub stores URLs to TMF documents in SharePoint. Actual document content is in SharePoint, not TrialHub.

### 6.5 LDAP authentication
Users authenticate via corporate LDAP (identical to LabTrack LIMS setup). External site users managed manually by Clinical Operations in a parallel Excel workbook — a long-standing audit finding.

## 7. Non-functional characteristics

**Performance:** EU/US sites acceptable. APAC sites report page response > 15 s during peak enrolment windows. Root cause: server-rendered JSF requires many round-trips over long-haul WAN.

**Availability:** 99.1% over the past 12 months. One extended outage of 14 hours in March 2026 when the Oracle cluster failed over and the WebLogic connection pool did not recover automatically.

**Scalability:** Stateful JSF sessions bind each user to a specific cluster node. Scaling means buying more RAM for existing nodes — the WebLogic cluster hasn't horizontally scaled since 2017.

**DR:** DC-US-RDU-COLO holds a cold standby. Last successful DR failover exercise: September 2024. The February 2026 exercise failed when the DR Oracle backup proved to be 72 hours stale.

## 8. Operations and support

- **Deployment:** Full EAR redeployment every 6 months. Downtime window: 8 hours.
- **Change control:** CAB + QA approval. Average lead time: 12 to 18 weeks for a non-trivial change.
- **Testing:** No automated tests. OQ regression suite is ~450 scripts executed by 3 QA analysts over 10 working days per release.
- **Monitoring:** Nagios on host metrics only. No APM. Application logs rotate on local disk, kept 30 days.
- **Backup:** Oracle RMAN nightly backups to local disk, swept to tape weekly, 25-year retention per TMF Reference Model.

## 9. Compliance posture

### Validation status
Validated under GAMP 5 Category 5 (custom). Current validation documents (URS, FS, DS, RA) last amended March 2025.

### 21 CFR Part 11 implementation
- **Audit trail:** Implemented in-database on 63 tables. Includes 25-year retention.
- **E-signatures:** HSM-backed (Thales nShield). Used for protocol amendment approval, monitoring visit report sign-off, subject-status change authorisations.
- **MFA:** Not enforced on signature events — password re-entry only. Open internal observation GXP-OBS-2024-091.

### GDPR implementation
Subject identifiers are pseudonymised in the application layer before persistence. The pseudonymisation key store lives on the WebLogic admin node — a single point of failure that was flagged in the Q4 FY25 DPIA review.

### Open audit findings
| ID | Severity | Open since | Description |
|---|---|---|---|
| GCP-OBS-2024-091 | Medium | Sep 2024 | No MFA on e-signature events |
| GCP-OBS-2025-033 | Medium | Apr 2025 | IRT files not cryptographically verified (ALCOA+ Original) |
| GCP-OBS-2025-061 | High | Aug 2025 | WebLogic/RHEL6 end-of-life, no patches |
| EMA-OBS-2026-007 | High | Oct 2026 | 25-year TMF archive readability drill not performed since 2023 |

## 10. Pain points and risks

- **QA lead:** "Six-month releases are not acceptable to our Clinical Operations stakeholders. Any plan that doesn't change the release cadence won't be funded."
- **Lead developer (R. Shankar):** "The visit-window PL/SQL is the most dangerous thing in this system. If we refactor it wrong, we'll miss or trigger subject safety visits incorrectly."
- **Clinical Operations head:** "APAC sites are losing productivity. If performance isn't fixed by H1 FY28 we'll have to procure a separate regional instance."
- **Information Security:** "The HSM is end-of-life in 2028. If we're still on-premises then, we need a hardware refresh plan now."

## 11. Prior modernization attempts

- **2017:** A planned WebLogic 12c upgrade was descoped when the JSF 1.2 → 2.3 migration proved to require rewriting ~40% of UI code.
- **2024:** A proof-of-concept to extract subject-enrolment as a Spring Boot microservice reached a working MVP but was shelved when the business owner moved to another division.

## 12. Constraints affecting modernization

- Validated state preservation — risk-based CSA plan is a prerequisite.
- No cutover during a study database lock (currently 2 locks scheduled Q1 FY28; 4 in Q2 FY28).
- Subject data for EU trials must remain in the EU.
- Audit trail continuity must be demonstrable to inspectors.
- Budget envelope: €3.5M–€4.5M over FY27–FY29.
- The HSM is end-of-life in 2028 — the modernization plan must address e-signature infrastructure.

## 13. Expected outcomes

- Shorten release cadence from 6 months to monthly.
- Reduce APAC page response below 3 seconds.
- Replace the end-of-life HSM with cloud-managed signing.
- Automate the OQ regression suite.
- Enable self-service onboarding for investigator-site users with MFA.
- Restore the 25-year TMF archive drill to annual cadence.
