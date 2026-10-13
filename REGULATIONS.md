# CodeClinic — The Buzzword Decoder

Everything our app says, in plain English. Read before the demo so you can answer any judge follow-up.

**Layout:** section 1 is the *big-picture concepts* (what pharma IT actually does and why it's hard). Section 2 is the *regulations* with the specific clauses we cite. Section 3 is a *vocab glossary* of acronyms, system types, and cloud terms. Section 4 is a *30-second cheat sheet* if you only read one page.

---

## 1. Big picture — the pharma IT problem CodeClinic solves

### What is a "pharma legacy app"?
A piece of software a pharma company runs — often 10–20 years old — that holds records a regulator (FDA, EMA, MHRA, CDSCO) cares about. Common examples:

- **LIMS** (Laboratory Information Management System) — tracks lab samples and QC test results. Decides whether a batch of drug product ships.
- **CTMS** (Clinical Trial Management System) — study operations, sites, enrolment.
- **MES** (Manufacturing Execution System) — runs the factory floor; electronic batch records.
- **QMS** (Quality Management System) — deviations, CAPAs, document control.
- **EDC** (Electronic Data Capture) — captures clinical trial data from investigator sites.
- **CDS** (Chromatography Data System) — e.g. Waters Empower; attached to lab instruments.
- **Pharmacovigilance / Safety DB** — adverse event tracking.
- **eTMF** (electronic Trial Master File) — the compliance docs for a clinical trial, retained 25 years.

These apps are **business-critical and heavily regulated**. Changing them is slow because of validation.

### What is "validation"?
Pharma companies must *prove to a regulator* that any software touching product quality or clinical data does what it's supposed to do, reliably. The proof is a stack of signed documents (**URS, FS, DS, RA, IQ, OQ, PQ, VSR, traceability matrix**). This is called **computer system validation (CSV)**, and more recently the lighter risk-based version is **computer software assurance (CSA)**.

**Why migration is scary:** moving an application to the cloud breaks the "validated state". You have to re-validate on the new platform *without* breaking the inspection evidence that already exists.

### What is "GxP"?
Umbrella term — the "x" is a placeholder: **GMP** (manufacturing), **GCP** (clinical), **GLP** (lab), **GDP** (distribution), **GVP** (pharmacovigilance). Any system holding a GxP record is "GxP-critical" and subject to the regulations below.

### The 7 cloud migration strategies ("The 7 Rs")
What our Modernization Plan tab picks per component:

| R | Meaning | Pharma context |
|---|---|---|
| **Retain** | Keep on-premises for now | Instrument-attached systems; CTMS in database lock |
| **Retire** | Decommission | Duplicate systems; replaced capability |
| **Rehost** | Lift-and-shift to cloud VMs, no code change | Fastest route out of EOL hardware; carries old OS forward |
| **Relocate** | Move virtualised estate wholesale (VMware → VMware Cloud) | Big VMware shops with a deadline |
| **Replatform** | Lift to managed services (managed DB, app hosting) with minimal code change | Sweet spot for validated systems — the LabTrack strategy |
| **Repurchase** | Replace with SaaS | Commodity capability (CRM, email) — the RepConnect strategy |
| **Refactor** | Re-architect for cloud-native | Highest effort/validation scope — TrialHub |

### The validation lifecycle (IQ / OQ / PQ)
Three stages. Judges will ask what they are.

- **IQ — Installation Qualification**: proof the platform is installed correctly to spec. In the cloud era this is usually automated via infrastructure-as-code.
- **OQ — Operational Qualification**: proof the system does what it was designed to do. This is where risk-based testing of changed functions lives.
- **PQ — Performance Qualification**: proof the system works for the real business process, with real users, real data. Often a parallel run.
- Followed by: **VSR (Validation Summary Report)** → QA sign-off → system released for GxP use → periodic review and change control for the rest of its life.

CodeClinic's roadmaps always put the right IQ/OQ/PQ gate on the right phase for GxP apps.

---

## 2. Regulations — the clauses we cite

### 21 CFR Part 11 (US FDA — electronic records and signatures)
What it is: the US rule that says "if a computer system holds a record the FDA cares about, it must be validated, have an audit trail, use controlled electronic signatures, limit access, and keep records retrievable for their retention period." Written in 1997, still the primary standard.

Specific clauses CodeClinic cites:

| Clause | What it says |
|---|---|
| **§11.10(a)** | Validate systems to ensure accuracy, reliability, and ability to detect altered records |
| **§11.10(b)** | Generate accurate, complete copies of records readable by inspectors |
| **§11.10(c)** | Protect records for ready retrieval across the full retention period |
| **§11.10(d)** | Limit access to authorised individuals |
| **§11.10(e)** | **Secure, computer-generated, time-stamped audit trails** (the clause we cite most) |
| **§11.10(g)** | Authority checks — only authorised people can sign records |
| **§11.50** | Electronic signatures must show name, date, time, and *meaning* of signature |
| **§11.70** | Signatures must be linked to their records |
| **§11.200** | Non-biometric signatures use **two distinct identification components** (userid + password, or password + MFA) |
| **§11.300** | Controls on identification codes / passwords — uniqueness, periodic change |

### EU GMP Annex 11 (EU — computerised systems in GMP)
The European equivalent of Part 11, broader scope. Clauses we cite:

| Clause | What it says |
|---|---|
| **§3** | Supplier agreements — formal supplier assessment (relevant for cloud providers) |
| **§4** | Risk-based validation across the system lifecycle |
| **§4.8** | Data migration must preserve integrity in the new system |
| **§7** | Data storage secured, periodically checked for accessibility |
| **§9** | Audit trails for GMP-relevant changes/deletions |
| **§10** | Change and configuration management under a defined procedure |
| **§12** | Physical / logical security controls |
| **§16** | Business continuity — provisions for critical process continuity on breakdown |
| **§17** | Archives checked for accessibility, readability, integrity |

### GAMP 5 (ISPE — Good Automated Manufacturing Practice, 2nd edition 2022)
Not a regulation — the *playbook* pharma companies follow to validate IT systems in a risk-based way. The one thing to know: **software categories**.

| Category | What | Validation effort |
|---|---|---|
| **Cat 1** | Infrastructure (OS, databases, networks, **managed cloud services**) | Qualify, don't functionally test |
| **Cat 3** | Non-configured products (standard COTS) | Rely on vendor evidence + basic UAT |
| **Cat 4** | Configured products (SaaS/platform configured for your process) | Validate the configuration, not the engine |
| **Cat 5** | Custom-developed | Full lifecycle validation |

**Why this matters for cloud:** when you move SQL Server to **Azure SQL Managed Instance**, that managed service is **Cat 1 infrastructure** — Microsoft's qualification evidence does most of the work. That's a big cost saver and we lean on it in every plan.

### FDA Computer Software Assurance (CSA) — 2022 draft guidance
The FDA's newer, lighter alternative to full CSV. Core idea: *test what's risky, don't test what's not.* Automated tests count as evidence. Unscripted/exploratory testing is acceptable for low-risk functions.

In practice this is how we justify shrinking the test cycle from "every function retested on every release" to "only changed functions, mostly automated."

### ALCOA+ — data integrity principles
Pharma's test for whether a data record will stand up in an inspection. Nine letters:

- **A**ttributable — who did it?
- **L**egible — can you read it?
- **C**ontemporaneous — recorded when it happened?
- **O**riginal — the original source, or a verified true copy?
- **A**ccurate — correct?
- **+ C**omplete, **C**onsistent, **E**nduring, **A**vailable

**Example gap we flag:** instrument CSV files on an SMB share can be edited before ingestion → fails "Original" and "Complete". Fix: hash-and-immutable-storage on arrival.

### GDPR (EU — personal data)
Articles we cite:

- **Art. 5(1)(f)** — Integrity and confidentiality of personal data
- **Art. 32** — Security of processing (encryption, resilience, restore capability)
- **Art. 44** — Cross-border transfers require adequate basis (region-pinning)

Clinical trial subject data and employee identity data are personal data. Our plans always pin EU workloads to EU regions.

### HIPAA (US — patient health info)
- **§164.312** — Technical safeguards: access controls, audit controls, integrity, authentication, transmission security.

Not our primary target (we're pharma QC/clinical, not provider), but we cite it when a system touches patient data.

---

## 3. Vocab glossary (everything else)

### Pharma systems and docs
| Term | What it means |
|---|---|
| **LIMS** | Laboratory Information Management System |
| **CTMS** | Clinical Trial Management System |
| **EDC** | Electronic Data Capture (trial data from sites) |
| **IRT / RTSM** | Interactive Response Technology / Randomisation and Trial Supply Management |
| **MES** | Manufacturing Execution System |
| **QMS** | Quality Management System |
| **CDS** | Chromatography Data System (Waters Empower, etc.) |
| **eTMF** | electronic Trial Master File |
| **CoA** | Certificate of Analysis — signed doc saying a batch passed QC |
| **OOS** | Out Of Specification — a lab result that fails spec, triggers investigation |
| **CAPA** | Corrective And Preventive Action |
| **URS / FS / DS** | User Requirement Spec / Functional Spec / Design Spec |
| **VSR** | Validation Summary Report — closes out a validation cycle |
| **SOP** | Standard Operating Procedure |
| **CAB** | Change Advisory Board — pharma's change control body |
| **TMF** | Trial Master File — compliance docs for a trial, retained 25 years |
| **GAMP 5 Cat 1/3/4/5** | Software category — see GAMP 5 section above |

### Compliance acronyms
| Term | What it means |
|---|---|
| **GxP** | Good "something" Practice — umbrella term |
| **GMP / GCP / GLP / GDP / GVP** | Manufacturing / Clinical / Laboratory / Distribution / Pharmacovigilance Practice |
| **CSV** (not the file!) | Computer System Validation — the traditional heavy approach |
| **CSA** | Computer Software Assurance — FDA's risk-based successor to CSV |
| **IQ / OQ / PQ** | Installation / Operational / Performance Qualification |
| **ALCOA+** | Data integrity principles |
| **DPIA** | Data Protection Impact Assessment (GDPR requirement) |
| **DPDP Act** | India's Digital Personal Data Protection Act (2023) |
| **FDA 483** | Observation form an inspector issues at the end of an inspection — companies dread these |
| **Warning Letter** | What happens after unresolved 483s — public, serious |

### Cloud + IT terms
| Term | What it means |
|---|---|
| **IaaS / PaaS / SaaS** | Infrastructure / Platform / Software as a Service — three levels of managed-ness |
| **Landing zone** | Qualified, policy-enforced cloud account(s) set up before any workload moves in |
| **IaC** | Infrastructure as Code — Terraform, Bicep, CloudFormation |
| **CI/CD** | Continuous Integration / Continuous Deployment |
| **EOL** | End Of Life — vendor no longer patches it |
| **MFA** | Multi-Factor Authentication |
| **RPO / RTO** | Recovery Point Objective (how much data loss is acceptable) / Recovery Time Objective (how long to restore) |
| **DR** | Disaster Recovery |
| **SLA / SLO** | Service Level Agreement / Objective |
| **WORM** | Write Once Read Many — immutable storage |
| **PITR** | Point-In-Time Restore |
| **SCP** | Service Control Policy (AWS) — organisation-wide guardrail |
| **SBOM** | Software Bill of Materials — list of all libraries in a build |

### Managed services (what we recommend for migration targets)
| Service family | AWS | Azure | GCP |
|---|---|---|---|
| App hosting | Elastic Beanstalk / ECS | App Service | Cloud Run |
| Containers | EKS | AKS | GKE |
| Serverless | Lambda | Functions | Cloud Run functions |
| Managed SQL Server | RDS for SQL Server | Azure SQL Managed Instance | Cloud SQL for SQL Server |
| Managed Oracle | RDS for Oracle | Oracle Database@Azure | Oracle Database@Google Cloud |
| Object storage (immutable) | S3 + Object Lock | Blob Storage + immutability policy | Cloud Storage + bucket lock |
| Identity | Cognito + IAM Identity Center | Microsoft Entra ID | Cloud Identity |
| Audit logs | CloudTrail | Activity Log + Monitor | Cloud Audit Logs |

---

## 4. 30-second pre-demo cheat sheet

> **CodeClinic takes a pharma legacy app, picks the right 7R strategy per component (Replatform, Refactor, Repurchase…), and plans the migration with the IQ/OQ/PQ gates and ALCOA+ controls needed to keep the GxP validated state intact under 21 CFR Part 11.**

If a judge asks any one word, this is what to say in one sentence:

- *"GxP?"* → **Umbrella for the pharma 'good practice' quality rules — GMP, GCP, GLP. If an app holds a GxP record, it's regulated.**
- *"Part 11?"* → **US FDA rule for electronic records and signatures. Requires validation, audit trails, controlled signatures.**
- *"Annex 11?"* → **European equivalent of Part 11 for computerised systems in GMP.**
- *"GAMP 5?"* → **ISPE's playbook for how to validate IT systems in pharma. Categorises software so managed cloud services get credit as 'Cat 1 infrastructure'.**
- *"ALCOA+?"* → **Data-integrity principles — records must be Attributable, Legible, Contemporaneous, Original, Accurate, plus Complete, Consistent, Enduring, Available.**
- *"IQ/OQ/PQ?"* → **Three validation stages: installed right → works as designed → works for the business. We put them as gates on the roadmap.**
- *"CSA vs CSV?"* → **CSA is the FDA's lighter, risk-based successor to CSV. We lean on it to shrink the test cycle to only changed functions.**
- *"The 7 Rs?"* → **The seven cloud migration strategies — Retain, Retire, Rehost, Relocate, Replatform, Repurchase, Refactor. We pick one per component.**
- *"Why pharma?"* → **A generic cloud-readiness tool ignores validation. In pharma, migrating an app without preserving the validated state means it can't be used for batch release. CodeClinic is the only tool that plans around that.**

If a judge asks something you don't know: **"That's a great question for our architect — can you note it and we'll follow up?"** is always better than guessing.
