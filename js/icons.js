/* Inline SVG icon system. 16×16 canvas, 1.5 stroke, currentColor so any
 * ancestor color tints the icon. Auto-hydrates [data-icon] elements. */
(function () {
  "use strict";

  const ICONS = {
    pipeline:   '<path d="M1.5 3.5h13"/><path d="M3 7.5h10"/><path d="M4.5 11.5h7"/>',
    signals:    '<path d="M1.5 8h2.5L5.5 4l2 8 1.5-4 1.5 2h3.5"/>',
    analytics:  '<circle cx="3.5" cy="5" r="1.3"/><circle cx="12.5" cy="5" r="1.3"/><circle cx="8" cy="12" r="1.3"/><path d="M4.1 6.1L7.5 11M11.9 6.1L8.5 11M4.8 5h6.4"/>',
    triage:     '<path d="M1.5 2.5h13l-5 5.5v5l-3-1.5V8z"/>',
    workspace:  '<path d="M3 2h5.5L12 5.5V14H3z"/><path d="M8.5 2v3.5H12"/><path d="M5 9h5M5 11.5h4"/>',
    enterprise: '<path d="M8 1.5l6.5 3-6.5 3-6.5-3z"/><path d="M1.5 8l6.5 3 6.5-3"/><path d="M1.5 11.5l6.5 3 6.5-3"/>',
    database:   '<ellipse cx="8" cy="3.5" rx="5.5" ry="1.75"/><path d="M2.5 3.5v9c0 .97 2.46 1.75 5.5 1.75s5.5-.78 5.5-1.75v-9"/><path d="M2.5 8c0 .97 2.46 1.75 5.5 1.75s5.5-.78 5.5-1.75"/>',
    globe:      '<circle cx="8" cy="8" r="6"/><path d="M2 8h12"/><path d="M8 2c2 2 3 4 3 6s-1 4-3 6"/><path d="M8 2c-2 2-3 4-3 6s1 4 3 6"/>',
    wave:       '<path d="M1.5 5.5c2 0 2 2 4 2s2-2 4-2 2 2 4 2"/><path d="M1.5 9.5c2 0 2 2 4 2s2-2 4-2 2 2 4 2"/>',
    shield:     '<path d="M8 1.5l5.5 2v4c0 3-2.2 5.5-5.5 7-3.3-1.5-5.5-4-5.5-7v-4z"/>',
    bitcoin:    '<circle cx="8" cy="8" r="5.5"/><path d="M6 5.5h3.5M6 10.5h3.5M8 4v8"/>',
    building:   '<path d="M2 5h12v9.5H2z"/><path d="M2 5L8 1.5l6 3.5"/><path d="M5 9v5.5M8 9v5.5M11 9v5.5"/>',
    flag:       '<path d="M3 2v12"/><path d="M3 3h8l-1.5 2.5L11 8H3"/>',
    search:     '<circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/>',
    sparkle:    '<path d="M8 2v4M8 10v4M2 8h4M10 8h4M4 4.5l2 2M10 9.5l2 2M4 11.5l2-2M10 6.5l2-2"/>',
    chevron:    '<path d="M6 4l4 4-4 4"/>'
  };

  function has(name) {
    return Object.prototype.hasOwnProperty.call(ICONS, name);
  }

  function list() {
    return Object.keys(ICONS);
  }

  function render(name, opts) {
    opts = opts || {};
    const content = ICONS[name];
    if (!content) return "";
    const size = Number(opts.size) || 16;
    return '<svg class="icon" viewBox="0 0 16 16" width="' + size + '" height="' + size +
      '" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      content + "</svg>";
  }

  function hydrate(root) {
    const scope = root || document;
    const nodes = scope.querySelectorAll("[data-icon]");
    for (let i = 0; i < nodes.length; i += 1) {
      const el = nodes[i];
      if (el.getAttribute("data-icon-hydrated") === "1") continue;
      const name = el.getAttribute("data-icon");
      const size = el.getAttribute("data-icon-size");
      el.innerHTML = render(name, size ? { size: Number(size) } : undefined);
      el.setAttribute("data-icon-hydrated", "1");
    }
  }

  window.FinCENIcons = { render, has, list, hydrate };
})();
