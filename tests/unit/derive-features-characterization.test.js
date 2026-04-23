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
  { caseId: "CASE-2001", entityId: "E0147", entityName: "Nils Demir",        typologyTag: "Sanctions Evasion",  riskScore: 84, confidence: 73, derived: { transactionVelocityScore: 59.9,  jurisdictionRiskScore: 52.8, beneficialOwnershipNetworkScore: 85.15, peerGroupDeviation: 23,    crossBorderExposureFlag: true  } },
  { caseId: "CASE-2002", entityId: "E0153", entityName: "Jozef Mercer",      typologyTag: "TBML",               riskScore: 90, confidence: 83, derived: { transactionVelocityScore: 52.22, jurisdictionRiskScore: 97.8, beneficialOwnershipNetworkScore: 85.15, peerGroupDeviation: 29.44, crossBorderExposureFlag: true  } },
  { caseId: "CASE-2003", entityId: "E0158", entityName: "Tariq Cortez",      typologyTag: "Sanctions Evasion",  riskScore: 93, confidence: 75, derived: { transactionVelocityScore: 66.46, jurisdictionRiskScore: 52.8, beneficialOwnershipNetworkScore: 94.15, peerGroupDeviation: 30.36, crossBorderExposureFlag: true  } },
  { caseId: "CASE-2004", entityId: "E0163", entityName: "Ezra Adeyemi",      typologyTag: "TBML",               riskScore: 92, confidence: 77, derived: { transactionVelocityScore: 52.73, jurisdictionRiskScore: 65.8, beneficialOwnershipNetworkScore: 76.15, peerGroupDeviation: 31.28, crossBorderExposureFlag: true  } },
  { caseId: "CASE-2005", entityId: "E0167", entityName: "Hiroshi Nakagawa",  typologyTag: "Sanctions Evasion",  riskScore: 87, confidence: 75, derived: { transactionVelocityScore: 56.73, jurisdictionRiskScore: 65.4, beneficialOwnershipNetworkScore: 75.45, peerGroupDeviation: 26.68, crossBorderExposureFlag: true  } },
  { caseId: "CASE-2006", entityId: "E0186", entityName: "Vendor Escrow Wallet", typologyTag: "Crypto Layering", riskScore: 88, confidence: 81, derived: { transactionVelocityScore: 100,   jurisdictionRiskScore: 35.6, beneficialOwnershipNetworkScore: 100,   peerGroupDeviation: 4.6,   crossBorderExposureFlag: false } },
  { caseId: "CASE-2007", entityId: "E0187", entityName: "Operator Wallet 1", typologyTag: "Crypto Layering",   riskScore: 83, confidence: 70, derived: { transactionVelocityScore: 32.53, jurisdictionRiskScore: 34.2, beneficialOwnershipNetworkScore: 42.85, peerGroupDeviation: 27.6,  crossBorderExposureFlag: false } },
  { caseId: "CASE-2008", entityId: "E0169", entityName: "Tumbler Mix Pool",  typologyTag: "Crypto Layering",   riskScore: 81, confidence: 81, derived: { transactionVelocityScore: 79.75, jurisdictionRiskScore: 67.6, beneficialOwnershipNetworkScore: 100,   peerGroupDeviation: 13.8,  crossBorderExposureFlag: false } },
  { caseId: "CASE-2009", entityId: "E0206", entityName: "Peel Funder",       typologyTag: "Crypto Layering",   riskScore: 87, confidence: 77, derived: { transactionVelocityScore: 26.22, jurisdictionRiskScore: 96,   beneficialOwnershipNetworkScore: 33.5,  peerGroupDeviation: 33.12, crossBorderExposureFlag: false } },
  { caseId: "CASE-2010", entityId: "E0174", entityName: "Una Njoku",         typologyTag: "Unusual Velocity",  riskScore: 83, confidence: 72, derived: { transactionVelocityScore: 38.71, jurisdictionRiskScore: 49,   beneficialOwnershipNetworkScore: 78.5,  peerGroupDeviation: 24.84, crossBorderExposureFlag: false } }
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

  it("returns exactly 10 rows against stock data (pre-extension baseline)", () => {
    const engine = window.FinCENEngine.buildEngine(window.FinCENData);
    const features = engine.getDerivedFeatures();
    expect(features.length).toBe(10);
  });
});
