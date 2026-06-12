import { describe, expect, it } from "vitest";

// Pure rule module backing the workspace "Proposed Next Steps" section
// (MP-02). Returns FinCENCopy.NEXT_STEPS keys, never rendered strings —
// copy lives in js/copy.js so SME wording edits never touch rule logic.

const feature = (derived, regulatoryReview) => ({
  derived: {
    transactionVelocityScore: 0,
    jurisdictionRiskScore: 0,
    beneficialOwnershipNetworkScore: 0,
    crossBorderExposureFlag: false,
    ...derived
  },
  regulatoryReview: {
    requiredFieldsComplete: true,
    sourceRecordsReconciled: true,
    timelinessStatus: "On time",
    ...regulatoryReview
  }
});

describe("FinCENNextSteps.suggest", () => {
  it("exposes the module with a suggest function", () => {
    expect(window.FinCENNextSteps).toBeDefined();
    expect(typeof window.FinCENNextSteps.suggest).toBe("function");
  });

  it("suggests expanding the transaction sample when velocity and jurisdiction are both elevated", () => {
    const keys = window.FinCENNextSteps.suggest(
      feature({ transactionVelocityScore: 90, jurisdictionRiskScore: 80 })
    );
    expect(keys).toContain("expandSample");
    expect(keys).not.toContain("velocityProfile");
  });

  it("suggests a velocity-profile comparison when only velocity is elevated", () => {
    const keys = window.FinCENNextSteps.suggest(
      feature({ transactionVelocityScore: 90 })
    );
    expect(keys).toContain("velocityProfile");
    expect(keys).not.toContain("expandSample");
  });

  it("suggests cross-border documentation checks on jurisdiction or cross-border exposure", () => {
    expect(window.FinCENNextSteps.suggest(feature({ jurisdictionRiskScore: 75 }))).toContain("crossBorderDocs");
    expect(window.FinCENNextSteps.suggest(feature({ crossBorderExposureFlag: true }))).toContain("crossBorderDocs");
  });

  it("suggests beneficial-ownership documentation when ownership depth is elevated", () => {
    expect(window.FinCENNextSteps.suggest(feature({ beneficialOwnershipNetworkScore: 85 }))).toContain("ownershipDocs");
  });

  it("suggests SAR/CTR filing testing on completeness, reconciliation, or timeliness exceptions", () => {
    expect(window.FinCENNextSteps.suggest(feature({}, { requiredFieldsComplete: false }))).toContain("filingCompleteness");
    expect(window.FinCENNextSteps.suggest(feature({}, { sourceRecordsReconciled: false }))).toContain("filingCompleteness");
    expect(window.FinCENNextSteps.suggest(feature({}, { timelinessStatus: "Late" }))).toContain("filingCompleteness");
  });

  it("falls back to document-and-monitor when no rule fires", () => {
    expect(window.FinCENNextSteps.suggest(feature())).toEqual(["documentAndMonitor"]);
  });

  it("always returns between one and three suggestions", () => {
    const everything = window.FinCENNextSteps.suggest(
      feature(
        {
          transactionVelocityScore: 95,
          jurisdictionRiskScore: 95,
          beneficialOwnershipNetworkScore: 95,
          crossBorderExposureFlag: true
        },
        { requiredFieldsComplete: false, timelinessStatus: "Late" }
      )
    );
    expect(everything.length).toBeGreaterThanOrEqual(1);
    expect(everything.length).toBeLessThanOrEqual(3);
  });

  it("only returns keys that exist in the centralized copy file", () => {
    const all = window.FinCENNextSteps.suggest(
      feature(
        { transactionVelocityScore: 95, jurisdictionRiskScore: 95, beneficialOwnershipNetworkScore: 95 },
        { requiredFieldsComplete: false }
      )
    ).concat(window.FinCENNextSteps.suggest(feature()));
    all.forEach((key) => {
      expect(typeof window.FinCENCopy.NEXT_STEPS[key]).toBe("string");
      expect(window.FinCENCopy.NEXT_STEPS[key].length).toBeGreaterThan(0);
    });
  });
});

describe("FinCENCopy centralized strings", () => {
  it("provides the human-in-the-loop disclaimer and next-steps caption", () => {
    expect(window.FinCENCopy.INDICATORS_DISCLAIMER).toMatch(/determinations are made by the examiner/i);
    expect(window.FinCENCopy.NEXT_STEPS_CAPTION).toMatch(/examiner determines/i);
  });
});
