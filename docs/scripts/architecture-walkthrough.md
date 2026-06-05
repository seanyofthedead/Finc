# Presentation Script: OCC BSA/AML Supervisory Architecture

*Estimated speaking time: 5-6 minutes. Use this when explaining the architecture behind the retargeted OCC micro-pilot.*

---

## Opening

This architecture turns bank source data, reporting feeds, transactions, and risk indicators into a short list of examiner-reviewable exceptions. The demo beside it is a working scale model: six ingestion feeds, 212 canonical entities, 10 surfaced exceptions, and a governed evidence trail.

The key distinction is role. FinCEN receives and uses BSA reporting data. OCC examiners evaluate whether supervised institutions have effective processes and whether reportable data is complete, accurate, timely, and supported by evidence.

---

## Layer 1 - Sources

The source layer starts with examination-relevant data: SAR reporting feeds, CTR reporting feeds, customer and account records, funds transfer records, bank metadata, and digital asset activity.

These sources map directly to the FFIEC BSA/AML examination lens: scoping and planning, risk assessment, SAR and CTR procedures, recordkeeping, funds transfer review, transaction testing, and reporting-quality validation.

---

## Layer 2 - Ingestion And Normalization

The ingestion layer normalizes records before they reach the examiner surface. It tags source system, receipt time, schema status, and lineage. It also supports entity resolution so duplicate customer, account, or counterparty records can be reviewed as one canonical entity.

In a production version, this would integrate with the institution's source systems and OCC-approved environments. In the demo, it is synthetic, but it shows the operating pattern: source data must be traceable before it becomes an examiner testing indicator.

---

## Layer 3 - Evidence Stores

The architecture separates raw evidence from analytical views. Raw records remain immutable. Processed records are organized for graph review, warehouse-style aggregation, and examiner workpapers.

The graph store supports relationship questions: who is connected to whom, through which transactions, accounts, and jurisdictions. The warehouse supports population-level questions: how many exceptions, how often, how concentrated, and compared to what baseline.

---

## Layer 4 - Examiner Testing And Analytics

The analytics layer combines deterministic rules, statistical indicators, graph analytics, and explainable model outputs. For OCC, these are testing aids, not conclusions.

Rules can surface CTR threshold patterns and funds transfer criteria. Statistical indicators can show peer deviation or unusual velocity. Graph analytics can show ownership depth, counterparty concentration, and cross-border paths. Natural-language or document review can support SAR narrative sufficiency in a later version.

The demo's Transaction Testing tab shows this layer as examiner-configurable presets: CTR Threshold Review, SAR Decision Review, Funds Transfer Review, Customer and Account Completeness, and Digital Asset Exposure.

---

## Layer 5 - Supervisory Prioritization

The prioritization layer routes exceptions using visible thresholds. High-risk, high-confidence items can move to supervisory escalation. High-risk, lower-confidence items can move to additional examiner review. Lower-risk items can remain in monitoring or close with no finding.

The important design point is transparency. Thresholds, confidence, route, and rationale are visible to the examiner and captured in the audit trail.

---

## Layer 6 - Examiner Workspace And Audit

The Examiner Workspace is the human decision surface. It presents the entity profile, testing rationale, FFIEC-aligned indicators, SAR/CTR validation, reporting lineage, examiner disposition, and transaction evidence.

The SAR/CTR validation fields make the reporting-quality claim concrete: filing type, required-field status, due date, filed date, timeliness, source-record reconciliation, and examiner disposition.

Every override and route action is timestamped. That audit trail is what makes the workflow defensible in a supervisory context.

---

## Layer 7 - Enterprise Deployment

The deployment layer keeps the backbone reusable. Ingestion, feature engineering, testing, prioritization, governance, audit, and model lifecycle management can support several supervisory lenses.

For the OCC conversation, the relevant lenses are SAR/CTR reporting quality, transaction testing, digital asset supervision, examiner workflow configuration, and model governance. The demo should be described as a micro-pilot, not as a production deployment.

---

## Close

The architecture demonstrates a practical path from bank source data to examiner-ready evidence. It supports risk-based scoping, transaction testing, SAR/CTR reporting validation, supervisory prioritization, and auditable human judgment.

That is the OCC retarget: keep the existing platform backbone, change the lens from financial-crime investigation to bank-supervision risk sensing, and make the reporting-quality evidence visible enough for an executive micro-pilot.
