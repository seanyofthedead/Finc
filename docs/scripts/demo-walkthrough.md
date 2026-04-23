# App Demo Script — FinCEN AML Platform

*Estimated speaking time: ~5–6 minutes at a steady pace. Stage directions in italics. Pauses marked with `(pause)`.*

---

## Opening — KPI strip visible at the top

What you're looking at is a synthetic AML analytics surface. 212 entities. About 2,000 transactions. 10 flagged cases. Everything on-screen is deterministic and seeded; there's nothing hitting a live system.

Before I touch anything, look at the top of the page. **Six KPI cards.**

The one on the left — **Total Entities: 212** — is the population the intelligence graph is tracking. Next to it, **Total Cases: 10**. That's what the detection layer has surfaced as worth an analyst's time. Out of 212 entities, the platform has reduced the workload to 10. That compression ratio is the whole point.

The rest of the cards — Enforcement Referrals, Intelligence Queue, Average Risk, Bias Status — describe what's happening to those 10 cases.

(pause)

---

## Tab 1 — Data Pipeline

*(Landing tab. No click needed.)*

Starting on the left: **Data Pipeline**. This is the ingestion and fusion layer.

**Six feeds.** SARs and CTRs from BSA filings. OFAC sanctions. Crypto ledger data. Bank core metadata. Cross-border wires. Some are streaming, some are batch — the tags on each card tell you which.

The middle panel shows **entity resolution** — before and after. 216 raw profiles collapse into **212 canonical entities**. Four of them were duplicate SAR filings for the same real person; the resolver merged them. The merge list underneath shows the four examples with confidence scores.

At the bottom, a **preview of the intelligence graph** — the top 36 most-connected nodes. Same graph we'll see in full on the Analytics tab. This is where the platform becomes more than just a collection of feeds — separate data sources are now a single connected graph.

---

## Tab 2 — Signal Engineering

*(Click Signal Engineering.)*

Feature engineering. Five derived signals computed for **every** entity:
**Velocity** — how often they transact. **Jurisdiction risk**. **Ownership network depth**. **Peer deviation** — how they compare to their kind-cohort. **Cross-border flag**.

Look at the table. **212 rows** — one per entity. The ten at the top with the amber left-border and the `CASE-2001` chips are flagged case subjects. They surface first because the default sort puts cases ahead of the background population.

The small **ⓘ icon** in the numeric cells means the score was computed using case-specific inputs, not just the entity's raw transaction stats. That's how we keep provenance visible.

*(Type "nils" in the search input.)*

**Search** narrows to three entities — Nils Demir and his immediate network. (pause)

*(Clear search. Click the Velocity column header.)*

**Column headers are keyboard-accessible** — tabindex, Enter or Space to activate. Clicking cycles between ascending and descending. Numeric columns default to descending on first click, alphabetical columns to ascending.

*(Click a case row — Nils Demir.)*

The right-hand **detail panel** shows raw inputs, the why-flagged rationale, enrichment sources, and two **sparklines**: velocity across eight time windows, and peer deviation against the entity's kind-cohort in σ units from the MAD. Click any non-case row and you get the entity-intrinsic view — same sparklines, no case-specific fields.

---

## Tab 3 — Analytics & Detection

*(Click Analytics & Detection.)*

Detection layer. This is the graph view the whole platform pivots around.

**212 nodes, aggregated to the top 60 edges** by transaction volume. Nodes are colored by risk — green, amber, red. Shapes indicate kind: shell companies are diamonds, banks are squares, crypto services are hexagons, disposable wallets are triangles. Sanctioned entities carry a **red halo**. Mixers have a **pulsing amber ring**. Shell-chain members are boxed in amber.

Click a node for details. **Shift-click a second node** to trace the shortest fund-flow path between them — that's the dashed amber line.

*(Click the "Crypto Layering" typology filter button.)*

Filter the graph by **Crypto Layering**. Now the graph narrows to about 32 entities — the four case subjects plus their one-hop counterparties. Look at the top: **Total Entities KPI dropped to 32**. Every view in the app is now showing the same population. The Signal table, the KPI cards, the routing board — all mirror the graph's current filter. That's the source-of-truth principle the whole platform is organized around.

Below the graph, the **Anomaly Heatmap** — jurisdiction on the rows, typology on the columns. Ambient transaction volume overlaid with flagged-case intensity.

Further down, the **Flagged Case Patterns** cards. *(Type "mix" in the card search.)* One card — Tumbler Mix Pool. *(Clear.) (Select "Confidence (high → low)" in the sort dropdown.)* Pivot between ranking dimensions. *(Switch back to All filter.)*

---

## Tab 4 — Risk Scoring & Triage

*(Click Risk Scoring & Triage.)*

Policy layer. **Three sliders**: high-risk threshold, confidence threshold, jurisdiction weight. The decision path below them is live — deterministic rules that govern every route.

*(Drop the High Risk slider to 80.)*

The **routing board** re-bucketed in real time. Some cases moved from Enforcement Referral into Intelligence Queue. *(Pull it back to 85.)*

The routing board shows all 10 cases across **four queues** — Intelligence, Enforcement, Analyst Review, Monitoring. Each card shows case ID, entity name, typology, risk, confidence. *(Type "crypto" in the routing search.)* Search across all queues — four Crypto Layering cases, wherever they landed.

*(Clear search.)* The **scatter plot** on the right plots risk against confidence with the threshold lines drawn. Anything in the top-right quadrant auto-routes to enforcement. Anything top-left gets flagged for intelligence work because risk is high but we're not certain yet.

This is what governance looks like in a platform: the policy isn't buried in code, it's surfaced as controls an analyst or auditor can manipulate and inspect.

---

## Tab 5 — Analyst Workspace

*(Click Analyst Workspace.)*

Where an analyst actually spends their day.

**Case selector** at the top — search by entity name, case ID, or typology. *(Type "demir".)* One match — CASE-2001, Nils Demir. *(Select it.)*

The **evidence grid** populates with raw inputs, the model's contributing features, and the routing destination. An analyst can override the risk score with a rationale. *(Hover the Apply Override button; don't click.)* Every override is recorded — look below in the **Decision Audit Trail**. Every action on every case is timestamped with the actor. That's the defensibility layer — when a regulator asks what we saw, when we saw it, and who decided what, we can show them.

On the right, **bias monitoring**. The indicator compares high-risk rates across jurisdictions. The pill goes amber or red if the spread exceeds thresholds — a governance check built into the interface itself, not a quarterly audit report.

---

## Tab 6 — Enterprise Deployment

*(Click Enterprise Deployment, briefly.)*

The last tab is architectural. **Six core capabilities** along the left — ingestion, feature engineering, detection, scoring, governance, DevSecOps. **Five mission modules** on the right — crypto intelligence, sanctions evasion, typology-specific detection packs, workflow customization, model validation. The connector lines show which capabilities each module consumes.

This is how you productize the platform: the backbone underneath stays stable; the modules on top evolve with the mission.

---

## Close

So: **six tabs, one dataset, one graph**. From billions of signals at the top of the funnel to ten analyst-ready cases at the bottom — every tab pivoting off the same population. Changing a filter on one tab moves the whole surface. Every decision is timestamped. And the feedback loop from the analyst's keyboard back to the detection layer means the platform gets smarter with every case that's worked.

Happy to take questions.
