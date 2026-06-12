import { describe, expect, it } from "vitest";

// MP-03: indicator scores (0-100) map to qualitative bands; no raw
// statistical terminology reaches the rendered default view. Thresholds are
// config placeholders pending SME validation (L. Arquette).

describe("FinCENIndicatorBands.bandFor", () => {
  it("exposes the module and the config thresholds", () => {
    expect(window.FinCENIndicatorBands).toBeDefined();
    expect(typeof window.FinCENIndicatorBands.bandFor).toBe("function");
    expect(window.FinCENConfig.indicatorBandThresholds).toMatchObject({
      high: expect.any(Number),
      elevated: expect.any(Number)
    });
  });

  it("maps scores at or above the high threshold to the substantially-above band", () => {
    const t = window.FinCENConfig.indicatorBandThresholds;
    expect(window.FinCENIndicatorBands.bandFor(t.high).key).toBe("high");
    expect(window.FinCENIndicatorBands.bandFor(100).key).toBe("high");
    expect(window.FinCENIndicatorBands.bandFor(100).className).toBe("risk-high");
  });

  it("maps scores between the elevated and high thresholds to the elevated band", () => {
    const t = window.FinCENConfig.indicatorBandThresholds;
    expect(window.FinCENIndicatorBands.bandFor(t.elevated).key).toBe("elevated");
    expect(window.FinCENIndicatorBands.bandFor(t.high - 1).key).toBe("elevated");
    expect(window.FinCENIndicatorBands.bandFor(t.high - 1).className).toBe("risk-medium");
  });

  it("maps scores below the elevated threshold to the within-typical band", () => {
    const t = window.FinCENConfig.indicatorBandThresholds;
    expect(window.FinCENIndicatorBands.bandFor(t.elevated - 1).key).toBe("typical");
    expect(window.FinCENIndicatorBands.bandFor(0).key).toBe("typical");
    expect(window.FinCENIndicatorBands.bandFor(0).className).toBe("risk-low");
  });

  it("honors config threshold changes without code changes", () => {
    const original = window.FinCENConfig.indicatorBandThresholds;
    window.FinCENConfig.indicatorBandThresholds = { high: 90, elevated: 80 };
    try {
      expect(window.FinCENIndicatorBands.bandFor(85).key).toBe("elevated");
      expect(window.FinCENIndicatorBands.bandFor(95).key).toBe("high");
      expect(window.FinCENIndicatorBands.bandFor(70).key).toBe("typical");
    } finally {
      window.FinCENConfig.indicatorBandThresholds = original;
    }
  });

  it("returns band labels from centralized copy, free of statistical terms", () => {
    const banned = /σ|σ|std\s*dev|standard deviation|\bmean\b|\bMAD\b|×\s*\d/i;
    [0, 50, 95].forEach((score) => {
      const band = window.FinCENIndicatorBands.bandFor(score);
      expect(typeof band.label).toBe("string");
      expect(band.label.length).toBeGreaterThan(0);
      expect(band.label).not.toMatch(banned);
    });
  });
});

describe("FinCENCopy indicator band sentences", () => {
  it("provides a plain-language sentence for every indicator and band", () => {
    const banned = /σ|σ|std\s*dev|standard deviation|\bmean\b|\bMAD\b|×\s*\d/i;
    ["velocity", "jurisdiction", "ownership"].forEach((indicator) => {
      ["high", "elevated", "typical"].forEach((bandKey) => {
        const sentence = window.FinCENCopy.INDICATOR_BAND_SENTENCES[indicator][bandKey];
        expect(typeof sentence).toBe("string");
        expect(sentence.length).toBeGreaterThan(0);
        expect(sentence).not.toMatch(banned);
      });
    });
  });
});
