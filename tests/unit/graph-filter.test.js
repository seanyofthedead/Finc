import { describe, it, expect } from "vitest";

function buildTinyDataset() {
  const entities = [
    { id: "SUB1", name: "Subject 1", kind: "shell_company", jurisdiction: "US" },
    { id: "CP1",  name: "Counterparty 1", kind: "bank", jurisdiction: "US" },
    { id: "CP2",  name: "Counterparty 2", kind: "individual", jurisdiction: "US" },
    { id: "UNR1", name: "Unrelated Entity", kind: "individual", jurisdiction: "US" },
    { id: "UNR2", name: "Unrelated Bank", kind: "bank", jurisdiction: "US" }
  ];
  const tx = (id, from, to, amount) => ({
    id, fromEntityId: from, toEntityId: to,
    timestamp: "2020-01-01T12:00:00Z",
    amountUsd: amount, channel: "wire", isCrossBorder: false, source: "SRC_BANK"
  });
  const transactions = [
    tx("T1", "SUB1", "CP1", 1000),
    tx("T2", "SUB1", "CP2", 1000),
    tx("T3", "UNR1", "UNR2", 500)
  ];
  const flaggedCases = [
    {
      caseId: "CASE-A", entityId: "SUB1", typology: "Structuring",
      riskScore: 80, confidence: 75, jurisdictionRelevance: 50,
      contributingFeatures: [], whyFlagged: "test", rawInputs: [], enrichmentSources: []
    }
  ];
  return {
    entities, transactions, flaggedCases,
    sanctionsList: [], ingestionSources: [],
    entityResolution: { duplicateProfiles: [] },
    historicalOutcomes: [],
    jurisdictionRisk: { US: 0.2 },
    typologySeverity: { Structuring: 0.78, TBML: 1.05, "Sanctions Evasion": 1.2, "Crypto Layering": 1.35, "Unusual Velocity": 1.42 }
  };
}

describe("engine.getFilteredGraph() — typology-driven graph filter", () => {
  it("is exposed on the engine instance", () => {
    const engine = window.FinCENEngine.buildEngine(buildTinyDataset());
    expect(typeof engine.getFilteredGraph).toBe("function");
  });

  it("returns the full graph when typology is 'All' (the default)", () => {
    const engine = window.FinCENEngine.buildEngine(buildTinyDataset());
    const g = engine.getFilteredGraph();
    expect(g.nodes.length).toBe(5);
    expect(g.edges.length).toBe(3);
  });

  it("narrows to subject + direct counterparties when a matching typology is selected", () => {
    const engine = window.FinCENEngine.buildEngine(buildTinyDataset());
    engine.setTypologyFilter("Structuring");
    const g = engine.getFilteredGraph();
    const ids = new Set(g.nodes.map((n) => n.id));
    expect(ids.has("SUB1")).toBe(true);
    expect(ids.has("CP1")).toBe(true);
    expect(ids.has("CP2")).toBe(true);
    // Unrelated entities are excluded.
    expect(ids.has("UNR1")).toBe(false);
    expect(ids.has("UNR2")).toBe(false);
    // Only the two edges that touch SUB1 survive.
    expect(g.edges.length).toBe(2);
    g.edges.forEach((e) => {
      expect(e.from === "SUB1" || e.to === "SUB1").toBe(true);
    });
  });

  it("returns an empty graph when the selected typology matches no flagged cases", () => {
    const engine = window.FinCENEngine.buildEngine(buildTinyDataset());
    engine.setTypologyFilter("Crypto Layering");
    const g = engine.getFilteredGraph();
    expect(g.nodes).toEqual([]);
    expect(g.edges).toEqual([]);
  });

  it("restores the full graph when the filter is reset to 'All'", () => {
    const engine = window.FinCENEngine.buildEngine(buildTinyDataset());
    engine.setTypologyFilter("Structuring");
    engine.setTypologyFilter("All");
    const g = engine.getFilteredGraph();
    expect(g.nodes.length).toBe(5);
    expect(g.edges.length).toBe(3);
  });

  it("does not mutate the underlying data arrays when filtering", () => {
    const data = buildTinyDataset();
    const entitiesBefore = data.entities.slice();
    const txBefore = data.transactions.slice();
    const engine = window.FinCENEngine.buildEngine(data);
    engine.setTypologyFilter("Structuring");
    engine.getFilteredGraph();
    engine.setTypologyFilter("All");
    engine.getFilteredGraph();
    expect(data.entities).toEqual(entitiesBefore);
    expect(data.transactions).toEqual(txBefore);
  });

  it("still returns a meaningful edge set for filtered views (does not starve on the full-graph edge cap)", () => {
    // Build a dataset where the full graph would have >60 edges, most between UNR entities,
    // to verify the filter-path computes edges fresh rather than filtering the pre-capped list.
    const data = buildTinyDataset();
    for (let i = 0; i < 70; i += 1) {
      const idA = "NOISE_A_" + i;
      const idB = "NOISE_B_" + i;
      data.entities.push({ id: idA, name: "NA" + i, kind: "individual", jurisdiction: "US" });
      data.entities.push({ id: idB, name: "NB" + i, kind: "individual", jurisdiction: "US" });
      data.transactions.push({
        id: "NT" + i, fromEntityId: idA, toEntityId: idB,
        timestamp: "2020-06-01T12:00:00Z", amountUsd: 100,
        channel: "wire", isCrossBorder: false, source: "SRC_BANK"
      });
    }
    const engine = window.FinCENEngine.buildEngine(data);
    engine.setTypologyFilter("Structuring");
    const g = engine.getFilteredGraph();
    expect(g.nodes.length).toBe(3); // SUB1 + CP1 + CP2
    expect(g.edges.length).toBe(2); // SUB1->CP1, SUB1->CP2
  });
});
