import { describe, it, expect } from "vitest";

// Extension tests for deriveFeatures() once it iterates all entities with
// two-track formulas. Case-subject rows keep existing values (guarded by
// derive-features-characterization.test.js); non-case rows use the
// entity-only fallback: riskScore=0, jurisdictionRelevance=0, typologyFactor=1.

const CASE_ENTITY_IDS = [
  "E0147", "E0153", "E0158", "E0163", "E0167",
  "E0186", "E0187", "E0169", "E0206", "E0174"
];

describe("deriveFeatures extended to all entities (two-track formulas)", () => {
  it("returns one row per entity in data.entities", () => {
    const engine = window.FinCENEngine.buildEngine(window.FinCENData);
    const features = engine.getDerivedFeatures();
    expect(features.length).toBe(window.FinCENData.entities.length);
  });

  it("every entity in the dataset appears exactly once by entityId", () => {
    const engine = window.FinCENEngine.buildEngine(window.FinCENData);
    const features = engine.getDerivedFeatures();
    const ids = features.map((f) => f.entityId);
    expect(new Set(ids).size).toBe(ids.length);
    const entityIds = new Set(window.FinCENData.entities.map((e) => e.id));
    ids.forEach((id) => expect(entityIds.has(id)).toBe(true));
  });

  it("case subjects carry _caseEnriched=true; all other rows carry _caseEnriched=false", () => {
    const engine = window.FinCENEngine.buildEngine(window.FinCENData);
    const features = engine.getDerivedFeatures();
    CASE_ENTITY_IDS.forEach((eid) => {
      const row = features.find((f) => f.entityId === eid);
      expect(row, `expected row for ${eid}`).toBeDefined();
      expect(row._caseEnriched, `${eid} should be _caseEnriched=true`).toBe(true);
    });
    const nonCaseRows = features.filter((f) => !CASE_ENTITY_IDS.includes(f.entityId));
    nonCaseRows.forEach((row) => {
      expect(row._caseEnriched, `${row.entityId} should be _caseEnriched=false`).toBe(false);
    });
  });

  it("non-case rows have null case-overlay fields", () => {
    const engine = window.FinCENEngine.buildEngine(window.FinCENData);
    const features = engine.getDerivedFeatures();
    const nonCase = features.find((f) => !CASE_ENTITY_IDS.includes(f.entityId));
    expect(nonCase).toBeDefined();
    expect(nonCase.caseId).toBeNull();
    expect(nonCase.typologyTag).toBeNull();
    expect(nonCase.riskScore).toBeNull();
    expect(nonCase.confidence).toBeNull();
    expect(nonCase.whyFlagged).toBeNull();
    expect(nonCase.rawInputs).toBeNull();
    expect(nonCase.enrichmentSources).toBeNull();
    expect(nonCase.contributingFeatures).toBeNull();
  });

  it("non-case rows have non-null universal fields (entityId, entityName, entityKind, jurisdiction)", () => {
    const engine = window.FinCENEngine.buildEngine(window.FinCENData);
    const features = engine.getDerivedFeatures();
    const nonCase = features.find((f) => !CASE_ENTITY_IDS.includes(f.entityId));
    expect(typeof nonCase.entityId).toBe("string");
    expect(typeof nonCase.entityName).toBe("string");
    expect(typeof nonCase.entityKind).toBe("string");
    expect(typeof nonCase.jurisdiction).toBe("string");
  });

  it("non-case row E0001 (Bay Clinic, UAE) computes entity-only formula values", () => {
    // txCount=47, crossBorder=47, peerSet.size=33, jur=UAE (risk 0.73 -> jurBase=73)
    // velocity        = clamp(round((47*3.4 + 0*0.24) * 1), 0, 100) = 100
    // ownership       = clamp(round(33*9 + 0*0.35), 0, 100) = 100
    // peerDeviation   = clamp(round(|0 - (50+47)| * 0.92), 0, 100) = 89.24
    // jurisdictionRsk = clamp(round(73 + 0*0.2), 0, 100) = 73
    // crossBorder     = 47 >= 4 = true
    const engine = window.FinCENEngine.buildEngine(window.FinCENData);
    const row = engine.getDerivedFeatures().find((f) => f.entityId === "E0001");
    expect(row).toBeDefined();
    expect(row._caseEnriched).toBe(false);
    expect(row.entityName).toBe("Bay Clinic");
    expect(row.entityKind).toBe("company");
    expect(row.jurisdiction).toBe("UAE");
    expect(row.derived.transactionVelocityScore).toBe(100);
    expect(row.derived.jurisdictionRiskScore).toBe(73);
    expect(row.derived.beneficialOwnershipNetworkScore).toBe(100);
    expect(row.derived.peerGroupDeviation).toBe(89.24);
    expect(row.derived.crossBorderExposureFlag).toBe(true);
  });

  it("two non-case entities with same txCount but different jurisdictions produce different jurisdictionRiskScore", () => {
    // E0013 (Nigeria) and E0017 (Israel) both have txCount=1 in stock data
    const engine = window.FinCENEngine.buildEngine(window.FinCENData);
    const features = engine.getDerivedFeatures();
    const a = features.find((f) => f.entityId === "E0013");
    const b = features.find((f) => f.entityId === "E0017");
    expect(a).toBeDefined();
    expect(b).toBeDefined();
    expect(a._caseEnriched).toBe(false);
    expect(b._caseEnriched).toBe(false);
    expect(a.derived.jurisdictionRiskScore).not.toBe(b.derived.jurisdictionRiskScore);
  });

  it("case-subject row values are unchanged from characterization baseline (redundant guard)", () => {
    // This is a sanity check; the characterization test file is the primary guard.
    const engine = window.FinCENEngine.buildEngine(window.FinCENData);
    const row = engine.getDerivedFeatures().find((f) => f.caseId === "CASE-2001");
    expect(row.entityId).toBe("E0147");
    expect(row._caseEnriched).toBe(true);
    expect(row.derived.transactionVelocityScore).toBe(56.5);
  });
});

describe("getDerivedFeatures typology-filter parity (R1, R5)", () => {
  it("default ('All' filter) returns one row per entity in data.entities", () => {
    const engine = window.FinCENEngine.buildEngine(window.FinCENData);
    expect(engine.getState().selectedTypology).toBe("All");
    expect(engine.getDerivedFeatures().length).toBe(window.FinCENData.entities.length);
  });

  it("Crypto Layering narrows to a non-empty subset strictly smaller than the full population", () => {
    const engine = window.FinCENEngine.buildEngine(window.FinCENData);
    engine.setTypologyFilter("Crypto Layering");
    const features = engine.getDerivedFeatures();
    expect(features.length).toBeGreaterThan(0);
    expect(features.length).toBeLessThan(window.FinCENData.entities.length);
  });

  it("bidirectional parity: getDerivedFeatures entity set equals getFilteredGraph node set for every typology", () => {
    const typologies = ["All"].concat(window.FinCENData.typologies);
    typologies.forEach((t) => {
      const engine = window.FinCENEngine.buildEngine(window.FinCENData);
      engine.setTypologyFilter(t);
      const featureIds = engine.getDerivedFeatures().map((f) => f.entityId).sort();
      const graphIds = engine.getFilteredGraph().nodes.map((n) => n.id).sort();
      expect(featureIds).toEqual(graphIds);
    });
  });

  it("Structuring (no flagged cases in stock data) returns [] without throwing", () => {
    const engine = window.FinCENEngine.buildEngine(window.FinCENData);
    engine.setTypologyFilter("Structuring");
    expect(() => engine.getDerivedFeatures()).not.toThrow();
    expect(engine.getDerivedFeatures()).toEqual([]);
  });

  it("switching back to 'All' restores the full population", () => {
    const engine = window.FinCENEngine.buildEngine(window.FinCENData);
    engine.setTypologyFilter("Crypto Layering");
    expect(engine.getDerivedFeatures().length).toBeLessThan(window.FinCENData.entities.length);
    engine.setTypologyFilter("All");
    expect(engine.getDerivedFeatures().length).toBe(window.FinCENData.entities.length);
  });

  it("narrowed feature set preserves the _caseEnriched flag correctly for rows that are case subjects", () => {
    const engine = window.FinCENEngine.buildEngine(window.FinCENData);
    engine.setTypologyFilter("Crypto Layering");
    const features = engine.getDerivedFeatures();
    const cryptoCaseEntityIds = ["E0186", "E0187", "E0169", "E0206"]; // from stock data
    cryptoCaseEntityIds.forEach((eid) => {
      const row = features.find((f) => f.entityId === eid);
      expect(row, `expected row for ${eid} in Crypto Layering subgraph`).toBeDefined();
      expect(row._caseEnriched).toBe(true);
      expect(row.typologyTag).toBe("Crypto Layering");
    });
  });
});
