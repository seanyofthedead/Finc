import { describe, it, expect } from "vitest";

// Characterization snapshot of today's engine.getDerivedFeatures() output for
// the 10 stock flagged cases. This test is committed BEFORE any refactor of
// deriveFeatures() that extends it to cover all entities. It guards R2
// (demo-fidelity: existing case rows must not drift).
//
// Values below were captured from js/engine.js at the commit that introduces
// this file. Any change to deriveFeatures() formulas, typologySeverity
// weights, or flaggedCases data will fail these assertions intentionally.

const EXPECTED = [
  { caseId: "CASE-2001", entityId: "E0147", entityName: "Nils Demir",        typologyTag: "Sanctions Evasion",  riskScore: 72, confidence: 73, derived: { transactionVelocityScore: 56.5,  jurisdictionRiskScore: 47, beneficialOwnershipNetworkScore: 75,    peerGroupDeviation: 11.96, crossBorderExposureFlag: true  } },
  { caseId: "CASE-2002", entityId: "E0153", entityName: "Jozef Mercer",      typologyTag: "TBML",               riskScore: 78, confidence: 83, derived: { transactionVelocityScore: 49.13, jurisdictionRiskScore: 91, beneficialOwnershipNetworkScore: 73.25, peerGroupDeviation: 18.4,  crossBorderExposureFlag: true  } },
  { caseId: "CASE-2003", entityId: "E0158", entityName: "Tariq Cortez",      typologyTag: "Sanctions Evasion",  riskScore: 67, confidence: 75, derived: { transactionVelocityScore: 59.09, jurisdictionRiskScore: 45, beneficialOwnershipNetworkScore: 80.5,  peerGroupDeviation: 6.44,  crossBorderExposureFlag: true  } },
  { caseId: "CASE-2004", entityId: "E0163", entityName: "Ezra Adeyemi",      typologyTag: "TBML",               riskScore: 72, confidence: 77, derived: { transactionVelocityScore: 47.59, jurisdictionRiskScore: 57, beneficialOwnershipNetworkScore: 60.75, peerGroupDeviation: 12.88, crossBorderExposureFlag: true  } },
  { caseId: "CASE-2005", entityId: "E0167", entityName: "Hiroshi Nakagawa",  typologyTag: "Sanctions Evasion",  riskScore: 60, confidence: 75, derived: { transactionVelocityScore: 49.09, jurisdictionRiskScore: 56, beneficialOwnershipNetworkScore: 59,    peerGroupDeviation: 1.84,  crossBorderExposureFlag: true  } },
  { caseId: "CASE-2006", entityId: "E0186", entityName: "Vendor Escrow Wallet", typologyTag: "Crypto Layering", riskScore: 73, confidence: 81, derived: { transactionVelocityScore: 100,   jurisdictionRiskScore: 31, beneficialOwnershipNetworkScore: 100,   peerGroupDeviation: 18.4,  crossBorderExposureFlag: false } },
  { caseId: "CASE-2007", entityId: "E0187", entityName: "Operator Wallet 1", typologyTag: "Crypto Layering",   riskScore: 66, confidence: 70, derived: { transactionVelocityScore: 28.12, jurisdictionRiskScore: 29, beneficialOwnershipNetworkScore: 33.75, peerGroupDeviation: 11.96, crossBorderExposureFlag: false } },
  { caseId: "CASE-2008", entityId: "E0169", entityName: "Tumbler Mix Pool",  typologyTag: "Crypto Layering",   riskScore: 61, confidence: 81, derived: { transactionVelocityScore: 74.56, jurisdictionRiskScore: 60, beneficialOwnershipNetworkScore: 100,   peerGroupDeviation: 4.6,   crossBorderExposureFlag: false } },
  { caseId: "CASE-2009", entityId: "E0206", entityName: "Peel Funder",       typologyTag: "Crypto Layering",   riskScore: 56, confidence: 77, derived: { transactionVelocityScore: 18.19, jurisdictionRiskScore: 89, beneficialOwnershipNetworkScore: 21.25, peerGroupDeviation: 4.6,   crossBorderExposureFlag: false } },
  { caseId: "CASE-2010", entityId: "E0174", entityName: "Una Njoku",         typologyTag: "Unusual Velocity",  riskScore: 52, confidence: 72, derived: { transactionVelocityScore: 31.56, jurisdictionRiskScore: 42, beneficialOwnershipNetworkScore: 66.25, peerGroupDeviation: 3.68,  crossBorderExposureFlag: false } }
];

describe("deriveFeatures characterization (10-case demo-fidelity guard)", () => {
  it("exposes engine.getDerivedFeatures()", () => {
    const engine = window.FinCENEngine.buildEngine(window.FinCENData);
    expect(typeof engine.getDerivedFeatures).toBe("function");
  });

  EXPECTED.forEach((snap) => {
    it(`${snap.caseId} (${snap.entityId} / ${snap.entityName}) derived values are stable`, () => {
      const engine = window.FinCENEngine.buildEngine(window.FinCENData);
      const features = engine.getDerivedFeatures();
      const row = features.find((f) => f.caseId === snap.caseId);
      expect(row, `expected a row for ${snap.caseId}`).toBeDefined();
      expect(row.entityId).toBe(snap.entityId);
      expect(row.entityName).toBe(snap.entityName);
      expect(row.typologyTag).toBe(snap.typologyTag);
      expect(row.riskScore).toBe(snap.riskScore);
      expect(row.confidence).toBe(snap.confidence);
      expect(row.derived).toEqual(snap.derived);
    });
  });

  it("contains rows for all 10 expected case subjects (demo-fidelity: no case lost)", () => {
    const engine = window.FinCENEngine.buildEngine(window.FinCENData);
    const features = engine.getDerivedFeatures();
    const caseRowCount = features.filter((f) => f.caseId != null).length;
    expect(caseRowCount).toBe(10);
    EXPECTED.forEach((snap) => {
      expect(features.find((f) => f.caseId === snap.caseId)).toBeDefined();
    });
  });
});
