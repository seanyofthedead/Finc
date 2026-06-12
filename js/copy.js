/* Centralized user-facing copy for the Examiner Workspace HITL framing.
 *
 * All disclaimer, caption, and proposed-next-step wording lives here — not
 * inline in markup or render code — so SME wording changes (L. Arquette
 * review) are single-file edits with no logic risk.
 */
(function () {
  "use strict";

  window.FinCENCopy = {
    // Persistent disclaimer shown with the case indicators (Findings section).
    INDICATORS_DISCLAIMER:
      "Indicators are inputs to scope a risk-based review. They are not findings or conclusions. All determinations are made by the examiner.",

    // One-line caption under the Proposed Next Steps list.
    NEXT_STEPS_CAPTION:
      "Suggestions only — the examiner determines the appropriate action.",

    // Workspace stage headers — the screen reads top-to-bottom as
    // evidence (A) + suggestion (B) = examiner decision (C).
    STAGE_FINDINGS: "Findings",
    STAGE_NEXT_STEPS: "Proposed Next Steps",
    STAGE_DECISION: "Examiner Decision",

    // Qualitative band labels for indicator scores (see js/indicator-bands.js;
    // cut points live in js/config.js).
    BAND_LABELS: {
      high: "Substantially above typical activity",
      elevated: "Elevated vs. baseline",
      typical: "Within typical range"
    },

    // One plain-language sentence per indicator per band — the default-view
    // replacement for raw statistical readouts.
    INDICATOR_BAND_SENTENCES: {
      velocity: {
        high: "Transaction activity is substantially more frequent than this entity's expected baseline.",
        elevated: "Transaction activity is somewhat more frequent than this entity's expected baseline.",
        typical: "Transaction frequency is consistent with this entity's expected baseline."
      },
      jurisdiction: {
        high: "Activity is concentrated in jurisdictions that carry substantially heightened supervisory attention.",
        elevated: "Some activity touches jurisdictions that carry heightened supervisory attention.",
        typical: "Jurisdictional exposure is consistent with routine activity for this entity type."
      },
      ownership: {
        high: "The beneficial-ownership structure is substantially more layered than is typical for this entity type.",
        elevated: "The beneficial-ownership structure shows more layering than is typical for this entity type.",
        typical: "The beneficial-ownership structure is consistent with this entity type."
      }
    },

    // Proposed next-step suggestions, keyed by rule id (see js/next-steps.js).
    NEXT_STEPS: {
      expandSample:
        "Consider expanding the transaction sample for the period of elevated activity.",
      velocityProfile:
        "Consider comparing observed transaction velocity against the institution's expected activity profile for this customer type.",
      crossBorderDocs:
        "Consider verifying cross-border counterparty documentation and OFAC screening evidence.",
      ownershipDocs:
        "Consider requesting beneficial-ownership documentation for the linked counterparties.",
      filingCompleteness:
        "Consider testing the related SAR/CTR filing for completeness, reconciliation, and timeliness.",
      documentAndMonitor:
        "Consider documenting the review rationale and returning the exception to routine monitoring."
    }
  };
})();
