# Friday Demo Script — OCC BSA/AML Supervisory Micro-Pilot

*Linear demo path: dashboard → lineage → case selection → findings → proposed next steps → disposition. Estimated speaking time: 4–5 minutes. Stage directions in italics. Repeatable pre-checks: `node scripts/demo-dry-run.mjs` (server on :4173).*

---

## Open — FFIEC handbook framing

*(App loads on the Data Pipeline screen. Do not click anything yet.)*

Everything you are about to see is organized around the FFIEC BSA/AML Examination Manual: the examiner's questions about completeness, accuracy, timeliness, and traceability of a bank's SAR and CTR reporting, and the risk-based scoping of transaction testing.

One note before we start: every record in this demo is synthetic — 212 entities, about 2,000 transactions, 10 surfaced exam exceptions. Nothing touches a live bank or agency system.

The operating principle of the whole pilot is simple, and you'll see it twice on one screen: **the tool proposes, the examiner decides.**

---

## Beat 1 — Dashboard and reporting lineage

*(Stay on Data Pipeline. Everything fits on screen — no scrolling.)*

Six examination-relevant feeds — SAR reporting, CTR reporting, customer and account records, digital asset activity, bank metadata, and funds transfers — land here in batch and streaming modes, with freshness shown per feed.

*(Hover a source card.)*

The reporting lineage panel on the right traces any source from raw ingest, through normalization, into the governed evidence graph. That trace is the examiner's answer to "where did this number come from?" — every indicator you'll see later resolves back to this panel.

Entity resolution in the middle collapses duplicate source records into canonical customers and counterparties, so the testing population is clean before any indicator is computed.

---

## Beat 2 — Case selection

*(Click Examiner Workspace. Pick an exception from the selector.)*

The Examiner Workspace is the single entry point for case review. One selector, ten surfaced exceptions; choosing a case drives everything below it on one screen — no tab-hopping.

Notice the screen reads top to bottom in three labeled stages: A, B, C. Evidence, then suggestion, then human decision.

---

## Beat 3 — Findings (Stage A)

The Findings stage opens with the standing disclaimer: indicators are inputs to scope a risk-based review — they are not findings or conclusions; all determinations are made by the examiner.

The three FFIEC-aligned indicators — transaction velocity, jurisdiction exposure, ownership depth — are stated in plain supervisory language: "elevated vs. baseline," "substantially above typical activity," "within typical range." No formulas, no statistical jargon. The math still runs underneath and remains auditable, but the examiner reads conclusions-shaped-as-context, not equations.

Below the indicators sits the case evidence: entity profile, testing rationale, SAR/CTR validation — filing type, required-field completeness, timeliness, source-record reconciliation — and the reporting lineage with due and filed dates.

---

## Beat 4 — Proposed Next Steps (Stage B)

Stage B is where the pilot suggests, in plain language, one to three risk-based next steps — for example, expanding the transaction sample for a period of elevated activity, or verifying cross-border counterparty documentation.

The caption under the list says it outright: suggestions only — the examiner determines the appropriate action. These are deterministic, rule-based prompts derived from the indicators above; nothing here commits the examiner to anything.

---

## Beat 5 — Examiner Decision (Stage C) and disposition

Stage C belongs to the examiner alone: four dispositions — request additional review, supervisory escalation, return to monitoring, or close with no finding — plus a governed risk-score override that requires a written rationale.

*(Click Request Additional Review, then Confirm.)*

Every action lands in the decision audit trail with timestamp, actor, and rationale. The output of this workflow is a defensible, documented supervisory judgment.

That's the principle made concrete, end to end: **the tool proposes, the examiner decides.**

---

## Close — the build story

Last point, because it matters for the operationalization conversation: this working pilot — ingestion through governed examiner decision — was built in roughly two days using a prompt-driven rapid-prototyping approach, skipping the traditional wireframe and requirements phases. The backbone is configurable; the OCC supervisory lens you just saw is one configuration of it. A different exam focus is a configuration exercise, not a rebuild.

Happy to go deeper on any layer — the data model, the routing governance, or the build methodology itself.
