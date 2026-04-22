/* Preferences modal UI. Pulls from FinCENPrefs, pushes changes back, and
 * applies classes on body so CSS can react. Opens via ⌘, or command palette. */
(function () {
  "use strict";

  let root = null;
  let isOpen = false;

  const OPTIONS = [
    { key: "reduceMotion",      label: "Reduce motion",          hint: "Disable animations, tickers, and slide-ins." },
    { key: "readingComfort",    label: "Reading comfort",        hint: "Looser line-height and letter-spacing for easier reading." },
    { key: "compactDensity",    label: "Compact density",        hint: "Tighter padding and smaller kickers." },
    { key: "hideClassification",label: "Hide classification bar",hint: "Keep just the amber hairline across the top." }
  ];

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  }

  function ensureMount() {
    if (root && root.isConnected) return;
    root = document.createElement("div");
    root.setAttribute("data-role", "prefs-root");
    root.className = "prefs-root";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", "prefs-title");
    document.body.appendChild(root);
    root.addEventListener("click", (evt) => {
      if (evt.target === root || evt.target.getAttribute("data-action") === "close") {
        close();
      }
    });
    document.addEventListener("keydown", (evt) => {
      if (!isOpen) return;
      if (evt.key === "Escape") { evt.preventDefault(); close(); }
    });
  }

  function render() {
    if (!root || !window.FinCENPrefs) return;
    const prefs = window.FinCENPrefs;
    root.innerHTML = '<div class="prefs-backdrop" data-action="close"></div>' +
      '<div class="prefs-card" role="document">' +
        '<header class="prefs-head">' +
          '<p class="kicker mono"><span class="kicker-num">\u2318 ,</span> <span class="kicker-rule"></span> Preferences</p>' +
          '<h3 id="prefs-title" class="display-head" style="font-size:1.4rem;margin:8px 0 4px">Comfort and cadence.</h3>' +
          '<p class="prefs-lede">Your settings are stored on this machine only.</p>' +
        '</header>' +
        '<ul class="prefs-list">' +
          OPTIONS.map((opt) => {
            const active = prefs.get(opt.key);
            return '<li class="prefs-row' + (active ? " is-on" : "") + '" data-key="' + escapeHtml(opt.key) + '">' +
              '<div class="prefs-row-text">' +
                '<div class="prefs-row-label">' + escapeHtml(opt.label) + "</div>" +
                '<div class="prefs-row-hint">' + escapeHtml(opt.hint) + "</div>" +
              "</div>" +
              '<button class="prefs-toggle" role="switch" aria-checked="' + (active ? "true" : "false") +
                '" aria-label="' + escapeHtml(opt.label) + '" data-action="toggle" data-key="' + escapeHtml(opt.key) + '">' +
                '<span class="prefs-toggle-knob"></span>' +
              "</button>" +
              "</li>";
          }).join("") +
        "</ul>" +
        '<footer class="prefs-foot">' +
          '<button class="btn" data-action="close">Done</button>' +
        "</footer>" +
      "</div>";
    root.querySelectorAll('[data-action="toggle"]').forEach((btn) => {
      btn.addEventListener("click", (evt) => {
        evt.stopPropagation();
        const key = btn.getAttribute("data-key");
        const current = prefs.get(key);
        prefs.set(key, !current);
        prefs.apply();
        render();
      });
    });
  }

  function open() {
    if (!window.FinCENPrefs) return;
    ensureMount();
    render();
    isOpen = true;
    root.classList.add("is-open");
    document.body.classList.add("cmdk-lock");
  }

  function close() {
    if (!root) return;
    isOpen = false;
    root.classList.remove("is-open");
    document.body.classList.remove("cmdk-lock");
  }

  function toggle() { isOpen ? close() : open(); }

  window.FinCENPrefsUI = { open, close, toggle, isOpen: () => isOpen };
})();
