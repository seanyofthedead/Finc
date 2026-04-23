import { describe, it, expect } from "vitest";

// Pure-logic tests for js/signal-table.js — the search/sort/selection helpers
// that back the Signal Engineering tab. DOM rendering is exercised by manual
// browser verification in Unit 7.

const SAMPLE = [
  { entityId: "E001", entityName: "Bay Clinic",       entityKind: "company",      jurisdiction: "UAE",     caseId: null,          typologyTag: null,          _caseEnriched: false, derived: { transactionVelocityScore: 100, jurisdictionRiskScore: 73, beneficialOwnershipNetworkScore: 100, peerGroupDeviation: 89, crossBorderExposureFlag: true  } },
  { entityId: "E002", entityName: "Acme Co",          entityKind: "company",      jurisdiction: "US",      caseId: null,          typologyTag: null,          _caseEnriched: false, derived: { transactionVelocityScore: 10,  jurisdictionRiskScore: 20, beneficialOwnershipNetworkScore: 5,   peerGroupDeviation: 30, crossBorderExposureFlag: false } },
  { entityId: "E147", entityName: "Nils Demir",       entityKind: "individual",   jurisdiction: "Liberia", caseId: "CASE-2001",   typologyTag: "Sanctions Evasion", _caseEnriched: true, derived: { transactionVelocityScore: 59,  jurisdictionRiskScore: 53, beneficialOwnershipNetworkScore: 85,  peerGroupDeviation: 23, crossBorderExposureFlag: true  } },
  { entityId: "E186", entityName: "Vendor Escrow",    entityKind: "crypto_service", jurisdiction: "Global", caseId: "CASE-2006",  typologyTag: "Crypto Layering", _caseEnriched: true,   derived: { transactionVelocityScore: 100, jurisdictionRiskScore: 36, beneficialOwnershipNetworkScore: 100, peerGroupDeviation: 4,  crossBorderExposureFlag: false } }
];

describe("FinCENSignalTable exposes pure helpers", () => {
  it("is registered on window", () => {
    expect(window.FinCENSignalTable).toBeDefined();
    expect(typeof window.FinCENSignalTable.filterFeatures).toBe("function");
    expect(typeof window.FinCENSignalTable.sortFeatures).toBe("function");
    expect(typeof window.FinCENSignalTable.compoundDefaultSort).toBe("function");
    expect(typeof window.FinCENSignalTable.defaultColumnDirection).toBe("function");
    expect(typeof window.FinCENSignalTable.chooseDefaultSelection).toBe("function");
  });
});

describe("filterFeatures(features, query)", () => {
  const { filterFeatures } = window.FinCENSignalTable;

  it("empty query returns all features", () => {
    expect(filterFeatures(SAMPLE, "").length).toBe(SAMPLE.length);
    expect(filterFeatures(SAMPLE, null).length).toBe(SAMPLE.length);
    expect(filterFeatures(SAMPLE, undefined).length).toBe(SAMPLE.length);
  });

  it("matches entityName case-insensitively", () => {
    expect(filterFeatures(SAMPLE, "bay").map((r) => r.entityId)).toEqual(["E001"]);
    expect(filterFeatures(SAMPLE, "BAY").map((r) => r.entityId)).toEqual(["E001"]);
    expect(filterFeatures(SAMPLE, "demir").map((r) => r.entityId)).toEqual(["E147"]);
  });

  it("matches entityId", () => {
    expect(filterFeatures(SAMPLE, "E147").map((r) => r.entityId)).toEqual(["E147"]);
    expect(filterFeatures(SAMPLE, "e00").map((r) => r.entityId).sort()).toEqual(["E001", "E002"]);
  });

  it("returns empty array when nothing matches", () => {
    expect(filterFeatures(SAMPLE, "zzznomatch")).toEqual([]);
  });

  it("does not mutate the input array", () => {
    const copy = SAMPLE.slice();
    filterFeatures(SAMPLE, "bay");
    expect(SAMPLE).toEqual(copy);
  });
});

describe("compoundDefaultSort(features)", () => {
  const { compoundDefaultSort } = window.FinCENSignalTable;

  it("places all case-subject rows before all non-case rows", () => {
    const sorted = compoundDefaultSort(SAMPLE);
    const firstNonCaseIndex = sorted.findIndex((r) => !r.caseId);
    const lastCaseIndex = sorted.map((r) => Boolean(r.caseId)).lastIndexOf(true);
    expect(lastCaseIndex).toBeLessThan(firstNonCaseIndex);
  });

  it("within case rows, orders by transactionVelocityScore descending", () => {
    const sorted = compoundDefaultSort(SAMPLE);
    const caseRows = sorted.filter((r) => r.caseId);
    // Vendor Escrow velocity=100 should precede Nils Demir velocity=59
    expect(caseRows[0].entityId).toBe("E186");
    expect(caseRows[1].entityId).toBe("E147");
  });

  it("within non-case rows, orders by transactionVelocityScore descending", () => {
    const sorted = compoundDefaultSort(SAMPLE);
    const nonCaseRows = sorted.filter((r) => !r.caseId);
    // Bay Clinic velocity=100 should precede Acme Co velocity=10
    expect(nonCaseRows[0].entityId).toBe("E001");
    expect(nonCaseRows[1].entityId).toBe("E002");
  });

  it("returns a new array (does not mutate input)", () => {
    const original = SAMPLE.slice();
    const sorted = compoundDefaultSort(SAMPLE);
    expect(sorted).not.toBe(SAMPLE);
    expect(SAMPLE).toEqual(original);
  });
});

describe("sortFeatures(features, sort)", () => {
  const { sortFeatures } = window.FinCENSignalTable;

  it("sorts numeric derived fields descending", () => {
    const sorted = sortFeatures(SAMPLE, { column: "transactionVelocityScore", direction: "desc" });
    expect(sorted[0].derived.transactionVelocityScore).toBe(100);
    expect(sorted[sorted.length - 1].derived.transactionVelocityScore).toBe(10);
  });

  it("sorts numeric derived fields ascending", () => {
    const sorted = sortFeatures(SAMPLE, { column: "transactionVelocityScore", direction: "asc" });
    expect(sorted[0].derived.transactionVelocityScore).toBe(10);
    expect(sorted[sorted.length - 1].derived.transactionVelocityScore).toBe(100);
  });

  it("sorts entityName alphabetically ascending", () => {
    const sorted = sortFeatures(SAMPLE, { column: "entityName", direction: "asc" });
    expect(sorted.map((r) => r.entityName)).toEqual(["Acme Co", "Bay Clinic", "Nils Demir", "Vendor Escrow"]);
  });

  it("sorts jurisdiction alphabetically descending", () => {
    const sorted = sortFeatures(SAMPLE, { column: "jurisdiction", direction: "desc" });
    expect(sorted[0].jurisdiction).toBe("US");
  });

  it("null or missing sort spec returns the input unchanged (caller can apply compound default)", () => {
    expect(sortFeatures(SAMPLE, null)).toEqual(SAMPLE);
    expect(sortFeatures(SAMPLE, { column: null, direction: null })).toEqual(SAMPLE);
  });

  it("returns a new array (does not mutate input)", () => {
    const copy = SAMPLE.slice();
    sortFeatures(SAMPLE, { column: "entityName", direction: "asc" });
    expect(SAMPLE).toEqual(copy);
  });
});

describe("defaultColumnDirection(column)", () => {
  const { defaultColumnDirection } = window.FinCENSignalTable;

  it("alphabetical columns default to ascending on first click", () => {
    expect(defaultColumnDirection("entityName")).toBe("asc");
    expect(defaultColumnDirection("entityKind")).toBe("asc");
    expect(defaultColumnDirection("jurisdiction")).toBe("asc");
  });

  it("numeric score columns default to descending on first click", () => {
    expect(defaultColumnDirection("transactionVelocityScore")).toBe("desc");
    expect(defaultColumnDirection("jurisdictionRiskScore")).toBe("desc");
    expect(defaultColumnDirection("beneficialOwnershipNetworkScore")).toBe("desc");
    expect(defaultColumnDirection("peerGroupDeviation")).toBe("desc");
  });

  it("unknown columns default to descending (safe default)", () => {
    expect(defaultColumnDirection("unknown")).toBe("desc");
  });
});

describe("chooseDefaultSelection(features, currentEntityId)", () => {
  const { chooseDefaultSelection } = window.FinCENSignalTable;
  const sorted = window.FinCENSignalTable.compoundDefaultSort(SAMPLE);

  it("keeps current selection when still present", () => {
    // sorted order: E186 (case), E147 (case), E001 (non-case), E002 (non-case)
    expect(chooseDefaultSelection(sorted, "E147")).toBe("E147");
    expect(chooseDefaultSelection(sorted, "E001")).toBe("E001");
  });

  it("falls back to first case-subject row when current selection is missing", () => {
    expect(chooseDefaultSelection(sorted, "E_GONE")).toBe("E186");
    expect(chooseDefaultSelection(sorted, null)).toBe("E186");
  });

  it("falls back to first row overall when no case subjects are present", () => {
    const nonCaseOnly = sorted.filter((r) => !r.caseId);
    expect(chooseDefaultSelection(nonCaseOnly, null)).toBe(nonCaseOnly[0].entityId);
  });

  it("returns null for empty feature list", () => {
    expect(chooseDefaultSelection([], null)).toBeNull();
    expect(chooseDefaultSelection([], "E147")).toBeNull();
  });
});
