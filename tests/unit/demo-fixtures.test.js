import { describe, it, expect } from "vitest";

describe("FinCENDemoFixtures.buildRichGraph (labelled demo-only synthetic data)", () => {
  it("exposes window.FinCENDemoFixtures.buildRichGraph()", () => {
    expect(window.FinCENDemoFixtures).toBeDefined();
    expect(typeof window.FinCENDemoFixtures.buildRichGraph).toBe("function");
  });

  it("returns a dataset with >=500 entities", () => {
    const rich = window.FinCENDemoFixtures.buildRichGraph();
    expect(rich.entities.length).toBeGreaterThanOrEqual(500);
  });

  it("carries over the production-shape fields the engine requires", () => {
    const rich = window.FinCENDemoFixtures.buildRichGraph();
    expect(Array.isArray(rich.transactions)).toBe(true);
    expect(Array.isArray(rich.flaggedCases)).toBe(true);
    expect(rich.jurisdictionRisk).toBeDefined();
    expect(rich.typologySeverity).toBeDefined();
    expect(rich.entityResolution).toBeDefined();
    expect(rich.historicalOutcomes).toBeDefined();

    const e = rich.entities[0];
    expect(e).toHaveProperty("id");
    expect(e).toHaveProperty("name");
    expect(e).toHaveProperty("kind");
    expect(e).toHaveProperty("jurisdiction");
  });

  it("includes at least one shell-company chain of depth >=3 (A -> B -> C -> D, all shell_company intermediaries)", () => {
    const rich = window.FinCENDemoFixtures.buildRichGraph();
    const shellIds = new Set(rich.entities.filter((e) => e.kind === "shell_company").map((e) => e.id));
    const outgoing = {};
    rich.transactions.forEach((tx) => {
      if (!outgoing[tx.fromEntityId]) outgoing[tx.fromEntityId] = new Set();
      outgoing[tx.fromEntityId].add(tx.toEntityId);
    });

    let foundDepth = 0;
    rich.entities.forEach((seed) => {
      const stack = [{ id: seed.id, depth: 0, visited: new Set([seed.id]) }];
      while (stack.length) {
        const node = stack.pop();
        if (node.depth > foundDepth) foundDepth = node.depth;
        if (node.depth >= 4) break;
        const nexts = outgoing[node.id] || new Set();
        nexts.forEach((nxt) => {
          if (!node.visited.has(nxt) && shellIds.has(nxt)) {
            const v = new Set(node.visited);
            v.add(nxt);
            stack.push({ id: nxt, depth: node.depth + 1, visited: v });
          }
        });
      }
    });
    expect(foundDepth).toBeGreaterThanOrEqual(3);
  });

  it("includes at least one mixer entity with fan-in >=6 AND fan-out >=6 distinct counterparties", () => {
    const rich = window.FinCENDemoFixtures.buildRichGraph();
    const fanIn = {};
    const fanOut = {};
    rich.transactions.forEach((tx) => {
      (fanOut[tx.fromEntityId] = fanOut[tx.fromEntityId] || new Set()).add(tx.toEntityId);
      (fanIn[tx.toEntityId] = fanIn[tx.toEntityId] || new Set()).add(tx.fromEntityId);
    });
    const mixers = rich.entities.filter((e) => (fanIn[e.id] || new Set()).size >= 6 && (fanOut[e.id] || new Set()).size >= 6);
    expect(mixers.length).toBeGreaterThanOrEqual(1);
  });

  it("shouldActivate(search) returns true for ?demo=rich, false otherwise", () => {
    expect(typeof window.FinCENDemoFixtures.shouldActivate).toBe("function");
    expect(window.FinCENDemoFixtures.shouldActivate("?demo=rich")).toBe(true);
    expect(window.FinCENDemoFixtures.shouldActivate("?demo=rich&foo=bar")).toBe(true);
    expect(window.FinCENDemoFixtures.shouldActivate("?foo=bar&demo=rich")).toBe(true);
    expect(window.FinCENDemoFixtures.shouldActivate("?demo=lite")).toBe(false);
    expect(window.FinCENDemoFixtures.shouldActivate("")).toBe(false);
    expect(window.FinCENDemoFixtures.shouldActivate(undefined)).toBe(false);
  });

  it("activate() swaps window.FinCENData with the rich graph when called", () => {
    const originalEntities = window.FinCENData.entities.length;
    expect(typeof window.FinCENDemoFixtures.activate).toBe("function");
    const prev = window.FinCENData;
    window.FinCENDemoFixtures.activate();
    expect(window.FinCENData).not.toBe(prev);
    expect(window.FinCENData.entities.length).toBeGreaterThanOrEqual(500);
    expect(window.FinCENData.__synthetic).toBe(true);
    // Restore for other tests.
    window.FinCENData = prev;
    expect(window.FinCENData.entities.length).toBe(originalEntities);
  });

  it("includes at least one disposable-wallet cluster of >=4 wallets sharing a common funder", () => {
    const rich = window.FinCENDemoFixtures.buildRichGraph();
    const disposableIds = new Set(rich.entities.filter((e) => e.kind === "disposable_wallet").map((e) => e.id));
    expect(disposableIds.size).toBeGreaterThanOrEqual(4);

    const funderTargets = {};
    rich.transactions.forEach((tx) => {
      if (disposableIds.has(tx.toEntityId)) {
        (funderTargets[tx.fromEntityId] = funderTargets[tx.fromEntityId] || new Set()).add(tx.toEntityId);
      }
    });
    const bigFunders = Object.keys(funderTargets).filter((k) => funderTargets[k].size >= 4);
    expect(bigFunders.length).toBeGreaterThanOrEqual(1);
  });
});
