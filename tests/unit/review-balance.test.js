import { describe, expect, it } from "vitest";

// MP-06: Review Balance is a routing-distribution-skew stoplight. It answers
// "is examiner review concentrating into one destination?" — a governance
// signal, distinct from any per-case risk score.
//
// Thresholds (placeholders pending SME review, see js/config.js):
//   top group's share > red   -> Red    (over-concentrated)
//   top group's share > amber -> Amber
//   otherwise                 -> Green   (balanced)

function routed(destinations) {
  return destinations.map((destination, i) => ({ caseId: "C" + i, destination }));
}

function repeat(destination, n) {
  return Array.from({ length: n }, () => destination);
}

describe("computeReviewBalance — routing distribution skew", () => {
  it("flags Red when one destination exceeds the red share threshold", () => {
    const results = routed(repeat("Examiner Review", 8).concat(repeat("Monitoring / No Finding", 2)));
    const status = window.FinCENEngine.computeReviewBalance(results);

    expect(status.label).toBe("Red");
    expect(status.className).toBe("risk-high");
    expect(status.topGroup).toBe("Examiner Review");
    expect(status.topShare).toBeCloseTo(0.8, 5);
  });

  it("flags Amber when the top destination is over the amber but under the red threshold", () => {
    const results = routed(repeat("Examiner Review", 6).concat(repeat("Supervisory Escalation", 4)));
    const status = window.FinCENEngine.computeReviewBalance(results);

    expect(status.label).toBe("Amber");
    expect(status.className).toBe("risk-medium");
  });

  it("flags Green when routing is balanced (top share at or below amber)", () => {
    const results = routed(
      repeat("Examiner Review", 5)
        .concat(repeat("Supervisory Escalation", 3))
        .concat(repeat("Additional Examiner Review", 1))
        .concat(repeat("Monitoring / No Finding", 1))
    );
    const status = window.FinCENEngine.computeReviewBalance(results);

    expect(status.label).toBe("Green");
    expect(status.className).toBe("risk-low");
    expect(status.topShare).toBeCloseTo(0.5, 5);
  });

  it("returns destination rows sorted by case count, descending", () => {
    const results = routed(repeat("Examiner Review", 5).concat(repeat("Supervisory Escalation", 3)).concat(repeat("Monitoring / No Finding", 2)));
    const status = window.FinCENEngine.computeReviewBalance(results);

    expect(status.rows.map((r) => r.destination)).toEqual([
      "Examiner Review",
      "Supervisory Escalation",
      "Monitoring / No Finding"
    ]);
    expect(status.rows[0]).toMatchObject({ destination: "Examiner Review", count: 5, share: 0.5 });
    expect(status.total).toBe(10);
  });

  it("marks small samples as indicative without suppressing the color", () => {
    const small = window.FinCENEngine.computeReviewBalance(routed(repeat("Examiner Review", 5).concat(repeat("Supervisory Escalation", 5))));
    expect(small.indicative).toBe(true);
    expect(small.caveat).toMatch(/synthetic/i);
    expect(small.caveat).toContain("10");
    // Still produces a real stoplight color, not a "Sample Limited" placeholder.
    expect(["Red", "Amber", "Green"]).toContain(small.label);
  });

  it("does not mark large samples as indicative", () => {
    const big = window.FinCENEngine.computeReviewBalance(routed(repeat("Examiner Review", 20).concat(repeat("Supervisory Escalation", 20))));
    expect(big.indicative).toBe(false);
    expect(big.caveat).toBe("");
  });

  it("handles an empty routing set as balanced with no rows", () => {
    const status = window.FinCENEngine.computeReviewBalance([]);
    expect(status.total).toBe(0);
    expect(status.rows).toEqual([]);
    expect(status.label).toBe("Green");
  });

  it("honors threshold overrides passed in options", () => {
    const results = routed(repeat("Examiner Review", 6).concat(repeat("Supervisory Escalation", 4)));
    const strict = window.FinCENEngine.computeReviewBalance(results, null, { redShare: 0.55, amberShare: 0.4 });
    expect(strict.label).toBe("Red");
  });
});
