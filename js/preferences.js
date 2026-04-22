/* Tiny preferences store. Reads/writes fincen:prefs in localStorage, notifies
 * subscribers on change, and applies body classes so any CSS can respond. */
(function () {
  "use strict";

  const STORAGE_KEY = "fincen:prefs";
  const DEFAULTS = {
    reduceMotion: false,
    readingComfort: false,
    hideClassification: false,
    compactDensity: false
  };

  let state = Object.assign({}, DEFAULTS);
  const subs = new Set();

  function loadFromStorage() {
    try {
      const raw = window.localStorage ? window.localStorage.getItem(STORAGE_KEY) : null;
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        Object.keys(DEFAULTS).forEach((k) => {
          if (Object.prototype.hasOwnProperty.call(parsed, k)) state[k] = Boolean(parsed[k]);
        });
      }
    } catch (e) { /* ignore parse errors */ }
  }

  function persist() {
    try {
      if (window.localStorage) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* storage quota, private mode — ignore */ }
  }

  function defaults() { return Object.assign({}, DEFAULTS); }
  function get(key) { return Object.prototype.hasOwnProperty.call(state, key) ? state[key] : undefined; }

  function set(key, value) {
    if (!Object.prototype.hasOwnProperty.call(DEFAULTS, key)) return;
    const v = Boolean(value);
    if (state[key] === v) return;
    state[key] = v;
    persist();
    subs.forEach((fn) => { try { fn(key, v); } catch (e) { /* subscriber error */ } });
  }

  function subscribe(fn) {
    if (typeof fn !== "function") return () => {};
    subs.add(fn);
    return () => { subs.delete(fn); };
  }

  const CLASS_MAP = {
    reduceMotion: "prefs-reduce-motion",
    readingComfort: "prefs-reading-comfort",
    hideClassification: "prefs-hide-classification",
    compactDensity: "prefs-compact-density"
  };

  function apply() {
    const body = document.body;
    if (!body) return;
    Object.keys(CLASS_MAP).forEach((k) => {
      body.classList.toggle(CLASS_MAP[k], Boolean(state[k]));
    });
  }

  function __resetForTest() {
    state = Object.assign({}, DEFAULTS);
    subs.clear();
    loadFromStorage();
  }

  loadFromStorage();

  window.FinCENPrefs = { get, set, subscribe, apply, defaults, __resetForTest };
})();
