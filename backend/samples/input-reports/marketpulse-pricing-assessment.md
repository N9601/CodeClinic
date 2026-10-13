# MarketPulse — Pricing & Market Access Platform Assessment

**Prepared for:** Commercial IT Portfolio Review, Vernova Pharmaceuticals Ltd.
**Prepared by:** Carlos Mendes (Commercial IT Lead) with Elena Rodriguez (Head of Market Access)
**Document ID:** CIT-ASMT-2026-055
**Classification:** Internal — Commercial Confidential
**Version:** 1.1 (final)
**Date:** 10 October 2026

---

## 1. Executive summary

MarketPulse is Vernova's **pricing and market access analytics platform**, used by the Global Market Access team and in-country pricing managers in 22 markets to model gross-to-net pricing scenarios, track payer contracts, monitor rebate accruals, and prepare health technology assessment (HTA) submission packages. The platform was built in-house 2019-2020 as a response to the limitations of the previous Excel-based process and sits alongside (not integrated with) the broader commercial data warehouse.

**MarketPulse is not a GxP system.** It does not touch patient data, clinical data, or any regulated manufacturing or quality record. It processes commercial pricing data, published list prices, confidential rebate rates, HTA assessment inputs, and payer contract metadata. It is subject to the normal corporate controls: SOX (because material financial information flows through it to accruals), GDPR (payer and HCP contact information), the US Sunshine Act / EU EFPIA Disclosure code (HCP interaction records fed from the CRM), and India DPDP where applicable.

The system is on the modernization shortlist because: (a) the original architect left in 2024 and no one left in the team is comfortable making structural changes, (b) the Angular 10 UI is end-of-life with multiple blocking security findings, and (c) the business owner (Elena Rodriguez) has asked for a mobile-friendly, dashboard-first experience that the current server-rendered + Angular SPA cannot deliver without a significant rewrite.

**Headline numbers**
- Users: ~140 across 22 markets (concentrated in the US, EU-5, Japan, Brazil, China, India)
- Markets modelled: 22 primary + 18 secondary (visibility only)
- Products modelled: ~35 marketed products + 8 pipeline assets
- Pricing scenarios run per quarter: ~1,800
- Database size: ~85 GB PostgreSQL
- Annual run cost (hosting + licences + SaaS integrations): approximately €310k

## 2. Business criticality

Tier-2 business-critical. An outage affects quarterly accrual preparation and scenario modelling; the finance team has a workaround (export and model in Excel) that is slow and unloved but functional. The Q4 rebate accrual cycle is the most sensitive period — a multi-day outage during the last week of each quarter would materially delay the external close.

- RTO: 24 hours (acceptable for most of the quarter; 2 hours during the Q4 accrual window)
- RPO: 24 hours (acceptable; data loss of up to a day can be reconstructed from source feeds)

## 3. Scope boundaries (what this system is NOT)

To avoid confusion with judges or reviewers unfamiliar with pharma:

- **Not GxP** — no quality, no manufacturing, no clinical, no patient data.
- **Not Part 11** — no electronic signatures, no inspection trail requirements.
- **Not FDA-regulated** as a system. The products it models are of course FDA-regulated, but their regulatory lifecycle is handled elsewhere (clinical in TrialHub, PV in SafetyNet, manufacturing in BatchFlow, batch release in SAP QM).
- **Not integrated with manufacturing or quality.** It receives sales volume feeds from the commercial data warehouse but does not drive any operational process.

## 4. Logical architecture

Modern-ish three-tier web application:

1. **Presentation**: Angular 10 SPA served from an NGINX reverse proxy
2. **Business logic**: Node.js 14 + Express REST API; Python 3.8 Celery workers for heavy pricing scenario runs
3. **Data**: PostgreSQL 11 primary + daily snapshot to AWS RDS PostgreSQL 11 (DR copy)
4. **Analytics**: BI dashboards in Tableau Server 2020.2 (separate from MarketPulse itself)

A Redis cache layer handles session state and short-lived scenario-run results.

## 5. Physical architecture

Hybrid: on-premises primary (DC-EU-DUB) with an AWS DR copy in `eu-west-1` (Ireland).

| Role | Hosts | Spec |
|---|---|---|
| NGINX + Angular bundle | 2 x Ubuntu 20.04 | 4 vCPU, 8 GB RAM |
| Node.js API | 2 x Ubuntu 20.04 | 8 vCPU, 16 GB RAM |
| Celery workers | 3 x Ubuntu 20.04 | 16 vCPU, 32 GB RAM |
| PostgreSQL primary | 1 x Ubuntu 20.04 | 16 vCPU, 64 GB RAM, SSD SAN 250 GB |
| Redis | 2 x Ubuntu 20.04 (sentinel pair) | 4 vCPU, 16 GB RAM |
| AWS DR | RDS PostgreSQL + EC2 for app tier (cold) | varies |

## 6. Technology stack

| Component | Version | Vendor support status |
|---|---|---|
| Angular | 10 | **End of life** (support ended December 2021) |
| Node.js | 14 LTS | **End of life** (ended April 2023) |
| Python | 3.8 (Celery workers) | **End of life** (ended October 2024) |
| PostgreSQL | 11 | **End of life** (community support ended November 2023) |
| Ubuntu | 20.04 LTS | Standard support ended April 2025; ESM paid support until April 2030 |
| NGINX | 1.18 | Supported but several minor versions behind |
| Redis | 6.2 | Supported but Redis 7.x is the modern baseline |
| Tableau Server | 2020.2 | Older long-term release; current is 2024.x |
| Celery | 5.1 | Supported |

**SCA scan (September 2026):** 18 critical, 54 high, 112 medium CVEs across npm + pip dependencies. The majority are from the Angular 10 ecosystem (unmaintained community packages).

## 7. Integrations

### 7.1 Commercial Data Warehouse → MarketPulse — inbound, daily batch (Airflow DAG)
Sales volumes, inventory flows, HCP targeting data. The DAG is managed by the Enterprise Data Platform team.

### 7.2 SAP ECC (FI module) ← MarketPulse — outbound, monthly rebate accrual journal entries
Posted as IDOCs. This is the SOX-material flow — financial controls are documented in the SOX control matrix.

### 7.3 Veeva CRM → MarketPulse — inbound, nightly (Veeva Direct SFTP)
HCP interactions and samples-drop data to inform pricing scenario modelling (particularly for products with physician-administered-like use).

### 7.4 IQVIA Pricing & Market Access Data Service — inbound, SFTP weekly
External competitor pricing + list price change feeds for all 22 markets.

### 7.5 Tableau Server — read-only access to MarketPulse PostgreSQL
Published BI dashboards for in-market pricing committees.

### 7.6 Okta SSO — SAML 2.0 for login + MFA

## 8. Non-functional characteristics

**Performance:** Interactive UI acceptable (<2 second page response). Heavy pricing scenarios (full gross-to-net waterfall across 22 markets) can take 15-45 minutes — users typically kick these off and come back later.

**Availability:** 99.5% over the past 12 months. One extended outage in March 2026 (18 hours) when a disk subsystem on the PostgreSQL primary failed during a weekend.

**Scalability:** Horizontally scalable in theory; in practice the Celery worker pool is the bottleneck for scenario runs. Peak quarterly accrual load has required temporary vertical scaling of the worker VMs.

**DR:** Cold AWS DR has never been exercised in production. Theoretical RTO is 4 hours; actual RTO is unknown.

## 9. Operations and support

- Deployment: continuous deployment via GitLab CI/CD to the primary environment. Deployments happen 5-10 times per week.
- Change control: standard Commercial IT CAB (not the heavier GxP CAB). Lead time 1-2 weeks for non-trivial changes.
- Monitoring: Datadog APM + logs, PagerDuty on-call rota.
- Testing: Jest + Cypress; approximately 42% test coverage overall.
- Support: business hours only in the primary market timezones; weekend coverage is best-effort.

## 10. Compliance posture

**SOX IT General Controls:**
- Change management, access management, operations management controls are documented in the SOX control matrix (reviewed annually by Internal Audit).
- The monthly rebate accrual journal entries posted to SAP are considered a SOX-material control.

**GDPR / privacy:**
- HCP data is personal data under GDPR; retention 7 years from last interaction.
- No special category data.
- A DPIA was performed when Veeva CRM integration was added in 2022.

**Data residency:**
- Primary EU hosting; AWS DR is in `eu-west-1`.
- US market data is accessed by US users but is stored in the EU environment (acceptable under current data processing agreements, but under review).

## 11. Pain points

- **Head of Market Access (E. Rodriguez):** "Our in-market pricing managers want to run scenarios on their phones between meetings. They can't. That is the single biggest UX gap."
- **Finance (Commercial Controller):** "The month-end rebate accrual process is still too manual. We need an audit-traceable 'approve and post' flow instead of the current export-to-Excel-then-journal."
- **IT Service Owner (C. Mendes):** "The original architect left in Q3 FY24. The remaining team can keep the lights on but is not confident making structural changes. The code is well-written but under-documented."
- **Information Security:** "Angular 10 is unmaintained. The CVE pipeline is unmanageable. We need either an aggressive Angular upgrade or a replatform within 12 months."
- **Business Technology Partner:** "We have been asked three times if this capability could move to a commercial SaaS. Model N, Vendavo, and FlexEngage have all pitched. The business owner is open-minded if we can preserve the custom pricing scenarios."

## 12. Prior modernization activity

- **2023:** Partial Angular 10 → 14 upgrade attempted; abandoned when 40% of the component library proved incompatible with Angular 14's strict mode. The partially-upgraded code was reverted.
- **2024:** Model N (Revenue Management SaaS) proof-of-concept — reached a working rebate scenario but the custom "innovative access agreement" scenarios Vernova uses in 4 markets could not be modelled in the vendor product.
- **2026 (ongoing):** Vendavo (Pricing Suite) demo scheduled for November — business is interested.

## 13. Constraints

- Budget envelope: €800k to €1.2M over FY27.
- Must not disrupt the Q4 FY27 rebate accrual cycle (last week of December through mid-January).
- Must retain the custom innovative-access-agreement scenario capability (used in 4 markets, approximately €180M combined annual revenue impact).
- SOX IT general controls must be preserved or demonstrably improved — any new tool requires Internal Audit sign-off.
- Mobile access to scenario modelling is a stated business requirement.
- Vendor independence is preferred where cost-equivalent (business owner is wary of lock-in given the Angular 10 experience).

## 14. Decision points

- **Platform direction**: Angular 10 → modern SPA replatform (React / Next.js) in place; replace with a commercial SaaS (Vendavo, Model N, FlexEngage); or Angular upgrade (10 → 17) in-place.
- **Rebate journal flow**: continue the manual export-and-post, OR build a direct SAP posting workflow with electronic sign-off.
- **Mobile strategy**: responsive web vs native mobile app vs read-only mobile dashboard only.
- **Scenario engine**: keep the Python Celery pattern vs move to a managed function/queue stack vs rebuild in a vendor platform.
- **DR**: upgrade cold-AWS to warm, or move the whole thing to AWS.

## 15. Expected outcomes

- Exit all end-of-life technology (Angular 10, Node.js 14, Python 3.8, PostgreSQL 11, Ubuntu 20.04).
- Deliver a mobile-usable scenario-modelling experience.
- Automate the rebate accrual journal posting under SOX-acceptable controls.
- Reduce release friction (today's CI/CD is good; the real friction is the fragility of the Angular front-end).
- Reduce vendor-concentration risk (currently a single architect's codebase).
- Deliver before the Q4 FY28 accrual cycle (October 2027) with the new platform live or the SaaS cutover complete.
