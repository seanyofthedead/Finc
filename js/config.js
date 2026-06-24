/* Runtime configuration for the OCC BSA/AML micro-pilot prototype.
 *
 * Everything here is editable without code changes. Threshold values are
 * PLACEHOLDERS pending SME validation. TODO: validate with SME (L. Arquette).
 */
(function () {
  "use strict";

  window.FinCENConfig = {
    // Indicator-score (0-100) cut points for the qualitative bands shown in
    // the Examiner Workspace Findings section:
    //   score >= high     -> "Substantially above typical activity"
    //   score >= elevated -> "Elevated vs. baseline"
    //   otherwise         -> "Within typical range"
    indicatorBandThresholds: {
      high: 70,
      elevated: 40
    },

    // MP-06: Review Balance stoplight. Measures routing-distribution skew —
    // the share of routed cases landing in the single most-used destination
    // queue. A high share means examiner review is concentrating into one
    // disposition, which is a governance signal worth surfacing.
    //   top group's share > red   -> Red    (over-concentrated)
    //   top group's share > amber -> Amber
    //   otherwise                 -> Green   (balanced)
    // Samples below minMeaningfulSample still show a color but are flagged
    // "indicative" so the synthetic demo never overclaims.
    // TODO: validate with SME (L. Arquette).
    reviewBalanceThresholds: {
      red: 0.7,
      amber: 0.5,
      minMeaningfulSample: 30
    },

    // MP-08: collapsed "Methodology" expander exposing the underlying
    // statistics. Ships OFF; Jennifer/Paul decide at the Friday demo.
    showMethodologyDetail: false
  };
})();
