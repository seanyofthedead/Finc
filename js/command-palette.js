/* Command palette — ⌘K / Ctrl+K. Fuzzy-matching over a registered command
 * list, minimal DOM, keyboard-first. Mirrors Apple Spotlight / Google Cmd-K. */
(function () {
  "use strict";

  const state = {
    commands: new Map(),
    isOpen: false,
    root: null,
    input: null,
    list: null,
    activeIndex: 0,
    query: "",
    previousFocus: null
  };

  function fuzzyScore(query, target) {
    const q = String(query || "").toLowerCase();
    const t = String(target || "").toLowerCase();
    if (q.length === 0) return 1;
    if (t.length === 0) return 0;
    let qi = 0;
    let score = 0;
    let consec = 0;
    let prevMatch = -2;
    for (let ti = 0; ti < t.length && qi < q.length; ti += 1) {
      if (t[ti] === q[qi]) {
        // Base: 1. Consecutive: +2. Prefix (ti == 0): +4. Word-boundary: +2.
        score += 1;
        if (ti === prevMatch + 1) {
          consec += 1;
          score += 2 * consec;
        } else {
          consec = 0;
        }
        if (ti === 0) score += 4;
        else if (t[ti - 1] === " " || t[ti - 1] === "-" || t[ti - 1] === "·") score += 2;
        prevMatch = ti;
        qi += 1;
      }
    }
    if (qi < q.length) return 0;
    // Shorter targets preferred when tied.
    score += Math.max(0, 12 - t.length) * 0.05;
    return score;
  }

  function registerCommand(cmd) {
    if (!cmd || !cmd.id) return;
    state.commands.set(cmd.id, {
      id: cmd.id,
      title: cmd.title || cmd.id,
      keywords: cmd.keywords || "",
      hint: cmd.hint || "",
      icon: cmd.icon || null,
      action: typeof cmd.action === "function" ? cmd.action : () => {}
    });
    if (state.isOpen) renderList();
  }

  function unregisterCommand(id) {
    state.commands.delete(id);
    if (state.isOpen) renderList();
  }

  function listCommands() {
    return Array.from(state.commands.values());
  }

  function findMatches(query) {
    const q = String(query || "");
    const out = [];
    state.commands.forEach((cmd) => {
      const titleScore = fuzzyScore(q, cmd.title);
      const keywordScore = fuzzyScore(q, cmd.keywords);
      const best = Math.max(titleScore, keywordScore * 0.7);
      if (best > 0) {
        out.push(Object.assign({}, cmd, { __score: best }));
      }
    });
    out.sort((a, b) => b.__score - a.__score);
    return out;
  }

  function execute(id) {
    const cmd = state.commands.get(id);
    if (!cmd) return;
    try { cmd.action(id); } catch (e) { /* silently swallow action errors */ }
  }

  function ensureMount() {
    if (state.root && state.root.isConnected) return;
    state.root = document.createElement("div");
    state.root.setAttribute("data-role", "cmdk-root");
    state.root.className = "cmdk-root";
    state.root.setAttribute("role", "dialog");
    state.root.setAttribute("aria-modal", "true");
    state.root.innerHTML = `
      <div class="cmdk-backdrop" data-role="cmdk-backdrop"></div>
      <div class="cmdk-card" role="combobox" aria-haspopup="listbox" aria-expanded="true">
        <div class="cmdk-input-wrap">
          <span class="cmdk-input-icon" data-icon="search" data-icon-size="16"></span>
          <input type="text"
                 class="cmdk-input"
                 data-role="cmdk-input"
                 placeholder="What would you like to do?"
                 autocomplete="off"
                 spellcheck="false"
                 aria-label="Command palette search"/>
          <kbd class="cmdk-esc-hint">esc</kbd>
        </div>
        <ul class="cmdk-list" data-role="cmdk-list" role="listbox"></ul>
        <footer class="cmdk-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> execute</span>
          <span><kbd>esc</kbd> close</span>
        </footer>
      </div>
    `;
    document.body.appendChild(state.root);
    state.input = state.root.querySelector('[data-role="cmdk-input"]');
    state.list = state.root.querySelector('[data-role="cmdk-list"]');

    state.root.querySelector('[data-role="cmdk-backdrop"]').addEventListener("click", close);
    state.input.addEventListener("input", () => { state.query = state.input.value; state.activeIndex = 0; renderList(); });
    state.input.addEventListener("keydown", (evt) => {
      if (evt.key === "Escape") { evt.preventDefault(); close(); }
      else if (evt.key === "ArrowDown") { evt.preventDefault(); moveActive(1); }
      else if (evt.key === "ArrowUp") { evt.preventDefault(); moveActive(-1); }
      else if (evt.key === "Enter") { evt.preventDefault(); runActive(); }
    });
    if (window.FinCENIcons) window.FinCENIcons.hydrate(state.root);
  }

  function renderList() {
    const matches = findMatches(state.query).slice(0, 40);
    state.activeIndex = Math.min(state.activeIndex, Math.max(0, matches.length - 1));
    state.list.innerHTML = matches.map((cmd, i) => {
      const active = i === state.activeIndex ? " is-active" : "";
      const iconHtml = cmd.icon && window.FinCENIcons ? window.FinCENIcons.render(cmd.icon, { size: 14 }) : "";
      const hintHtml = cmd.hint ? '<span class="cmdk-item-hint">' + escapeHtml(cmd.hint) + "</span>" : "";
      return '<li data-role="cmdk-item" data-cmd-id="' + escapeAttr(cmd.id) + '" class="cmdk-item' + active + '" role="option">' +
        '<span class="cmdk-item-icon">' + iconHtml + "</span>" +
        '<span class="cmdk-item-title">' + escapeHtml(cmd.title) + "</span>" +
        hintHtml +
        "</li>";
    }).join("") || '<li class="cmdk-empty">No commands match.</li>';
    Array.from(state.list.querySelectorAll('[data-role="cmdk-item"]')).forEach((el) => {
      el.addEventListener("mouseenter", () => { state.activeIndex = Number(el.getAttribute("data-index") || 0); });
      el.addEventListener("click", () => {
        const id = el.getAttribute("data-cmd-id");
        if (id) { execute(id); close(); }
      });
    });
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  }
  function escapeAttr(str) { return escapeHtml(str); }

  function moveActive(delta) {
    const items = state.list.querySelectorAll('[data-role="cmdk-item"]');
    if (!items.length) return;
    state.activeIndex = (state.activeIndex + delta + items.length) % items.length;
    items.forEach((el, i) => el.classList.toggle("is-active", i === state.activeIndex));
    const el = items[state.activeIndex];
    if (el && typeof el.scrollIntoView === "function") el.scrollIntoView({ block: "nearest" });
  }

  function runActive() {
    const items = state.list.querySelectorAll('[data-role="cmdk-item"]');
    const active = items[state.activeIndex];
    if (!active) return;
    const id = active.getAttribute("data-cmd-id");
    if (id) { execute(id); close(); }
  }

  function open() {
    ensureMount();
    state.isOpen = true;
    state.previousFocus = document.activeElement;
    state.query = "";
    state.input.value = "";
    state.activeIndex = 0;
    state.root.classList.add("is-open");
    document.body.classList.add("cmdk-lock");
    renderList();
    setTimeout(() => { if (state.input) state.input.focus(); }, 0);
  }

  function close() {
    if (!state.root) return;
    state.isOpen = false;
    state.root.classList.remove("is-open");
    document.body.classList.remove("cmdk-lock");
    if (state.previousFocus && typeof state.previousFocus.focus === "function") {
      state.previousFocus.focus();
    }
  }

  function isOpen() { return state.isOpen; }

  function __resetForTest() {
    state.commands.clear();
    state.isOpen = false;
    if (state.root && state.root.parentNode) state.root.parentNode.removeChild(state.root);
    state.root = null;
    state.input = null;
    state.list = null;
    state.activeIndex = 0;
    state.query = "";
  }

  window.FinCENCommand = {
    fuzzyScore, registerCommand, unregisterCommand, listCommands,
    findMatches, execute, open, close, isOpen, __resetForTest
  };
})();
