#!/usr/bin/env node
/* ===========================================================================
 * FinCEN demo — Le Roux × Silk Road synthetic AML dataset generator
 *
 * Produces two artefacts, both deterministic given RANDOM_SEED = 42:
 *   1) js/data.js                        — IIFE populating window.FinCENData
 *   2) data/ground-truth-labels.json     — out-of-band labels, 1 row / tx
 *
 * Patterns are generalised from publicly-available court filings and
 * journalism on Paul Le Roux's RX Limited / arms-and-narcotics network and
 * Ross Ulbricht's Silk Road marketplace.
 *
 *      SYNTHETIC DATA — FOR TRAINING / DEMO ONLY.
 *      No real PII, accounts, wallets, or companies.
 *
 * Run with:  node scripts/generate-dataset.js
 * =========================================================================== */

"use strict";

const fs = require("node:fs");
const path = require("node:path");

// ---------------------------------------------------------------------------
// Seeded PRNG — linear congruential generator (Numerical Recipes params),
// mirrors the idiom already used inside js/data.js at line 56. Reseedable.
// ---------------------------------------------------------------------------
const RANDOM_SEED = 42;
let rngState = RANDOM_SEED | 0;
function rand() {
  rngState = (Math.imul(rngState, 1664525) + 1013904223) | 0;
  return ((rngState >>> 0) % 1_000_000) / 1_000_000;
}
function randInt(lo, hi) { return lo + Math.floor(rand() * (hi - lo + 1)); }
function choice(arr)    { return arr[Math.floor(rand() * arr.length)]; }
function pick(arr, n)   {
  const copy = arr.slice();
  const out = [];
  for (let i = 0; i < n && copy.length; i += 1) {
    const idx = Math.floor(rand() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}
function logNormal(mu, sigma) {
  // Box-Muller with PRNG-driven normals.
  const u1 = Math.max(1e-9, rand());
  const u2 = rand();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.exp(mu + sigma * z);
}

// ---------------------------------------------------------------------------
// Enums must match values the app hard-codes.
// ---------------------------------------------------------------------------
const KIND = {
  INDIVIDUAL: "individual",
  SHELL:      "shell_company",
  COMPANY:    "company",
  BANK:       "bank",
  CRYPTO:     "crypto_service",
  WALLET:     "disposable_wallet"
};
const CHANNEL = { WIRE: "wire", ACH: "ach", CRYPTO: "crypto" };
const SOURCE  = {
  SAR:     "SRC_SAR",
  CTR:     "SRC_CTR",
  SAN:     "SRC_SAN",
  CRYPTO:  "SRC_CRYPTO",
  BANK:    "SRC_BANK",
  XBORDER: "SRC_XBORDER"
};
const TYPOLOGY = {
  STRUCTURING: "Structuring",
  TBML:        "TBML",
  SANCTIONS:   "Sanctions Evasion",
  CRYPTO:      "Crypto Layering",
  VELOCITY:    "Unusual Velocity"
};

// Extended jurisdictionRisk — adds Philippines, Liberia, Brazil, Israel per
// Le Roux's documented footprint. Heatmap iterates Object.keys() so new rows
// appear automatically.
const JURISDICTION_RISK = {
  US: 0.20,
  Switzerland: 0.25,
  "Hong Kong": 0.52,
  Cyprus: 0.59,
  UAE: 0.73,
  Nigeria: 0.77,
  Panama: 0.82,
  "Cayman Islands": 0.86,
  Philippines: 0.72,
  Liberia: 0.80,
  Brazil: 0.48,
  Israel: 0.35
};
const ALL_JURISDICTIONS = Object.keys(JURISDICTION_RISK);
const LEGIT_JURISDICTIONS = ["US", "Switzerland", "Hong Kong", "Cyprus", "UAE", "Nigeria", "Panama", "Cayman Islands", "Brazil", "Israel"];
const LEROUX_JURISDICTIONS = ["Hong Kong", "Philippines", "Panama", "Liberia", "Brazil", "Israel"];

const TYPOLOGY_SEVERITY = {
  Structuring: 1.00,
  TBML: 1.07,
  "Sanctions Evasion": 1.18,
  "Crypto Layering": 1.08,
  "Unusual Velocity": 0.96
};

// ---------------------------------------------------------------------------
// Curated fabricated name pools — no real entities.
// ---------------------------------------------------------------------------
const FIRST_NAMES = [
  "Aidan", "Mira", "Rasheed", "Ines", "Oluwa", "Hiroshi", "Kenji", "Yael",
  "Ruth", "Noa", "Felix", "Imani", "Tomas", "Linnea", "Arvind", "Priya",
  "Teresa", "Mateo", "Sofia", "Nils", "Amara", "Koen", "Lucia", "Omar",
  "Samira", "Elias", "Gabriela", "Isabela", "Kai", "Rania", "Zara", "Leonel",
  "Chidera", "Anika", "Bilal", "Ezra", "Hannah", "Ingrid", "Jozef", "Maya",
  "Niamh", "Osei", "Paulina", "Quentin", "Rafael", "Saskia", "Tariq", "Una"
];
const LAST_NAMES = [
  "Mercer", "Velasquez", "Al Khatib", "Nakagawa", "Adeyemi", "Okonkwo",
  "Weiss", "Cohen", "Arbel", "Nordstrom", "Harrow", "Silva", "Navarro",
  "Thorne", "Bellamy", "Ibarra", "Darius", "Kwame", "Delacroix", "Strand",
  "Patel", "Cruz", "Rahman", "Baptiste", "Ferenc", "Schmidt", "Marcovich",
  "Ochoa", "Halberstam", "Cortez", "Giorgadze", "Hassan", "Vargas", "Njoku",
  "Pereira", "Hoshino", "Eisenberg", "Baan", "Demir", "Malinowski"
];
const SHELL_STEM = [
  "Nera", "Orchid", "Veridian", "Cipher", "Aurora", "Castoria", "Meridian",
  "Spectra", "Copperleaf", "Pelican", "Kestrel", "Tritone", "Meridian Bay",
  "Starling", "Ravena", "Tideford", "Jasper", "Sable", "Magnolia", "Zephyr",
  "Vorteil", "Helios", "Silvan", "Novara", "Orrin", "Castellon"
];
const SHELL_SUFFIX_BY_JURISDICTION = {
  "Hong Kong":   ["Holdings Limited", "Trading (HK) Ltd", "Enterprises HK", "Pacific Group Ltd"],
  Philippines:   ["Corporation", "Resources Inc.", "Industries Corp", "Ventures Inc."],
  Panama:        ["S.A.", "Capital SA", "Grupo S.A.", "Partners S.A."],
  Liberia:       ["Shipping Co.", "Maritime Inc.", "Holdings Inc."],
  Brazil:        ["Participações Ltda", "Empreendimentos Ltda", "Comércio Ltda"],
  Israel:        ["Investments Ltd", "Enterprises Ltd", "Global Ltd"],
  "Cayman Islands": ["Trust", "Holdings (Cayman) Ltd", "SPC"],
  Cyprus:        ["Trading Ltd", "Holdings Ltd", "Ventures Ltd"],
  UAE:           ["FZ-LLC", "DMCC", "Trading LLC"],
  Switzerland:   ["AG", "SA", "Holding AG"],
  Nigeria:       ["Limited", "Enterprises Ltd", "Trading Ltd"],
  US:            ["LLC", "Corp.", "Holdings LLC"]
};
const LEGIT_COMPANY_STEM = [
  "Harbor", "Canyon", "Ridge", "Silverwood", "Oak", "Maple", "Lakeside",
  "Fairview", "Northlight", "Granite", "Meadow", "Hillcrest", "Bay",
  "Briarwood", "Parkside", "Summit", "Creekside", "Stonebridge", "Riverwalk",
  "Cedar", "Aspen", "Evergreen", "Brightline", "Fountain", "Westcliff",
  "Crosswind", "Harvest", "Torchlight", "Magellan", "Copper Valley"
];
const LEGIT_COMPANY_SUFFIX = [
  "Logistics", "Foods", "Retail", "Consulting", "Software", "Supply Co.",
  "Distribution", "Engineering", "Advisors", "Construction", "Healthcare",
  "Media Group", "Capital", "Industries", "Systems", "Cafe", "Bookstore",
  "Clinic", "Auto Body", "Printing"
];
const BANK_STEM = [
  "Northpoint", "Cedar Delta", "Maritime Harbor", "Osprey", "Marlin",
  "Horizon Nova", "Riverstone", "Summit Reserve", "Porto Fiel", "Sable Trust",
  "Corvina", "Aventine", "Ironwood", "Oakmere", "Stonemere"
];
const BANK_SUFFIX_BY_JURISDICTION = {
  US:            ["Bank", "Commercial Bank", "National Bank"],
  Switzerland:   ["Privatbank AG", "Bank AG", "Bank SA"],
  "Hong Kong":   ["Banking Corp Ltd", "Pacific Bank", "Commercial Bank"],
  Cyprus:        ["Bank Ltd", "Commercial Bank"],
  UAE:           ["Bank PJSC", "Commercial Bank"],
  Nigeria:       ["Bank Plc", "Commercial Bank"],
  Panama:        ["Banco S.A.", "Banco Internacional S.A."],
  "Cayman Islands": ["Trust Bank", "Custody Bank"],
  Philippines:   ["Banking Corp", "Universal Bank"],
  Liberia:       ["Trust Bank Ltd"],
  Brazil:        ["Banco S.A.", "Banco Nacional S.A."],
  Israel:        ["Bank Ltd"]
};
const LEROUX_FRONT_SECTORS = [
  { sector: "Pharmaceuticals",  memos: ["Active ingredient procurement", "Bulk API shipment", "Clinical supply logistics", "Pharma regulatory retainer"] },
  { sector: "Shipping",          memos: ["Charter settlement", "Maritime fuel bunkering", "Container repositioning", "Port handling fees"] },
  { sector: "Logging",           memos: ["Timber export advance", "Forestry concession payment", "Sawmill equipment", "Hardwood bill of lading"] },
  { sector: "Agri-Export",       memos: ["Cashew forward contract", "Palm-oil shipment", "Cocoa warehouse receipt", "Fertilizer procurement"] }
];
const LEROUX_KICKBACK_MEMOS = [
  "Consulting fees — strategic advisory",
  "Logistics coordination fee",
  "Regulatory liaison retainer",
  "Trade-compliance consulting",
  "Government relations retainer"
];
const SILKROAD_EXCHANGE_NAMES = ["CoinBridge", "DigitalVault Exchange", "HarborMint"];

// ---------------------------------------------------------------------------
// Time window — 2011-01-01 through 2013-10-31.
// ---------------------------------------------------------------------------
const WINDOW_START = new Date("2011-01-01T00:00:00Z").getTime();
const WINDOW_END   = new Date("2013-10-31T23:59:59Z").getTime();

// Diurnal-heavy weekday sampler for legitimate + Le Roux activity.
function tsBusinessHours() {
  let ts;
  for (;;) {
    const t = WINDOW_START + rand() * (WINDOW_END - WINDOW_START);
    const d = new Date(t);
    const dow = d.getUTCDay();
    if (dow === 0 || dow === 6) { if (rand() < 0.82) continue; } // heavy weekday
    const hour = d.getUTCHours();
    if (hour < 6 || hour > 21) { if (rand() < 0.88) continue; } // heavy business-hours
    ts = t;
    break;
  }
  return new Date(ts).toISOString();
}

// 24/7-uniform sampler for Silk Road marketplace activity.
function tsUniform() {
  const t = WINDOW_START + rand() * (WINDOW_END - WINDOW_START);
  return new Date(t).toISOString();
}

// ---------------------------------------------------------------------------
// ID factories — stable, numbered.
// ---------------------------------------------------------------------------
function idFactory(prefix, width) {
  let n = 0;
  return () => {
    n += 1;
    return prefix + String(n).padStart(width, "0");
  };
}

// ---------------------------------------------------------------------------
// Entity builders.
// ---------------------------------------------------------------------------
function aliasesFor(name) {
  if (rand() < 0.6) return [];
  // Simple alias: strip company suffix or abbreviate.
  const parts = name.split(" ");
  if (parts.length >= 3) return [parts.slice(0, 2).join(" ")];
  return [name[0] + ". " + parts.slice(-1).join(" ")];
}

function buildLegitimateEntities(nextId, count) {
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const r = rand();
    const jurisdiction = choice(LEGIT_JURISDICTIONS);
    let kind, name, sector;
    if (r < 0.35) {
      kind = KIND.INDIVIDUAL;
      name = choice(FIRST_NAMES) + " " + choice(LAST_NAMES);
      sector = choice(["Retail", "Education", "Healthcare", "Services", "Trading", "Import/Export"]);
    } else if (r < 0.55) {
      kind = KIND.BANK;
      const stem = choice(BANK_STEM);
      const suf = choice(BANK_SUFFIX_BY_JURISDICTION[jurisdiction] || ["Bank"]);
      name = stem + " " + suf;
      sector = "Commercial Banking";
    } else if (r < 0.85) {
      kind = KIND.COMPANY;
      name = choice(LEGIT_COMPANY_STEM) + " " + choice(LEGIT_COMPANY_SUFFIX);
      sector = choice(["Logistics", "Foods", "Retail", "Consulting", "Software", "Construction", "Healthcare", "Media Group", "Manufacturing"]);
    } else {
      kind = KIND.SHELL;
      const stem = choice(SHELL_STEM);
      const suf = choice(SHELL_SUFFIX_BY_JURISDICTION[jurisdiction] || ["Ltd"]);
      name = stem + " " + suf;
      sector = choice(["Holding", "Capital Management", "Trading", "Advisory"]);
    }
    const riskZone = rand() < 0.1 ? "High" : (rand() < 0.35 ? "Medium" : "Low");
    out.push({
      id: nextId(),
      name,
      kind,
      jurisdiction,
      riskZone,
      sector,
      aliases: aliasesFor(name)
    });
  }
  return out;
}

function buildLerouxCluster(nextId) {
  // One chain per CASE cluster (5). Each chain = 4 shells + 1 terminal individual.
  // Plus 3 correspondent banks shared across clusters, and 4 operator individuals.
  const entities = [];
  const clusters = []; // { caseClusterId, chainIds, operatorId }
  const correspondentBanks = [];
  for (let i = 0; i < 3; i += 1) {
    const jurisdiction = choice(["Hong Kong", "UAE", "Panama"]);
    correspondentBanks.push({
      id: nextId(),
      name: choice(BANK_STEM) + " Correspondent " + choice(BANK_SUFFIX_BY_JURISDICTION[jurisdiction] || ["Bank"]),
      kind: KIND.BANK,
      jurisdiction,
      riskZone: "High",
      sector: "Correspondent Banking",
      aliases: []
    });
  }
  entities.push(...correspondentBanks);

  for (let k = 0; k < 5; k += 1) {
    const caseClusterId = "CASE-" + String(2001 + k);
    const chain = [];
    const chainDepth = 3 + Math.floor(rand() * 3); // 3..5
    const usedJur = pick(LEROUX_JURISDICTIONS, chainDepth);
    for (let i = 0; i < chainDepth; i += 1) {
      const juris = usedJur[i];
      const stem = choice(SHELL_STEM);
      const suf = choice(SHELL_SUFFIX_BY_JURISDICTION[juris] || ["Ltd"]);
      const sectorData = LEROUX_FRONT_SECTORS[(k + i) % LEROUX_FRONT_SECTORS.length];
      const ent = {
        id: nextId(),
        name: stem + " " + sectorData.sector + " " + suf,
        kind: KIND.SHELL,
        jurisdiction: juris,
        riskZone: "High",
        sector: sectorData.sector,
        aliases: aliasesFor(stem + " " + suf)
      };
      entities.push(ent);
      chain.push(ent);
    }
    // Terminal beneficial owner (individual)
    const beneficiary = {
      id: nextId(),
      name: choice(FIRST_NAMES) + " " + choice(LAST_NAMES),
      kind: KIND.INDIVIDUAL,
      jurisdiction: choice(["Liberia", "Brazil", "Israel"]),
      riskZone: "High",
      sector: "Beneficial Owner",
      aliases: []
    };
    entities.push(beneficiary);
    clusters.push({
      caseClusterId,
      chainIds: chain.map((e) => e.id),
      beneficiaryId: beneficiary.id
    });
  }
  return { entities, clusters, correspondentBanks };
}

function buildSilkRoadCluster(nextId) {
  // 2 mixer crypto_services, 3 fictional exchanges, 5 operator individuals,
  // ~15 disposable wallets split into 5 CASE clusters (1 per sub-typology).
  // Plus per-cluster enough wallets/edges to exceed detector thresholds.
  const entities = [];
  const clusters = []; // { caseClusterId, entityIds, role-index }

  const mixers = [];
  for (let i = 0; i < 2; i += 1) {
    mixers.push({
      id: nextId(),
      name: (i === 0 ? "Spiral" : "Tumbler") + " Mix Pool",
      kind: KIND.CRYPTO,
      jurisdiction: "Hong Kong",
      riskZone: "High",
      sector: "Mixer",
      aliases: []
    });
  }
  entities.push(...mixers);

  const exchanges = [];
  for (let i = 0; i < SILKROAD_EXCHANGE_NAMES.length; i += 1) {
    exchanges.push({
      id: nextId(),
      name: SILKROAD_EXCHANGE_NAMES[i],
      kind: KIND.CRYPTO,
      jurisdiction: choice(["Cyprus", "Panama", "UAE"]),
      riskZone: "High",
      sector: "Crypto Exchange",
      aliases: []
    });
  }
  entities.push(...exchanges);

  const operators = [];
  for (let i = 0; i < 5; i += 1) {
    operators.push({
      id: nextId(),
      name: choice(FIRST_NAMES) + " " + choice(LAST_NAMES),
      kind: KIND.INDIVIDUAL,
      jurisdiction: choice(["US", "Brazil", "Israel"]),
      riskZone: "High",
      sector: "Marketplace Operator",
      aliases: []
    });
  }
  entities.push(...operators);

  // CASE-2006: marketplace escrow inflows → 8 buyer wallets + vendor wallets
  const escrowBuyers = [];
  for (let i = 0; i < 8; i += 1) {
    const w = {
      id: nextId(),
      name: "Buyer Wallet " + String(i + 1).padStart(2, "0"),
      kind: KIND.WALLET,
      jurisdiction: choice(ALL_JURISDICTIONS),
      riskZone: "High",
      sector: "Wallet",
      aliases: []
    };
    entities.push(w);
    escrowBuyers.push(w);
  }
  const escrowVendor = {
    id: nextId(),
    name: "Vendor Escrow Wallet",
    kind: KIND.WALLET,
    jurisdiction: "US",
    riskZone: "High",
    sector: "Wallet",
    aliases: []
  };
  entities.push(escrowVendor);

  clusters.push({
    caseClusterId: "CASE-2006",
    kind: "escrow",
    mixerId: mixers[0].id,
    operatorId: operators[0].id,
    buyerIds: escrowBuyers.map((w) => w.id),
    vendorId: escrowVendor.id
  });

  // CASE-2007: 10% commission skim from escrow vendor → operator wallet cluster
  const operatorWallets = [];
  for (let i = 0; i < 3; i += 1) {
    const w = {
      id: nextId(),
      name: "Operator Wallet " + String(i + 1),
      kind: KIND.WALLET,
      jurisdiction: choice(["US", "Cayman Islands"]),
      riskZone: "High",
      sector: "Wallet",
      aliases: []
    };
    entities.push(w);
    operatorWallets.push(w);
  }
  clusters.push({
    caseClusterId: "CASE-2007",
    kind: "commission",
    vendorId: escrowVendor.id,
    operatorId: operators[0].id,
    operatorWalletIds: operatorWallets.map((w) => w.id)
  });

  // CASE-2008: mixer fan-in/fan-out — 8 source wallets + 8 destination wallets
  const mixerSources = [];
  const mixerDestinations = [];
  for (let i = 0; i < 8; i += 1) {
    const s = { id: nextId(), name: "Mix Source " + String(i + 1), kind: KIND.WALLET, jurisdiction: choice(ALL_JURISDICTIONS), riskZone: "High", sector: "Wallet", aliases: [] };
    const d = { id: nextId(), name: "Mix Sink " + String(i + 1), kind: KIND.WALLET, jurisdiction: choice(ALL_JURISDICTIONS), riskZone: "High", sector: "Wallet", aliases: [] };
    entities.push(s, d);
    mixerSources.push(s);
    mixerDestinations.push(d);
  }
  clusters.push({
    caseClusterId: "CASE-2008",
    kind: "mixer",
    mixerId: mixers[1].id,
    sourceIds: mixerSources.map((w) => w.id),
    destinationIds: mixerDestinations.map((w) => w.id)
  });

  // CASE-2009: peel chain — 1 funding wallet → sequential smaller outputs
  const peelFunder = { id: nextId(), name: "Peel Funder", kind: KIND.WALLET, jurisdiction: "Panama", riskZone: "High", sector: "Wallet", aliases: [] };
  entities.push(peelFunder);
  const peelHops = [];
  for (let i = 0; i < 6; i += 1) {
    const h = { id: nextId(), name: "Peel Hop " + String(i + 1), kind: KIND.WALLET, jurisdiction: choice(ALL_JURISDICTIONS), riskZone: "High", sector: "Wallet", aliases: [] };
    entities.push(h);
    peelHops.push(h);
  }
  clusters.push({
    caseClusterId: "CASE-2009",
    kind: "peel",
    funderId: peelFunder.id,
    hopIds: peelHops.map((w) => w.id)
  });

  // CASE-2010: exchange cash-out — operator wallets → exchange → USD wire to operator individual's bank.
  clusters.push({
    caseClusterId: "CASE-2010",
    kind: "cashout",
    operatorWalletIds: operatorWallets.map((w) => w.id),
    exchangeIds: exchanges.map((x) => x.id),
    operatorId: operators[1].id
  });

  return { entities, clusters, mixers, exchanges, operators };
}

// ---------------------------------------------------------------------------
// Transaction builders — each returns { txs, labels } where labels parallels
// the txs but stays out-of-band from the main dataset.
// ---------------------------------------------------------------------------
function wireCrossBorder(fromEnt, toEnt) { return fromEnt.jurisdiction !== toEnt.jurisdiction; }

function buildLegitimateTransactions(nextTxId, legitEntities, count) {
  // Payroll / rent / retail / utilities / peer / SMB revenue / remittances.
  const txs = [];
  const labels = [];
  const banks = legitEntities.filter((e) => e.kind === KIND.BANK);
  const individuals = legitEntities.filter((e) => e.kind === KIND.INDIVIDUAL);
  const companies = legitEntities.filter((e) => e.kind === KIND.COMPANY);
  const everyone = legitEntities.slice();
  if (!banks.length || !individuals.length || !companies.length) {
    throw new Error("legitimate entity pool is unbalanced");
  }

  for (let i = 0; i < count; i += 1) {
    const flavor = rand();
    let fromEnt, toEnt, amountUsd, channel, source;
    if (flavor < 0.18) {
      // Payroll: company → individual, ACH, round-ish.
      fromEnt = choice(companies);
      toEnt = choice(individuals);
      amountUsd = Math.round(logNormal(8.0, 0.35));
      channel = CHANNEL.ACH;
      source = SOURCE.BANK;
    } else if (flavor < 0.28) {
      // Rent: individual → company, ACH, monthly-ish round.
      fromEnt = choice(individuals);
      toEnt = choice(companies);
      amountUsd = Math.round(100 * Math.max(8, logNormal(3.0, 0.25))); // a few $k
      channel = CHANNEL.ACH;
      source = SOURCE.BANK;
    } else if (flavor < 0.55) {
      // Retail POS: individual → company, ACH, small.
      fromEnt = choice(individuals);
      toEnt = choice(companies);
      amountUsd = Math.max(5, Math.round(logNormal(3.5, 0.9)));
      channel = CHANNEL.ACH;
      source = SOURCE.BANK;
    } else if (flavor < 0.66) {
      // Utilities: individual → company (utility-like).
      fromEnt = choice(individuals);
      toEnt = choice(companies);
      amountUsd = Math.round(logNormal(4.6, 0.4));
      channel = CHANNEL.ACH;
      source = SOURCE.BANK;
    } else if (flavor < 0.75) {
      // P2P transfer between individuals, ACH.
      fromEnt = choice(individuals);
      do { toEnt = choice(individuals); } while (toEnt === fromEnt);
      amountUsd = Math.round(logNormal(5.0, 0.8));
      channel = CHANNEL.ACH;
      source = SOURCE.BANK;
    } else if (flavor < 0.85) {
      // SMB revenue: individual/company → company, ACH/wire.
      fromEnt = choice(everyone);
      do { toEnt = choice(companies); } while (toEnt === fromEnt);
      amountUsd = Math.round(logNormal(7.0, 0.7));
      channel = rand() < 0.3 ? CHANNEL.WIRE : CHANNEL.ACH;
      source = SOURCE.BANK;
    } else if (flavor < 0.92) {
      // Legitimate cross-border wire, moderate size.
      fromEnt = choice(companies);
      do { toEnt = choice(companies); } while (toEnt === fromEnt || toEnt.jurisdiction === fromEnt.jurisdiction);
      amountUsd = Math.round(logNormal(9.0, 0.6));
      channel = CHANNEL.WIRE;
      source = SOURCE.XBORDER;
    } else if (flavor < 0.97) {
      // Legitimate cash-ish deposit (near but not at $10k — noise around structuring).
      fromEnt = choice(individuals);
      toEnt = choice(banks);
      amountUsd = randInt(3500, 9500);
      channel = CHANNEL.ACH;
      source = SOURCE.CTR;
    } else {
      // Legitimate crypto activity (non-suspicious retail).
      fromEnt = choice(individuals);
      toEnt = choice(everyone);
      amountUsd = Math.round(logNormal(4.0, 0.7));
      channel = CHANNEL.CRYPTO;
      source = SOURCE.CRYPTO;
    }

    const tx = {
      id: nextTxId(),
      timestamp: tsBusinessHours(),
      fromEntityId: fromEnt.id,
      toEntityId: toEnt.id,
      amountUsd,
      channel,
      isCrossBorder: wireCrossBorder(fromEnt, toEnt),
      source
    };
    txs.push(tx);
    labels.push({
      transactionId: tx.id,
      is_suspicious: false,
      cluster: null,
      case_cluster_id: null,
      pattern_tag: "legit",
      typology: null
    });
  }
  return { txs, labels };
}

function buildLerouxTransactions(nextTxId, legitEntities, lerouxBuilt) {
  const txs = [];
  const labels = [];
  const { clusters, correspondentBanks, entities: lerouxEntities } = lerouxBuilt;
  const usBanks = legitEntities.filter((e) => e.kind === KIND.BANK && e.jurisdiction === "US");
  const shellsByJur = {};
  lerouxEntities.filter((e) => e.kind === KIND.SHELL).forEach((e) => {
    (shellsByJur[e.jurisdiction] = shellsByJur[e.jurisdiction] || []).push(e);
  });

  function addTx(partial, pattern, caseClusterId, typology) {
    const tx = Object.assign({ id: nextTxId() }, partial);
    txs.push(tx);
    labels.push({
      transactionId: tx.id,
      is_suspicious: true,
      cluster: "leroux",
      case_cluster_id: caseClusterId,
      pattern_tag: pattern,
      typology
    });
    return tx;
  }

  clusters.forEach((cluster) => {
    const { caseClusterId, chainIds, beneficiaryId } = cluster;
    const chain = chainIds.map((id) => lerouxEntities.find((e) => e.id === id));
    const beneficiary = lerouxEntities.find((e) => e.id === beneficiaryId);
    if (!chain.length || !beneficiary) return;

    // Shell-company layering: sequential wires along the chain, terminating at beneficiary.
    const layerHops = chain.length;
    for (let hop = 0; hop < layerHops - 1; hop += 1) {
      const from = chain[hop];
      const to = chain[hop + 1];
      const amount = Math.round(logNormal(11.0, 0.6));
      addTx({
        timestamp: tsBusinessHours(),
        fromEntityId: from.id,
        toEntityId: to.id,
        amountUsd: amount,
        channel: CHANNEL.WIRE,
        isCrossBorder: wireCrossBorder(from, to),
        source: SOURCE.XBORDER
      }, "shell_layering", caseClusterId, TYPOLOGY.SANCTIONS);
    }
    // Terminal wire to beneficiary.
    addTx({
      timestamp: tsBusinessHours(),
      fromEntityId: chain[chain.length - 1].id,
      toEntityId: beneficiary.id,
      amountUsd: Math.round(logNormal(11.5, 0.5)),
      channel: CHANNEL.WIRE,
      isCrossBorder: wireCrossBorder(chain[chain.length - 1], beneficiary),
      source: SOURCE.XBORDER
    }, "shell_layering", caseClusterId, TYPOLOGY.TBML);

    // Structured ACH deposits — 4-6 sub-$10k deposits on same "day" into different US banks.
    const smurfCount = 4 + Math.floor(rand() * 3);
    const depositDay = tsBusinessHours();
    const depositBase = Date.parse(depositDay);
    for (let s = 0; s < smurfCount; s += 1) {
      const amount = randInt(9200, 9950);
      const bank = usBanks.length ? usBanks[(s + (beneficiary.id.length) + parseInt(caseClusterId.slice(5), 10)) % usBanks.length] : null;
      if (!bank) continue;
      addTx({
        timestamp: new Date(depositBase + s * 45 * 60 * 1000).toISOString(),
        fromEntityId: beneficiary.id,
        toEntityId: bank.id,
        amountUsd: amount,
        channel: CHANNEL.ACH,
        isCrossBorder: wireCrossBorder(beneficiary, bank),
        source: SOURCE.CTR
      }, "structuring_smurf", caseClusterId, TYPOLOGY.STRUCTURING);
    }

    // Bulk cash courier: one large deposit after a travel-week gap.
    const courierBank = usBanks.length ? choice(usBanks) : correspondentBanks[0];
    addTx({
      timestamp: tsBusinessHours(),
      fromEntityId: beneficiary.id,
      toEntityId: courierBank.id,
      amountUsd: randInt(45000, 90000),
      channel: CHANNEL.WIRE,
      isCrossBorder: wireCrossBorder(beneficiary, courierBank),
      source: SOURCE.CTR
    }, "bulk_courier", caseClusterId, TYPOLOGY.STRUCTURING);

    // Correspondent-bank wire to high-risk jurisdiction.
    const corrBank = choice(correspondentBanks);
    addTx({
      timestamp: tsBusinessHours(),
      fromEntityId: chain[0].id,
      toEntityId: corrBank.id,
      amountUsd: Math.round(logNormal(12.2, 0.5)),
      channel: CHANNEL.WIRE,
      isCrossBorder: wireCrossBorder(chain[0], corrBank),
      source: SOURCE.XBORDER
    }, "correspondent_wire", caseClusterId, TYPOLOGY.SANCTIONS);

    // Round-number kickback payments (1-2 per cluster).
    for (let k = 0; k < 1 + Math.floor(rand() * 2); k += 1) {
      const roundAmount = choice([25000, 50000, 75000, 100000]);
      const counter = choice(chain);
      addTx({
        timestamp: tsBusinessHours(),
        fromEntityId: counter.id,
        toEntityId: beneficiary.id,
        amountUsd: roundAmount,
        channel: CHANNEL.WIRE,
        isCrossBorder: wireCrossBorder(counter, beneficiary),
        source: SOURCE.XBORDER
      }, "kickback", caseClusterId, TYPOLOGY.TBML);
    }
  });

  return { txs, labels };
}

function buildSilkRoadTransactions(nextTxId, legitEntities, silkBuilt) {
  const txs = [];
  const labels = [];
  const usBanks = legitEntities.filter((e) => e.kind === KIND.BANK && e.jurisdiction === "US");

  function addTx(partial, pattern, caseClusterId, typology) {
    const tx = Object.assign({ id: nextTxId() }, partial);
    txs.push(tx);
    labels.push({
      transactionId: tx.id,
      is_suspicious: true,
      cluster: "silkroad",
      case_cluster_id: caseClusterId,
      pattern_tag: pattern,
      typology
    });
    return tx;
  }

  silkBuilt.clusters.forEach((cluster) => {
    if (cluster.kind === "escrow") {
      // CASE-2006: each buyer wallet → vendor wallet, small retail amounts.
      cluster.buyerIds.forEach((buyerId) => {
        const nOrders = 3 + Math.floor(rand() * 4); // 3..6 orders per buyer
        for (let i = 0; i < nOrders; i += 1) {
          const amount = Math.max(20, Math.round(logNormal(4.7, 0.55)));
          addTx({
            timestamp: tsUniform(),
            fromEntityId: buyerId,
            toEntityId: cluster.vendorId,
            amountUsd: Math.min(amount, 800),
            channel: CHANNEL.CRYPTO,
            isCrossBorder: false,
            source: SOURCE.CRYPTO
          }, "marketplace_escrow", cluster.caseClusterId, TYPOLOGY.CRYPTO);
        }
      });
    }
    if (cluster.kind === "commission") {
      // CASE-2007: vendor wallet skims ~10% to operator wallets.
      const skims = 6 + Math.floor(rand() * 5);
      for (let i = 0; i < skims; i += 1) {
        const parent = Math.round(logNormal(4.7, 0.55)) + 80;
        const skim = Math.max(5, Math.round(parent * 0.1));
        addTx({
          timestamp: tsUniform(),
          fromEntityId: cluster.vendorId,
          toEntityId: cluster.operatorWalletIds[i % cluster.operatorWalletIds.length],
          amountUsd: skim,
          channel: CHANNEL.CRYPTO,
          isCrossBorder: false,
          source: SOURCE.CRYPTO
        }, "commission_skim", cluster.caseClusterId, TYPOLOGY.CRYPTO);
      }
    }
    if (cluster.kind === "mixer") {
      // CASE-2008: 8 sources → mixer (fan-in), then mixer → 8 destinations after delay (fan-out).
      cluster.sourceIds.forEach((srcId) => {
        addTx({
          timestamp: tsUniform(),
          fromEntityId: srcId,
          toEntityId: cluster.mixerId,
          amountUsd: Math.round(logNormal(6.5, 0.4)),
          channel: CHANNEL.CRYPTO,
          isCrossBorder: false,
          source: SOURCE.CRYPTO
        }, "mixer_fan_in", cluster.caseClusterId, TYPOLOGY.CRYPTO);
      });
      cluster.destinationIds.forEach((dstId) => {
        addTx({
          timestamp: tsUniform(),
          fromEntityId: cluster.mixerId,
          toEntityId: dstId,
          amountUsd: Math.round(logNormal(6.3, 0.45)),
          channel: CHANNEL.CRYPTO,
          isCrossBorder: false,
          source: SOURCE.CRYPTO
        }, "mixer_fan_out", cluster.caseClusterId, TYPOLOGY.CRYPTO);
      });
    }
    if (cluster.kind === "peel") {
      // CASE-2009: funder → hop1, hop1 → hop2, etc., each smaller than the last.
      let remaining = 180000;
      let prev = cluster.funderId;
      for (let i = 0; i < cluster.hopIds.length; i += 1) {
        const hopId = cluster.hopIds[i];
        const take = Math.round(remaining * (0.35 + rand() * 0.2));
        remaining = Math.max(500, remaining - take);
        addTx({
          timestamp: tsUniform(),
          fromEntityId: prev,
          toEntityId: hopId,
          amountUsd: take,
          channel: CHANNEL.CRYPTO,
          isCrossBorder: false,
          source: SOURCE.CRYPTO
        }, "peel_chain", cluster.caseClusterId, TYPOLOGY.CRYPTO);
        prev = hopId;
      }
    }
    if (cluster.kind === "cashout") {
      // CASE-2010: operator wallets → exchanges (crypto) → USD wire to operator individual → US bank.
      cluster.operatorWalletIds.forEach((walletId, idx) => {
        const exchangeId = cluster.exchangeIds[idx % cluster.exchangeIds.length];
        const amount = randInt(25000, 75000);
        addTx({
          timestamp: tsUniform(),
          fromEntityId: walletId,
          toEntityId: exchangeId,
          amountUsd: amount,
          channel: CHANNEL.CRYPTO,
          isCrossBorder: false,
          source: SOURCE.CRYPTO
        }, "exchange_deposit", cluster.caseClusterId, TYPOLOGY.CRYPTO);
        // Follow-up USD wire to operator.
        addTx({
          timestamp: tsUniform(),
          fromEntityId: exchangeId,
          toEntityId: cluster.operatorId,
          amountUsd: Math.round(amount * 0.97),
          channel: CHANNEL.WIRE,
          isCrossBorder: true,
          source: SOURCE.XBORDER
        }, "cashout_wire", cluster.caseClusterId, TYPOLOGY.VELOCITY);
        // Operator → US bank deposit
        if (usBanks.length) {
          addTx({
            timestamp: tsUniform(),
            fromEntityId: cluster.operatorId,
            toEntityId: usBanks[idx % usBanks.length].id,
            amountUsd: Math.round(amount * 0.95),
            channel: CHANNEL.WIRE,
            isCrossBorder: false,
            source: SOURCE.BANK
          }, "cashout_deposit", cluster.caseClusterId, TYPOLOGY.VELOCITY);
        }
      });
    }
  });

  return { txs, labels };
}

// ---------------------------------------------------------------------------
// Flagged case synthesis — 1 per cluster (10 total).
// ---------------------------------------------------------------------------
function buildFlaggedCases(allEntities, lerouxBuilt, silkBuilt, allTxs, allLabels) {
  const cases = [];

  // Le Roux — one case per cluster, tied to the beneficiary.
  lerouxBuilt.clusters.forEach((cluster, i) => {
    const relatedTxIds = allLabels
      .filter((l) => l.case_cluster_id === cluster.caseClusterId)
      .slice(0, 5)
      .map((l) => l.transactionId);
    const beneficiary = allEntities.find((e) => e.id === cluster.beneficiaryId);
    const chainDepth = cluster.chainIds.length;
    const whyFlagged = "Shell-company chain " + chainDepth + " layers deep across " +
      cluster.chainIds.map((id) => allEntities.find((e) => e.id === id)).map((e) => e.jurisdiction).join(" → ") +
      " routes value to " + (beneficiary ? beneficiary.name : "an individual") +
      "; same-day structured sub-$10k deposits and correspondent-bank wires follow.";
    cases.push({
      caseId: cluster.caseClusterId,
      entityId: beneficiary.id,
      typology: i % 2 === 0 ? TYPOLOGY.SANCTIONS : TYPOLOGY.TBML,
      riskScore: 84 + Math.floor(rand() * 10),
      confidence: 72 + Math.floor(rand() * 15),
      jurisdictionRelevance: 80 + Math.floor(rand() * 12),
      contributingFeatures: [
        "Shell-company chain of depth " + chainDepth,
        "Structured sub-$10k ACH deposits clustered same-day",
        "Correspondent-bank wire to high-risk jurisdiction",
        "Round-number consulting / logistics kickback"
      ],
      whyFlagged,
      rawInputs: [
        chainDepth + " linked shell accounts across high-risk jurisdictions",
        "4-6 sub-$10k deposits within 4 hours on same-day",
        "1 correspondent-bank outbound wire ≥$100k",
        "Round-number kickback memos consistent with bribery typology"
      ],
      enrichmentSources: ["Corporate registry", "Sanctions graph", "CTR filings", "Ownership resolver"],
      relatedTransactionIds: relatedTxIds
    });
  });

  // Silk Road — one case per cluster. Typology = Crypto Layering (except cashout → Unusual Velocity).
  const silkCaseTemplates = [
    {
      kind: "escrow",
      typology: TYPOLOGY.CRYPTO,
      contributing: ["Retail-scale crypto inflows to single vendor wallet", "Right-skewed amounts $20–$800", "24/7 uniform cadence inconsistent with single operator", "Fan-in from many unrelated wallets"],
      why: "Dozens of small crypto inflows from unrelated wallets consolidate into a single vendor wallet in a pattern consistent with an anonymous marketplace escrow."
    },
    {
      kind: "commission",
      typology: TYPOLOGY.CRYPTO,
      contributing: ["~10% skim from vendor wallet to operator-controlled cluster", "Multiple operator wallets receiving proportional shares", "Timing immediately follows marketplace inflows"],
      why: "Recurring ~10% outflows from the vendor escrow to a small operator-controlled wallet cluster, timing-aligned with marketplace inflows, consistent with a platform commission skim."
    },
    {
      kind: "mixer",
      typology: TYPOLOGY.CRYPTO,
      contributing: ["Fan-in ≥8 distinct counterparties", "Fan-out ≥8 distinct counterparties", "1–72h randomised delay between receive and send", "No apparent economic purpose"],
      why: "A single wallet receives from ≥8 distinct sources and redistributes to ≥8 distinct destinations after randomised delays, a canonical mixer/tumbler signature."
    },
    {
      kind: "peel",
      typology: TYPOLOGY.CRYPTO,
      contributing: ["Sequential peel of a large balance into smaller outputs", "Geometric decay of transfer sizes", "Chain of single-purpose hop wallets"],
      why: "A large balance is broken into geometrically-decaying outputs through a chain of single-purpose hop wallets — classic peel-chain obfuscation."
    },
    {
      kind: "cashout",
      typology: TYPOLOGY.VELOCITY,
      contributing: ["High-velocity crypto→exchange→USD wire conversion", "Multiple exchanges used in parallel", "Immediate onward bank deposit", "Cross-border correspondent leg"],
      why: "Operator-controlled wallets rapidly convert crypto to USD via multiple exchanges and wire proceeds onward to a commercial-bank account — high-velocity cash-out consistent with marketplace proceeds being realised."
    }
  ];

  silkBuilt.clusters.forEach((cluster) => {
    const t = silkCaseTemplates.find((s) => s.kind === cluster.kind);
    if (!t) return;
    const related = allLabels
      .filter((l) => l.case_cluster_id === cluster.caseClusterId)
      .slice(0, 5)
      .map((l) => l.transactionId);
    let entityId = null;
    if (cluster.kind === "escrow")     entityId = cluster.vendorId;
    if (cluster.kind === "commission") entityId = cluster.operatorWalletIds[0];
    if (cluster.kind === "mixer")      entityId = cluster.mixerId;
    if (cluster.kind === "peel")       entityId = cluster.funderId;
    if (cluster.kind === "cashout")    entityId = cluster.operatorId;
    if (!entityId) return;
    cases.push({
      caseId: cluster.caseClusterId,
      entityId,
      typology: t.typology,
      riskScore: 80 + Math.floor(rand() * 13),
      confidence: 70 + Math.floor(rand() * 18),
      jurisdictionRelevance: 65 + Math.floor(rand() * 15),
      contributingFeatures: t.contributing,
      whyFlagged: t.why,
      rawInputs: t.contributing.map((c) => c + " — detector threshold crossed"),
      enrichmentSources: ["Crypto ledger", "Wallet intelligence", "Peer model", "Exchange KYC"],
      relatedTransactionIds: related
    });
  });

  cases.sort((a, b) => a.caseId.localeCompare(b.caseId));
  return cases;
}

// ---------------------------------------------------------------------------
// Sanctions list — small set of fabricated sanctioned entities drawn from the
// Le Roux / Silk Road clusters for demo consistency.
// ---------------------------------------------------------------------------
function buildSanctionsList(lerouxBuilt, silkBuilt) {
  const out = [];
  // 3 Le Roux shells flagged + beneficiaries
  let sanIdx = 1;
  lerouxBuilt.clusters.slice(0, 3).forEach((c) => {
    const lastShellId = c.chainIds[c.chainIds.length - 1];
    const ent = lerouxBuilt.entities.find((e) => e.id === lastShellId);
    if (ent) {
      out.push({
        id: "S" + String(sanIdx++).padStart(2, "0"),
        name: ent.name,
        program: choice(["OFAC - Counter Proliferation", "OFAC - Counter-Narcotics", "EU Restrictive Measures"]),
        jurisdiction: ent.jurisdiction,
        severity: "High"
      });
    }
  });
  // 2 Silk Road — mixer + exchange
  if (silkBuilt.mixers[0]) {
    out.push({
      id: "S" + String(sanIdx++).padStart(2, "0"),
      name: silkBuilt.mixers[0].name,
      program: "OFAC - Virtual Currency",
      jurisdiction: silkBuilt.mixers[0].jurisdiction,
      severity: "High"
    });
  }
  if (silkBuilt.exchanges[0]) {
    out.push({
      id: "S" + String(sanIdx++).padStart(2, "0"),
      name: silkBuilt.exchanges[0].name,
      program: "OFAC - Cyber",
      jurisdiction: silkBuilt.exchanges[0].jurisdiction,
      severity: "Medium"
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Ingestion sources / entity resolution / historical outcomes — preserve the
// existing shape with row counts that make sense for this dataset.
// ---------------------------------------------------------------------------
function buildIngestionSources() {
  return [
    { id: SOURCE.SAR,     label: "SAR Filings",          mode: "Batch",     records: 1834, freshnessMinutes: 22,  lineage: "BSA eFiling -> XML parser -> normalized_sar" },
    { id: SOURCE.CTR,     label: "CTR Filings",          mode: "Batch",     records: 4281, freshnessMinutes: 40,  lineage: "CTR ingest -> schema harmonizer -> normalized_ctr" },
    { id: SOURCE.SAN,     label: "Sanctions List",       mode: "Batch",     records: 719,  freshnessMinutes: 95,  lineage: "Consolidated sanctions -> alias resolver -> sanctions_master" },
    { id: SOURCE.CRYPTO,  label: "Crypto Transactions",  mode: "Streaming", records: 6822, freshnessMinutes: 3,   lineage: "Node listener -> wallet resolver -> crypto_ledger" },
    { id: SOURCE.BANK,    label: "Bank Metadata",        mode: "Batch",     records: 1164, freshnessMinutes: 144, lineage: "FI profiles -> entity linker -> bank_reference" },
    { id: SOURCE.XBORDER, label: "Cross-Border Records", mode: "Streaming", records: 2655, freshnessMinutes: 6,   lineage: "SWIFT monitor -> geo enricher -> xborder_events" }
  ];
}

function buildEntityResolution(entities) {
  const sampleShells = entities.filter((e) => e.kind === KIND.SHELL).slice(0, 4);
  const duplicateProfiles = sampleShells.map((e, i) => ({
    sourceId: "SAR-" + String(9000 + i * 37).padStart(4, "0"),
    observedName: (e.aliases && e.aliases[0]) || e.name.split(" ").slice(0, 2).join(" "),
    matchedEntityId: e.id,
    confidence: Number((0.91 + rand() * 0.07).toFixed(2))
  }));
  return {
    duplicateProfiles,
    beforeEntityCount: entities.length + duplicateProfiles.length,
    afterEntityCount: entities.length
  };
}

function buildHistoricalOutcomes() {
  return [
    { caseId: "CASE-0902", result: "Referred to Enforcement",  closeDate: "2013-08-19T13:44:00Z", analyst: "A. Stone" },
    { caseId: "CASE-0905", result: "Intelligence Escalation",   closeDate: "2013-08-29T10:12:00Z", analyst: "R. Chen" },
    { caseId: "CASE-0908", result: "Monitoring Continued",      closeDate: "2013-09-02T16:03:00Z", analyst: "J. Patel" },
    { caseId: "CASE-0913", result: "Auto-closed",               closeDate: "2013-09-08T09:21:00Z", analyst: "M. Turner" }
  ];
}

// ---------------------------------------------------------------------------
// Stable serialisation — produces pretty-printed, deterministic output.
// ---------------------------------------------------------------------------
function serialiseEntity(e) {
  const parts = [
    "id: "           + JSON.stringify(e.id),
    "name: "         + JSON.stringify(e.name),
    "kind: "         + JSON.stringify(e.kind),
    "jurisdiction: " + JSON.stringify(e.jurisdiction),
    "riskZone: "     + JSON.stringify(e.riskZone),
    "sector: "       + JSON.stringify(e.sector),
    "aliases: "      + JSON.stringify(e.aliases || [])
  ];
  return "    { " + parts.join(", ") + " }";
}

function serialiseTransaction(t) {
  const parts = [
    "id: "           + JSON.stringify(t.id),
    "timestamp: "    + JSON.stringify(t.timestamp),
    "fromEntityId: " + JSON.stringify(t.fromEntityId),
    "toEntityId: "   + JSON.stringify(t.toEntityId),
    "amountUsd: "    + t.amountUsd,
    "channel: "      + JSON.stringify(t.channel),
    "isCrossBorder: "+ t.isCrossBorder,
    "source: "       + JSON.stringify(t.source)
  ];
  return "    { " + parts.join(", ") + " }";
}

function serialiseFlaggedCase(c) {
  return "    " + JSON.stringify(c, null, 2).split("\n").join("\n    ");
}

function serialiseSanction(s) {
  const parts = [
    "id: " + JSON.stringify(s.id),
    "name: " + JSON.stringify(s.name),
    "program: " + JSON.stringify(s.program),
    "jurisdiction: " + JSON.stringify(s.jurisdiction),
    "severity: " + JSON.stringify(s.severity)
  ];
  return "    { " + parts.join(", ") + " }";
}

function serialiseIngestion(s) {
  const parts = [
    "id: " + JSON.stringify(s.id),
    "label: " + JSON.stringify(s.label),
    "mode: " + JSON.stringify(s.mode),
    "records: " + s.records,
    "freshnessMinutes: " + s.freshnessMinutes,
    "lineage: " + JSON.stringify(s.lineage)
  ];
  return "    { " + parts.join(", ") + " }";
}

function serialiseHistory(h) {
  return "    { caseId: " + JSON.stringify(h.caseId) +
    ", result: " + JSON.stringify(h.result) +
    ", closeDate: " + JSON.stringify(h.closeDate) +
    ", analyst: " + JSON.stringify(h.analyst) + " }";
}

function serialiseEntityResolution(er) {
  const lines = [];
  lines.push("  const entityResolution = {");
  lines.push("    duplicateProfiles: [");
  er.duplicateProfiles.forEach((d, i) => {
    const parts = [
      "sourceId: " + JSON.stringify(d.sourceId),
      "observedName: " + JSON.stringify(d.observedName),
      "matchedEntityId: " + JSON.stringify(d.matchedEntityId),
      "confidence: " + d.confidence
    ];
    lines.push("      { " + parts.join(", ") + " }" + (i < er.duplicateProfiles.length - 1 ? "," : ""));
  });
  lines.push("    ],");
  lines.push("    beforeEntityCount: " + er.beforeEntityCount + ",");
  lines.push("    afterEntityCount: " + er.afterEntityCount);
  lines.push("  };");
  return lines.join("\n");
}

function serialiseJurisdictionRisk(jr) {
  const lines = ["  const jurisdictionRisk = {"];
  const keys = Object.keys(jr);
  keys.forEach((k, i) => {
    const keyStr = /[^A-Za-z_$]/.test(k) ? JSON.stringify(k) : k;
    lines.push("    " + keyStr + ": " + jr[k] + (i < keys.length - 1 ? "," : ""));
  });
  lines.push("  };");
  return lines.join("\n");
}

function serialiseTypologySeverity(ts) {
  const lines = ["  const typologySeverity = {"];
  const keys = Object.keys(ts);
  keys.forEach((k, i) => {
    const keyStr = /[^A-Za-z_$]/.test(k) ? JSON.stringify(k) : k;
    lines.push("    " + keyStr + ": " + ts[k].toFixed(2) + (i < keys.length - 1 ? "," : ""));
  });
  lines.push("  };");
  return lines.join("\n");
}

function buildDataFile(bundle) {
  const lines = [];
  lines.push("/* Synthetic intelligence dataset for the FinCEN signal-to-decision demo.");
  lines.push(" *");
  lines.push(" * Generated by scripts/generate-dataset.js (seed = 42, deterministic).");
  lines.push(" * Patterns are generalised from publicly-available court filings and");
  lines.push(" * journalism on Paul Le Roux's RX Limited network and Ross Ulbricht's");
  lines.push(" * Silk Road marketplace.  SYNTHETIC DATA — FOR TRAINING / DEMO ONLY.");
  lines.push(" * See data/README_DATASET.md for full details.");
  lines.push(" */");
  lines.push("(function () {");
  lines.push("  \"use strict\";");
  lines.push("");

  // entities
  lines.push("  const entities = [");
  bundle.entities.forEach((e, i) => {
    lines.push(serialiseEntity(e) + (i < bundle.entities.length - 1 ? "," : ""));
  });
  lines.push("  ];");
  lines.push("");

  // ingestion sources
  lines.push("  const ingestionSources = [");
  bundle.ingestionSources.forEach((s, i) => {
    lines.push(serialiseIngestion(s) + (i < bundle.ingestionSources.length - 1 ? "," : ""));
  });
  lines.push("  ];");
  lines.push("");

  // sanctions
  lines.push("  const sanctionsList = [");
  bundle.sanctionsList.forEach((s, i) => {
    lines.push(serialiseSanction(s) + (i < bundle.sanctionsList.length - 1 ? "," : ""));
  });
  lines.push("  ];");
  lines.push("");

  // jurisdiction risk + typology severity
  lines.push(serialiseJurisdictionRisk(bundle.jurisdictionRisk));
  lines.push("");
  lines.push(serialiseTypologySeverity(bundle.typologySeverity));
  lines.push("");

  // transactions
  lines.push("  const transactions = [");
  bundle.transactions.forEach((t, i) => {
    lines.push(serialiseTransaction(t) + (i < bundle.transactions.length - 1 ? "," : ""));
  });
  lines.push("  ];");
  lines.push("");

  // entity resolution
  lines.push(serialiseEntityResolution(bundle.entityResolution));
  lines.push("");

  // flagged cases
  lines.push("  const flaggedCases = [");
  bundle.flaggedCases.forEach((c, i) => {
    lines.push(serialiseFlaggedCase(c) + (i < bundle.flaggedCases.length - 1 ? "," : ""));
  });
  lines.push("  ];");
  lines.push("");

  // historical outcomes
  lines.push("  const historicalOutcomes = [");
  bundle.historicalOutcomes.forEach((h, i) => {
    lines.push(serialiseHistory(h) + (i < bundle.historicalOutcomes.length - 1 ? "," : ""));
  });
  lines.push("  ];");
  lines.push("");

  // export
  lines.push("  const FinCENData = {");
  lines.push("    entities,");
  lines.push("    transactions,");
  lines.push("    sanctionsList,");
  lines.push("    flaggedCases,");
  lines.push("    historicalOutcomes,");
  lines.push("    ingestionSources,");
  lines.push("    entityResolution,");
  lines.push("    jurisdictionRisk,");
  lines.push("    typologySeverity");
  lines.push("  };");
  lines.push("");
  lines.push("  window.FinCENData = FinCENData;");
  lines.push("})();");
  lines.push("");

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Validator — run in-process before writing, crashes loudly if invariants
// break. Prevents us ever shipping a corrupt js/data.js.
// ---------------------------------------------------------------------------
function validate(bundle) {
  const entityIds = new Set(bundle.entities.map((e) => e.id));
  const txIds = new Set();
  const validKinds = new Set(Object.values(KIND));
  const validChannels = new Set(Object.values(CHANNEL));
  const validSources = new Set(Object.values(SOURCE));
  const validTypologies = new Set(Object.values(TYPOLOGY));
  const validJurisdictions = new Set(Object.keys(bundle.jurisdictionRisk));

  const errs = [];
  bundle.entities.forEach((e) => {
    if (!e.id) errs.push("entity missing id: " + JSON.stringify(e));
    if (!validKinds.has(e.kind)) errs.push("entity " + e.id + " bad kind: " + e.kind);
    if (!validJurisdictions.has(e.jurisdiction)) errs.push("entity " + e.id + " bad jurisdiction: " + e.jurisdiction);
  });
  bundle.transactions.forEach((t) => {
    if (!t.id) errs.push("tx missing id: " + JSON.stringify(t));
    if (txIds.has(t.id)) errs.push("tx duplicate id: " + t.id);
    txIds.add(t.id);
    if (!entityIds.has(t.fromEntityId)) errs.push("tx " + t.id + " bad fromEntityId: " + t.fromEntityId);
    if (!entityIds.has(t.toEntityId)) errs.push("tx " + t.id + " bad toEntityId: " + t.toEntityId);
    if (!validChannels.has(t.channel)) errs.push("tx " + t.id + " bad channel: " + t.channel);
    if (!validSources.has(t.source)) errs.push("tx " + t.id + " bad source: " + t.source);
    if (typeof t.amountUsd !== "number" || !Number.isFinite(t.amountUsd)) errs.push("tx " + t.id + " bad amount: " + t.amountUsd);
  });
  bundle.flaggedCases.forEach((c) => {
    if (!entityIds.has(c.entityId)) errs.push("case " + c.caseId + " bad entityId: " + c.entityId);
    if (!validTypologies.has(c.typology)) errs.push("case " + c.caseId + " bad typology: " + c.typology);
    (c.relatedTransactionIds || []).forEach((id) => {
      if (!txIds.has(id)) errs.push("case " + c.caseId + " bad tx ref: " + id);
    });
  });
  if (errs.length) {
    console.error("VALIDATION FAILED:");
    errs.slice(0, 10).forEach((e) => console.error("  " + e));
    if (errs.length > 10) console.error("  ...and " + (errs.length - 10) + " more");
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Main.
// ---------------------------------------------------------------------------
function main() {
  const nextEntityId = idFactory("E", 4);
  const nextTxId     = idFactory("TX", 5);

  // Entity pools — ordering deterministic because rand() is seeded.
  const legit = buildLegitimateEntities(nextEntityId, 140);
  const lerouxBuilt = buildLerouxCluster(nextEntityId);
  const silkBuilt = buildSilkRoadCluster(nextEntityId);

  const entities = [].concat(legit, lerouxBuilt.entities, silkBuilt.entities);

  // Transactions — legit first so TX IDs are densest in the baseline.
  const legitResult   = buildLegitimateTransactions(nextTxId, legit, 1820);
  const lerouxResult  = buildLerouxTransactions(nextTxId, legit, lerouxBuilt);
  const silkResult    = buildSilkRoadTransactions(nextTxId, legit, silkBuilt);

  const allTxs    = [].concat(legitResult.txs, lerouxResult.txs, silkResult.txs);
  const allLabels = [].concat(legitResult.labels, lerouxResult.labels, silkResult.labels);

  // Sort transactions by timestamp for nicer in-app display.
  const order = allTxs.map((tx, i) => ({ tx, label: allLabels[i] }))
                      .sort((a, b) => (a.tx.timestamp < b.tx.timestamp ? -1 : a.tx.timestamp > b.tx.timestamp ? 1 : 0));
  // Re-ID transactions after sort for stable readable TX numbers.
  const reTxFactory = idFactory("TX", 5);
  const remapped = {};
  order.forEach(({ tx }) => {
    const newId = reTxFactory();
    remapped[tx.id] = newId;
    tx.id = newId;
  });
  // Update label transactionId references and flaggedCase.relatedTransactionIds.
  order.forEach(({ label }) => { label.transactionId = remapped[label.transactionId]; });

  const flaggedCases = buildFlaggedCases(entities, lerouxBuilt, silkBuilt, order.map((o) => o.tx), order.map((o) => o.label));
  flaggedCases.forEach((c) => {
    c.relatedTransactionIds = c.relatedTransactionIds.map((id) => remapped[id] || id);
  });

  const bundle = {
    entities,
    transactions: order.map((o) => o.tx),
    sanctionsList: buildSanctionsList(lerouxBuilt, silkBuilt),
    flaggedCases,
    historicalOutcomes: buildHistoricalOutcomes(),
    ingestionSources: buildIngestionSources(),
    entityResolution: buildEntityResolution(entities),
    jurisdictionRisk: JURISDICTION_RISK,
    typologySeverity: TYPOLOGY_SEVERITY
  };

  validate(bundle);

  // Write js/data.js
  const repoRoot = path.resolve(__dirname, "..");
  const dataPath = path.join(repoRoot, "js", "data.js");
  fs.writeFileSync(dataPath, buildDataFile(bundle));

  // Write data/ground-truth-labels.json — stable, sorted by transactionId.
  const labels = order.map((o) => o.label).sort((a, b) => (a.transactionId < b.transactionId ? -1 : 1));
  const labelsPath = path.join(repoRoot, "data", "ground-truth-labels.json");
  fs.writeFileSync(labelsPath, JSON.stringify(labels, null, 2) + "\n");

  // Stats
  const suspicious = labels.filter((l) => l.is_suspicious).length;
  const leroux = labels.filter((l) => l.cluster === "leroux").length;
  const silkroad = labels.filter((l) => l.cluster === "silkroad").length;

  console.log("Wrote " + dataPath);
  console.log("Wrote " + labelsPath);
  console.log("Entities:        " + entities.length);
  console.log("Transactions:    " + order.length);
  console.log("Flagged cases:   " + flaggedCases.length);
  console.log("Suspicious TXs:  " + suspicious + " (" + ((suspicious / order.length) * 100).toFixed(1) + "%)");
  console.log("  Le Roux:       " + leroux);
  console.log("  Silk Road:     " + silkroad);
  console.log("Time range:      " + order[0].tx.timestamp + "  →  " + order[order.length - 1].tx.timestamp);
}

main();
