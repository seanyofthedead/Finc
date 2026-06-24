# Implementation Backlog — OCC BSA/AML Micropilot

Repo-ready work items derived from the 6/11 handbook-update review with Jennifer.
Ordered by dependency — work top to bottom. Items 1–5 must merge before the Tuesday check-in; Friday demo with Paul is the hard gate.

Suggested branch convention: `feat/<ticket-id>-short-name` (e.g., `feat/mp-02-hitl-framing`).
Tag the pre-demo state: `git tag pre-friday-demo` once MP-01 through MP-05 are merged.

-----

## SPRINT 1 — Due before Tuesday check-in (hard gate: Friday demo)

### MP-01 — Merge Signal Engineering tab into Examiner Workspace

**Priority:** P0 · **Effort:** M · **Blocks:** MP-02, MP-03, MP-04

Do this first — MP-02 and MP-03 modify the components this consolidation moves, so doing it later means rework.

**Tasks**

- [ ] Remove Signal Engineering as a standalone tab/route from the nav.
- [ ] Move the per-case indicator components (transaction velocity, jurisdiction exposure, ownership depth) into the Examiner Workspace view, scoped to the currently selected case.
- [ ] Keep the existing case selector as the single entry point; indicators re-render on case change.
- [ ] Keep the four disposition controls (Request Additional Review, Supervisory Escalation, Return to Monitoring, Close — No Finding) unchanged in behavior.
- [ ] Delete or archive the orphaned Signal Engineering tab code; no dead routes left in nav.

**Acceptance criteria**

- Selecting a case shows its indicators and disposition options in one screen with no tab switch.
- No regression in disposition selection behavior.
- App has one fewer top-level tab; no broken links.

-----

### MP-02 — Human-in-the-loop framing: Findings → Proposed Next Steps → Examiner Decision

**Priority:** P0 · **Effort:** M · **Depends on:** MP-01

Restructure the consolidated workspace into a strict linear layout. Jennifer’s requirement: examiners think “a + b = c” — the screen must read top-to-bottom as evidence, then suggestion, then human decision.

**Tasks**

- [ ] Add three visually distinct, vertically ordered sections to the case view:
1. **Findings** — the indicator summaries (content comes from MP-03’s rolled-up versions).
1. **Proposed Next Steps** — new component. Generate 1–3 plain-language suggested actions per case from the existing indicator data (rule-based is fine for the prototype, e.g., high velocity + high jurisdiction exposure → “Consider expanding transaction sample for period X”).
1. **Examiner Decision** — the four disposition buttons, relabeled section header to make ownership explicit.
- [ ] Add persistent disclaimer copy near the indicators: e.g., “Indicators are inputs to scope a risk-based review. They are not findings or conclusions. All determinations are made by the examiner.” Exact wording in a constants/copy file so it’s easy to edit after Lisa’s review.
- [ ] Add a one-line caption under Proposed Next Steps: “Suggestions only — the examiner determines the appropriate action.”

**Acceptance criteria**

- The three sections appear in order on every case, with the decision controls last.
- Disclaimer text visible without scrolling/hovering on a standard laptop screen-share resolution.
- Copy strings centralized (one file), not hardcoded inline.

-----

### MP-03 — Roll up statistical detail out of the default indicator view

**Priority:** P0 · **Effort:** S–M · **Depends on:** MP-01

Remove raw math (means, standard deviations, “mean × 4.3”-style multipliers) from anything user-facing. Keep the computation; change the presentation.

**Tasks**

- [ ] Write a mapping layer that converts each indicator’s numeric score into a qualitative band, e.g.:
  - ≥ 3σ above baseline → “Substantially above typical activity”
  - 1.5–3σ → “Elevated vs. baseline”
  - < 1.5σ → “Within typical range”
    (Thresholds in a config file — they’re placeholders pending Lisa’s review.)
- [ ] Replace the right-panel statistical readout with the band label + one plain-language sentence per indicator.
- [ ] Keep the raw stats computed and stored — do NOT delete the math — but render nothing containing “mean”, “std dev”, “σ”, or multiplier expressions in the default view.
- [ ] Optional (only if time allows, do not block Tuesday): a collapsed “Methodology” expander/tooltip exposing the underlying stats. Ship it hidden behind a config flag so Jennifer/Paul can decide Friday.

**Acceptance criteria**

- Grep of rendered UI strings shows no raw statistical terms or formulas in the default view.
- Every indicator shows a qualitative band + plain-language summary.
- Thresholds editable in config without code changes.

-----

### MP-04 — Layout polish: sizing and spacing

**Priority:** P0 · **Effort:** S · **Depends on:** MP-01 (do last in the sprint)

**Tasks**

- [ ] Resize the data lineage / pipeline diagram to normal proportions (currently intentionally oversized). Target: fully legible at 1080p screen share without scrolling.
- [ ] Normalize spacing/padding in the consolidated Examiner Workspace — consistent gutters, no crowding from the MP-01 merge, no overflow/truncation.
- [ ] Quick pass on all remaining views for obvious misalignment introduced by the consolidation.

**Acceptance criteria**

- Screenshot review at 1920×1080: lineage diagram fits, workspace sections evenly spaced, nothing clipped.

-----

### MP-05 — Demo dry run + Tuesday status

**Priority:** P0 · **Effort:** S · **Depends on:** MP-01–MP-04

**Tasks**

- [ ] Full click-through of the demo path: dashboard → lineage → case selection → findings → proposed next steps → disposition.
- [ ] Draft the linear demo script (open with FFIEC handbook framing; state “tool proposes, examiner decides” twice; mention synthetic data once up front; close with the ~2-day build story).
- [ ] Tag the repo `pre-friday-demo`.
- [ ] Ping Jennifer with status by Tuesday (she has a reminder set regardless).

**Acceptance criteria**

- Dry run completes with zero errors/visual defects; script committed to `/docs/demo-script.md`.

-----

## SPRINT 2 — Before Lisa (SME) review / OCC presentation

### MP-06 — Review Balance stoplight (replace “sample limited” placeholder)

**Priority:** P1 · **Effort:** M

**Tasks**

- [x] Generate synthetic case-routing data (destination group per case: intelligence, law enforcement, etc.) if it doesn’t exist. _(Already present — routing destinations come from `computeRouting`/`routeCase` in `js/engine.js`.)_
- [x] Implement red/yellow/green logic on routing distribution skew. Placeholder thresholds in config, e.g.: any group > 70% of routed cases → red; > 50% → yellow; else green. Flag thresholds with a `# TODO: validate with SME (L. Arquette)` comment. _(`reviewBalanceThresholds` in `js/config.js`; `computeReviewBalance` rewritten to routing-skew.)_
- [x] Replace the static “sample limited” text with the stoplight component. _(Color always shown; small samples flagged "Indicative" rather than suppressed — per "Color + sample caveat" decision.)_
- [x] Click/hover reveals the underlying distribution (simple bar or percentage breakdown). _(Clicking/Enter on the Review Balance pill toggles a per-destination bar breakdown.)_

**Acceptance criteria**

- Stoplight renders from data, not hardcoded; drill-down shows the distribution; thresholds documented in config. ✅

**Implementation note:** "Review Balance" was redefined from jurisdiction high-risk spread to routing-distribution skew (share of routed cases in the single most-used destination queue). On the 10-case demo the top group is exactly 50% → **Green**, flagged indicative on the synthetic sample. Tests: `tests/unit/review-balance.test.js` (new) + updated guard in `tests/unit/occ-retarget.test.js`.

-----

### MP-07 — FFIEC handbook terminology audit

**Priority:** P1 · **Effort:** S–M

**Tasks**

- [ ] Extract every user-facing string (labels, headers, indicator names, disposition names, tooltips) into a single inventory (`/docs/terminology-audit.md`).
- [ ] Audit each against FFIEC BSA/AML Examination Manual language for: SARs, CTRs, recordkeeping, transaction testing, completeness, data lineage, examiner review.
- [ ] Fix mismatches; mark uncertain terms `NEEDS SME` for Lisa’s review.
- [ ] Centralize remaining hardcoded strings while you’re in there (pays off when Lisa requests wording changes).

**Acceptance criteria**

- Audit doc committed with verified/changed/NEEDS-SME status per term; no user-facing string outside the central copy layer.

-----

### MP-08 — Methodology drill-down (decide at Friday demo)

**Priority:** P2 · **Effort:** S · **Depends on:** MP-03

If Jennifer/Paul want the math accessible: enable the config flag from MP-03, style the expander as clearly secondary (“Methodology”), default collapsed. If not, leave the flag off. Either way, no work before Friday’s decision.

-----

### MP-09 — SME feedback intake (placeholder)

**Priority:** P2 · **Effort:** TBD

After Lisa’s review: log every request as a new ticket, but per Jennifer’s decision do NOT expand prototype scope (e.g., additional disposition options) before the OCC presentation unless she explicitly re-prioritizes. Likely areas: dispositions, terminology, stoplight thresholds, proposed-next-steps wording.

-----

## SPRINT 3 — Parallel / non-blocking

### MP-10 — Document the build methodology

**Priority:** P2 · **Effort:** M

Write up the prompt-driven rapid-prototyping approach (`/docs/build-methodology.md`): toolchain (Copilot + prompting), iteration loop, how it bypassed wireframe/requirements phases, elapsed effort. This is ammunition for the operationalization conversation Jennifer wants to have with the technology group — and de-risks the single-person dependency on you.

-----

## Quick reference — definition of done for Friday

- [ ] MP-01 Tabs consolidated
- [ ] MP-02 Findings / Proposed Next Steps / Examiner Decision structure + disclaimers
- [ ] MP-03 No raw stats in default view; qualitative bands live
- [ ] MP-04 Lineage resized; workspace spacing clean
- [ ] MP-05 Dry run clean; demo script committed; Jennifer pinged Tuesday; repo tagged