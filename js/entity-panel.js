/* Entity-detail side panel. Mount-once, show/hide on demand. Owns an Escape
 * handler at window level while visible. Pure DOM; no direct engine coupling. */
(function () {
  "use strict";

  let root = null;
  let visible = false;
  let onOpenWorkspaceCb = null;

  function escape(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));
  }

  function mount(container) {
    if (!container) return;
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = document.createElement("aside");
    root.setAttribute("data-role", "entity-panel");
    root.className = "entity-panel";
    root.setAttribute("aria-hidden", "true");
    root.innerHTML = `
      <header class="entity-panel-head">
        <h3 data-role="entity-name"></h3>
        <button class="entity-panel-close" data-action="close" aria-label="Close">×</button>
      </header>
      <div class="entity-panel-body">
        <div class="metric-row"><span class="muted">Kind</span><span data-role="entity-kind"></span></div>
        <div class="metric-row"><span class="muted">Jurisdiction</span><span data-role="entity-jurisdiction"></span></div>
        <div class="metric-row"><span class="muted">Risk</span><span data-role="entity-risk"></span></div>
        <div data-role="sanctioned-slot"></div>
        <div data-role="case-slot"></div>
        <h4 class="entity-panel-subhead" data-role="tx-head" style="display:none">Recent Transactions</h4>
        <ul data-role="tx-list" class="entity-tx-list"></ul>
      </div>
      <footer class="entity-panel-foot">
        <button class="btn accent" data-action="open-workspace">Open in Examiner Workspace</button>
      </footer>
    `;
    container.appendChild(root);
    root.addEventListener("click", (evt) => {
      const action = evt.target && evt.target.getAttribute && evt.target.getAttribute("data-action");
      if (action === "close") hide();
      if (action === "open-workspace" && onOpenWorkspaceCb) {
        onOpenWorkspaceCb(root.getAttribute("data-entity-id"));
      }
    });
  }

  function show(entity, opts) {
    opts = opts || {};
    if (!root) mount(document.body);
    root.setAttribute("data-entity-id", entity.id);
    root.querySelector('[data-role="entity-name"]').textContent = entity.name || entity.id;
    root.querySelector('[data-role="entity-kind"]').textContent = entity.kind || "";
    root.querySelector('[data-role="entity-jurisdiction"]').textContent = entity.jurisdiction || "";

    const riskEl = root.querySelector('[data-role="entity-risk"]');
    const riskScore = opts.case && typeof opts.case.riskScore === "number" ? opts.case.riskScore : null;
    riskEl.textContent = riskScore == null ? "—" : String(riskScore);

    const sanctionedSlot = root.querySelector('[data-role="sanctioned-slot"]');
    sanctionedSlot.innerHTML = opts.sanctioned
      ? '<div data-role="sanctioned-badge" class="pill risk-high">Sanctioned</div>'
      : "";

    const caseSlot = root.querySelector('[data-role="case-slot"]');
    if (opts.case && (opts.case.typology || opts.case.whyFlagged)) {
      caseSlot.innerHTML =
        '<div class="metric-row"><span class="muted">Testing Pattern</span><span>' + escape(opts.case.typology || "") + "</span></div>" +
        (opts.case.whyFlagged ? '<div class="entity-panel-why muted">' + escape(opts.case.whyFlagged) + "</div>" : "");
    } else {
      caseSlot.innerHTML = "";
    }

    const txHead = root.querySelector('[data-role="tx-head"]');
    const txList = root.querySelector('[data-role="tx-list"]');
    const txs = Array.isArray(opts.recentTransactions) ? opts.recentTransactions : [];
    if (txs.length) {
      txHead.style.display = "";
      txList.innerHTML = txs.slice(0, 6).map((t) =>
        "<li><code>" + escape(t.id) + "</code> $" + Number(t.amountUsd || 0).toLocaleString() + " " + escape(t.channel || "") + "</li>"
      ).join("");
    } else {
      txHead.style.display = "none";
      txList.innerHTML = "";
    }

    onOpenWorkspaceCb = opts.onOpenWorkspace || null;
    root.classList.add("open");
    root.setAttribute("aria-hidden", "false");
    visible = true;
  }

  function hide() {
    if (!root) return;
    root.classList.remove("open");
    root.setAttribute("aria-hidden", "true");
    visible = false;
  }

  function isVisible() {
    return visible;
  }

  window.addEventListener("keydown", (evt) => {
    if (evt.key === "Escape" && visible) hide();
  });

  window.FinCENEntityPanel = { mount, show, hide, isVisible };
})();
