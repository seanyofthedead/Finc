/* Rule-based Proposed Next Steps for the Examiner Workspace (MP-02).
 *
 * Pure module: takes a derived-feature record (the shape emitted by
 * engine.getDerivedFeatures(), optionally carrying the flagged case's
 * regulatoryReview) and returns 1-3 copy keys into
 * FinCENCopy.NEXT_STEPS. No DOM access, no engine access — unit-testable
 * in isolation, and wording changes never touch this file.
 *
 * Prototype scope: deterministic indicator-threshold rules, ordered by
 * supervisory relevance. The list is capped at three so the section stays
 * a suggestion, not a checklist.
 */
(function () {
  "use strict";

  // Indicator scores are 0-100; >= HIGH reads as an elevated indicator.
  const HIGH_INDICATOR_THRESHOLD = 70;

  function suggest(featureRecord) {
    const d = (featureRecord && featureRecord.derived) || {};
    const review = (featureRecord && featureRecord.regulatoryReview) || {};
    const high = (v) => typeof v === "number" && v >= HIGH_INDICATOR_THRESHOLD;
    const keys = [];

    if (high(d.transactionVelocityScore) && high(d.jurisdictionRiskScore)) {
      keys.push("expandSample");
    } else if (high(d.transactionVelocityScore)) {
      keys.push("velocityProfile");
    }

    if (high(d.jurisdictionRiskScore) || d.crossBorderExposureFlag === true) {
      keys.push("crossBorderDocs");
    }

    if (high(d.beneficialOwnershipNetworkScore)) {
      keys.push("ownershipDocs");
    }

    if (
      review.requiredFieldsComplete === false ||
      review.sourceRecordsReconciled === false ||
      review.timelinessStatus === "Late"
    ) {
      keys.push("filingCompleteness");
    }

    if (keys.length === 0) {
      keys.push("documentAndMonitor");
    }

    return keys.slice(0, 3);
  }

  window.FinCENNextSteps = {
    suggest,
    HIGH_INDICATOR_THRESHOLD
  };
})();
