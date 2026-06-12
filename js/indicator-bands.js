/* Qualitative band mapping for indicator scores (MP-03).
 *
 * Pure module: converts a 0-100 indicator score into a qualitative band
 * { key, label, className }. The raw statistics stay computed in the engine;
 * this layer changes presentation only. Cut points come from
 * FinCENConfig.indicatorBandThresholds; labels from FinCENCopy.BAND_LABELS.
 */
(function () {
  "use strict";

  const DEFAULT_THRESHOLDS = { high: 70, elevated: 40 };
  const BAND_CLASS = { high: "risk-high", elevated: "risk-medium", typical: "risk-low" };
  const FALLBACK_LABELS = {
    high: "Substantially above typical activity",
    elevated: "Elevated vs. baseline",
    typical: "Within typical range"
  };

  function thresholds() {
    const cfg = window.FinCENConfig && window.FinCENConfig.indicatorBandThresholds;
    return cfg || DEFAULT_THRESHOLDS;
  }

  function bandFor(score) {
    const t = thresholds();
    const v = typeof score === "number" && !isNaN(score) ? score : 0;
    const key = v >= t.high ? "high" : v >= t.elevated ? "elevated" : "typical";
    const labels = (window.FinCENCopy && window.FinCENCopy.BAND_LABELS) || FALLBACK_LABELS;
    return { key, label: labels[key], className: BAND_CLASS[key] };
  }

  window.FinCENIndicatorBands = { bandFor };
})();
