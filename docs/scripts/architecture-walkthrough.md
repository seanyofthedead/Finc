# Presentation Script: FinCEN AML Platform Architecture

*Estimated speaking time: ~5–6 minutes at a steady pace. Pauses marked with `(pause)`. Aligned to the FinCEN demo app — references concrete surfaces you can click to while narrating.*

---

## Opening

What you're looking at is a seven-layer platform that takes raw financial data — billions of transactions, filings, and signals — and turns it into a short, prioritized list of cases for a human analyst to investigate. The demo running alongside this diagram is a working scale model of that platform: **six ingestion feeds, 212 canonical entities, ten surfaced cases.** Every concept in the architecture has something you can actually click in the demo.

(pause)

The simplest way to think about it is a funnel. At the top, we pour in everything the financial system generates. At the bottom, an analyst sits down in the morning and sees the handful of cases that actually matter. Everything in the middle is how we get from one to the other.

Let me walk you through it, layer by layer, from the top down.

---

## Layer 1 — Sources

The first layer is where our data comes from. **Six feeds**, which you can see as the cards at the top of the **Data Pipeline** tab in the demo.

Two come from BSA filings: **SARs** (Suspicious Activity Reports) and **CTRs** (Currency Transaction Reports). **Sanctions lists** from OFAC, EU, and UN — the watchlists of people and entities we're not allowed to do business with. **Bank core** metadata streamed directly from the banks themselves. **Crypto ledger** data — major cryptocurrencies plus analytics feeds like Chainalysis. And **cross-border wires** — SWIFT and Fedwire — the plumbing that moves money between institutions.

(pause)

That's the input side. Six very different kinds of data, arriving in six very different formats, at six very different speeds — some streaming, some batch. The mode is tagged on every card in the demo.

---

## Layer 2 — Ingestion

Which is exactly why the second layer exists. The ingestion fabric is the front door of the platform. It takes all of those feeds and normalizes them — it makes sure every record is well-formed, tagged, and traceable before it goes any further.

In the demo, the middle panel of the Data Pipeline tab — the one that shows 216 raw profiles collapsing into 212 canonical entities — is where this work surfaces. Four duplicate SAR filings for the same real person, merged into one canonical record with a confidence score. That's entity resolution, and it sits on top of Kafka for streaming, Airflow for scheduled jobs, and a schema registry that enforces the structure of every message. If a bank changes a field name tomorrow, we know about it immediately — we don't find out three weeks later when a detection rule silently breaks.

---

## Layer 3 — Raw Storage

Once data is through the door, it lands in the data lake. This is our permanent, immutable record of everything we've ever received. **Parquet** files on S3, cataloged with **Iceberg** or **Delta**.

The important word here is *immutable*. We never overwrite the raw data. If a regulator or a court asks us, five years from now, exactly what we saw and when we saw it — we can show them. The demo doesn't expose raw storage directly — that's the layer that's quiet when things are working — but every case card you see later is traceable back through lineage metadata to a specific file and row.

---

## Layer 4 — Processing and Stores

Now we start shaping the data for use. This layer has four components working in parallel.

**Stream processing**, using Flink, handles anything time-sensitive — a sanctioned wire transfer needs to be flagged in seconds, not overnight. **Batch processing**, using Spark and dbt, handles the heavier analytical work that runs on a daily or weekly cycle.

Then we land the results in two different kinds of stores, because two different kinds of questions get asked.

The **graph store** — Neptune or Neo4j — is for relationship questions: *who is connected to whom, through which accounts, across which transactions?* This is what you're looking at on the **Analytics & Detection** tab — the Entity Relationship Network with 212 nodes and 60 aggregated edges. Click a node; shift-click a second node; the shortest fund-flow path draws itself. That's the graph store at work.

The **warehouse** — Snowflake or BigQuery — is for aggregate questions: *how much, how often, compared to what?* The KPI strip at the top of the demo — Total Entities, Total Cases, Average Risk — is a warehouse query in disguise. Change the typology filter on the Analytics tab and watch the Total Entities KPI move in lockstep. Same question, different slice of the warehouse.

---

## Layer 5 — Detection and ML

(pause)

This is the layer that matters most. This is where the platform earns its keep.

Everything above this point is plumbing. Important plumbing — but plumbing. This layer is where we actually decide what's suspicious.

Four techniques run side by side, and all four have a home in the demo.

**Rules** — the classic deterministic checks, like structuring patterns just under reporting thresholds. The **Risk Scoring & Triage** tab exposes the rules layer as sliders — high-risk threshold, confidence threshold, jurisdiction weight — with a live decision path below them. Move a slider, watch cases re-route in real time.

**Anomaly detection** — statistical models that flag behavior unusual for a specific customer or segment. The **Signal Engineering** tab shows this directly: five derived signals computed for every entity — velocity, jurisdiction risk, ownership network depth, peer deviation against the kind-cohort, cross-border exposure. Click any row and the sparklines on the right plot velocity and deviation across eight time windows.

**Graph analytics** — finding suspicious network structures, like shell company rings, mixer fan-in/fan-out patterns, or disposable-wallet clusters. On the Analytics graph, these show up as visual overlays: amber rings for mixers, amber-boxed shell chains, red halos for sanctioned entities.

**Natural language processing** — reading the unstructured narrative fields in SARs to surface themes a keyword search would miss. In the demo, the "Why Flagged" and "Raw Inputs" fields you see on the Analyst Workspace tab are downstream products of that NLP pipeline.

All of these models are tracked and versioned through **MLflow**, so we always know which version of which model flagged which case, and why. The model version badge in the topbar is the user-facing hook into that registry.

---

## Layer 6 — API and Orchestration

The sixth layer is the delivery mechanism. **GraphQL** for flexible queries — the reason a typology filter on one tab can propagate to four others without a page reload. **Temporal** for workflow orchestration — making sure a case moves through review, escalation, and filing in the right sequence.

And critically, a **hash-chained audit log**. Every action on every case is recorded in a tamper-evident chain. You can see this in the demo on the **Analyst Workspace** tab — scroll to the Decision Audit Trail panel. Every override, every escalation, every close action is timestamped with the actor who made the decision. If someone reviewed a case, or closed it, or escalated it — we can prove exactly what happened and when.

---

## Layer 7 — Consumers

Finally, the people. **Three audiences**, all represented in the demo.

The **Analyst Workbench** — the investigation UI where compliance analysts actually work their caseload. That's the entire Analyst Workspace tab in the demo: case selector, evidence grid, override controls, audit log.

The **Supervisor Dashboard** — for the managers overseeing quality, throughput, and team performance. The KPI strip across the top of the demo, plus the bias indicator on the Workspace tab, is the supervisor view. Are we producing enforcement referrals at the expected rate? Are our routing decisions biased across jurisdictions? The answers live there.

And **regulator reporting** — the export pipelines that generate SAR and CTR filings and send them to FinCEN. The "Generate Report" button on the Workspace tab is the analyst-facing entry point; the actual filings go out through automated pipelines behind it.

---

## Cross-Cutting Concerns

Running down the right side of the diagram you'll see four things that apply to every layer — not just one.

**Security** — encryption keys managed through KMS, and tokenization of sensitive identifiers. **Governance** — full data lineage and retention policies, so we can trace any output back to the exact inputs that produced it. You see this in the demo as the "Source" and "Enrichment Sources" fields on every case record. **Observability** — Prometheus and Jaeger for monitoring and tracing, so when something breaks, we find it in minutes instead of days. And **compliance** — explicit alignment with FFIEC guidance, SR 11-7 for model risk management, and FATF standards internationally. The bias monitoring strip on the Workspace tab is SR 11-7 made visible.

---

## The Feedback Loop

One last thing. Look at the arrow running from the analyst workbench back up into detection and ML.

When an analyst marks a case as a false positive, or confirms a true hit, that signal flows back and retrains the models. In the demo, every override you apply on the Workspace tab ends up in the audit log — and in a production system, those overrides become training signal for the next model iteration. The platform gets smarter with every case that's worked. That's what turns this from a static piece of infrastructure into a system that compounds in value over time.

---

## Close

So: **seven layers, four cross-cutting concerns, one feedback loop.** Raw signals in at the top, prioritized cases out at the bottom, and a platform that learns from every decision the analysts make. Everything in this diagram has a corresponding surface in the demo — pick any tab and you can trace it back to one or more of these layers.

Happy to take questions.
