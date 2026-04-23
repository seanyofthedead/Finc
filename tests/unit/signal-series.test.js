import { describe, it, expect } from "vitest";

function buildTinyDataset() {
  const entities = [
    { id: "E1", name: "Alpha Ltd", kind: "shell_company", jurisdiction: "US" },
    { id: "E2", name: "Beta Ltd", kind: "shell_company", jurisdiction: "US" },
    { id: "E3", name: "Gamma Ltd", kind: "shell_company", jurisdiction: "US" },
    { id: "E4", name: "Delta Bank", kind: "bank", jurisdiction: "US" }
  ];
  const transactions = [];
  const pushTx = (id, from, to, iso, amount) => {
    transactions.push({
      id,
      fromEntityId: from,
      toEntityId: to,
      timestamp: iso,
      amountUsd: amount,
      channel: "wire",
      isCrossBorder: false,
      source: "SRC_BANK"
    });
  };
  // Span: 2020-01-01 to 2020-12-31 — 8 roughly-equal buckets of ~46 days.
  // E1 (subject): heavy activity in first 3 buckets, quiet otherwise
  pushTx("T1", "E1", "E4", "2020-01-15T12:00:00Z", 5000);
  pushTx("T2", "E1", "E4", "2020-02-01T12:00:00Z", 5000);
  pushTx("T3", "E1", "E4", "2020-02-15T12:00:00Z", 5000);
  pushTx("T4", "E1", "E4", "2020-03-20T12:00:00Z", 5000);
  pushTx("T5", "E1", "E4", "2020-12-20T12:00:00Z", 5000);
  // E2: mostly quiet
  pushTx("T6", "E2", "E4", "2020-06-15T12:00:00Z", 5000);
  pushTx("T7", "E2", "E4", "2020-07-15T12:00:00Z", 5000);
  // E3: median-ish — two evenly spaced tx
  pushTx("T8", "E3", "E4", "2020-05-15T12:00:00Z", 5000);
  pushTx("T9", "E3", "E4", "2020-08-15T12:00:00Z", 5000);

  const flaggedCases = [
    {
      caseId: "CASE-001",
      entityId: "E1",
      typology: "Structuring",
      riskScore: 80,
      confidence: 75,
      jurisdictionRelevance: 50,
      contributingFeatures: [],
      whyFlagged: "test",
      rawInputs: [],
      enrichmentSources: []
    },
    {
      caseId: "CASE-002",
      entityId: "E2",
      typology: "TBML",
      riskScore: 70,
      confidence: 80,
      jurisdictionRelevance: 60,
      contributingFeatures: [],
      whyFlagged: "test",
      rawInputs: [],
      enrichmentSources: []
    }
  ];

  return {
    entities,
    transactions,
    flaggedCases,
    sanctionsList: [],
    ingestionSources: [],
    entityResolution: { duplicateProfiles: [] },
    historicalOutcomes: [],
    jurisdictionRisk: { US: 0.2 },
    typologySeverity: { Structuring: 0.78, TBML: 1.05 }
  };
}

describe("engine.getSignalSeries()", () => {
  it("is exposed on the engine instance", () => {
    const engine = window.FinCENEngine.buildEngine(buildTinyDataset());
    expect(typeof engine.getSignalSeries).toBe("function");
  });

  it("returns the documented shape for a valid case", () => {
    const engine = window.FinCENEngine.buildEngine(buildTinyDataset());
    const s = engine.getSignalSeries("CASE-001");
    expect(s).not.toBeNull();
    expect(s.caseId).toBe("CASE-001");
    expect(typeof s.bucketDays).toBe("number");
    expect(Array.isArray(s.bucketLabels)).toBe(true);
    expect(s.velocity).toBeDefined();
    expect(Array.isArray(s.velocity.values)).toBe(true);
    expect(typeof s.velocity.unit).toBe("string");
    expect(s.peerDeviation).toBeDefined();
    expect(Array.isArray(s.peerDeviation.values)).toBe(true);
    expect(s.peerDeviation.peerGroup).toContain("shell_company");
    expect(s.summary).toBeDefined();
    expect(typeof s.summary.txPerDay).toBe("number");
    expect(typeof s.summary.peerZ).toBe("number");
  });

  it("bucketLabels and velocity.values have equal length", () => {
    const engine = window.FinCENEngine.buildEngine(buildTinyDataset());
    const s = engine.getSignalSeries("CASE-001");
    expect(s.velocity.values.length).toBe(s.bucketLabels.length);
    expect(s.peerDeviation.values.length).toBe(s.bucketLabels.length);
  });

  it("produces different velocity.values arrays for cases with different entities", () => {
    const engine = window.FinCENEngine.buildEngine(buildTinyDataset());
    const s1 = engine.getSignalSeries("CASE-001");
    const s2 = engine.getSignalSeries("CASE-002");
    expect(s1.velocity.values).not.toEqual(s2.velocity.values);
  });

  it("produces different peerDeviation.values arrays for cases with different entities", () => {
    const engine = window.FinCENEngine.buildEngine(buildTinyDataset());
    const s1 = engine.getSignalSeries("CASE-001");
    const s2 = engine.getSignalSeries("CASE-002");
    expect(s1.peerDeviation.values).not.toEqual(s2.peerDeviation.values);
  });

  it("summary.txPerDay equals total tx count divided by active days within rounding", () => {
    const engine = window.FinCENEngine.buildEngine(buildTinyDataset());
    const s = engine.getSignalSeries("CASE-001");
    // E1 has 5 transactions spanning 2020-01-15 to 2020-12-20 = 340 days.
    // Expect txPerDay ≈ 5 / 340 ≈ 0.0147
    const expected = 5 / ((new Date("2020-12-20T12:00:00Z") - new Date("2020-01-15T12:00:00Z")) / (24 * 60 * 60 * 1000));
    expect(s.summary.txPerDay).toBeCloseTo(expected, 2);
  });

  it("returns null for an unknown caseId", () => {
    const engine = window.FinCENEngine.buildEngine(buildTinyDataset());
    expect(engine.getSignalSeries("CASE-DOES-NOT-EXIST")).toBeNull();
  });

  it("is safe against a case whose entity has no transactions (returns zeroed velocity series, finite peerZ)", () => {
    const d = buildTinyDataset();
    d.entities.push({ id: "E5", name: "Idle Co", kind: "shell_company", jurisdiction: "US" });
    d.flaggedCases.push({
      caseId: "CASE-IDLE",
      entityId: "E5",
      typology: "Structuring",
      riskScore: 50,
      confidence: 50,
      jurisdictionRelevance: 30,
      contributingFeatures: [],
      whyFlagged: "idle",
      rawInputs: [],
      enrichmentSources: []
    });
    const engine = window.FinCENEngine.buildEngine(d);
    const s = engine.getSignalSeries("CASE-IDLE");
    expect(s.velocity.values.every((v) => v === 0)).toBe(true);
    expect(Number.isFinite(s.summary.peerZ)).toBe(true);
  });

  it("peerDeviation is centred at zero when the entity equals the peer median in every bucket", () => {
    // Three identical peers, each 1 tx in each of 2 consecutive buckets.
    const entities = [
      { id: "A", name: "A", kind: "shell_company", jurisdiction: "US" },
      { id: "B", name: "B", kind: "shell_company", jurisdiction: "US" },
      { id: "C", name: "C", kind: "shell_company", jurisdiction: "US" },
      { id: "SINK", name: "Sink", kind: "bank", jurisdiction: "US" }
    ];
    const transactions = [];
    const iso = (month, day) => "2020-" + String(month).padStart(2, "0") + "-" + String(day).padStart(2, "0") + "T12:00:00Z";
    ["A", "B", "C"].forEach((eid) => {
      transactions.push({ id: eid + "-1", fromEntityId: eid, toEntityId: "SINK", timestamp: iso(1, 15), amountUsd: 100, channel: "wire", isCrossBorder: false, source: "SRC_BANK" });
      transactions.push({ id: eid + "-2", fromEntityId: eid, toEntityId: "SINK", timestamp: iso(12, 15), amountUsd: 100, channel: "wire", isCrossBorder: false, source: "SRC_BANK" });
    });

    const data = {
      entities,
      transactions,
      flaggedCases: [{
        caseId: "CASE-EQ",
        entityId: "A",
        typology: "Structuring",
        riskScore: 50,
        confidence: 50,
        jurisdictionRelevance: 30,
        contributingFeatures: [],
        whyFlagged: "eq",
        rawInputs: [],
        enrichmentSources: []
      }],
      sanctionsList: [],
      ingestionSources: [],
      entityResolution: { duplicateProfiles: [] },
      historicalOutcomes: [],
      jurisdictionRisk: { US: 0.2 },
      typologySeverity: { Structuring: 0.78 }
    };
    const engine = window.FinCENEngine.buildEngine(data);
    const s = engine.getSignalSeries("CASE-EQ");
    expect(s.peerDeviation.values.every((v) => v === 0)).toBe(true);
  });
});

describe("engine.getSignalSeriesByEntity()", () => {
  it("is exposed on the engine instance", () => {
    const engine = window.FinCENEngine.buildEngine(buildTinyDataset());
    expect(typeof engine.getSignalSeriesByEntity).toBe("function");
  });

  it("returns null for an unknown entityId", () => {
    const engine = window.FinCENEngine.buildEngine(buildTinyDataset());
    expect(engine.getSignalSeriesByEntity("E_DOES_NOT_EXIST")).toBeNull();
  });

  it("returns a valid series for a non-case entity (caseId=null)", () => {
    const engine = window.FinCENEngine.buildEngine(buildTinyDataset());
    const s = engine.getSignalSeriesByEntity("E3"); // E3 is NOT a case subject in the tiny dataset
    expect(s).not.toBeNull();
    expect(s.caseId).toBeNull();
    expect(Array.isArray(s.velocity.values)).toBe(true);
    expect(Array.isArray(s.peerDeviation.values)).toBe(true);
    expect(typeof s.summary.txPerDay).toBe("number");
    expect(Number.isFinite(s.summary.peerZ)).toBe(true);
  });

  it("returns series matching getSignalSeries for case subjects (E1 == CASE-001)", () => {
    const engine = window.FinCENEngine.buildEngine(buildTinyDataset());
    const byEntity = engine.getSignalSeriesByEntity("E1");
    const byCase = engine.getSignalSeries("CASE-001");
    expect(byEntity.velocity.values).toEqual(byCase.velocity.values);
    expect(byEntity.peerDeviation.values).toEqual(byCase.peerDeviation.values);
    expect(byEntity.summary.txPerDay).toBe(byCase.summary.txPerDay);
    // caseId is resolved to the overlay when the entity is a case subject
    expect(byEntity.caseId).toBe("CASE-001");
  });

  it("caches results by entityId (reference equality on repeat call)", () => {
    const engine = window.FinCENEngine.buildEngine(buildTinyDataset());
    const a = engine.getSignalSeriesByEntity("E3");
    const b = engine.getSignalSeriesByEntity("E3");
    expect(a).toBe(b);
  });

  it("existing getSignalSeries(caseId) contract is unchanged — caseId remains the input string", () => {
    const engine = window.FinCENEngine.buildEngine(buildTinyDataset());
    const s = engine.getSignalSeries("CASE-002");
    expect(s.caseId).toBe("CASE-002");
  });
});
