# FinCEN Demo — Synthetic AML Dataset

> # ⚠️ SYNTHETIC DATA — FOR TRAINING / DEMO ONLY
>
> Every entity, account, wallet, transaction, case narrative, and identifier in this dataset is **fabricated**. There is no real PII, no real wallet address, no real bank account, and no real company name anywhere in the corpus. Patterns are generalised from publicly-documented court filings and journalism; they are not operational intelligence.

## 1. What this dataset is

Two artefacts, regenerable from a seeded script:

| Path | Purpose | Loaded by the app? |
|---|---|---|
| `js/data.js` | Main synthetic dataset in the `window.FinCENData` IIFE shape the app already consumes | **Yes** |
| `data/ground-truth-labels.json` | One label record per transaction — `is_suspicious`, cluster, `case_cluster_id`, `pattern_tag`, app-typology | **No** — out-of-band, for evaluators only |
| `js/data.original.js` | Untouched snapshot of the 20-entity starter dataset that shipped with the repo | No |

The main dataset embeds two families of laundering typology — a **Paul Le Roux-style arms-and-narcotics/shell-company layering** cluster and a **Ross Ulbricht / Silk Road-style crypto marketplace** cluster — mixed into a realistic legitimate baseline. The app operates blind: it sees the main dataset only. A reviewer with the labels file can assess whether the detection surface (flagged cases, pattern overlays, heatmap, etc.) surfaces the embedded typologies.

## 2. Volumes

| | Count |
|---|---|
| Entities | 212 |
| Transactions | 1956 |
| Flagged cases | 10 (5 Le Roux + 5 Silk Road) |
| Sanctioned entities | 5 |
| Time range | 2011-01-01 → 2013-10-31 |
| Suspicious transactions | 136 (7.0%) |
| — Le Roux subset | 62 |
| — Silk Road subset | 74 |

Sized for a responsive live demo. The existing app renders this corpus smoothly — pages load immediately, filters react instantly, the graph's 60-edge render cap keeps the network legible.

## 3. Reproducing the dataset

From the repo root:

```
node scripts/generate-dataset.js
```

No dependencies. Node 18+. Two reruns produce byte-identical `js/data.js` and `data/ground-truth-labels.json` (seed = 42, deterministic PRNG).

Also wired as an npm script:

```
npm run generate:dataset
```

## 4. Data dictionary

All fields below are the app's existing contract. No field names or types changed.

### `entities[]`

| Field | Type | Values |
|---|---|---|
| `id` | string | Unique, prefix `E`, 4-digit padded (e.g. `E0001`) |
| `name` | string | Fabricated |
| `kind` | enum | `individual` \| `shell_company` \| `company` \| `bank` \| `crypto_service` \| `disposable_wallet` |
| `jurisdiction` | string | One of the 12 keys in `jurisdictionRisk` (US, Switzerland, Hong Kong, Cyprus, UAE, Nigeria, Panama, Cayman Islands, Philippines, Liberia, Brazil, Israel) |
| `riskZone` | enum | `Low` \| `Medium` \| `High` |
| `sector` | string | Free-form |
| `aliases` | string[] | Possibly empty |

### `transactions[]`

| Field | Type | Values |
|---|---|---|
| `id` | string | Unique, prefix `TX`, 5-digit padded (e.g. `TX00001`) |
| `timestamp` | ISO 8601 UTC | 2011-01-01 → 2013-10-31 |
| `fromEntityId` | FK → `entities.id` | — |
| `toEntityId` | FK → `entities.id` | — |
| `amountUsd` | number (integer USD) | Log-normal shaped |
| `channel` | enum | `wire` \| `ach` \| `crypto` |
| `isCrossBorder` | boolean | Derived from jurisdiction mismatch |
| `source` | enum | `SRC_SAR` \| `SRC_CTR` \| `SRC_SAN` \| `SRC_CRYPTO` \| `SRC_BANK` \| `SRC_XBORDER` |

### `flaggedCases[]`

| Field | Type | Values |
|---|---|---|
| `caseId` | string | `CASE-2001` … `CASE-2010` |
| `entityId` | FK → `entities.id` | The "subject" of the case |
| `typology` | enum | `Structuring` \| `TBML` \| `Sanctions Evasion` \| `Crypto Layering` \| `Unusual Velocity` |
| `riskScore` | 0-100 | — |
| `confidence` | 0-100 | — |
| `jurisdictionRelevance` | 0-100 | — |
| `contributingFeatures` | string[] | 3–4 feature narratives |
| `whyFlagged` | string | Narrative summary |
| `rawInputs` | string[] | 3–4 input items |
| `enrichmentSources` | string[] | 2–4 source labels |
| `relatedTransactionIds` | FK[] → `transactions.id` | Up to 5 example TXs per case |

### Supporting tables

- `sanctionsList[]` — 5 fabricated sanctioned entities drawn from the Le Roux / Silk Road clusters
- `ingestionSources[]` — 6 feed descriptors (same as the app shipped with)
- `entityResolution.duplicateProfiles[]` — 4 alias-to-canonical sample records
- `historicalOutcomes[]` — 4 closed-case stubs for audit-trail seeding
- `jurisdictionRisk{}` — 12 keys, FATF/Basel-inspired risk scores in [0, 1]
- `typologySeverity{}` — 5-key multiplier map used by the risk engine

### `data/ground-truth-labels.json` (out-of-band)

One object per transaction (1956 rows). Not loaded by the app.

```json
{
  "transactionId": "TX00042",
  "is_suspicious": true,
  "cluster": "leroux",
  "case_cluster_id": "CASE-2003",
  "pattern_tag": "structuring_smurf",
  "typology": "Structuring"
}
```

`cluster`: `"leroux"` | `"silkroad"` | `null` (legitimate). `pattern_tag` values, per typology:

| Cluster | `pattern_tag` | Sub-typology |
|---|---|---|
| Le Roux | `shell_layering` | Sequential wires along shell-company chain to beneficial owner |
| Le Roux | `structuring_smurf` | Sub-$10k ACH deposits across branches, same-day clustering |
| Le Roux | `bulk_courier` | Single bulk cash courier deposit post-travel |
| Le Roux | `correspondent_wire` | Shell → correspondent bank in high-risk jurisdiction |
| Le Roux | `kickback` | Round-number `$25k / $50k / $75k / $100k` payments with "consulting" memos |
| Silk Road | `marketplace_escrow` | Buyer wallet → vendor escrow, retail amounts $20–$800 |
| Silk Road | `commission_skim` | Vendor → operator wallet, ~10% of parent amount |
| Silk Road | `mixer_fan_in` / `mixer_fan_out` | Tumbler topology, ≥8 in / ≥8 out per mixer |
| Silk Road | `peel_chain` | Geometric-decay sequential hop chain |
| Silk Road | `exchange_deposit` / `cashout_wire` / `cashout_deposit` | Crypto → exchange → USD wire → commercial-bank deposit |
| — | `legit` | Legitimate baseline |

## 5. Typology map to court/journalism sources

Patterns are generalised — no real names, accounts, or wallets appear — from:

- **Paul Le Roux / RX Limited network**
  - Evan Ratliff, *The Mastermind*, The Atavist, 2016 (seven-part serial)
  - Evan Ratliff, *The Mastermind* (Random House, 2019)
  - U.S. v. Paul Calder Le Roux, indictment and plea materials (S.D.N.Y., 2012 onward)
  - DEA / USCENTCOM public-affairs summaries (2012-2014)
- **Ross Ulbricht / Silk Road**
  - U.S. v. Ross William Ulbricht, superseding indictment and trial exhibits (S.D.N.Y., 2014-2015)
  - Nicholas Weaver et al., "There's No Free Lunch, Even Using Bitcoin: Tracking the Popularity and Profits of Virtual Currency Scams" (Financial Cryptography and Data Security, 2014)
  - Joshua Bearman, "The Rise & Fall of Silk Road", *Wired* (2015)
- **Typology frameworks**
  - FATF Typology Reports on Trade-Based Money Laundering (2006, updates through 2020)
  - FATF Report on Virtual Assets (2013, 2020)
  - FinCEN Advisory FIN-2013-A001 — Structuring
  - FinCEN Advisory FIN-2014-A001 — Cyber-Enabled Virtual Currency Laundering

All synthesis of these sources into data is for educational / detection-training purposes only. The dataset is **not** a factual reconstruction of either case and must not be presented as one.

## 6. Using the ground-truth labels

The detection-exercise flow:

1. Load the app — it sees only `js/data.js`. The user operates the existing surfaces (entity graph, typology filters, heatmap, path tracer, analyst workspace) to identify suspicious activity.
2. Load `data/ground-truth-labels.json` separately to grade the session. Join on `transactionId`.
3. Compute precision / recall / F1 across the two clusters and across individual `pattern_tag` values. A good detection session should recover ≥80% of the Silk Road mixer-fan-in transactions and ≥70% of the Le Roux structuring cluster on first pass.

No label should ever be shown to the user inside the app — that's the intended split.

## 7. Known limitations / caveats

- **Graph edge cap** — the app's `engine.buildGraph` caps rendered edges at 60. With 1956 transactions only the densest subset is visualised. The pattern detectors operate on the full graph, so shell-chain / mixer / disposable-wallet overlays still light up even when the edge cap hides legitimate baseline transactions. Ground truth retains every transaction.
- **Timestamps are decorative** — the app has no date filters, so `timestamp` is not used for visualisation beyond the audit trail. Distribution shapes (diurnal for Le Roux, uniform for Silk Road) are preserved for any future temporal analysis.
- **Names are deliberately neutral** — first-name / last-name and shell-company stem pools are curated to avoid resembling any specific real party. If a generated name coincides with a real person or company it is purely coincidental.
- **Sanctioned names reuse synthetic entities** — the `sanctionsList` entries pull names directly from the generated Le Roux and Silk Road clusters, matching the demo pattern shipped originally. These are not real sanctions designations.

## 8. Change guardrails

- **Do not remove `js/data.original.js`.** It's the only way to diff the embedded patterns against the baseline demo data.
- **Do not hand-edit `js/data.js`.** Re-run the generator instead — edits will be overwritten on next regeneration and break determinism.
- **Do not load `data/ground-truth-labels.json` in the app.** Keeping the split is what makes this a detection exercise rather than a narrated walkthrough.

---

*Generated by `scripts/generate-dataset.js` with `RANDOM_SEED = 42`.*
