# Architecture Visualization Plan — Production-Grade FinCEN Platform

## 1. Context

The current repo is a single-process static web demo: `js/data.js` is parsed into `window.FinCENData` at load, consumed synchronously by an in-browser engine, rendered into six investigative screens. For the grad-student demo we want a seventh screen (or a standalone companion artefact) that answers the question **"what would this look like in production?"** — the data sources, the pipelines, the stores, the detection services, the governance surface, and the humans in the loop.

The deliverable is a **plan document** (this file) plus a **concrete implementation spec** for visualising a production-grade data architecture. The plan identifies:

- What components and flows the diagram must depict
- How it will render visually (layout, interactivity, aesthetic)
- Where it lives in the codebase (new tab in the existing app vs. standalone)
- How it is kept in sync with the data + text describing it
- The verification criteria

## 2. Recommended approach

**Add a seventh tab to the app — "07 — Platform Architecture" — rendering a layered, interactive SVG diagram with per-component detail in the existing right-side panel.**

Rationale:

- The grad-student demo already walks through screens 01–06 sequentially. A "what's behind the scenes" screen is the natural closer.
- The architecture is inherently visual — boxes, layers, pipes — which matches the app's graph+canvas vocabulary. SVG is the right medium (crisp at any zoom, interactive per-element, accessible).
- The entity-panel component is already reusable; a component-detail view reuses that UI pattern for zero new UX work.
- The existing aesthetic (dossier / amber / Fraunces / plex-mono) carries over directly.
- Keeping it inside the app means the same keyboard shortcuts, command palette, and theme apply for free.

## 3. What the diagram must show

Seven horizontal bands, top-to-bottom, representing the path of data from origin to analyst action.

### Band 1 — External data sources
- BSA eFiling (SAR, CTR, Form 8300, CMIR) — batch pull
- OFAC, EU, UN, UK HMT sanctions lists — batch pull + webhook deltas
- Bank core systems — change-data-capture streams
- SWIFT gpi / Fedwire / CHIPS — message feed
- ACH / NACHA — batch file ingest
- Blockchain nodes (BTC, ETH) + chain-analytics vendor (Chainalysis / Elliptic / TRM) — hybrid feed
- KYC / CDD vendor APIs (LexisNexis, Refinitiv World-Check, Dow Jones) — on-demand enrich
- Adverse-media / PEP feeds — batch pull
- Trade data (invoices, bills of lading, customs records) — batch
- Telecommunications metadata (call/SMS records via lawful process) — restricted, lawful-access only

### Band 2 — Ingestion fabric
- Stream bus: Apache Kafka (or MSK / Confluent Cloud) — partition-per-feed
- Batch orchestration: Apache Airflow (or Dagster) — DAG-driven
- Schema registry: Confluent Schema Registry / Glue Schema Registry with Avro / Protobuf
- Data-quality gate: Great Expectations suites enforced at the gate; bad-row quarantine topic
- Secrets / credentials broker: Vault / AWS Secrets Manager
- Observability tap at the ingress (OpenTelemetry → Jaeger / Honeycomb)

### Band 3 — Raw storage
- Data lake (S3 / GCS) — raw + typed-bronze zones, Parquet, partitioned by ingest-date × feed
- Iceberg / Delta table catalog over the lake — ACID, time-travel
- Change-data replay topic retention 14 days

### Band 4 — Core processing + stores
- Stream processing: Apache Flink — stateful enrichment, windowed aggregations, CEP for velocity
- Batch processing: Spark on EMR / Databricks + dbt — silver / gold transformations
- **Graph store**: Neptune / Neo4j — canonical entity graph, ownership, counterparty networks
- **Analytics warehouse**: Snowflake / BigQuery — curated facts and features
- **Entity resolution**: Senzing / Zingg / in-house ML — fuzzy matching, alias reconciliation, canonical ID minting
- **Time-series store**: TimescaleDB / InfluxDB — transaction-velocity metrics, behavioural baselines
- **Feature store**: Feast / Tecton — online and offline features for detection models
- **Operational DB**: Postgres — case management, override audit trail, analyst state
- **Search**: OpenSearch / Elasticsearch — narrative, SAR body full-text, memo search
- **Cache**: Redis — hot entity lookups, flagged-case serving

### Band 5 — Detection + ML
- Rules engine (Drools or custom) — deterministic typology policies, threshold-driven routing
- Anomaly detection: isolation forests, autoencoders — unsupervised baseline-drift alarms
- Graph analytics: community detection, centrality, subgraph matching for typology motifs
- NLP: transformer-based SAR narrative extraction, named-entity linking back to the graph
- Model registry + experiment tracker: MLflow / Weights & Biases
- Model serving: TorchServe / Ray Serve / Seldon
- Feedback loop: analyst dispositions → labelled-data pipeline → retrain
- Explainability surface: SHAP-based per-decision rationales feeding the analyst UI

### Band 6 — API + services
- GraphQL gateway — BFF for the analyst workbench
- REST + gRPC — service-to-service
- Event-driven case lifecycle (workflow engine: Temporal / Cadence)
- Authentication: SSO (SAML / OIDC), step-up MFA for high-risk actions
- Authorisation: RBAC + ABAC, segregation-of-duties across analyst tiers, supervisor approval paths
- Rate limiting + WAF
- Audit-log service: append-only, hash-chained, regulator-exportable

### Band 7 — Consumers + humans
- Analyst workbench (React / Next.js) — this demo app in production form
- Supervisor dashboard
- Compliance reporting (SAR/CTR generation, BSA exports)
- Regulator portal integrations
- Mobile alerts (on-call + high-priority escalation)
- Data-scientist notebooks — read from feature store + graph store

### Cross-cutting (vertical columns spanning all bands)
- **Security**: encryption at rest + in transit, PII tokenisation, HSM-rooted crypto keys, network segmentation
- **Data governance**: OpenLineage / Amundsen / DataHub catalog, column-level retention + deletion policies, GDPR / CCPA / OFAC hold mechanisms
- **Privacy**: differential-privacy aggregates where appropriate, k-anonymised research extracts
- **Compliance controls**: FFIEC, 23 NYCRR 500, FinCEN 31 CFR Part 1010, FATF Rec. 10/16/20/21, SOX for financial controls, SR 11-7 model-risk management
- **Observability**: Prometheus + Grafana + Jaeger; SLOs per service; error budgets
- **Cost**: FinOps dashboards over warehouse and storage costs
- **DR/BCP**: multi-region active-active for ingestion, pilot-light for detection, RPO ≤5 min on the operational plane

Approx **40 components** across the seven bands, plus **four cross-cutting columns**. Too many to cram onto one canvas without careful layering — the interaction design below resolves this.

## 4. Visualisation approach

### Render medium
Inline **SVG**. Hand-authored, not library-generated. Reasons:

- Crisp at any zoom level on a projector
- One stylesheet (the existing tokens) controls all colour / stroke / type
- Can be deep-linked (each component gets an id; `#cmp-kafka` scrolls/selects)
- No new dependency
- Plays with all existing interaction modules (keyboard, focus, preferences)

### Layout
- 7 horizontal bands with a thin amber rule between bands
- Each band has a kicker label (`01 EXTERNAL SOURCES`, `02 INGESTION`, etc.) in mono small-caps left-aligned
- Components sit as rounded-corner rectangles inside their band
- Components are coloured by *category* (storage = deep navy fill, service = amber-outline ghost, stream = warm-grey, UI = white-outline ghost), not by band
- Connections between components are thin amber strokes with directional chevrons, never more than 3 per component to avoid visual noise
- The **four cross-cutting columns** (Security / Governance / Observability / Compliance) are rendered as thin vertical amber gutters on the far right, each with a stack of chips showing their controls — indicates "these concerns apply to every band above"

### Typography
- Component labels: IBM Plex Sans 0.8rem
- Sub-labels (tech name, e.g. "Neptune"): IBM Plex Mono 0.7rem, amber-dim
- Kicker band-titles: IBM Plex Mono uppercase 0.7rem with 0.22em tracking
- Section headlines (on the screen itself): Fraunces display with per-screen typography scale already defined

### Interactive states
- **Hover** — component outline brightens, connected flow-lines pulse with a 1s amber dash animation, unrelated components dim to 35%
- **Click** — entity panel (reusing `FinCENEntityPanel`) slides in with detailed description: what the component does, how it fits, which real-world vendors / tech (2–3 examples), what the FinCEN-demo equivalent is today, what gets better in production
- **Keyboard** — Tab moves focus through components in reading order; Enter opens the panel; Esc closes
- **Typology overlay** — a toggle group (`Structuring / TBML / Sanctions / Crypto / Velocity`) highlights only the components involved in detecting that typology; others dim
- **Data-flow overlay** — a toggle shows example data flowing along connections in an animated dashed-line walk (reusing the path-trace engine from the analytics screen)
- **Zoom/pan** — same camera primitives as the entity graph (`FinCENViz.setCamera`) so the architecture can be explored at detail without losing its place

### Bridge to the demo data
Each component carries a `demoEquivalent` pointing to something the user *already saw* in screens 01–06:
- "Kafka" → "the `ingestionSources` feed ticker on screen 01"
- "Graph store" → "the entity relationship graph on screen 03"
- "Feature store" → "the `engine.getDerivedFeatures()` output on screen 02"
- "Case management DB" → "the case cards on screen 03 and workspace screen 05"
- "Audit log" → "screen 05's decision audit trail"

This closes the loop: the demo isn't just "look what we made" — it's "and here is the production reality it abstracts."

## 5. Alternatives considered (not chosen — recorded for context)

| Option | Why rejected |
|---|---|
| **Mermaid.js diagram embedded in a docs page** | Mermaid renders cleanly but can't match the app's aesthetic, can't share interaction primitives, and doesn't offer per-component drill-down |
| **External tool export (Figma / Excalidraw / Lucid)** | Breaks the single-page demo. A PDF/PNG is final, un-navigable, and can't animate the detection typology toggles |
| **React Flow / d3-flow / cytoscape graph** | New heavyweight dependency just for one screen; the team has proven it can hand-author SVG against the tokens |
| **Dedicated static site in a `docs/` subtree** | Fragments the demo story and forces context-switching mid-presentation |
| **Animated architecture walk-through video** | Great for async marketing but useless for the live interactive demo the grad students will see |

## 6. Implementation plan (for a follow-up turn)

### Phase A — Content model
1. Define a single JS data file `js/architecture-catalog.js` as an IIFE exporting `window.FinCENArchitecture`:
   - `bands[]` — `{ id, index, title, kicker, color }`
   - `components[]` — `{ id, bandId, label, techName, category, position, demoEquivalent, typologies[], description }`
   - `connections[]` — `{ from, to, label?, category }`
   - `crossCuttingColumns[]` — `{ id, title, chips[] }`
2. Curate **~40 components** across the 7 bands (from Section 3 of this plan), **~4 cross-cutting columns**, and the flow connections between them.
3. For each component write ~60 words of description + 2–3 vendor examples, mapping back to the demo (`demoEquivalent`).

### Phase B — Rendering module
1. New file `js/architecture-view.js` with `FinCENArchitecture.render(canvasEl)`:
   - Builds the SVG from the catalog (`<svg>`, bands as `<g>`, components as `<g data-component-id>`, connections as `<path>`)
   - Applies the warm-palette tokens directly
   - Binds hover / click / keyboard handlers
2. Tests (unit, TDD):
   - `catalogIsValid()` — every connection's `from`/`to` resolves, every component's `bandId` exists, every `demoEquivalent` is a known demo surface, no duplicate component ids
   - `renderedSvgHasComponent(id)` — DOM query reliably finds every component
   - `clickComponent(id)` → calls `FinCENEntityPanel.show()` with matching description
   - Typology-overlay toggle dims unrelated components
3. Rendering performance: one SVG document (not canvas), ≤300 DOM elements, no per-frame RAF loop needed

### Phase C — Integration
1. `index.html` — add the 7th tab button + the `<section class="screen" id="screen-architecture">` with the kicker/mast/lede and an `<svg id="architecture-diagram">` container
2. `js/app.js` — call `FinCENArchitecture.render()` in `renderArchitecture()`, wired into `setScreen` for the new tab
3. `js/command-palette.js` — register a "Go to Platform Architecture" command
4. `js/legend.js` — extend the legend with a new section describing component category colours
5. `js/icons.js` — add 3 small icons (stream, batch, service) used as component-category glyphs
6. CSS — component rectangle styles, connection path styles, hover/focus/active states — one new block in `css/styles.css`, ~80 lines

### Phase D — Content polish
1. Each component's `description` field sanity-checked by a reviewer; no vendor bias; public-knowledge sources cited where controversial
2. One "end-to-end scenario" pre-canned button: "Show how a Silk Road mixer transaction travels the pipeline" → animates a dotted line from `Blockchain Node` through `Kafka → Flink → Graph store → Mixer detector → Case management → Analyst workbench`
3. Accessibility: each component `<g>` has `role="group" aria-label="..."`, tab order follows reading order, keyboard-only users can drill in

### Phase E — Verification
1. `npm test` — the new `tests/unit/architecture.test.js` suite passes alongside the existing 140 tests
2. `node --check js/architecture-catalog.js` + `node --check js/architecture-view.js` — syntax clean
3. Visual QA at 1080p and 1440p on a projector — bands legible, no clipping, no reflow stutter when scrolling
4. Reduced-motion preference silences the animated flow walks
5. Screen-reader walkthrough lands on every component in logical order (top-left → bottom-right, band by band)
6. Live-demo rehearsal: the closing two minutes of the grad-student demo script switch to tab 07 and cover "here's the blueprint for scaling what you just saw" without narration gaps

## 7. Files touched (summary)

| File | Purpose | Size estimate |
|---|---|---|
| `js/architecture-catalog.js` | Pure data — bands, components, connections, cross-cutting columns | ~550 lines |
| `js/architecture-view.js` | SVG renderer + interactions, hooks to entity panel | ~450 lines |
| `index.html` | +1 tab button, +1 `<section>`, +1 `<script>` | +15 lines |
| `js/app.js` | `renderArchitecture()` + palette command | +40 lines |
| `js/legend.js` | +1 section for component categories | +25 lines |
| `js/icons.js` | +3 icons (stream / batch / service) | +10 lines |
| `css/styles.css` | Screen + band + component + connection styles | +100 lines |
| `tests/unit/architecture.test.js` | Catalog invariants + render invariants + interaction | ~180 lines |

Cost: a 400-line content file, a 450-line renderer, a ~180-line test suite, one new screen. Total ≈ 1,400 lines across 8 files.

## 8. Risks / follow-ups

- **Catalog maintenance**: when the list of components evolves, Phase A's content file becomes the source of truth. Add a linter step that verifies every `demoEquivalent` still points to a real demo surface.
- **Visual clutter**: 40 components + connection lines risks becoming a hairball. Mitigation: ruthless per-band budgeting (≤8 components per band, ≤3 connections per component as-drawn), and the typology-overlay mode to reveal detail on demand.
- **Vendor neutrality**: the plan names specific products for realism. Review copy so descriptions say "a message bus such as Kafka or Kinesis" rather than endorsing a product.
- **Drift from reality**: architecture documents age. Add a `"last-reviewed"` field per component and surface components older than 12 months as stale-chips in the UI.

## 9. Recommended demo-script addition (Section 6 closer of the grad-student demo)

> **Minute 6–7 — Platform Architecture** (new tab 07)
>
> *"What you just saw is the surface. Here's what's underneath."*
>
> Press ⌘K → "platform architecture". The tab animates open. Bands scroll into view top-to-bottom: ingestion, storage, processing, detection, serving.
>
> *"Every capability you saw maps to a real production component. The ingestion ticker on tab 01 is Kafka in production. The entity graph on tab 03 is Neptune or Neo4j. The model explanations in the workspace come from an explainability service wired into a feature store. The audit trail on tab 05 is a hash-chained append-only log exported to regulators."*
>
> Hover the "Case management DB" component; the line to the analyst workbench pulses. Click it — the entity panel shows the corresponding demo surface. Close the panel, toggle the "Crypto" typology overlay — only the components involved in the mixer → case pipeline stay lit.
>
> *"This is the blueprint. Every line an analyst sees in the demo traces back to something real at bank-scale."*

## 10. Approval gate

Before writing code, confirm:

1. **One screen or standalone page?** Recommended: tab 07 inside the app. Alternative: a `/architecture` deep-link page.
2. **Content scope?** Recommended: ~40 components across 7 bands + 4 cross-cutting columns. Alternative: shrink to 25 components for a tighter, more legible diagram at the cost of realism.
3. **Vendor naming?** Recommended: name 2–3 vendors per component ("Neptune / Neo4j / JanusGraph") for concreteness. Alternative: category-only ("Graph database") for vendor-neutrality.
4. **Animated data-flow walk?** Recommended: yes, reusing the path-trace engine with ⌘K-triggered scenarios. Alternative: static arrows only.
5. **Test scope?** Recommended: full TDD (catalog invariants + render invariants + interaction invariants). Alternative: just catalog-shape tests.

Once the five above are confirmed I'll move to Phase A (content catalog) under strict TDD and ship the tab to parity with the other six screens.
