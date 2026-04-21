/* Synthetic intelligence dataset for the FinCEN signal-to-decision demo. */
(function () {
  "use strict";

  const entities = [
    { id: "E01", name: "Aidan Mercer", kind: "individual", jurisdiction: "US", riskZone: "Low", sector: "Import/Export", aliases: ["A. Mercer"] },
    { id: "E02", name: "Nera Holdings Ltd", kind: "shell_company", jurisdiction: "Cayman Islands", riskZone: "High", sector: "Holding", aliases: ["Nera HLD"] },
    { id: "E03", name: "Blue Delta Trading", kind: "shell_company", jurisdiction: "Cyprus", riskZone: "Medium", sector: "Commodities", aliases: ["BD Trading"] },
    { id: "E04", name: "Marlin Private Bank", kind: "bank", jurisdiction: "Switzerland", riskZone: "Low", sector: "Private Banking", aliases: ["MPB"] },
    { id: "E05", name: "Atlas Freight Group", kind: "company", jurisdiction: "US", riskZone: "Medium", sector: "Logistics", aliases: ["Atlas FG"] },
    { id: "E06", name: "Safa Exchange House", kind: "company", jurisdiction: "UAE", riskZone: "High", sector: "MSB", aliases: ["Safa EX"] },
    { id: "E07", name: "Kestrel Mining Supply", kind: "company", jurisdiction: "Nigeria", riskZone: "High", sector: "Mining", aliases: ["KMS"] },
    { id: "E08", name: "Horizon Nova Bank", kind: "bank", jurisdiction: "Hong Kong", riskZone: "Medium", sector: "Commercial Banking", aliases: ["HNB"] },
    { id: "E09", name: "Lucent Bridge Advisors", kind: "company", jurisdiction: "Panama", riskZone: "High", sector: "Advisory", aliases: ["LBA"] },
    { id: "E10", name: "Mira Velasquez", kind: "individual", jurisdiction: "Panama", riskZone: "High", sector: "Consulting", aliases: ["M. Velasquez"] },
    { id: "E11", name: "Northpoint Retail Finance", kind: "bank", jurisdiction: "US", riskZone: "Low", sector: "Retail Banking", aliases: ["NRF"] },
    { id: "E12", name: "Orchid Harbor Trust", kind: "shell_company", jurisdiction: "Cayman Islands", riskZone: "High", sector: "Trust", aliases: ["OHT"] },
    { id: "E13", name: "Silver Reef Commodities", kind: "company", jurisdiction: "Cyprus", riskZone: "Medium", sector: "Commodities", aliases: ["Silver Reef"] },
    { id: "E14", name: "TerraPay Digital", kind: "company", jurisdiction: "US", riskZone: "Medium", sector: "Fintech", aliases: ["TerraPay"] },
    { id: "E15", name: "Osprey Custody Bank", kind: "bank", jurisdiction: "Switzerland", riskZone: "Low", sector: "Custody", aliases: ["OCB"] },
    { id: "E16", name: "Rasheed Al Khatib", kind: "individual", jurisdiction: "UAE", riskZone: "High", sector: "Trading", aliases: ["R. Khatib"] },
    { id: "E17", name: "Pelican Ledger Services", kind: "company", jurisdiction: "Hong Kong", riskZone: "Medium", sector: "Crypto Services", aliases: ["Pelican Ledger"] },
    { id: "E18", name: "Veridian Capital SA", kind: "shell_company", jurisdiction: "Panama", riskZone: "High", sector: "Capital Management", aliases: ["Veridian SA"] },
    { id: "E19", name: "Cedar Delta Bank", kind: "bank", jurisdiction: "US", riskZone: "Low", sector: "Commercial Banking", aliases: ["CDB"] },
    { id: "E20", name: "Lumen Harbor Imports", kind: "company", jurisdiction: "Nigeria", riskZone: "High", sector: "Trade", aliases: ["LHI"] }
  ];

  const ingestionSources = [
    { id: "SRC_SAR", label: "SAR Filings", mode: "Batch", records: 1834, freshnessMinutes: 22, lineage: "BSA eFiling -> XML parser -> normalized_sar" },
    { id: "SRC_CTR", label: "CTR Filings", mode: "Batch", records: 4281, freshnessMinutes: 40, lineage: "CTR ingest -> schema harmonizer -> normalized_ctr" },
    { id: "SRC_SAN", label: "Sanctions List", mode: "Batch", records: 719, freshnessMinutes: 95, lineage: "Consolidated sanctions -> alias resolver -> sanctions_master" },
    { id: "SRC_CRYPTO", label: "Crypto Transactions", mode: "Streaming", records: 6822, freshnessMinutes: 3, lineage: "Node listener -> wallet resolver -> crypto_ledger" },
    { id: "SRC_BANK", label: "Bank Metadata", mode: "Batch", records: 1164, freshnessMinutes: 144, lineage: "FI profiles -> entity linker -> bank_reference" },
    { id: "SRC_XBORDER", label: "Cross-Border Records", mode: "Streaming", records: 2655, freshnessMinutes: 6, lineage: "SWIFT monitor -> geo enricher -> xborder_events" }
  ];

  const sanctionsList = [
    { id: "S01", name: "Veridian Capital SA", program: "OFAC - Counter Proliferation", jurisdiction: "Panama", severity: "High" },
    { id: "S02", name: "Rasheed Al Khatib", program: "OFAC - Narcotics", jurisdiction: "UAE", severity: "High" },
    { id: "S03", name: "Orchid Harbor Trust", program: "EU Restrictive Measures", jurisdiction: "Cayman Islands", severity: "High" },
    { id: "S04", name: "Nera Holdings Ltd", program: "UN Sanctions", jurisdiction: "Cayman Islands", severity: "Medium" },
    { id: "S05", name: "Safa Exchange House", program: "Domestic Watchlist", jurisdiction: "UAE", severity: "Medium" }
  ];

  const jurisdictionRisk = {
    US: 0.2,
    Switzerland: 0.25,
    "Hong Kong": 0.52,
    Cyprus: 0.59,
    UAE: 0.73,
    Nigeria: 0.77,
    Panama: 0.82,
    "Cayman Islands": 0.86
  };

  function pseudoRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  const txPairs = [
    ["E01", "E05"], ["E05", "E11"], ["E03", "E08"], ["E14", "E19"], ["E07", "E20"],
    ["E02", "E12"], ["E12", "E18"], ["E09", "E10"], ["E16", "E06"], ["E17", "E08"],
    ["E13", "E03"], ["E15", "E04"], ["E20", "E09"], ["E02", "E06"], ["E18", "E04"]
  ];

  const transactions = [];
  const start = new Date("2025-09-01T08:00:00Z").getTime();
  for (let i = 1; i <= 120; i += 1) {
    const pair = txPairs[i % txPairs.length];
    const jitter = pseudoRandom(i) * 55000;
    const amountBase = 5000 + (i % 19) * 1300;
    const isStructuringBand = i % 17 === 0 || i % 23 === 0;
    const isCryptoLayer = i % 14 === 0;
    const amount = isStructuringBand ? 9800 + (i % 3) * 60 : Math.round(amountBase + jitter);
    const channel = isCryptoLayer ? "crypto" : (i % 3 === 0 ? "wire" : "ach");
    const ts = new Date(start + i * 86400000 / 2 + (i % 5) * 900000).toISOString();
    const from = pair[0];
    const to = pair[1];
    transactions.push({
      id: "TX" + String(i).padStart(3, "0"),
      timestamp: ts,
      fromEntityId: from,
      toEntityId: to,
      amountUsd: amount,
      channel,
      isCrossBorder: entities.find((e) => e.id === from).jurisdiction !== entities.find((e) => e.id === to).jurisdiction,
      source: channel === "crypto" ? "SRC_CRYPTO" : (i % 2 === 0 ? "SRC_XBORDER" : "SRC_CTR")
    });
  }

  const entityResolution = {
    duplicateProfiles: [
      { sourceId: "SAR-9823", observedName: "Nera HLD", matchedEntityId: "E02", confidence: 0.94 },
      { sourceId: "CTR-5561", observedName: "Nera Holdings Limited", matchedEntityId: "E02", confidence: 0.97 },
      { sourceId: "CRY-2215", observedName: "R. Khatib", matchedEntityId: "E16", confidence: 0.93 },
      { sourceId: "SAR-1011", observedName: "Veridian SA", matchedEntityId: "E18", confidence: 0.92 }
    ],
    beforeEntityCount: 24,
    afterEntityCount: 20
  };

  const flaggedCases = [
    {
      caseId: "CASE-1001",
      entityId: "E02",
      typology: "Structuring",
      riskScore: 92,
      confidence: 89,
      jurisdictionRelevance: 88,
      contributingFeatures: ["Transaction velocity spike", "Sub-threshold deposit clustering", "Sanctions-adjacent ownership"],
      whyFlagged: "Seven near-threshold deposits were followed by immediate offshore movement through linked shell entities.",
      rawInputs: ["9 CTR events in 36h", "4 linked shell accounts", "1 sanctions adjacency hit"],
      enrichmentSources: ["Bank metadata", "Ownership registry", "Sanctions alias resolver"],
      relatedTransactionIds: ["TX017", "TX023", "TX034", "TX051", "TX068"]
    },
    {
      caseId: "CASE-1002",
      entityId: "E18",
      typology: "Sanctions Evasion",
      riskScore: 97,
      confidence: 93,
      jurisdictionRelevance: 91,
      contributingFeatures: ["Direct sanctions match", "Nested intermediary routing", "High-risk counterparty"],
      whyFlagged: "Named entity appears on sanctions list with matching alias and transmitted value through layered intermediaries.",
      rawInputs: ["Sanctions hit S01", "5-hop transfer chain", "2 high-risk jurisdiction endpoints"],
      enrichmentSources: ["Sanctions master", "Cross-border records", "Graph enrichment"],
      relatedTransactionIds: ["TX030", "TX045", "TX060", "TX075"]
    },
    {
      caseId: "CASE-1003",
      entityId: "E17",
      typology: "Crypto Layering",
      riskScore: 84,
      confidence: 81,
      jurisdictionRelevance: 70,
      contributingFeatures: ["Rapid wallet hops", "Mixer proximity", "Peer outlier behavior"],
      whyFlagged: "Funds traversed multiple short-lived wallets before reconversion through a linked fiat account.",
      rawInputs: ["14 wallet transfers in 6h", "3 known mixer adjacencies", "Outlier conversion pattern"],
      enrichmentSources: ["Crypto ledger", "Wallet intelligence", "Peer model"],
      relatedTransactionIds: ["TX014", "TX028", "TX042", "TX056"]
    },
    {
      caseId: "CASE-1004",
      entityId: "E07",
      typology: "TBML",
      riskScore: 86,
      confidence: 76,
      jurisdictionRelevance: 82,
      contributingFeatures: ["Invoice-value mismatch", "Trade corridor anomaly", "Circular payment"],
      whyFlagged: "Declared commodity values diverge materially from market baselines and funds loop back to an affiliated importer.",
      rawInputs: ["5 invoice mismatches", "28% overvaluation", "2 circular flows"],
      enrichmentSources: ["Trade docs", "Commodity benchmarks", "Entity graph"],
      relatedTransactionIds: ["TX007", "TX022", "TX037", "TX052"]
    },
    {
      caseId: "CASE-1005",
      entityId: "E16",
      typology: "Unusual Velocity",
      riskScore: 78,
      confidence: 72,
      jurisdictionRelevance: 79,
      contributingFeatures: ["Account burst activity", "Counterparty novelty", "Night-hour concentration"],
      whyFlagged: "Transaction cadence and timing diverge sharply from historical behavior over a short interval.",
      rawInputs: ["31 transfers in 24h", "87% new counterparties", "high off-hours ratio"],
      enrichmentSources: ["Account history", "Behavioral baseline"],
      relatedTransactionIds: ["TX011", "TX026", "TX041", "TX058"]
    },
    {
      caseId: "CASE-1006",
      entityId: "E09",
      typology: "Structuring",
      riskScore: 71,
      confidence: 66,
      jurisdictionRelevance: 74,
      contributingFeatures: ["Repeated $9.8K deposits", "Cross-border fan-out", "Peer group deviation"],
      whyFlagged: "Repeated near-threshold deposits route to multiple external destinations within short windows.",
      rawInputs: ["6 deposits < $10K", "4 destination jurisdictions"],
      enrichmentSources: ["CTR filings", "Cross-border events", "Peer model"],
      relatedTransactionIds: ["TX019", "TX033", "TX047", "TX059"]
    },
    {
      caseId: "CASE-1007",
      entityId: "E12",
      typology: "Sanctions Evasion",
      riskScore: 88,
      confidence: 67,
      jurisdictionRelevance: 86,
      contributingFeatures: ["Indirect sanctions nexus", "Ownership opacity", "Offshore sequencing"],
      whyFlagged: "Beneficial ownership chain links to sanctioned entities via nominee-controlled intermediaries.",
      rawInputs: ["3-layer ownership chain", "sanctions adjacency score 0.81"],
      enrichmentSources: ["Corporate registry", "Sanctions graph", "KYC profiles"],
      relatedTransactionIds: ["TX039", "TX053", "TX067", "TX081"]
    },
    {
      caseId: "CASE-1008",
      entityId: "E05",
      typology: "TBML",
      riskScore: 64,
      confidence: 62,
      jurisdictionRelevance: 58,
      contributingFeatures: ["Cargo value variance", "Counterparty churn", "Documentation inconsistency"],
      whyFlagged: "Trade payment activity reflects inconsistent documentation and elevated variance against expected values.",
      rawInputs: ["4 inconsistent manifests", "counterparty churn +41%"],
      enrichmentSources: ["Trade manifests", "Bank metadata"],
      relatedTransactionIds: ["TX005", "TX018", "TX031", "TX043"]
    }
  ];

  const historicalOutcomes = [
    { caseId: "CASE-0902", result: "Referred to Enforcement", closeDate: "2025-08-19T13:44:00Z", analyst: "A. Stone" },
    { caseId: "CASE-0905", result: "Intelligence Escalation", closeDate: "2025-08-29T10:12:00Z", analyst: "R. Chen" },
    { caseId: "CASE-0908", result: "Monitoring Continued", closeDate: "2025-09-02T16:03:00Z", analyst: "J. Patel" },
    { caseId: "CASE-0913", result: "Auto-closed", closeDate: "2025-09-08T09:21:00Z", analyst: "M. Turner" }
  ];

  const typologySeverity = {
    Structuring: 1.0,
    TBML: 1.07,
    "Sanctions Evasion": 1.18,
    "Crypto Layering": 1.08,
    "Unusual Velocity": 0.96
  };

  const FinCENData = {
    entities,
    transactions,
    sanctionsList,
    flaggedCases,
    historicalOutcomes,
    ingestionSources,
    entityResolution,
    jurisdictionRisk,
    typologySeverity
  };

  window.FinCENData = FinCENData;
})();
