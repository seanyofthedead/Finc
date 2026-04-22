/* Legend panel for the analytics graph. Inline SVG swatches for each shape +
 * annotation (sanctioned halo, mixer pulse, shell chain, path trace). */
(function () {
  "use strict";

  let root = null;
  let visible = true;

  const SVG_NS = "http://www.w3.org/2000/svg";
  function svg(children) {
    return `<svg xmlns="${SVG_NS}" width="22" height="22" viewBox="-11 -11 22 22">${children}</svg>`;
  }

  const swatches = [
    { svg: svg('<polygon points="0,-8 8,0 0,8 -8,0" fill="#eab873"/>'), label: "Shell company" },
    { svg: svg('<rect x="-7" y="-7" width="14" height="14" fill="#eab873"/>'), label: "Bank" },
    { svg: svg('<polygon points="8,0 4,6.9 -4,6.9 -8,0 -4,-6.9 4,-6.9" fill="#eab873"/>'), label: "Crypto service" },
    { svg: svg('<polygon points="0,-8 7,6 -7,6" fill="#eab873"/>'), label: "Disposable wallet" },
    { svg: svg('<circle cx="0" cy="0" r="7" fill="#eab873"/>'), label: "Individual / company" }
  ];

  const annotations = [
    { svg: svg('<circle cx="0" cy="0" r="5" fill="#e6695c"/><circle cx="0" cy="0" r="9" fill="none" stroke="#e6695c" stroke-width="2"/>'), label: "Sanctioned (red halo)" },
    { svg: svg('<circle cx="0" cy="0" r="4" fill="#eab873"/><circle cx="0" cy="0" r="9" fill="none" stroke="#eab873" stroke-width="1.5" opacity="0.7"/>'), label: "Mixer (pulsing ring)" },
    { svg: svg('<circle cx="0" cy="0" r="5" fill="#e6695c"/><circle cx="0" cy="0" r="8" fill="none" stroke="#eab873" stroke-width="1.5"/>'), label: "Shell-chain member" },
    { svg: svg('<line x1="-9" y1="0" x2="9" y2="0" stroke="#eab873" stroke-width="2.4" stroke-dasharray="4 3"/>'), label: "Traced fund-flow path" }
  ];

  function mount(container) {
    if (!container) return;
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = document.createElement("div");
    root.className = "legend";
    root.setAttribute("data-role", "legend");
    root.innerHTML = `
      <header class="legend-head">
        <strong>Legend</strong>
        <button class="legend-toggle" data-action="legend-toggle" aria-label="Hide legend">−</button>
      </header>
      <div class="legend-body">
        <h5 class="legend-section">Entity shapes</h5>
        <ul class="legend-list">` +
      swatches.map((s) => `<li><span class="legend-swatch">${s.svg}</span><span>${s.label}</span></li>`).join("") +
      `</ul>
        <h5 class="legend-section">Annotations</h5>
        <ul class="legend-list">` +
      annotations.map((s) => `<li><span class="legend-swatch">${s.svg}</span><span>${s.label}</span></li>`).join("") +
      `</ul>
      </div>
    `;
    container.appendChild(root);
    root.addEventListener("click", (evt) => {
      if (evt.target && evt.target.getAttribute && evt.target.getAttribute("data-action") === "legend-toggle") {
        toggle();
      }
    });
    applyVisibility();
  }

  function applyVisibility() {
    if (!root) return;
    root.classList.toggle("collapsed", !visible);
  }

  function toggle() {
    visible = !visible;
    applyVisibility();
  }

  function isVisible() {
    return visible;
  }

  window.FinCENLegend = { mount, toggle, isVisible };
})();
