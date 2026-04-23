/* Pure helpers for the Signal Engineering tab's Derived Signal Table.
 *
 * Kept separate from app.js so the search/sort/selection logic is unit-
 * testable without having to spin up the full DOM. app.js imports from
 * window.FinCENSignalTable and delegates.
 *
 * No DOM access in this module. No engine access. Pure functions operating
 * on plain feature-record arrays (the shape emitted by
 * engine.getDerivedFeatures()).
 */
(function () {
  "use strict";

  const ALPHABETICAL_COLUMNS = new Set(["entityName", "entityKind", "jurisdiction"]);
  const DERIVED_COLUMNS = new Set([
    "transactionVelocityScore",
    "jurisdictionRiskScore",
    "beneficialOwnershipNetworkScore",
    "peerGroupDeviation"
  ]);

  function getColumnValue(row, column) {
    if (!row) return undefined;
    if (column in row) return row[column];
    if (row.derived && column in row.derived) return row.derived[column];
    return undefined;
  }

  function filterFeatures(features, query) {
    if (!query) return features.slice();
    const q = String(query).toLowerCase();
    return features.filter((r) => {
      const name = (r.entityName || "").toLowerCase();
      const id = (r.entityId || "").toLowerCase();
      return name.indexOf(q) !== -1 || id.indexOf(q) !== -1;
    });
  }

  function compareValues(a, b, direction) {
    // Stable-ish total order: numbers numerically, strings via localeCompare,
    // null/undefined sink to the end (regardless of direction).
    const aNil = a == null;
    const bNil = b == null;
    if (aNil && bNil) return 0;
    if (aNil) return 1;
    if (bNil) return -1;

    let cmp;
    if (typeof a === "number" && typeof b === "number") {
      cmp = a - b;
    } else {
      cmp = String(a).localeCompare(String(b));
    }
    return direction === "asc" ? cmp : -cmp;
  }

  function sortFeatures(features, sort) {
    if (!sort || !sort.column || !sort.direction) return features.slice();
    const out = features.slice();
    out.sort((a, b) => compareValues(
      getColumnValue(a, sort.column),
      getColumnValue(b, sort.column),
      sort.direction
    ));
    return out;
  }

  // Compound default sort surfaces all case-subject rows at the top of the
  // rendered table (ordered by velocity desc within cases), then all non-case
  // rows (also by velocity desc). Mechanically implements R9: a first-time
  // viewer sees the 10 curated cases before they encounter non-case entities.
  function compoundDefaultSort(features) {
    const out = features.slice();
    out.sort((a, b) => {
      const caseA = a.caseId != null;
      const caseB = b.caseId != null;
      if (caseA !== caseB) return caseA ? -1 : 1;
      const va = a.derived ? a.derived.transactionVelocityScore : 0;
      const vb = b.derived ? b.derived.transactionVelocityScore : 0;
      return vb - va;
    });
    return out;
  }

  function defaultColumnDirection(column) {
    if (ALPHABETICAL_COLUMNS.has(column)) return "asc";
    if (DERIVED_COLUMNS.has(column)) return "desc";
    return "desc";
  }

  // Selection lifecycle rule: keep the user's selection when still valid;
  // otherwise prefer the first case-subject row (the Unit 0 demo flow);
  // otherwise the first row; otherwise null (empty-state).
  function chooseDefaultSelection(features, currentEntityId) {
    if (!features || features.length === 0) return null;
    if (currentEntityId && features.some((r) => r.entityId === currentEntityId)) {
      return currentEntityId;
    }
    const firstCase = features.find((r) => r.caseId != null);
    if (firstCase) return firstCase.entityId;
    return features[0].entityId;
  }

  window.FinCENSignalTable = {
    filterFeatures,
    sortFeatures,
    compoundDefaultSort,
    defaultColumnDirection,
    chooseDefaultSelection
  };
})();
