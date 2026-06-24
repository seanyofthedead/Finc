import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

describe("OCC BSA/AML retarget", () => {
  it("provides examiner transaction-testing presets for the OCC demo", () => {
    expect(Array.isArray(window.FinCENData.transactionTestingPresets)).toBe(true);
    expect(window.FinCENData.transactionTestingPresets.map((p) => p.id)).toEqual([
      "ctr-threshold",
      "sar-decision",
      "funds-transfer",
      "customer-account",
      "digital-asset"
    ]);
  });

  it("adds SAR/CTR validation metadata to every surfaced exception", () => {
    window.FinCENData.flaggedCases.forEach((exception) => {
      expect(exception.regulatoryReview).toMatchObject({
        filingType: expect.stringMatching(/SAR|CTR/),
        reportableTrigger: expect.any(String),
        requiredFieldsComplete: expect.any(Boolean),
        dueDate: expect.any(String),
        filedDate: expect.any(String),
        timelinessStatus: expect.stringMatching(/On time|Late|Pending/),
        sourceRecordsReconciled: expect.any(Boolean),
        examinerDisposition: expect.any(String)
      });
    });
  });

  it("keeps examiner testing pattern scores distributed for demo nuance", () => {
    const routing = window.FinCENEngine.buildEngine(window.FinCENData).getRouting();
    const scores = routing.results.map((exception) => exception.riskScore).sort((a, b) => b - a);
    const uniqueScores = new Set(scores);
    const saturated = scores.filter((score) => score === 100);
    const high = scores.filter((score) => score >= 85);
    const medium = scores.filter((score) => score >= 60 && score < 85);
    const lower = scores.filter((score) => score < 60);

    expect(scores.length).toBe(10);
    expect(saturated.length).toBeLessThanOrEqual(1);
    expect(uniqueScores.size).toBeGreaterThanOrEqual(8);
    expect(high.length).toBeGreaterThanOrEqual(3);
    expect(high.length).toBeLessThanOrEqual(5);
    expect(medium.length).toBeGreaterThanOrEqual(4);
    expect(lower.length).toBeGreaterThanOrEqual(1);
  });

  it("shows the synthetic 10-case routing balance as a color flagged indicative, not a bare claim", () => {
    const engine = window.FinCENEngine.buildEngine(window.FinCENData);
    const status = window.FinCENEngine.computeReviewBalance(
      engine.getRouting().results,
      window.FinCENData.entities
    );

    // MP-06: the routing-skew stoplight surfaces a real color (the demo's
    // 10 cases route at most 50% into any one group -> Green), but the small
    // synthetic sample is flagged "indicative" so it never overclaims.
    expect(["Red", "Amber", "Green"]).toContain(status.label);
    expect(status.indicative).toBe(true);
    expect(status.caveat).toMatch(/synthetic/i);
    expect(status.rows.length).toBeGreaterThan(0);
    expect(status.rows[0]).toHaveProperty("destination");
    expect(status.rows[0]).toHaveProperty("share");
  });

  it("keeps prepared demo scripts in the OCC supervisory voice", () => {
    const demo = fs.readFileSync(path.join(projectRoot, "docs/scripts/demo-walkthrough.md"), "utf8");
    const architecture = fs.readFileSync(path.join(projectRoot, "docs/scripts/architecture-walkthrough.md"), "utf8");
    const combined = demo + "\n" + architecture;

    expect(combined).toContain("OCC");
    expect(combined).toContain("Examiner Workspace");
    expect(combined).toContain("SAR/CTR");
    expect(combined).not.toMatch(/Click Analyst Workspace|Enforcement Referral|Intelligence Queue|financial crime context/i);
  });
});
