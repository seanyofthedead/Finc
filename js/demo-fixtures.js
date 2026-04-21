/* Labelled demo-only synthetic graph. Extends the production FinCENData shape
 * with three domain-pattern cores (shell chain, crypto mixer, disposable
 * cluster) plus procedural background entities to reach ~500 nodes. Never
 * replaces production data implicitly; callers must opt in. */
(function () {
  "use strict";

  const JURIS = ["US", "Switzerland", "Hong Kong", "Cyprus", "UAE", "Nigeria", "Panama", "Cayman Islands"];
  const BG_KINDS = ["company", "individual", "bank", "shell_company", "crypto_service", "disposable_wallet"];

  function seededRandom(seed) {
    let s = (seed | 0) || 1;
    return function () {
      s = (s * 1664525 + 1013904223) | 0;
      return ((s >>> 0) % 1000000) / 1000000;
    };
  }

  function buildRichGraph() {
    const base = window.FinCENData;
    if (!base) {
      throw new Error("FinCENDemoFixtures.buildRichGraph: window.FinCENData not loaded.");
    }
    const rng = seededRandom(42);

    const entities = base.entities.map((e) => ({ ...e }));
    const transactions = base.transactions.map((t) => ({ ...t }));

    let nextN = 100;
    const nextId = () => {
      nextN += 1;
      return "E" + nextN;
    };

    // --- Shell-company chain (depth 5), terminating in an individual beneficial owner ---
    const chain = [];
    for (let i = 0; i < 6; i += 1) {
      const isTerminal = i === 5;
      const id = nextId();
      entities.push({
        id,
        name: "Shell Link " + String.fromCharCode(65 + i),
        kind: isTerminal ? "individual" : "shell_company",
        jurisdiction: JURIS[i % JURIS.length],
        riskZone: "High",
        sector: isTerminal ? "Beneficial Owner" : "Holding",
        aliases: []
      });
      chain.push(id);
    }
    for (let i = 0; i < chain.length - 1; i += 1) {
      transactions.push({
        id: "TX-CHAIN-" + i,
        timestamp: new Date(Date.now() - (chain.length - i) * 3600 * 1000).toISOString(),
        fromEntityId: chain[i],
        toEntityId: chain[i + 1],
        amountUsd: 50000 + i * 7500,
        channel: "wire",
        isCrossBorder: true,
        source: "SRC_XBORDER"
      });
    }

    // --- Crypto mixer with fan-in 10 and fan-out 10 ---
    const mixerId = nextId();
    entities.push({
      id: mixerId,
      name: "Spiral Mix Pool",
      kind: "crypto_service",
      jurisdiction: "Hong Kong",
      riskZone: "High",
      sector: "Mixer",
      aliases: ["Spiral Mixer"]
    });
    for (let i = 0; i < 10; i += 1) {
      const src = nextId();
      entities.push({
        id: src,
        name: "Mixer Source " + i,
        kind: "disposable_wallet",
        jurisdiction: JURIS[i % JURIS.length],
        riskZone: "High",
        sector: "Wallet",
        aliases: []
      });
      transactions.push({
        id: "TX-MIX-IN-" + i,
        timestamp: new Date(Date.now() - i * 600 * 1000).toISOString(),
        fromEntityId: src,
        toEntityId: mixerId,
        amountUsd: 29000 + i * 130,
        channel: "crypto",
        isCrossBorder: true,
        source: "SRC_CRYPTO"
      });
    }
    for (let i = 0; i < 10; i += 1) {
      const dst = nextId();
      entities.push({
        id: dst,
        name: "Mixer Destination " + i,
        kind: "disposable_wallet",
        jurisdiction: JURIS[(i + 3) % JURIS.length],
        riskZone: "High",
        sector: "Wallet",
        aliases: []
      });
      transactions.push({
        id: "TX-MIX-OUT-" + i,
        timestamp: new Date(Date.now() - i * 400 * 1000).toISOString(),
        fromEntityId: mixerId,
        toEntityId: dst,
        amountUsd: 28000 - i * 90,
        channel: "crypto",
        isCrossBorder: true,
        source: "SRC_CRYPTO"
      });
    }

    // --- Disposable-wallet cluster sharing a single funder ---
    const funderId = nextId();
    entities.push({
      id: funderId,
      name: "Orphan Funder",
      kind: "individual",
      jurisdiction: "UAE",
      riskZone: "High",
      sector: "Trading",
      aliases: []
    });
    for (let i = 0; i < 6; i += 1) {
      const w = nextId();
      entities.push({
        id: w,
        name: "Burn Wallet " + i,
        kind: "disposable_wallet",
        jurisdiction: "UAE",
        riskZone: "High",
        sector: "Wallet",
        aliases: []
      });
      transactions.push({
        id: "TX-BURN-" + i,
        timestamp: new Date(Date.now() - i * 900 * 1000).toISOString(),
        fromEntityId: funderId,
        toEntityId: w,
        amountUsd: 9800 + (i % 3) * 50,
        channel: "crypto",
        isCrossBorder: false,
        source: "SRC_CRYPTO"
      });
    }

    // --- Procedural background entities to reach >=500 total ---
    while (entities.length < 520) {
      const id = nextId();
      const kind = BG_KINDS[Math.floor(rng() * BG_KINDS.length)];
      entities.push({
        id,
        name: "Synthetic " + id,
        kind,
        jurisdiction: JURIS[Math.floor(rng() * JURIS.length)],
        riskZone: rng() > 0.72 ? "High" : (rng() > 0.45 ? "Medium" : "Low"),
        sector: "Synthetic",
        aliases: []
      });
    }

    // --- Ambient procedural transactions (connects the background graph) ---
    for (let i = 0; i < 420; i += 1) {
      const a = entities[Math.floor(rng() * entities.length)];
      const b = entities[Math.floor(rng() * entities.length)];
      if (a.id === b.id) continue;
      transactions.push({
        id: "TX-AMB-" + i,
        timestamp: new Date(Date.now() - i * 300 * 1000).toISOString(),
        fromEntityId: a.id,
        toEntityId: b.id,
        amountUsd: Math.round(rng() * 48000 + 500),
        channel: rng() > 0.6 ? "wire" : (rng() > 0.3 ? "ach" : "crypto"),
        isCrossBorder: a.jurisdiction !== b.jurisdiction,
        source: rng() > 0.6 ? "SRC_BANK" : "SRC_XBORDER"
      });
    }

    return {
      entities,
      transactions,
      sanctionsList: base.sanctionsList,
      flaggedCases: base.flaggedCases,
      historicalOutcomes: base.historicalOutcomes,
      ingestionSources: base.ingestionSources,
      entityResolution: base.entityResolution,
      jurisdictionRisk: base.jurisdictionRisk,
      typologySeverity: base.typologySeverity,
      __synthetic: true
    };
  }

  function shouldActivate(search) {
    if (typeof search !== "string" || !search) return false;
    const query = search.charAt(0) === "?" ? search.slice(1) : search;
    return query.split("&").some((pair) => pair === "demo=rich");
  }

  function activate() {
    window.FinCENData = buildRichGraph();
    return window.FinCENData;
  }

  window.FinCENDemoFixtures = { buildRichGraph, shouldActivate, activate };
})();
