import { describe, it, expect } from "vitest";

describe("FinCENPatternDetection — pure detectors", () => {
  it("exposes detectShellChains, detectMixers, detectDisposableClusters", () => {
    expect(window.FinCENPatternDetection).toBeDefined();
    expect(typeof window.FinCENPatternDetection.detectShellChains).toBe("function");
    expect(typeof window.FinCENPatternDetection.detectMixers).toBe("function");
    expect(typeof window.FinCENPatternDetection.detectDisposableClusters).toBe("function");
  });

  it("detectShellChains returns a list of ordered ID arrays, each containing >=3 shell_company nodes in a directed chain", () => {
    const graph = {
      nodes: [
        { id: "S1", group: "shell_company" },
        { id: "S2", group: "shell_company" },
        { id: "S3", group: "shell_company" },
        { id: "S4", group: "shell_company" },
        { id: "P", group: "individual" }
      ],
      edges: [
        { from: "S1", to: "S2", weight: 1 },
        { from: "S2", to: "S3", weight: 1 },
        { from: "S3", to: "S4", weight: 1 },
        { from: "S4", to: "P", weight: 1 }
      ]
    };
    const chains = window.FinCENPatternDetection.detectShellChains(graph);
    expect(Array.isArray(chains)).toBe(true);
    expect(chains.length).toBeGreaterThanOrEqual(1);
    const longest = chains.reduce((m, c) => (c.length > m.length ? c : m), []);
    expect(longest.length).toBeGreaterThanOrEqual(3);
    longest.forEach((id) => {
      expect(["S1", "S2", "S3", "S4"].indexOf(id)).toBeGreaterThanOrEqual(0);
    });
  });

  it("detectShellChains returns [] when no chain of depth >=3 exists", () => {
    const graph = {
      nodes: [
        { id: "A", group: "shell_company" },
        { id: "B", group: "shell_company" },
        { id: "C", group: "individual" }
      ],
      edges: [
        { from: "A", to: "B", weight: 1 },
        { from: "B", to: "C", weight: 1 }
      ]
    };
    const chains = window.FinCENPatternDetection.detectShellChains(graph);
    expect(chains).toEqual([]);
  });

  it("detectMixers returns IDs with fan-in >= 6 AND fan-out >= 6 in distinct counterparties", () => {
    const nodes = [{ id: "M", group: "crypto_service" }];
    const edges = [];
    for (let i = 0; i < 7; i += 1) {
      nodes.push({ id: "IN" + i, group: "disposable_wallet" });
      edges.push({ from: "IN" + i, to: "M", weight: 1 });
    }
    for (let i = 0; i < 7; i += 1) {
      nodes.push({ id: "OUT" + i, group: "disposable_wallet" });
      edges.push({ from: "M", to: "OUT" + i, weight: 1 });
    }
    const mixers = window.FinCENPatternDetection.detectMixers({ nodes, edges });
    expect(mixers).toContain("M");
  });

  it("detectMixers ignores nodes without sufficient fan-in or fan-out", () => {
    const graph = {
      nodes: [
        { id: "X", group: "company" },
        { id: "Y1", group: "company" }, { id: "Y2", group: "company" }, { id: "Y3", group: "company" },
        { id: "Y4", group: "company" }, { id: "Y5", group: "company" }, { id: "Y6", group: "company" },
        { id: "Y7", group: "company" }
      ],
      edges: [
        { from: "Y1", to: "X", weight: 1 }, { from: "Y2", to: "X", weight: 1 }, { from: "Y3", to: "X", weight: 1 },
        { from: "Y4", to: "X", weight: 1 }, { from: "Y5", to: "X", weight: 1 }, { from: "Y6", to: "X", weight: 1 },
        { from: "Y7", to: "X", weight: 1 }
      ]
    };
    const mixers = window.FinCENPatternDetection.detectMixers(graph);
    expect(mixers).not.toContain("X");
  });

  it("detectDisposableClusters finds funders with >=4 disposable_wallet children", () => {
    const nodes = [{ id: "F", group: "individual" }];
    const edges = [];
    for (let i = 0; i < 5; i += 1) {
      nodes.push({ id: "W" + i, group: "disposable_wallet" });
      edges.push({ from: "F", to: "W" + i, weight: 1 });
    }
    const clusters = window.FinCENPatternDetection.detectDisposableClusters({ nodes, edges });
    expect(Array.isArray(clusters)).toBe(true);
    expect(clusters.length).toBeGreaterThanOrEqual(1);
    expect(clusters[0].funderId).toBe("F");
    expect(clusters[0].walletIds.sort()).toEqual(["W0", "W1", "W2", "W3", "W4"]);
  });

  it("detectDisposableClusters returns [] when no funder has enough disposable children", () => {
    const graph = {
      nodes: [
        { id: "F", group: "individual" },
        { id: "W0", group: "disposable_wallet" },
        { id: "W1", group: "disposable_wallet" }
      ],
      edges: [
        { from: "F", to: "W0", weight: 1 },
        { from: "F", to: "W1", weight: 1 }
      ]
    };
    expect(window.FinCENPatternDetection.detectDisposableClusters(graph)).toEqual([]);
  });
});

describe("FinCENViz.shapeForKind — pure mapping", () => {
  it("maps entity kinds to distinct shape names", () => {
    expect(typeof window.FinCENViz.shapeForKind).toBe("function");
    expect(window.FinCENViz.shapeForKind("shell_company")).toBe("diamond");
    expect(window.FinCENViz.shapeForKind("bank")).toBe("square");
    expect(window.FinCENViz.shapeForKind("crypto_service")).toBe("hex");
    expect(window.FinCENViz.shapeForKind("disposable_wallet")).toBe("triangle");
    expect(window.FinCENViz.shapeForKind("individual")).toBe("circle");
  });

  it("falls back to circle for unknown or missing kinds", () => {
    expect(window.FinCENViz.shapeForKind("company")).toBe("circle");
    expect(window.FinCENViz.shapeForKind(undefined)).toBe("circle");
    expect(window.FinCENViz.shapeForKind(null)).toBe("circle");
    expect(window.FinCENViz.shapeForKind("not-a-kind")).toBe("circle");
  });
});

describe("FinCENViz.setPatternOverlay — state only", () => {
  it("is settable and readable via __test.getPatternOverlay()", () => {
    expect(typeof window.FinCENViz.setPatternOverlay).toBe("function");
    expect(typeof window.FinCENViz.__test.getPatternOverlay).toBe("function");
    const overlay = {
      shellChains: [["S1", "S2", "S3"]],
      mixers: ["M"],
      disposableClusters: [{ funderId: "F", walletIds: ["W0", "W1", "W2", "W3"] }],
      sanctionedIds: ["E18"]
    };
    window.FinCENViz.setPatternOverlay(overlay);
    const back = window.FinCENViz.__test.getPatternOverlay();
    expect(back).toEqual(overlay);
  });

  it("resetLayout clears the overlay", () => {
    window.FinCENViz.setPatternOverlay({ shellChains: [["A", "B", "C"]], mixers: [], disposableClusters: [], sanctionedIds: [] });
    window.FinCENViz.__test.resetLayout();
    expect(window.FinCENViz.__test.getPatternOverlay()).toEqual({ shellChains: [], mixers: [], disposableClusters: [], sanctionedIds: [] });
  });
});
