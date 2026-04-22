import { beforeEach, describe, it, expect } from "vitest";

function resetBody() {
  document.body.innerHTML = "";
}

describe("FinCENLegend", () => {
  beforeEach(resetBody);

  it("is exposed with mount(container), toggle(), isVisible()", () => {
    expect(window.FinCENLegend).toBeDefined();
    expect(typeof window.FinCENLegend.mount).toBe("function");
    expect(typeof window.FinCENLegend.toggle).toBe("function");
    expect(typeof window.FinCENLegend.isVisible).toBe("function");
  });

  it("mount inserts a legend element into the given container", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    window.FinCENLegend.mount(host);
    const legend = host.querySelector('[data-role="legend"]');
    expect(legend).not.toBeNull();
  });

  it("legend includes entries for all shape kinds and annotations (shell chain / mixer / sanctioned / disposable / path)", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    window.FinCENLegend.mount(host);
    const legend = host.querySelector('[data-role="legend"]');
    const text = legend.textContent.toLowerCase();
    ["shell", "bank", "individual", "crypto", "wallet", "sanction", "mixer", "path"].forEach((needle) => {
      expect(text, `legend should mention "${needle}"`).toContain(needle);
    });
  });

  it("includes a Risk score section with low / medium / high swatches matching riskColor() thresholds", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    window.FinCENLegend.mount(host);
    const legend = host.querySelector('[data-role="legend"]');
    const text = legend.textContent;
    expect(text).toMatch(/Risk score/i);
    expect(text).toMatch(/Low risk/i);
    expect(text).toMatch(/Medium risk/i);
    expect(text).toMatch(/High risk/i);
    // Thresholds surfaced to the user must match riskColor() in js/visualizations.js
    expect(text).toContain("65");
    expect(text).toContain("85");
    // The three risk colors must appear somewhere in the rendered SVG payload.
    const html = legend.innerHTML;
    expect(html).toContain("#6ca678");
    expect(html).toContain("#ddb361");
    expect(html).toContain("#e6695c");
  });

  it("shell-chain annotation swatch no longer contains a red disk fill", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    window.FinCENLegend.mount(host);
    const legend = host.querySelector('[data-role="legend"]');
    const items = Array.from(legend.querySelectorAll(".legend-list li"));
    const chainItem = items.find((li) => /shell[- ]chain/i.test(li.textContent));
    expect(chainItem, "expected a Shell-chain legend entry").toBeDefined();
    // Previously rendered a solid red `<circle ... fill="#e6695c"/>` disk; after the fix,
    // the ring is the only red-adjacent element and nothing inside the swatch should be filled red.
    const chainSvg = chainItem.innerHTML;
    expect(chainSvg).not.toMatch(/fill="#e6695c"/i);
  });

  it("annotation swatches use hollow rings (fill=\"none\" on the outer overlay)", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    window.FinCENLegend.mount(host);
    const legend = host.querySelector('[data-role="legend"]');
    const items = Array.from(legend.querySelectorAll(".legend-list li"));
    const annotationLabels = [/sanction/i, /mixer/i, /shell[- ]chain/i];
    annotationLabels.forEach((re) => {
      const li = items.find((x) => re.test(x.textContent));
      expect(li, `annotation "${re}" should exist`).toBeDefined();
      // The overlay ring is a <circle ... fill="none" ...> element.
      expect(li.innerHTML, `annotation "${re}" should render a hollow ring`).toMatch(/fill="none"/);
    });
  });

  it("toggle() flips visibility state", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    window.FinCENLegend.mount(host);
    const initial = window.FinCENLegend.isVisible();
    window.FinCENLegend.toggle();
    expect(window.FinCENLegend.isVisible()).toBe(!initial);
    window.FinCENLegend.toggle();
    expect(window.FinCENLegend.isVisible()).toBe(initial);
  });
});
