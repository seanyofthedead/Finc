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
