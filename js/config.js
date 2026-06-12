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

    // MP-08: collapsed "Methodology" expander exposing the underlying
    // statistics. Ships OFF; Jennifer/Paul decide at the Friday demo.
    showMethodologyDetail: false
  };
})();
