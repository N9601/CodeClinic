# BatchFlow MES — Manufacturing Execution System Assessment

**Prepared for:** Manufacturing IT Governance Board, Vernova Pharmaceuticals Ltd.
**Prepared by:** Fergal O'Donnell (QC IT Lead, Ireland site), with Hiroshi Tanaka (Manufacturing IT Lead, Osaka site) and Sanjay Rao (Manufacturing Automation Engineer, Hyderabad site)
**Document ID:** MFG-IT-ASMT-2026-008
**Classification:** Internal — Confidential
**Version:** 2.0 (final)
**Date:** 9 October 2026

---

## 1. Executive summary

BatchFlow is Vernova's Manufacturing Execution System (MES) running on the production floor at three API/finished-product sites: Cork (Ireland), Osaka (Japan), and Hyderabad (India). The system was commissioned in 2015 as a customisation of Rockwell's **FactoryTalk ProductionCentre v10**, extended with site-specific electronic batch records (eBR), equipment interlocks, and material consumption workflows. BatchFlow sits between the SAP ECC Production Planning module and the plant-floor control systems (DeltaV DCS, Siemens S7 PLCs, environmental monitoring, weighing systems).

Unlike the office-side applications in Vernova's modernization portfolio, BatchFlow is **operations-critical real time software**. A 30-minute outage halts drug product manufacturing. A longer outage can cause batch loss (products in-process cannot be held indefinitely without stability-impact investigation). The system runs 24x7x365 with scheduled downtime limited to 4 hours per site per quarter.

The platform is subject to **cGMP (current Good Manufacturing Practice)**, **21 CFR Part 11** (eBR is a GxP electronic record), **EU GMP Annex 11**, and the industry-specific **ISA-95** reference model (which BatchFlow uses as its data model). The electronic batch records are the primary release artefact for every batch of commercial product — approximately 2,400 batches per year across the three sites.

The system is on the FY28 modernization shortlist. Primary drivers: Rockwell announced end-of-life for FactoryTalk ProductionCentre v10 (sunset December 2029), and Microsoft Windows Server 2016 (the underlying OS) reaches EOL October 2027.

**Headline numbers**
- Sites: 3 (Cork, Osaka, Hyderabad)
- Users: 480 operators + 90 shift supervisors + 60 QA/batch disposition
- Batches per year: ~2,400 (API + finished product combined)
- Electronic batch records per year: ~2,400 (each ~800 pages when printed)
- Databases: 3 x SQL Server 2016 Enterprise (one per site), ~800 GB each
- PLCs connected: ~210 across the three sites (DeltaV DCS + Siemens S7)
- Annual run cost (across the three sites): approximately €1.8M

## 2. Business criticality

Tier-0 operations critical. Each site has a **No MES = No Production** policy — if MES is down for more than 30 minutes, the site shift supervisor pauses manufacturing. Loss of a batch in progress (through MES-driven interlock error or recipe loss) is a reportable deviation in SAP QM.

- RTO: **15 minutes** (operators can tolerate a short pause; longer means product-at-risk).
- RPO: **near-zero** — eBR data must not be lost; synchronous SQL Server AlwaysOn availability groups are mandated.
- Operations: 24x7x365. Scheduled maintenance: 4 hours per site per quarter.

## 3. Regulatory scope

- **FDA 21 CFR Part 11** — eBR audit trail, electronic signatures (operator check-and-verify, QA review)
- **EU GMP Annex 11** — computerised systems
- **FDA 21 CFR Part 210/211** — cGMP for finished pharmaceuticals
- **FDA 21 CFR Part 212** — cGMP for PET drugs (not applicable at these sites currently; relevant for FY29 pipeline product)
- **GAMP 5** — ProductionCentre is Cat 4; site customisations are Cat 5
- **ISPE Baseline Guide: Sterile Manufacturing Facilities** (where applicable)
- **MHRA Data Integrity Guidance 2018** (ALCOA+)
- **ICH Q7** (API) and Q8/Q9/Q10
- **FDA / ANVISA / PMDA** inspections — this system is directly in scope

## 4. Functional scope

- Recipe management (import from SAP, master recipe control, site-specific control recipe)
- Electronic Work Instructions (EWI) displayed on operator HMIs
- Material staging and consumption (dispensing booth integration + weighing system interfaces)
- Equipment status interlocks (BatchFlow refuses to start a step if a tagged piece of equipment is out of calibration)
- Operator sign-off and verifier sign-off (dual signature where required)
- Deviation capture and workflow
- Electronic batch record assembly
- QA review and batch disposition hand-off to SAP (release decision)
- Shift handover reports
- Equipment calibration status tracking (feed from calibration management system)

## 5. Logical architecture

ISA-95 Levels 2-3-4 bridging:

- **Level 4 (Business):** SAP ECC (QM, PP modules) → BatchFlow via dedicated IDOC-based integration
- **Level 3 (MES):** BatchFlow itself — recipe/work instruction/eBR
- **Level 2 (SCADA/DCS):** DeltaV DCS (10 systems across sites), Siemens WinCC OA (environmental monitoring), Siemens TIA Portal for S7 PLCs — BatchFlow talks to Level 2 via OPC-UA
- **Level 2 (specialised):** Mettler-Toledo weighing systems, Sartorius dispensing booths — proprietary protocols

Three BatchFlow instances (one per site), **not** federated. Each site is a logical island with its own database, user base, and recipe library. SAP integration is per-site.

## 6. Physical architecture (per site)

Example: Cork site. Osaka and Hyderabad are similar scale.

| Role | Hosts | Spec |
|---|---|---|
| ProductionCentre app servers | 3 x Windows Server 2016 | 24 vCPU, 96 GB RAM, physical rack servers |
| SQL Server AlwaysOn AG | 3-node cluster (2 sync + 1 async DR) | 32 vCPU, 256 GB RAM, SSD SAN |
| OPC-UA gateway nodes | 2 x Windows Server 2016 | 8 vCPU, 16 GB RAM, redundant pair |
| Operator HMIs | 48 x industrial PCs on manufacturing LAN | varies |
| QA workstations | 20 x standard desktops on office LAN (via DMZ) | varies |
| Historian | 1 x OSIsoft PI System | 24 vCPU, 128 GB RAM |

Manufacturing LAN is strictly segmented from the office network through industrial firewalls. QA workstations access MES through a DMZ with proxy and MFA.

## 7. Technology stack

| Component | Version | Vendor support status |
|---|---|---|
| Rockwell FactoryTalk ProductionCentre | 10.1 | **Vendor sunset announced** — EOL December 2029 (36 months out) |
| Microsoft SQL Server Enterprise | 2016 | Extended support ended Jul 2026 — **sustaining support only** |
| Microsoft Windows Server | 2016 | **EOL October 2027** (24 months out) |
| OPC Foundation OPC-UA SDK | 1.03.361 | Several revisions behind (current ~1.05) |
| OSIsoft PI System | 2018 | Supported; AVEVA PI Vision 2023 recommended upgrade |
| DeltaV DCS (Emerson) | v13.3.1 | DeltaV end-of-life schedule depends on hardware; many DCS controllers in-field reach EOL from 2029 onward |
| Siemens WinCC OA | v3.17 | Supported |
| Site customisations | ~85,000 lines of C# + ~22,000 lines of T-SQL + ~8,000 lines of PLC ladder logic | custom; our own code |

Hardware refresh needed for 42 industrial PCs (operator HMIs) across the three sites — the current units are at vendor-support cutoff.

## 8. Integrations

### 8.1 SAP ECC (QM/PP) ↔ BatchFlow — bi-directional, IDOC + custom SOAP
Master recipes flow down from SAP; batch disposition and material consumption flow up. SAP integration code is Vernova's own, maintained by the SAP integration team (separate from MES team).

### 8.2 DeltaV DCS ↔ BatchFlow — bi-directional, OPC-UA + custom tag mapping
Equipment status, interlock requests, and batch parameters flow between MES and the DCS. The tag mapping files are stored in version control, which was only established in 2022.

### 8.3 Siemens WinCC OA (environmental monitoring) → BatchFlow — one-way, OPC-UA
Cleanroom pressure, temperature, and particle counts fed into BatchFlow for inclusion in the eBR.

### 8.4 Mettler-Toledo weighing systems → BatchFlow — one-way, serial + custom TCP bridge
Dispensing weights captured directly into the eBR. The serial bridges at Osaka and Hyderabad use an aging Moxa device that is end-of-life.

### 8.5 Calibration Management System → BatchFlow — one-way, nightly ETL
Equipment calibration status refreshed daily. If a piece of equipment is out of calibration, BatchFlow interlock prevents its use in a batch step.

### 8.6 Document Management (TMF-adjacent) → BatchFlow — one-way, URL links
Master recipe documents, SOP references.

### 8.7 PI Historian → BatchFlow — bi-directional, PI-SDK
Process data feeds into eBR; eBR context events feed back to PI for process analytics.

## 9. Non-functional characteristics

**Performance:** Operator-perceived HMI response under 1 second for routine actions. Recipe download to DCS can take 2-5 minutes for complex recipes.

**Availability:** 99.94% at Cork, 99.91% at Osaka, 99.88% at Hyderabad over the past 12 months. Target 99.95%, intermittently missed.

**Scalability:** Each site is independently scaled. Adding a fourth site (planned Hyderabad site expansion for FY28) would require a full new deployment per the current pattern.

**DR:** Each site has local HA (SQL AG with sync + async nodes). There is **no cross-site DR** — if a whole site is destroyed, that site's batches are lost. A ransomware event is the primary residual risk; the OT network segmentation is the primary compensating control.

## 10. Operations and support

- Deployment: planned 4-hour windows per site per quarter. OQ regression per release is ~400 scripts, mostly automated. The release train is tied to planned manufacturing shutdowns.
- Change control: Manufacturing CAB (separate from the office CAB). Lead time 10-14 weeks.
- Monitoring: enterprise Splunk + site-local SCOM + a bespoke OPC-UA health dashboard.
- Support: 24x7 on-site plus manufacturer vendor on-call. India and Japan sites have local shift coverage.

## 11. Compliance posture

### Validation status
Validated under GAMP 5 Cat 4 (ProductionCentre) + Cat 5 (customisations). Each site has its own validation package. URS/FS/DS last amended December 2025 at Cork, March 2026 at Osaka, August 2026 at Hyderabad.

### 21 CFR Part 11 implementation
- eBR audit trail: implemented at the ProductionCentre layer; extended to custom modules
- Operator and verifier signatures (dual-signature-required steps are configurable per recipe)
- MFA: not currently enforced at the operator HMI level (operator sign-in uses badge + PIN); MFA is enforced for QA workstations in the DMZ. This is an open internal observation.

### ALCOA+ posture
- Attributable: yes (every entry tied to a logged-in operator)
- Legible: yes
- Contemporaneous: yes (real-time)
- Original: yes (eBR is the system of record)
- Accurate: enforced through interlocks and verifier signatures
- Complete / Consistent / Enduring / Available: strong, with the caveat that cross-site DR gaps mean "available" is a per-site guarantee only

### Open audit findings
| ID | Severity | Open since | Description |
|---|---|---|---|
| MFG-OBS-2024-033 | Medium | Jul 2024 | Operator HMI badge+PIN login does not meet §11.200 two-factor expectations for e-signature events |
| GXP-OBS-2025-108 | High | Nov 2025 | Windows Server 2016 approaching EOL Oct 2027 |
| MFG-OBS-2026-004 | Medium | Mar 2026 | Moxa serial bridges (Osaka, Hyderabad) at vendor EOL |
| MFG-OBS-2026-019 | Low | Jul 2026 | No formal cross-site DR for MES |

## 12. Pain points

- **VP Manufacturing:** "The current pattern of 3 unfederated sites means we cannot see global production state in real time. A central MES overlay — or a true multi-site MES — would be transformational for S&OP."
- **QC IT Lead (F. O'Donnell):** "The hardware refresh for operator HMIs is approved in principle but there is no budget without a wider modernization context. We need an answer by end FY27 at the latest."
- **Manufacturing Automation Engineer (S. Rao):** "The OPC-UA integration layer is where most of our incidents originate. Modernising only the UI tier without rethinking the OT-IT interface would be a mistake."
- **QA Head:** "Manual batch record review is the single biggest cycle-time contributor to batch release. Any plan that doesn't address eBR review workflow is incomplete."
- **Information Security:** "The OT network is reasonably segmented, but we need better IDS at the OT-IT boundary before a cloud exposure of any MES data is acceptable."

## 13. Prior modernization attempts

- **2019:** Rockwell proposed an upgrade path from ProductionCentre v10 to the then-current PlantPAx MES. Shelved after costing came in at €8M across the three sites with no clear ROI case beyond "stay on vendor's roadmap".
- **2023:** Investigated a cloud-native MES (Tulip, Siemens Opcenter Execution Pharma) as alternatives to Rockwell. Both would require re-development of all site customisations; business case was deferred.

## 14. Constraints

- **No disruption to manufacturing** during migration. 4-hour planned windows only.
- **Validated state continuous** through migration — no "unvalidated test production" ever.
- **cGMP data residency** typically allows regional cloud regions provided controls are in place; subject to formal supplier qualification.
- **OT network isolation** — the manufacturing LAN cannot be opened wholesale to cloud services. Any cloud integration must be through a DMZ with industrial firewalls and application-level gateways.
- **Hardware refresh of 42 operator HMIs** must happen regardless of MES platform decision.
- **Budget envelope:** €6M to €8M across FY28 and FY29 for a true platform modernization, or €2M to €2.5M for a scoped lift (OS/DB only, same functional MES).
- **The Rockwell ProductionCentre v10 EOL (Dec 2029)** is the hard upstream deadline.

## 15. Decision points

- **Platform**: Rockwell upgrade (v10 → latest PlantPAx MES); migrate to cloud-native MES (Tulip, Opcenter, Körber PAS-X); or scope-reduced OS/DB-only lift keeping ProductionCentre v10 running until 2029.
- **Deployment model**: continue 3 unfederated instances OR adopt a true multi-site MES with central master data.
- **OT-IT interface**: continue custom OPC-UA gateway OR move to a managed OT integration platform (Litmus, HighByte, AWS IoT SiteWise).
- **eBR review**: continue manual QA review OR introduce automated review-by-exception.
- **Site expansion (FY28 Hyderabad)**: pilot the new target architecture at the new site, OR replicate current pattern.

## 16. Expected outcomes

- Exit Windows Server 2016 before October 2027.
- Deliver a plan for Rockwell ProductionCentre v10 EOL (Dec 2029) with a go/no-go decision by Q1 FY28.
- Reduce batch review cycle time by 30%.
- Enable central multi-site production visibility.
- Preserve or improve current 99.9%+ availability and 15-minute RTO.
- Validate the target architecture before the FY28 Hyderabad site expansion so the new site adopts the modernised pattern.
