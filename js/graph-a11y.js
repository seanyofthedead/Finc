/* Accessibility companion for the entity graph canvas. Maintains an
 * aria-live summary and a hidden, screen-reader-friendly node list so
 * non-sighted analysts can understand the network state. */
(function () {
  "use strict";

  let liveEl = null;
  let listEl = null;

  function pluralize(n, singular, plural) {
    return n + " " + (n === 1 ? singular : (plural || singular + "s"));
  }

  function summarize(graph, overlay) {
    const nodes = (graph && graph.nodes) || [];
    const parts = [];
    if (nodes.length === 0) {
      parts.push("No entities in view");
    } else {
      parts.push(pluralize(nodes.length, "entity", "entities"));
    }
    if (overlay) {
      const chains = (overlay.shellChains || []).length;
      const mixers = (overlay.mixers || []).length;
      const disposable = (overlay.disposableClusters || []).length;
      const sanctioned = (overlay.sanctionedIds || []).length;
      if (chains > 0)     parts.push(pluralize(chains, "shell chain"));
      if (mixers > 0)     parts.push(pluralize(mixers, "mixer"));
      if (disposable > 0) parts.push(pluralize(disposable, "disposable-wallet cluster"));
      if (sanctioned > 0) parts.push(pluralize(sanctioned, "sanctioned entity", "sanctioned entities"));
    }
    return parts.join(", ") + ".";
  }

  function mount(container) {
    if (!container) return;
    if (liveEl && liveEl.parentNode) liveEl.parentNode.removeChild(liveEl);
    if (listEl && listEl.parentNode) listEl.parentNode.removeChild(listEl);
    liveEl = document.createElement("div");
    liveEl.setAttribute("data-role", "graph-a11y-live");
    liveEl.setAttribute("aria-live", "polite");
    liveEl.setAttribute("aria-atomic", "true");
    liveEl.className = "sr-only";
    listEl = document.createElement("ul");
    listEl.setAttribute("data-role", "graph-a11y-list");
    listEl.className = "sr-only";
    container.appendChild(liveEl);
    container.appendChild(listEl);
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  }

  function update(graph, overlay) {
    if (!liveEl || !listEl) return;
    liveEl.textContent = summarize(graph, overlay);
    const nodes = (graph && graph.nodes) || [];
    listEl.innerHTML = nodes.map((n) => {
      const label = n.label || n.id;
      const kind = n.group ? (", " + escapeHtml(n.group)) : "";
      return "<li>" + escapeHtml(label) + " (" + escapeHtml(n.id) + ")" + kind + "</li>";
    }).join("");
  }

  window.FinCENGraphA11y = { summarize, mount, update };
})();
