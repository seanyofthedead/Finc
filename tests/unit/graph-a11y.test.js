import { beforeEach, describe, it, expect } from "vitest";

function resetBody() { document.body.innerHTML = ""; }

describe("FinCENGraphA11y", () => {
  beforeEach(resetBody);

  it("is exposed with summarize, mount, update", () => {
    expect(window.FinCENGraphA11y).toBeDefined();
    expect(typeof window.FinCENGraphA11y.summarize).toBe("function");
    expect(typeof window.FinCENGraphA11y.mount).toBe("function");
    expect(typeof window.FinCENGraphA11y.update).toBe("function");
  });

  describe("summarize", () => {
    it("returns a string mentioning entity count", () => {
      const g = { nodes: [{ id: "A" }, { id: "B" }, { id: "C" }], edges: [] };
      const s = window.FinCENGraphA11y.summarize(g);
      expect(s).toMatch(/3 entities/);
    });

    it("pluralizes correctly for 1 vs N", () => {
      const g1 = { nodes: [{ id: "A" }], edges: [] };
      expect(window.FinCENGraphA11y.summarize(g1)).toMatch(/1 entity/);
      const g0 = { nodes: [], edges: [] };
      expect(window.FinCENGraphA11y.summarize(g0)).toMatch(/No entities|0 entities/);
    });

    it("includes pattern counts when overlay is provided", () => {
      const g = { nodes: [{ id: "A" }, { id: "B" }], edges: [] };
      const overlay = {
        shellChains: [["A", "B", "X"], ["C", "D", "E"]],
        mixers: ["M"],
        disposableClusters: [{ funderId: "F", walletIds: ["w1", "w2", "w3", "w4"] }],
        sanctionedIds: ["S1", "S2"]
      };
      const s = window.FinCENGraphA11y.summarize(g, overlay);
      expect(s).toMatch(/2 shell chains/);
      expect(s).toMatch(/1 mixer/);
      expect(s).toMatch(/1 disposable[- ]wallet cluster/);
      expect(s).toMatch(/2 sanctioned/);
    });

    it("omits zero-count pattern sentences cleanly", () => {
      const g = { nodes: [{ id: "A" }], edges: [] };
      const overlay = { shellChains: [], mixers: [], disposableClusters: [], sanctionedIds: [] };
      const s = window.FinCENGraphA11y.summarize(g, overlay);
      expect(s).not.toMatch(/0 shell chains/);
      expect(s).not.toMatch(/0 mixer/);
    });
  });

  describe("mount + update", () => {
    it("mount(container) inserts an aria-live region and a hidden node list", () => {
      const host = document.createElement("div");
      document.body.appendChild(host);
      window.FinCENGraphA11y.mount(host);
      const live = host.querySelector('[data-role="graph-a11y-live"]');
      const list = host.querySelector('[data-role="graph-a11y-list"]');
      expect(live).not.toBeNull();
      expect(list).not.toBeNull();
      expect(live.getAttribute("aria-live")).toBe("polite");
    });

    it("update(graph, overlay) writes the summary into the live region", () => {
      const host = document.createElement("div");
      document.body.appendChild(host);
      window.FinCENGraphA11y.mount(host);
      const g = {
        nodes: [{ id: "A", label: "Alpha" }, { id: "B", label: "Beta" }],
        edges: []
      };
      window.FinCENGraphA11y.update(g, null);
      const live = host.querySelector('[data-role="graph-a11y-live"]');
      expect(live.textContent).toMatch(/2 entities/);
    });

    it("update populates the hidden list with one entry per node (label + id)", () => {
      const host = document.createElement("div");
      document.body.appendChild(host);
      window.FinCENGraphA11y.mount(host);
      const g = {
        nodes: [{ id: "E01", label: "Alpha Inc" }, { id: "E02", label: "Beta Ltd" }],
        edges: []
      };
      window.FinCENGraphA11y.update(g, null);
      const items = host.querySelectorAll('[data-role="graph-a11y-list"] li');
      expect(items.length).toBe(2);
      expect(items[0].textContent).toContain("Alpha Inc");
      expect(items[0].textContent).toContain("E01");
    });
  });
});
