# App Demo Script - OCC BSA/AML Supervisory Risk Sensing Micro-Pilot

*Estimated speaking time: 5-6 minutes. Stage directions in italics. This script is for the OCC retargeted demo and should be used instead of the original FinCEN/law-enforcement voice track.*

> **Note:** For the Friday executive demo, use the linear script in
> [`docs/demo-script.md`](../demo-script.md) (dashboard → lineage → case
> selection → findings → proposed next steps → disposition). This walkthrough
> covers every tab and stays useful for deeper sessions.

---

## Opening - KPI strip visible at the top

This is a synthetic OCC BSA/AML supervisory risk sensing micro-pilot. It uses 212 entities, about 2,000 transactions, and 10 surfaced exam exceptions. Nothing is connected to a live agency or bank system. The point is to show how an existing data and AI capability can be adapted quickly into an examiner-oriented view.

The top KPI strip frames the demo in supervisory terms: total entities, exam exceptions, supervisory escalations, additional review, average supervisory risk, and governance status. These are not final findings. They are a way to focus examiner attention and preserve a clear evidence trail.

(pause)

---

## Tab 1 - Data Pipeline

*(Landing tab. No click needed.)*

Start with the Data Pipeline. This is the source-to-evidence layer.

The six feeds are examination-relevant: SAR reporting, CTR reporting, customer and account data, digital asset activity, bank metadata, and funds transfer records. Each card shows whether the feed is batch or streaming and how fresh it is. That matters for the FFIEC-aligned questions of completeness, accuracy, timeliness, and traceability.

The middle panel shows entity resolution. Duplicate source records collapse into canonical customers, accounts, and counterparties before testing begins. The purpose is not to make a black-box determination; it is to give the examiner a clearer population for transaction testing.

At the bottom, the graph preview shows how the feeds become one evidence graph. This is the bridge from bank source data to FinCEN-reportable outputs like SARs and CTRs.

---

## Tab 2 - Transaction Testing

*(Click Transaction Testing.)*

This tab is the examiner testing surface. The graph helps an examiner review relationships across accounts, counterparties, jurisdictions, and transactions.

The FFIEC Transaction Testing Presets make the pivot explicit. CTR Threshold Review focuses on aggregation and exemption questions. SAR Decision Review focuses on alert disposition, narrative support, and filing timeliness. Funds Transfer Review focuses on originator, beneficiary, jurisdiction, and record support. Customer and Account Completeness checks ownership and account evidence. Digital Asset Exposure keeps crypto in scope as an OCC-relevant policy lens without making it the entire demo.

*(Click a testing-pattern filter.)*

The graph, KPI strip, exception cards, and routing board stay synchronized. That lets the examiner move from scoping to testing to review without losing the evidence context.

Below the graph, the exception cards summarize the testing pattern, entity, confidence, review path, and supporting indicators. This is where a reviewer can decide whether to open the item in the workspace for documentation.

---

## Tab 3 - Supervisory Prioritization

*(Click Supervisory Prioritization.)*

This is the governance layer. Three controls drive the routing logic: high-risk threshold, confidence threshold, and jurisdiction weight. The decision path makes the rules visible.

*(Move the High Risk slider down, then return it to 85.)*

The routing board re-buckets in real time. Exceptions can move to supervisory escalation, additional examiner review, examiner review, or monitoring/no finding. The important message is that the thresholds are transparent, adjustable, and auditable.

This is useful for an OCC executive conversation because it shows both risk sensing and governance. The system can prioritize, but the examiner still sees the rule path and can document the final decision.

---

## Tab 4 - Examiner Workspace

*(Click Examiner Workspace.)*

This is where the demo becomes concrete. Select an exception and the case view reads top to bottom in three labeled stages: A Findings, B Proposed Next Steps, C Examiner Decision — evidence, then suggestion, then human decision.

Findings opens with a standing disclaimer that indicators are inputs, not conclusions. The three FFIEC-aligned indicators — transaction velocity, jurisdiction exposure, ownership depth — are expressed as plain-language qualitative bands, with the underlying math retained but not shown. Below them sit the entity profile, testing rationale, SAR/CTR validation, reporting lineage, and supporting transactions.

Proposed Next Steps offers one to three rule-based, plain-language suggestions scoped to the selected case, captioned as suggestions only — the examiner determines the appropriate action.

The SAR/CTR validation card is the important new OCC proof point. It shows filing type, whether required fields are complete, whether the filing is on time, and whether source records reconcile. The reporting lineage card shows the reportable trigger, due date, and filed date.

An examiner can override the supervisory risk score with a rationale. The audit trail records the action, timestamp, actor, and details. The output is not an investigative handoff by default; it is a documented supervisory judgment, request for additional review, escalation, or no-finding closure.

---

## Tab 5 - Enterprise Deployment

*(Click Enterprise Deployment, briefly.)*

The final tab shows why this can be adapted quickly. The backbone stays stable: ingestion, feature engineering, examiner testing, supervisory prioritization, governance, audit, and model lifecycle management.

The modules on the right are configurable supervisory lenses: digital asset supervision, SAR/CTR reporting quality, transaction testing presets, examiner workflow configuration, and model governance.

---

## Close

The takeaway is simple: this is not a production system and it is not replacing examiners. It is a configurable micro-pilot that shows how bank source data, SAR/CTR reporting quality, transaction testing, risk sensing, and auditability can be brought into one examiner-facing workflow.

For the first OCC conversation, the strongest message is speed and relevance: Guidehouse can take an existing capability, apply an OCC supervisory lens, and show a working evidence trail without a long build cycle.
