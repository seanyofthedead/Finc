# AML Dataset Plan — Le Roux × Silk Road Training / Demo Corpus

> **SYNTHETIC DATA — FOR TRAINING / DEMO ONLY.**
> All names, accounts, wallets, companies, and transactions in the resulting dataset are fabricated. No real PII, no real wallet addresses, no real bank accounts. Patterns are generalised from publicly available court filings and journalism.

## 1. Intent

Replace the existing `js/data.js` starter dataset (20 entities / 120 transactions / 8 flagged cases, dated 2025) with a richer, reproducible, demo-ready AML corpus that embeds laundering typologies characteristic of **Paul Le Roux's RX Limited / arms-and-narcotics network** and **Ross Ulbricht's Silk Road**, mixed into a realistic legitimate baseline. The dataset must render in the existing app with **zero code changes** and ship with a parallel out-of-band ground-truth labels file so the app can be operated as a blind detection exercise.

## 2. Repo Contract Summary

Vanilla HTML / CSS / JavaScript — no framework, no build step, no async loader. Data is exposed synchronously to the application via an IIFE that populates `window.FinCENData` at parse time:

- Main dataset file: `js/data.js` (loaded from `index.html:343`)
- Consumer: `window.FinCENEngine.buildEngine(data)` at `js/app.js:9`

### Top-level `window.FinCENData` keys
`entities`, `transactions`, `sanctionsList`, `flaggedCases`, `historicalOutcomes`, `ingestionSources`, `entityResolution`, `jurisdictionRisk`, `typologySeverity`.

### Field-level contract (extracted from `js/data.js` + code-path inspection)

| Object | Field | Type | Required | Must-match values |
|---|---|---|---|---|
| entity | `id` | string | ✅ | Unique ID (existing convention: `E01` … `E20`) |
| entity | `name` | string | ✅ | — |
| entity | `kind` | string | ✅ | `individual \| shell_company \| company \| bank \| crypto_service \| disposable_wallet` |
| entity | `jurisdiction` | string | ✅ | Must be a key of `jurisdictionRisk` (see extension below) |
| entity | `riskZone` | string | opt | `Low \| Medium \| High` |
| entity | `sector` | string | opt | Free-form |
| entity | `aliases` | array[str] | opt | Empty OK |
| transaction | `id` | string | ✅ | Unique (`TX001`…) |
| transaction | `timestamp` | ISO 8601 | opt | Not filtered on |
| transaction | `fromEntityId` | string (FK) | ✅ | Must resolve to `entities[].id` |
| transaction | `toEntityId` | string (FK) | ✅ | Must resolve to `entities[].id` |
| transaction | `amountUsd` | number | ✅ | Integer USD |
| transaction | `channel` | string | ✅ | `wire \| ach \| crypto` |
| transaction | `isCrossBorder` | boolean | ✅ | Derived from jurisdiction mismatch |
| transaction | `source` | string | ✅ | `SRC_SAR \| SRC_CTR \| SRC_SAN \| SRC_CRYPTO \| SRC_BANK \| SRC_XBORDER` |
| flaggedCase | `caseId` | string | ✅ | Unique (`CASE-xxxx`) |
| flaggedCase | `entityId` | string (FK) | ✅ | Must resolve to `entities[].id` |
| flaggedCase | `typology` | string | ✅ | `Structuring \| TBML \| Sanctions Evasion \| Crypto Layering \| Unusual Velocity` |
| flaggedCase | `riskScore` | number 0-100 | ✅ | — |
| flaggedCase | `confidence` | number 0-100 | ✅ | — |
| flaggedCase | `jurisdictionRelevance` | number 0-100 | ✅ | — |
| flaggedCase | `contributingFeatures` | array[str] | ✅ | 3–4 narrative strings |
| flaggedCase | `whyFlagged` | string | ✅ | Narrative |
| flaggedCase | `rawInputs` | array[str] | ✅ | 3–4 input items |
| flaggedCase | `enrichmentSources` | array[str] | ✅ | 2–4 source labels |
| flaggedCase | `relatedTransactionIds` | array[str] | ✅ | Subset of `transactions[].id` |

Full field listings for `sanctionsList`, `historicalOutcomes`, `ingestionSources`, `entityResolution` preserved from existing shape.

### What the app visualises today
- Entity relationship graph with shape-by-kind encoding, pulsing mixer halo, shell-chain stroke, sanctioned halo
- Jurisdiction × typology heatmap (iterates `Object.keys(data.jurisdictionRisk)`)
- Risk × confidence scatter + routing board across 4 queues
- Case cards with `whyFlagged` narratives
- Analyst workspace with per-case evidence grid
- Shortest-path fund-flow tracer (BFS)
- Pattern detectors: shell chains depth ≥3, mixers fan-in ≥6 ∧ fan-out ≥6, disposable clusters ≥4 wallets per funder

### Fields the app expects but whose semantics are narrative-only (no TODOs)
None — every field is either consumed by the engine/UI or is purely informational (e.g., `ingestionSources.lineage` strings cycle in the live-ticker). Nothing requires new interpretation from the synthetic data.

## 3. Schema Additions (minimal, additive)

Le Roux's jurisdictional footprint per the task requires **Philippines, Liberia, Brazil, Israel** — four keys missing from `jurisdictionRisk`. Addition is purely additive; the heatmap iterates `Object.keys(jurisdictionRisk)` so new rows appear automatically with no code change.

Proposed FATF/Basel-inspired risk scores:

```
Philippines: 0.72
Liberia:     0.80
Brazil:      0.48
Israel:      0.35
```

Final `jurisdictionRisk` will carry 12 keys.

**No other schema additions. No field renames. No type changes.**

## 4. Performance Envelope

Current app proven responsive at up to ~520 entities / ~540 edges via the existing `?demo=rich` fixture. Target dataset is sized well inside that envelope:

| | Baseline (`data.js`) | `?demo=rich` | This plan |
|---|---|---|---|
| entities | 20 | 520+ | **200** |
| transactions | 120 | 540+ | **2,000** |
| flaggedCases | 8 | 8 | **10** |
| graph edges (rendered cap) | ≤60 | ≤60 | ≤60 |

Graph rendering is already capped at 60 edges in `engine.buildGraph`, so the jump from 120 → 2,000 transactions does **not** explode the rendered graph — the cap holds and typology-salient edges will dominate by deliberate over-representation.

## 5. Generation Plan

| Deliverable | Path | Description |
|---|---|---|
| Generator | `scripts/generate-dataset.js` | Node.js ≥18. Seeded PRNG (seed=42). No external deps. |
| Main dataset | `js/data.js` | Overwritten with synthetic IIFE. |
| Backup | `js/data.original.js` | Snapshot of pre-overwrite `data.js`. Not loaded. |
| Ground truth | `data/ground-truth-labels.json` | 2,000 records, one per transaction. Out-of-band. |
| Docs | `README_DATASET.md` | Data dictionary + typology citations. |
| NPM script | `package.json → scripts."generate:dataset"` | `node scripts/generate-dataset.js` |

### Composition (suspicious : legitimate)

| Cluster | Case count | Transaction count (approx.) | % of total |
|---|---|---|---|
| Le Roux (5 sub-typologies) | 5 | 90 | 4.5% |
| Silk Road (5 sub-typologies) | 5 | 90 | 4.5% |
| Legitimate baseline | — | 1,820 | 91% |
| **Total** | **10** | **2,000** | **100%** |

Target suspicious ratio: **9%**, within the 6–10% success-criterion band.

### Typology → enum mapping (no new enums)

#### Le Roux cluster (CASE-2001 … CASE-2005)
- Shell-company layering across HK/PH/PA/LR/BR/IL → `Sanctions Evasion` / `TBML`, channel `wire`, source `SRC_XBORDER`
- Sub-$10k structured ACH deposits → `Structuring`, channel `ach`, source `SRC_CTR`
- Bulk cash courier single deposits → `Structuring`, channel `wire`, source `SRC_CTR`
- Correspondent-bank wires to high-risk jurisdictions → `Sanctions Evasion`, channel `wire`, source `SRC_XBORDER`
- Round-number kickback payments → `TBML`, channel `wire`, source `SRC_XBORDER`

#### Silk Road cluster (CASE-2006 … CASE-2010)
- Marketplace escrow retail inflows → `Crypto Layering`, channel `crypto`, source `SRC_CRYPTO`
- 10% commission skim to operator wallet → `Crypto Layering`, channel `crypto`, source `SRC_CRYPTO`
- Mixer tumble fan-in/out → `Crypto Layering`, channel `crypto`, source `SRC_CRYPTO`
- Peel chains → `Crypto Layering`, channel `crypto`, source `SRC_CRYPTO`
- Exchange cash-out → USD wire → `Crypto Layering` + `Unusual Velocity`, channels `crypto` → `wire`, sources `SRC_CRYPTO` → `SRC_XBORDER`

Amounts: log-normal distributions, right-skewed for retail drug buys, heavy-tailed for correspondent-bank wires, tight-banded below-threshold for structured ACH. Timestamps: diurnal (09:00–18:00 heavy) + weekday-heavy for Le Roux; near-uniform 24/7 for Silk Road marketplace activity.

### Detector-threshold conformance
- **Shell chains**: Le Roux chains will be 3–5 `shell_company` deep so `detectShellChains` lights them.
- **Mixers**: Silk Road mixer entities will have ≥8 distinct in-counterparties and ≥8 distinct out-counterparties so `detectMixers` auto-pulses them.
- **Disposable clusters**: ≥5 `disposable_wallet` children per funder so `detectDisposableClusters` captures them.

## 6. Ground Truth Design

Separate `data/ground-truth-labels.json`. **Not** loaded by the app; the app operates blind on the synthetic data alone.

```json
{
  "transactionId": "TX0001",
  "is_suspicious": true,
  "cluster": "leroux",                 // "leroux" | "silkroad" | null
  "case_cluster_id": "CASE-2001",      // null for legitimate
  "pattern_tag": "shell_layering",     // sub-typology key
  "typology": "Sanctions Evasion"      // app enum value (or null)
}
```

Record count: exactly 2,000 (one per transaction). Suspicious fraction: within [120, 200]. 50/50 split between clusters.

## 7. Reproducibility

- Generator is seeded (seed = 42, linear congruential, matching the `pseudoRandom` idiom already in `data.js:56-59`)
- Entity / transaction / case ordering is deterministic from the seed
- Output files are pretty-printed with stable key ordering so two runs yield **byte-identical** output
- Validation: `diff <(node scripts/generate-dataset.js && cat js/data.js) <(node scripts/generate-dataset.js && cat js/data.js)` → empty

## 8. Verification (executed after Phase 2 generation)

1. `node --check js/data.js` — syntax passes
2. Custom in-script validator — every FK resolves, every enum value legal
3. `npm test` — existing 140/140 tests remain green
4. `npm run serve` + browser smoke — Pipeline, Analytics, Triage, Workspace, Enterprise screens render error-free
5. Visual pattern-recognition check — filter `Crypto Layering` ⇒ Silk Road cluster dominates; filter `Structuring` ⇒ Le Roux cluster dominates
6. Ground truth leak check — grep `case_cluster_id` / `is_suspicious` / `pattern_tag` across `js/*.js` — must find zero hits outside `scripts/generate-dataset.js` and `data/ground-truth-labels.json`

## 9. Public-source citations (to be reproduced in `README_DATASET.md`)

- Evan Ratliff, *The Mastermind* (Atavist, 2016) and book (Random House, 2019) — Le Roux organisation structure and front companies
- U.S. v. Le Roux, indictments and plea materials (SDNY, 2012 onward)
- Nicholas Weaver et al., "There's No Free Lunch, Even Using Bitcoin" (Financial Cryptography and Data Security, 2014) — Silk Road flow analysis
- U.S. v. Ross W. Ulbricht, indictment and trial materials (SDNY, 2014)
- FATF typology reports on TBML (2006), structuring (ongoing), virtual assets (2013, 2020)
- FinCEN advisories FIN-2013-A001 (structuring) and FIN-2014-A001 (cyber-enabled virtual-currency laundering)

All patterns in the dataset are generalisations of publicly-documented behaviour. No party to any case is named in the synthetic data.

## 10. Scope Exclusions

- **No application code changes.** `index.html`, `engine.js`, `visualizations.js`, `app.js`, `pattern-detection.js`, all interaction modules, and all tests remain untouched.
- **No new UI.** All visualisation is via existing surfaces.
- **No new dependencies.** Generator uses only Node built-ins.
- **No operational evasion guidance.** Dataset and any future queries are strictly for detection / training / educational use.

---

*Phase 1 complete. Proceed to Phase 2 (generator implementation + dataset output). See `README_DATASET.md` after generation for the data dictionary, typology-to-transaction mapping, reproduction steps, and full citations.*
