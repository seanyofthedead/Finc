---
title: "feat: Expand Derived Signal Table to all ER-graph entities"
type: feat
status: completed
date: 2026-04-22
revised: 2026-04-22
execution: test-first
---

# Expand Derived Signal Table to all ER-graph entities

## Overview

Today the Signal Engineering tab's **Derived Signal Table** shows exactly 10 rows — one per flagged case. The Entity Relationship Network graph renders 212 entities. This plan expands the table to mirror the graph's population (narrows with the typology filter), preserves existing case-row numbers byte-for-byte (demo fidelity), and adds a small set of UX affordances so 200+ rows remain purposeful — not a generic data grid.

The plan is **test-first**: every feature-bearing Implementation Unit specifies failing tests to write *before* code changes. A characterization snapshot of today's 10-case output is committed first (as its own step), locking demo fidelity before any formula edit.

## Problem Frame

From the consistency audit (see `C:\Users\peder\.claude\plans\role-you-are-a-synthetic-neumann.md`): the Signal table and the ER graph are intentionally over different populations. The user asked for a wider table and chose the "mirror the ER graph" scope option during planning.

### Analyst job-to-be-done (for rows that are not flagged cases)

Non-case rows serve **discovery and baseline-comparison**: the analyst wants to see whether an uncased entity is quietly near the signal band of a real case (possible next case), and to use the broader population as a peer-comparison backdrop for the curated 10. The table therefore functions as a **per-entity feature explorer with a case overlay**, not as a case worklist. Design treatments below follow from this framing: the 10 case subjects must remain visually prominent even inside a 212-row view, and non-case rows must *look* like context, not candidates misrepresenting themselves as cases.

### Alternative considered and rejected

The audit could have been resolved in the opposite direction — contract the ER graph to the 10 case subjects and their 1-hop counterparties — yielding parity-of-framing at a fraction of the work. The user explicitly chose the expansion direction during planning because the graph's "everything in the intelligence dataset" framing is the product story; cropping it would weaken the graph. Recorded here so the next planner sees the decision, not just the result.

### What must not change

- Demo fidelity: the 10 existing flagged-case rows render with **exactly the same** derived values today's code produces.
- The ER graph, the typology-filter UI, and routing logic.
- Data-file schema or the dataset itself.

## Requirements Trace

- **R1.** Derived Signal Table covers the same entity population the ER graph renders at any given time (parity with `engine.getFilteredGraph()` across typology filters).
- **R2.** The 10 existing flagged-case rows render with identical `derived.*` values to the pre-change function (formula parity, demo fidelity).
- **R3.** Non-case rows render Velocity, Jurisdiction risk, Ownership, Peer deviation, Cross-border flag. Case-only fields (typology pill, risk score, raw inputs, enrichment, why-flagged) are hidden on non-case rows, not shown as "—" text (design decision — see KTD).
- **R4.** Table supports text search (entity name or ID), column-header sort, and fixed-height scroll with a sticky header. No pagination.
- **R5.** When the typology filter changes from any entry point (Analytics bar, command palette, or other), the Signal table re-renders in lockstep with the graph.
- **R6.** Clicking any row (case or non-case) populates the detail panel and sparklines for that entity without throwing, without flicker, and without stale state from a prior selection.
- **R7.** **Test coverage, written first**, asserts: row-count parity with the graph, case-row value preservation (characterization snapshot), non-case entity-only fallback formulas, empty-filter / empty-search paths, selection-state lifecycle, keyboard sort activation, and typology-filter propagation.
- **R8. (a11y)** Sort column headers are keyboard-operable: `tabindex="0"`, activation via Enter or Space, `aria-sort` reflects current direction. Search input is standard `<input>` (already accessible). Row click-target has no keyboard requirement beyond what the existing tab already provides.
- **R9. (discoverability)** A first-time viewer opening the tab with default sort can distinguish the 10 case-subject rows from background entities without interaction. Concretely: case rows surface first in default sort order, and carry a non-color visual accent (left-border + case-ID chip) that survives sort-by-other-column.

## Scope Boundaries

- **Not** changing the ER graph, typology filter UI, heatmap, routing logic, policy sliders, or workspace.
- **Not** redefining what engineered features mean across rows — two-track formulas are the deliberate decision (see KTD).
- **Not** adding a "Cases only / All entities" toggle in this change. Noted as a reasonable follow-up if user discovery feedback warrants it; excluded here to keep the plan bounded.
- **Not** adding pagination or virtualization. ~520-row demo-fixtures ceiling is within plain-scroll territory.
- **Not** adding arrow-key row navigation. Sort-header keyboard support (R8) is the minimum a11y bar.
- **Not** editing `data/ground-truth-labels.json`, demo-fixtures activation behavior, or the 60-edge graph cap.
- **Not** editing the `.txt` source duplicates (`js/app.txt`, `js/engine.txt`, etc.) — separate cleanup.

## Context & Research

### Relevant Code and Patterns (function-name anchored)

> Line numbers drift as code evolves; grep the function/identifier if citations don't match. Feasibility review found the previous revision's line numbers were off by 10–22 lines — anchors below are stable across drift.

- **`js/engine.js` → `deriveFeatures(data)`** — currently iterates `data.flaggedCases.map(...)`. The choke point; will iterate a passed-in entity list instead.
- **`js/engine.js` → `buildTransactionStats(data)`** — already initializes `byEntity[e.id]` for every entity; no change needed.
- **`js/engine.js` → `buildSignalSeries(data, caseId, stats)`** — today resolves `caseRecord = flaggedCases.find(c => c.caseId === caseId)` then uses `caseRecord.entityId` for all downstream math. Factor into an entity primitive with a caseId wrapper.
- **`js/engine.js` → `filterGraphByTypology(data, typology)`** — reuse directly for R1 parity. When the typology has zero flagged cases, returns `{ nodes: [], edges: [] }`.
- **`js/engine.js` → `getDerivedFeatures()` export** — wrapper to change to read `state.selectedTypology` and pass the narrowed entity list to `deriveFeatures`.
- **`js/engine.js` → `getFilteredGraph()` export** — canonical source for parity assertions.
- **`js/engine.js` → `state.selectedTypology`** — filter state already centralized.
- **`js/engine.js` → `signalSeriesCache`** — existing caseId-keyed memoization. Mirror pattern for entity-keyed cache (promoted from deferred to required — see KTD).
- **`js/app.js` → `appState.selectedFeatureCase`** — rename to `selectedFeatureEntity`. Exhaustive grep before commit.
- **`js/app.js` → `renderSignalEngineering()`** — table renderer.
- **`js/app.js` → `renderSignalDetail()`** — detail panel.
- **`js/app.js` → `renderTypologyFilters()`** — filter-bar click handler. Add `renderSignalEngineering()` to the callback.
- **`js/app.js` → command-palette typology handler** — second `engine.setTypologyFilter(t)` call site. Add `renderSignalEngineering()`. **Ordering note (P0 from review):** the command-palette handler also calls `setScreen('screen-analytics')`. Invoke `renderSignalEngineering()` **before** `setScreen()` so the Signal tab is warm if the user later navigates back to it; `renderAnalytics()` fires post-navigation as today. Do not add conditional logic on the active screen.
- **`js/app.js` → `emptyState(opts)` helper** — reuse for empty-state rendering in Unit 7.
- **`js/app.js` → `typologyPillClass()`** — DO NOT call for null typologyTag (returns "risk-low" default, which misleads). Use explicit branch.
- **`index.html`** — Signal Engineering section (`#screen-signals`) — add search input, wrap table in scroll container with `border-collapse: separate`, mark headers sortable.
- **`css/styles.css`** — new classes for the scroll wrapper, sort-header states, and case-row accent.
- **`tests/unit/signal-series.test.js`** — preserve byte-for-byte; add new cases for entityId variant.
- **`tests/setup.js`** — loads all core modules into jsdom. No change.

### Institutional Learnings

- The consistency audit established the precedent: for data shown across tabs, thread the canonical source + canonical filter through every consumer. Don't duplicate state.
- `demo-fixtures.js` can swell `entities` to **~520** when activated via query param (verified against `while (entities.length < 520)`). Search/sort/scroll must work at 520, not just 212.
- Sticky `<thead>` inside `overflow-y: auto` interacts with `border-collapse: collapse` — sticky cells lose their bottom border during scroll. The new wrapper must scope `border-collapse: separate; border-spacing: 0;` to avoid this quirk.

### Typology reality check (feasibility review)

Stock `js/data.js` flagged cases use typologies: **Sanctions Evasion, TBML, Crypto Layering, Unusual Velocity**. Notably **no "Structuring" flagged cases**. Tests and manual verification steps use **Crypto Layering** for the "narrows to a non-empty subset" scenario and **Structuring** specifically for the "zero-match empty-state" scenario — not the other way around.

## Key Technical Decisions

### Population & formulas

- **Scope:** Table population = entities in `engine.getFilteredGraph().nodes`. Reuses a tested code path rather than a parallel filter.
- **Two-track formulas:** Case-subject rows keep today's enriched formulas unchanged; non-case rows use entity-only fallbacks (`riskScore=0`, `typologyFactor=1`, `jurisdictionRelevance=0`). **Preserves R2 demo fidelity.** The UX risk — mixed semantics in one column — is addressed below.
- **Mixed-semantics UX treatment:** A small provenance icon (`info` glyph, existing `FinCENIcons.render('info')` pattern) sits beside each case-row's numeric cells that depend on case inputs (Velocity, Ownership, Peer deviation, Jurisdiction). Tooltip reads: *"Case-enriched: formula includes risk-score and typology factor."* Non-case rows show no icon. The Signal Engineering card's existing `.th-info` tooltip pattern is the style reference.
- **Row primary key = `entityId`.** Every entity has exactly one row. `caseId` becomes nullable overlay metadata.

### Default sort, selection, and case-row prominence

- **Default sort is compound:** `caseId-non-null DESC, transactionVelocityScore DESC`. This surfaces all 10 case subjects at the top of the default view, ordered by velocity within cases, then all non-case entities in velocity-desc order. R9 satisfied without extra UI controls.
- **Case-row visual accent (R9, non-color):** case-subject rows get a 3px left-border in the typology-pill color and a leading monospace case-ID chip (e.g., `CASE-2001`) before the entity name. The accent survives any column sort — if the user sorts by Jurisdiction, case rows still visually stand out anywhere they appear in the ordering.
- **Sort direction defaults (by column type):** alphabetical columns (Entity name, Jurisdiction) default to **ascending** on first click. Numeric/score columns (Velocity, Ownership, Peer deviation) default to **descending**. Compound default sort is only the *initial* state — any user click switches to a single-column sort with the type-appropriate default.
- **aria-sort** on each sortable `<th>`: `"none"`, `"ascending"`, or `"descending"`. Updated on every sort change. Exactly one header may have a non-`"none"` value at a time (except the initial compound sort, which sets `aria-sort="descending"` on Velocity and leaves the caseId-presence sort implicit).

### Selection state lifecycle (five explicit phases)

1. **Initial load:** if `appState.selectedFeatureEntity` is null, select the first row after default sort (a case subject). If the features list is empty, selection stays null; detail panel shows empty-state placeholder.
2. **User clicks a row:** set `appState.selectedFeatureEntity = row.entityId`. Re-render detail. Scroll position unchanged.
3. **User changes search:** if the currently selected entity is still in the filtered list, keep selection and scroll-into-view. If not, fall back to first visible row. Empty filtered list → selection null; detail panel shows placeholder.
4. **User changes typology filter (any entry point):** if the currently selected entity is still in the new filtered list, preserve selection and scrollTop. Otherwise, reset to default-sort first row (a case subject if any exist in the filter), scroll to top, scroll the new selection into view.
5. **User changes tab away and back (no filter change in between):** preserve both selection and scrollTop.

### Empty states (three reachable paths, explicit copy)

- **Empty typology filter** (e.g., user picks "Structuring" — zero flagged cases match): render `emptyState({ icon: "filter", title: "No entities match this typology", body: "Pick a different typology above, or select 'All' to see the full graph." })` in place of `<tbody>`. Detail panel: `"Select a row to see derived signals."`
- **Empty search** (search string narrows to zero rows): render `emptyState({ icon: "search", title: "No matches for '" + query + "'", body: "Clear the search or try an entity name fragment." })` with a visible "Clear search" button/link.
- **Engine returns null for entity series** (`getSignalSeriesByEntity(entityId)` → null — shouldn't happen for entities from the table, but guarded): detail panel shows entity name + `"No signal data available for this entity."` No sparkline canvas draw.

### Per-entity signal series

- **Required caching** (promoted from deferred): new `entitySignalSeriesCache` mirrors the existing `signalSeriesCache` pattern. Keyed by `entityId`. Same engine lifetime.
- **Return contract:** `getSignalSeriesByEntity(entityId)` returns the same shape as `getSignalSeries(caseId)`. For non-case entities the returned object has `caseId: null` (field always present; this is the contract). For case entities queried via the by-entity API, `caseId` resolves to the overlay case's ID (`caseByEntityId[entityId].caseId`).
- **Render-cycle flicker guard:** `renderSignalDetail()` reads the current `appState.selectedFeatureEntity` at the *top* of the function. Before drawing each sparkline canvas, re-check that `appState.selectedFeatureEntity` still matches the row being rendered. If not, abort this draw. Prevents A-then-B rapid clicks from leaving A-sparklines under B's header.

### Scroll & responsive layout

- Table wrapper: `max-height: 480px` (tune if needed in implementation), `overflow-y: auto`, `border-collapse: separate` + `border-spacing: 0` scoped to the wrapper (fixes the sticky-header border quirk).
- `<thead>` cells: `position: sticky; top: 0; background: <card-surface>;` — the sticky background masks the scrolled row content.
- **Responsive:** at viewports narrower than `768px`, the Signal Engineering two-column grid stacks (table above, detail below) using the existing grid-column fallback pattern in `css/styles.css`. `max-height` on the wrapper switches to `50vh` in the stacked layout.

### Performance & rendering

- `engine.getDerivedFeatures()` recomputes stats on every call (via `buildTransactionStats`). At 520 entities × each keystroke during search, this is measurably fine in local profiling (<5ms) but flagged for future memoization if demo-fixtures mode shows lag.
- No progressive render / skeleton — a synchronous 520-row render in the jsdom and Chromium environments measures <100ms. If implementation reveals a visible hitch, add a one-frame "Rendering N entities…" placeholder; otherwise skip.

## Open Questions

### Resolved During Planning

- Scope = mirror the ER graph. ✓
- Two-track formulas preserve R2. ✓
- Primary key = entityId. ✓
- Default sort = compound (caseId-non-null first, velocity-desc). ✓
- Case-row visual accent = left-border + case-ID chip. ✓
- Three empty states specified with copy. ✓
- Selection lifecycle covers five phases. ✓
- Sort-header keyboard a11y in scope. ✓
- Cases/All toggle **not** in scope (follow-up). ✓

### Deferred to Implementation

- Exact `max-height` of scroll wrapper — tune visually; start at 480px.
- Sort-indicator icon — use existing `FinCENIcons.render('chevron-up'/'chevron-down')` if present; otherwise Unicode `▲`/`▼`. Pick whichever is already in the icon set.
- Whether to remove `emptyState({ icon: "filter", ... })` when "filter" icon doesn't exist in the icon set — fall back to `"search"` icon. Grep the icon set during implementation.

## High-Level Technical Design

> *Directional guidance for review. Not implementation spec.*

```
                            data.entities  (212)
                                   │
                                   ▼
   ┌──────────────────────────────────────────────────────────────┐
   │ engine.getDerivedFeatures()                                  │
   │                                                              │
   │   filteredNodes = filterGraphByTypology(                     │
   │                     data, state.selectedTypology).nodes      │
   │                   ← SAME population as ER graph              │
   │                                                              │
   │   caseByEntityId = index(flaggedCases, c => c.entityId)      │
   │                                                              │
   │   return filteredNodes.map(node =>                           │
   │     computeEntityFeatures(node, stats, data) ⊕               │
   │     (caseByEntityId[node.id]                                 │
   │        ? caseOverlay(caseByEntityId[node.id])                │
   │        : EMPTY_OVERLAY))                                     │
   └──────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
   rows: [{ entityId, entityName, entityKind, jurisdiction,
            caseId | null, typologyTag | null, riskScore | null, ...,
            derived: { transactionVelocityScore, jurisdictionRiskScore,
                       beneficialOwnershipNetworkScore,
                       peerGroupDeviation, crossBorderExposureFlag },
            _caseEnriched: bool   ← drives provenance-icon display }]
                                   │
                                   ▼
   ┌──────────────────────────────────────────────────────────────┐
   │ renderSignalEngineering()                                    │
   │                                                              │
   │  features   = engine.getDerivedFeatures()                    │
   │  searched   = applySearch(features, appState.signalSearch)   │
   │  sorted     = applySort(searched, appState.signalSort)       │
   │                                                              │
   │  if (sorted.length === 0)                                    │
   │    render(emptyState branch for search or filter)            │
   │  else                                                        │
   │    render(rows, with case-accent on caseId != null)          │
   │                                                              │
   │  ensureSelection(sorted)  // see 5-phase rules               │
   └──────────────────────────────────────────────────────────────┘
                                   │  onRowClick(entityId)
                                   ▼
   ┌──────────────────────────────────────────────────────────────┐
   │ renderSignalDetail()                                         │
   │                                                              │
   │  const current = appState.selectedFeatureEntity              │
   │  if (!current) render placeholder; return                    │
   │                                                              │
   │  row = features.find(r => r.entityId === current)            │
   │  series = engine.getSignalSeriesByEntity(current)            │
   │                                                              │
   │  render always: Entity, Kind, Jurisdiction, Velocity,        │
   │                 Peer Deviation                               │
   │  render only if row.caseId: Case, Typology, Raw Inputs,      │
   │                             Why Flagged, Enrichment          │
   │  draw sparklines — flicker guard before each canvas          │
   └──────────────────────────────────────────────────────────────┘

   Filter-change propagation:
     setTypologyFilter(t) [bar]     → setPathHighlight(null)
                                    → renderAnalytics()
                                    → renderRouting()
                                    → renderSignalEngineering()  ← NEW

     setTypologyFilter(t) [cmdk]    → renderSignalEngineering()  ← NEW
                                    → setScreen('screen-analytics')
                                    → renderAnalytics() (via setScreen)

   Keyboard & a11y:
     <th role="columnheader" tabindex="0" aria-sort="none|asc|desc">
     Enter / Space → toggleSort(column)
```

**Formula shape** (unchanged from prior revision; reproduced here for review):

```
s          = stats[entity.id]                             // entity-universal
jurBase    = (data.jurisdictionRisk[entity.jurisdiction] ?? 0.35) * 100
overlay    = caseByEntityId[entity.id]                   // may be null
rs         = overlay?.riskScore              ?? 0
jurRel     = overlay?.jurisdictionRelevance  ?? 0
typFactor  = overlay ? (data.typologySeverity[overlay.typology] ?? 1) : 1

velocity        = clamp(round((s.txCount * 3.4 + rs * 0.24) * typFactor), 0, 100)
ownership       = clamp(round(s.peerSet.size * 9 + jurRel * 0.35),         0, 100)
peerDeviation   = clamp(round(abs(rs - (50 + s.txCount)) * 0.92),          0, 100)
jurisdictionRsk = clamp(round(jurBase + jurRel * 0.2),                     0, 100)
crossBorder     = s.crossBorder >= 4
```

Case rows: identical to today's math.
Non-case rows: rs=0, jurRel=0, typFactor=1.

## Implementation Units

**Execution posture: test-first.** Every feature-bearing unit specifies the failing test to write *before* the code change.

---

- [ ] **Unit 0: Lock characterization snapshot of today's 10-case output**

  **Goal:** Capture the exact `derived.*` values today's `deriveFeatures()` produces for the 10 stock flagged cases. This snapshot is the regression tripwire that guards R2 across Units 1–6.

  **Requirements:** R2, R7

  **Dependencies:** None. **Commit before Unit 1.**

  **Files:**
  - Create: `tests/unit/derive-features-characterization.test.js`

  **Approach:**
  - Load the unmodified engine + stock `FinCENData` via `tests/setup.js`.
  - Call `engine.getDerivedFeatures()` once.
  - For each of the 10 case rows, assert exact equality on `caseId`, `entityId`, `typologyTag`, and every `derived.*` field. Use `toBe` (strict equality) for primitives and `toEqual` for the derived object.
  - Include the `riskScore`, `confidence`, `contributingFeatures.length`, `rawInputs.length`, `enrichmentSources.length` for each case — these feed the formulas.

  **Execution note:** **Commit this test file on its own before any engine edit**, so CI locks the baseline. Every subsequent unit runs `npm test` as the gate — this file must stay green.

  **Test scenarios:**
  - Ten case assertions (one per `CASE-2001..CASE-2010`) with a strict equality snapshot of the full derived-field set.
  - File passes against the current `js/engine.js`. (Goal: this test is GREEN before Unit 1 begins.)

  **Verification:**
  - `npm test -- derive-features-characterization` — 10 assertions pass against unmodified engine.
  - Commit message: `test: lock derive-features characterization snapshot for R2 regression guard`.

---

- [ ] **Unit 1: Extend `deriveFeatures()` to cover all entities (two-track formulas)**

  **Goal:** Return one feature record per entity, preserving case-row values byte-for-byte (Unit 0's snapshot stays green) while computing entity-only formulas for non-case rows.

  **Requirements:** R1, R2, R3, R7

  **Dependencies:** Unit 0.

  **Files:**
  - Modify: `js/engine.js` (`deriveFeatures` function; `getDerivedFeatures` export stays thin, Unit 2 handles filter wiring)
  - Modify: `tests/unit/derive-features-characterization.test.js` — no edits; must stay green
  - Create: `tests/unit/derive-features-extended.test.js` — new tests for entity-row extension

  **Approach:**
  - `deriveFeatures(data, entityList)` signature: iterate `entityList || data.entities`. (Filtering happens in Unit 2; keep this unit's signature additive.)
  - Build `caseByEntityId = indexById(data.flaggedCases, c => c.entityId)` using existing `indexById` helper.
  - For each entity, compute universal features from `stats[entity.id]` + `jurisdictionBase`. Read overlay from `caseByEntityId[entity.id]`; use null-coalescing defaults (`rs=0`, `jurRel=0`, `typFactor=1`) as in HLD formula shape.
  - Set `_caseEnriched: Boolean(overlay)` on each row so the UI can render provenance icon without recomputing.
  - Nullable fields when no overlay: `caseId`, `typologyTag`, `riskScore`, `confidence`, `whyFlagged`, `rawInputs`, `enrichmentSources`, `contributingFeatures`. New fields always populated: `entityId`, `entityName`, `entityKind`, `jurisdiction`.

  **Execution note:** **Test-first.** Write `tests/unit/derive-features-extended.test.js` with failing tests, confirm red, then edit `engine.js` to green. Run full suite including Unit 0 snapshot at each step.

  **Patterns to follow:**
  - `indexById()` helper (existing).
  - `buildTransactionStats()` (unchanged, entity-universal).
  - `clamp()` / `round()` (existing).

  **Test scenarios (all written before code change):**
  - Row count = `data.entities.length` when no `entityList` argument.
  - Row count = `entityList.length` when passed.
  - Each of the 10 case subjects has `_caseEnriched: true`; the remaining 202 have `_caseEnriched: false`.
  - Non-case row nullable-field set: `row.caseId === null && row.typologyTag === null && row.riskScore === null && row.whyFlagged === null && row.rawInputs === null && row.enrichmentSources === null && row.contributingFeatures === null`.
  - Non-case row universal fields non-null: `row.entityId`, `row.entityName`, `row.entityKind`, `row.jurisdiction` are strings.
  - Non-case row formula: `row.derived.transactionVelocityScore === clamp(round(stats.txCount * 3.4), 0, 100)`.
  - Non-case row `derived.crossBorderExposureFlag === (stats.crossBorder >= 4)`.
  - Non-case row `derived.peerGroupDeviation === clamp(round(Math.abs(0 - (50 + stats.txCount)) * 0.92), 0, 100)` (verifies rs=0 substitution).
  - Two entities with identical `txCount` but different jurisdictions produce different `derived.jurisdictionRiskScore`.
  - **Characterization still green.**

  **Verification:**
  - `npm test` — Unit 0 snapshot + new extended tests both pass.
  - Spot-check one case row and one non-case row in vitest output.

---

- [ ] **Unit 2: Thread typology-filter parity into `getDerivedFeatures()`**

  **Goal:** The row set returned by `engine.getDerivedFeatures()` equals — exactly — the node set returned by `engine.getFilteredGraph()` under the same typology filter state.

  **Requirements:** R1, R5, R7

  **Dependencies:** Unit 1.

  **Files:**
  - Modify: `js/engine.js` (`getDerivedFeatures` export)
  - Extend: `tests/unit/derive-features-extended.test.js`

  **Approach:**
  - In `getDerivedFeatures()`, call `filterGraphByTypology(data, state.selectedTypology)` and map `.nodes` → entity records (via `indexById(data.entities)`). Pass that list into `deriveFeatures(data, entityList)`.
  - `"All"` passes through `filterGraphByTypology` as `buildGraph(data)` (full 212 nodes) — no special-case code needed in the wrapper.

  **Execution note:** **Test-first.** Parity test is the core of R1; write it before touching `getDerivedFeatures()`.

  **Test scenarios:**
  - **Bidirectional parity (R1, durable — not literal row count):** for each typology in `data.typologies` *and* for `"All"`, after `engine.setTypologyFilter(t)`, `getDerivedFeatures().map(r => r.entityId).sort()` deep-equals `engine.getFilteredGraph().nodes.map(n => n.id).sort()`.
  - **Crypto Layering narrows to a non-empty subset** — at least 4 cases have this typology in stock data, so the subset is measurable. Row count < `data.entities.length`.
  - **Structuring yields `[]`** (zero flagged cases of this typology in stock data) — `getDerivedFeatures()` returns `[]` without throwing. Empty-state shadow-path test.
  - **"All" restores the full population:** `getDerivedFeatures().length === data.entities.length`.

  **Verification:**
  - `npm test` — all new parity tests green.
  - Manual (after UI units): open Analytics, apply Crypto Layering filter, switch to Signal Engineering, confirm row count matches the ER graph node count displayed.

---

- [ ] **Unit 3: Per-entity signal series with required caching**

  **Goal:** `engine.getSignalSeriesByEntity(entityId)` returns the same shape as `engine.getSignalSeries(caseId)`. Caching is required (not deferred). Existing by-case API stays byte-compatible.

  **Requirements:** R6, R7

  **Dependencies:** Unit 0 (safety net for `getSignalSeries` behavior). Unit 1 is unrelated — can land in parallel with Unit 1 but must precede Unit 4.

  **Files:**
  - Modify: `js/engine.js` (extract `buildSignalSeriesForEntity(data, entity, stats)` from `buildSignalSeries`; add `entitySignalSeriesCache`; add `getSignalSeriesByEntity` to the engine export; leave `getSignalSeries` as a thin caseId→entity wrapper that preserves `caseId` in the return)
  - Extend: `tests/unit/signal-series.test.js` — add entity-keyed cases alongside existing 9 tests (do not edit existing tests)

  **Approach:**
  - Factor out `buildSignalSeriesForEntity(data, entity, stats)`. It takes the entity record directly (not an ID lookup) — all existing math below lines ~342 of `buildSignalSeries` uses only `entity`. The returned object includes `caseId: null` by default; the wrapper that calls this for a known case sets `caseId: <caseId>` on the returned object before returning.
  - `buildSignalSeries(data, caseId, stats)` becomes: find case → find entity → delegate to `buildSignalSeriesForEntity(data, entity, stats)` → set `result.caseId = caseId` → return. Identical behavior and shape as today.
  - `entitySignalSeriesCache` mirrors `signalSeriesCache`. Keyed by `entityId`.
  - **Return contract clarified:** both APIs always include a `caseId` field. For `getSignalSeries(caseId)`, it's the input. For `getSignalSeriesByEntity(entityId)`, it's `null` if the entity isn't a case subject, or the matching case's `caseId` if it is (resolved via `caseByEntityId[entityId]`).

  **Execution note:** **Test-first.** Write the new entity tests; they should fail until the method exists.

  **Test scenarios (extend `signal-series.test.js`):**
  - All 9 existing `getSignalSeries(caseId)` tests still pass.
  - `engine.getSignalSeriesByEntity("E0147")` (a case subject — CASE-2001) returns a series whose `velocity.values` and `peerDeviation.values` equal `engine.getSignalSeries("CASE-2001")` arrays. `caseId === "CASE-2001"`.
  - `engine.getSignalSeriesByEntity("E0005")` (a non-case entity in stock data) returns a valid series: `typeof summary.txPerDay === "number"`, `Number.isFinite(summary.peerZ)`, `caseId === null`.
  - `engine.getSignalSeriesByEntity("E_DOES_NOT_EXIST")` returns `null` (matches existing null-for-unknown behavior).
  - **Cache identity:** `engine.getSignalSeriesByEntity("E0005") === engine.getSignalSeriesByEntity("E0005")` (same object reference on second call).
  - **Cross-cache consistency:** calling `getSignalSeries("CASE-2001")` then `getSignalSeriesByEntity("E0147")` both return series with matching numeric values (they may be different object references; caches are independent).

  **Verification:**
  - `npm test -- signal-series` — 9 existing + ~5 new tests green.

---

- [ ] **Unit 4: Entity-keyed Signal Engineering renderer (with flicker guard, empty states, selection lifecycle)**

  **Goal:** `renderSignalEngineering()` and `renderSignalDetail()` work on entity IDs. Case-only detail fields hide when `caseId` is null. All three empty states render explicit copy. Selection lifecycle follows the 5-phase spec. Sparkline render is flicker-guarded.

  **Requirements:** R3, R6, R7 (plus the UI-level parts of R1/R5)

  **Dependencies:** Units 1, 2, 3.

  **Files:**
  - Modify: `js/app.js` (`appState.selectedFeatureCase` → `selectedFeatureEntity`; `renderSignalEngineering()`; `renderSignalDetail()`)
  - Create: `tests/unit/signal-render.test.js`

  **Approach:**
  - Rename `selectedFeatureCase` → `selectedFeatureEntity`. **Exhaustive grep** the repo (not just `js/app.js`; include `js/app.txt` for awareness, tests, etc.) to confirm no straggler reference remains.
  - `renderSignalEngineering()`:
    - Fetch `features = engine.getDerivedFeatures()`. Store on closure-scoped array used by search/sort (Unit 5 will apply those filters; Unit 4 can leave them as pass-through identity).
    - **Empty-filter branch** (`features.length === 0`): clear `<tbody>`; inject `emptyState({ icon: "filter", ... })` as the only child. Set `appState.selectedFeatureEntity = null`. Call `renderSignalDetail()` which handles the null path.
    - **Populated branch:** render one `<tr>` per feature. Row HTML includes:
      - Left-border accent + case-ID chip when `f._caseEnriched`.
      - Entity cell: entity name (and kind as aria-label hint for a11y).
      - Velocity / Jurisdiction / Ownership / Peer deviation cells — values from `derived`. For case-enriched cells, include the provenance info-icon.
      - Typology cell: case rows render the pill via `typologyPillClass(f.typologyTag)`; non-case rows render an empty cell (no "—"; visual absence > textual placeholder per R3).
      - Cross-border: Yes/No.
    - Row click handler: `appState.selectedFeatureEntity = f.entityId`; apply `.selected` class; call `renderSignalDetail()`.
    - Selection ensure step (phase 1 + 3 + 4): if `appState.selectedFeatureEntity` is still in the current feature set, keep it; else fall back to first row (which will be a case subject under compound default sort).
  - `renderSignalDetail()`:
    - **Flicker-guard top-line:** capture `const currentEntity = appState.selectedFeatureEntity;`. If null → render placeholder `"Select a row to see derived signals."`; clear sparkline canvases; return.
    - Find row: `features.find(r => r.entityId === currentEntity)`.
    - Render universal rows: Entity, Kind, Jurisdiction, Velocity, Peer Deviation (mean + peak).
    - Conditionally render when `row.caseId != null`: Case ID, Typology pill, Why Flagged, Raw Inputs, Enrichment Sources.
    - `const series = engine.getSignalSeriesByEntity(currentEntity);` — if null, render "No signal data available for this entity." in the sparkline region; return.
    - Before drawing each sparkline canvas: re-check `appState.selectedFeatureEntity === currentEntity`. If mismatch, abort (user has since clicked another row).

  **Execution note:** **Test-first.** Write the DOM-level tests (see scenarios) against the existing Signal-tab HTML (load into jsdom via the existing setup pattern in `tests/setup.js`), confirm red for new behavior, then edit `js/app.js`.

  **Test scenarios:**
  - With a stub `engine.getDerivedFeatures()` returning N rows (mix case + non-case), `renderSignalEngineering()` produces exactly N `<tr>` in `#feature-table-body` and no `—` text in non-case typology cells.
  - Case rows carry `.signal-row--case-enriched` class (drives left-border accent + case-ID chip in CSS); non-case rows don't.
  - Clicking a case row sets `appState.selectedFeatureEntity` to the row's entityId; detail panel renders Case / Typology / Raw Inputs sections. Sparklines draw without throwing (canvas stub OK).
  - Clicking a non-case row sets `selectedFeatureEntity`; detail panel shows Entity / Kind / Jurisdiction / Velocity / Peer Deviation. Case / Typology / Raw Inputs / Enrichment sections are **absent from the DOM** (not empty-with-dash).
  - With `features = []`, `#feature-table-body` contains exactly one empty-state element; `selectedFeatureEntity` is null; detail panel shows "Select a row…" placeholder.
  - Selection survives a no-op re-render (call `renderSignalEngineering()` twice; `selectedFeatureEntity` unchanged).
  - **Flicker guard:** call `renderSignalDetail()` once, change `appState.selectedFeatureEntity` to a different valid entityId, call again — no exception, second render renders the new entity.
  - Full-repo grep for `selectedFeatureCase` returns zero matches in `js/*.js` after commit.

  **Verification:**
  - `npm test` — new DOM tests + all existing tests green.
  - Manual browser: open Signal Engineering, click a case row (sparklines + full detail with case-ID chip), click a non-case row (sparklines + trimmed detail, no pill).

---

- [ ] **Unit 5: Search, sort, compound default, keyboard a11y, scroll layout, responsive stacking**

  **Goal:** Browsability at 200+ rows. Compound default sort surfaces cases first. Keyboard-operable sort headers satisfy R8. Case-row accent and provenance icon satisfy R9 and the two-track-semantics UX concern. Responsive stacking below 768px.

  **Requirements:** R4, R8, R9, R7

  **Dependencies:** Unit 4.

  **Files:**
  - Modify: `index.html` (Signal Engineering card — add search input wrapper with "Showing N of M" readout, wrap `<table>` in scrollable `<div>`, mark headers with `tabindex="0"`, `role="columnheader"`, `aria-sort="none"`)
  - Modify: `js/app.js` — add `appState.signalSearch` and `appState.signalSort`; search input handler; sort toggle handler; integrate `applySearch` and `applySort` into `renderSignalEngineering()` (they were identity pass-throughs in Unit 4)
  - Modify: `css/styles.css` — `.signal-table-wrapper { max-height: 480px; overflow-y: auto; }`; scoped `border-collapse: separate; border-spacing: 0;`; `.signal-table-wrapper thead th { position: sticky; top: 0; background: var(--card-surface); }`; `.signal-row--case-enriched { border-left: 3px solid var(--typology-accent); }`; `.signal-row--case-enriched .signal-case-chip { ... }`; `.signal-provenance-icon { ... }`; responsive rule `@media (max-width: 768px) { .signals-grid { grid-template-columns: 1fr; } .signal-table-wrapper { max-height: 50vh; } }`
  - Create: `tests/unit/signal-table.test.js`

  **Approach:**
  - `appState.signalSearch: ""`, `appState.signalSort: { column: null, direction: null }` (null sort means compound default).
  - **Compound default sort** (when `signalSort.column === null`): `features.slice().sort((a, b) => (Boolean(b.caseId) - Boolean(a.caseId)) || (b.derived.transactionVelocityScore - a.derived.transactionVelocityScore))`. Case-subjects float to the top; within cases, velocity-desc; non-case tail velocity-desc.
  - **Explicit sort** (user click): `signalSort = { column, direction }`. Sort comparator keys off `row[column]` (entity name / jurisdiction / kind) or `row.derived[column]`. String columns use `.localeCompare`.
  - **First-click direction by column type:** alphabetical (`entityName`, `jurisdiction`, `entityKind`) → `"asc"`; numeric (`transactionVelocityScore`, `jurisdictionRiskScore`, `beneficialOwnershipNetworkScore`, `peerGroupDeviation`) → `"desc"`. Subsequent clicks on the same column toggle direction.
  - **aria-sort**: all headers start `"none"`. When user sorts, target header gets `"ascending"` or `"descending"`; others reset to `"none"`. Under the compound default, Velocity header carries `"descending"` as the visible indicator (caseId-presence sort is implicit / not user-inspectable via aria).
  - **Keyboard activation:** `<th>` with `tabindex="0"`, keydown listener on Enter or Space fires the same toggle handler.
  - **Search:** input event handler updates `signalSearch`; `applySearch` filters by case-insensitive substring match on `entityName` OR `entityId`.
  - **Result-count readout:** `"Showing " + displayedCount + " of " + features.length + " rows"` updates on every render.
  - **Clear-search affordance:** a small "×" button inside the search input (or a `Clear` link next to the readout when search is non-empty) that resets `signalSearch = ""`.
  - **Scroll reset + scroll-into-view (selection phase 4):** after a typology-filter-induced re-render where selection changed to default, call `selectedRowEl.scrollIntoView({ block: "nearest" })`; set `wrapper.scrollTop = 0` first if selection fell back to the first row.
  - **Case-row accent** is pure CSS — rely on the `.signal-row--case-enriched` class Unit 4 writes.
  - **Provenance info-icon** renders inside case-row numeric cells via `FinCENIcons.render('info')`; tooltip text set as `title` attribute on the icon wrapper.

  **Execution note:** **Test-first.** Write `signal-table.test.js` before adding search/sort/a11y code.

  **Test scenarios:**
  - Compound default: with stock data, first 10 rows all have `row.caseId != null`; remaining rows all have `row.caseId === null`. Case rows are in velocity-desc order.
  - Search "bay": result count equals entities whose `entityName` matches `/bay/i` (case-insensitive). "Showing N of M" readout reflects the count.
  - Search "E0005": finds the entity whose ID is `E0005`.
  - Search with zero matches renders empty-state (scenario covered in Unit 4; cross-check here).
  - Click Velocity header: fires sort with direction `"desc"` on first click (column was not previously the explicit sort); second click toggles `"asc"`.
  - Click Jurisdiction header: first click direction `"asc"` (alphabetical column default).
  - Click Entity header → Jurisdiction header: Velocity's `aria-sort` resets to `"none"`, Jurisdiction's becomes `"ascending"`.
  - **Keyboard activation:** focus Velocity header, press Enter → sort fires; press Space → sort toggles. Default-prevent on Space (don't scroll).
  - `aria-sort` state machine: exactly one header has a non-`"none"` value after any user sort click.
  - Scroll wrapper has `overflow-y: auto`; scroll the wrapper; header `getBoundingClientRect().top` stays at wrapper.top ± 1px (sticky header holds position).
  - Viewport resize to 600px wide: `.signals-grid` computed `grid-template-columns` becomes `1fr` (stacked).
  - After changing typology filter such that current selection drops out, `wrapper.scrollTop === 0` and new selected row is visible in viewport (calls `scrollIntoView`).

  **Verification:**
  - `npm test` — all new tests pass.
  - Manual browser: type partial name; click each header; Tab through headers and activate with Enter/Space; resize window below 768px.

---

- [ ] **Unit 6: Filter-change propagation with command-palette ordering**

  **Goal:** `renderSignalEngineering()` fires whenever the typology filter changes, from any entry point. Command-palette path orders the call before `setScreen()` so the Signal tab is ready if the user later navigates back.

  **Requirements:** R5, R7

  **Dependencies:** Units 1, 2, 4, 5.

  **Files:**
  - Modify: `js/app.js` — typology filter bar click handler (`renderTypologyFilters`) and command-palette typology action
  - Extend: `tests/unit/signal-render.test.js` or create `tests/unit/signal-filter-propagation.test.js`

  **Approach:**
  - **Filter bar handler:** after `engine.setTypologyFilter(t)`, call `renderSignalEngineering()` alongside existing `renderAnalytics()` / `renderRouting()`.
  - **Command-palette handler:** order is
    1. `engine.setTypologyFilter(t)`
    2. `renderSignalEngineering()`  ← **new, fires regardless of navigation**
    3. `setScreen('screen-analytics')` (existing)
    which then invokes `renderAnalytics()` through `setScreen`'s standard path.
  - Unit 5's scroll/selection reset logic runs inside `renderSignalEngineering()`, so both entry points share the same selection lifecycle.

  **Execution note:** **Test-first.** Write the propagation tests before editing the handlers.

  **Test scenarios:**
  - Simulate filter-bar click for "Crypto Layering": `#feature-table-body` row count equals `engine.getFilteredGraph().nodes.length`.
  - Simulate filter-bar click for "Structuring": `#feature-table-body` contains the empty-state element; detail panel shows placeholder.
  - Simulate command-palette typology change: same row-count parity as above; `appState.activeScreen === "screen-analytics"` (confirms setScreen still fired); Signal table re-rendered (verify by checking `#feature-table-body` against the new filter).
  - Switch back to "All" from either entry point: row count returns to `data.entities.length`.

  **Verification:**
  - `npm test` — propagation tests pass.
  - Manual browser: apply Crypto Layering from bar, switch to Signal Engineering, confirm table narrowed. Apply "All" from command palette, switch to Signal, confirm table restored.

---

- [ ] **Unit 7: Documentation & copy polish**

  **Goal:** Update the Signal Engineering card's copy so a demo viewer understands the scope shift; update the repo-root architecture note if it references the 10-case scope.

  **Requirements:** R3, R9 (reinforcing)

  **Dependencies:** Units 1–6 complete.

  **Files:**
  - Modify: `index.html` — card lede/hint text on the Signal Engineering masthead
  - Modify (if referenced): `ARCHITECTURE_PLAN.md` at repo root

  **Approach:**
  - Lede copy: change from the current case-centric framing to something like: *"Derived signals for every entity in the intelligence graph — velocity, jurisdiction, ownership, peer deviation — with flagged cases highlighted."* Exact wording chosen during implementation.
  - Grep `ARCHITECTURE_PLAN.md` for phrases like "10 cases" / "flagged cases only" in the signal-engineering context. Update to reflect the new scope.

  **Test scenarios:** n/a — copy only.

  **Verification:**
  - Manual read-through of the Signal Engineering card header in-browser.

---

## System-Wide Impact

- **Interaction graph:** Two filter-change entry points now also trigger `renderSignalEngineering()`. Command-palette path orders re-render before navigation. Initial-load path unchanged.
- **Error propagation:** `deriveFeatures` throws unchanged if `data.entities` is missing. `getSignalSeriesByEntity(null_or_unknown)` returns null; `renderSignalDetail()` handles the null path with an explicit "No signal data available" message.
- **State lifecycle:** `appState.selectedFeatureCase` → `selectedFeatureEntity`. Renaming is the only state-shape change. Grep-gated.
- **API surface:** `engine.getDerivedFeatures()` gains new fields (`entityId`, `entityKind`, `jurisdiction`, `_caseEnriched`). Existing fields become nullable (`caseId`, `typologyTag`, `riskScore`, `rawInputs`, `enrichmentSources`, `whyFlagged`, `contributingFeatures`, `confidence`). No external consumers — grep confirms only `js/app.js` reads this data. `engine.getSignalSeries(caseId)` untouched; new `getSignalSeriesByEntity(entityId)` added.
- **Positioning:** This change repositions Signal Engineering from a case worklist to a per-entity feature explorer. Future case-workflow affordances (assignment, status, bulk triage) should target a different surface or be planned as a deliberate re-addition here.
- **Integration coverage:** The end-to-end path — apply typology filter → switch to Signal → click non-case row → view sparklines → clear filter → confirm row restoration — is covered by Unit 6 tests plus manual pass.

## Risks & Dependencies

- **R2 regression risk (critical):** mitigated by Unit 0 characterization snapshot committed ahead of any formula code change.
- **Structuring-filter empty state:** demonstrates the worst case (zero rows) every time the user picks that filter in the stock dataset. Unit 4 + Unit 6 tests lock the copy and no-throw behavior.
- **Two-track formula UX muddle:** provenance icon + tooltip is a deliberate UX trade-off. If demo-day feedback says it's confusing, escalate to a split-column or Cases-only-toggle in a follow-up; tracked in Scope Boundaries.
- **Stale `selectedFeatureCase` references:** mitigated by grep at end of Unit 4 and a test asserting zero matches in `js/*.js`.
- **Sticky-header border quirk:** addressed by scoped `border-collapse: separate` in Unit 5.
- **Demo-fixtures ~520 rows:** plain scroll + sort + search verified against this ceiling in manual browser pass; virtualization explicitly out of scope.
- **Dependencies:** none external. All changes within `js/engine.js`, `js/app.js`, `index.html`, `css/styles.css`, plus four new or extended test files.

## Documentation / Operational Notes

- Card lede copy update — Unit 7.
- `ARCHITECTURE_PLAN.md` — update references to the 10-row scope if any exist.
- No migration, no rollout flag, no monitoring impact (static demo).

## Sources & References

- Origin: user request after the data-consistency audit.
- Related audit: `C:\Users\peder\.claude\plans\role-you-are-a-synthetic-neumann.md`.
- Previous revision of this plan reviewed by: coherence, feasibility, product-lens, design-lens personas (2026-04-22). 27 findings folded into this revision.
- Key code paths: `js/engine.js` (`deriveFeatures`, `filterGraphByTypology`, `buildSignalSeries`, `signalSeriesCache`); `js/app.js` (`renderSignalEngineering`, `renderSignalDetail`, `renderTypologyFilters`, command-palette typology handler, `emptyState`); `index.html` (`#screen-signals`); `css/styles.css`.
