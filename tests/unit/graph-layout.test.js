import { beforeEach, describe, it, expect } from "vitest";

function makeCanvas(width = 400, height = 300) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  c.getBoundingClientRect = () => ({ x: 0, y: 0, left: 0, top: 0, right: width, bottom: height, width, height });
  return c;
}

function resetLayout() {
  if (window.FinCENViz && window.FinCENViz.__test && window.FinCENViz.__test.resetLayout) {
    window.FinCENViz.__test.resetLayout();
  }
}

describe("drawGraph — persistent layout", () => {
  beforeEach(() => {
    resetLayout();
  });

  it("populates getLayout() with an (x, y) entry for every node after drawing", () => {
    const canvas = makeCanvas();
    const graph = {
      nodes: [{ id: "A" }, { id: "B" }, { id: "C" }],
      edges: [{ from: "A", to: "B", weight: 1 }, { from: "B", to: "C", weight: 1 }]
    };
    window.FinCENViz.drawGraph(canvas, graph, { A: 50, B: 70, C: 90 });
    const layout = window.FinCENViz.__test.getLayout();
    expect(Object.keys(layout).sort()).toEqual(["A", "B", "C"]);
    ["A", "B", "C"].forEach((id) => {
      expect(typeof layout[id].x).toBe("number");
      expect(typeof layout[id].y).toBe("number");
      expect(Number.isFinite(layout[id].x)).toBe(true);
      expect(Number.isFinite(layout[id].y)).toBe(true);
    });
  });

  it("keeps node positions stable across two successive redraws of the same graph (<5 px drift)", () => {
    const canvas = makeCanvas();
    const graph = {
      nodes: [{ id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }],
      edges: [{ from: "A", to: "B", weight: 1 }, { from: "C", to: "D", weight: 1 }]
    };
    window.FinCENViz.drawGraph(canvas, graph, {});
    const first = JSON.parse(JSON.stringify(window.FinCENViz.__test.getLayout()));
    window.FinCENViz.drawGraph(canvas, graph, {});
    const second = window.FinCENViz.__test.getLayout();
    ["A", "B", "C", "D"].forEach((id) => {
      expect(Math.abs(second[id].x - first[id].x)).toBeLessThan(5);
      expect(Math.abs(second[id].y - first[id].y)).toBeLessThan(5);
    });
  });

  it("keeps existing node positions stable (<30 px drift) when a new node is added to the graph", () => {
    const canvas = makeCanvas();
    const graph1 = {
      nodes: [{ id: "A" }, { id: "B" }, { id: "C" }],
      edges: [{ from: "A", to: "B", weight: 1 }]
    };
    window.FinCENViz.drawGraph(canvas, graph1, {});
    const first = JSON.parse(JSON.stringify(window.FinCENViz.__test.getLayout()));
    const graph2 = {
      nodes: [{ id: "A" }, { id: "B" }, { id: "C" }, { id: "E" }],
      edges: [{ from: "A", to: "B", weight: 1 }, { from: "C", to: "E", weight: 1 }]
    };
    window.FinCENViz.drawGraph(canvas, graph2, {});
    const second = window.FinCENViz.__test.getLayout();
    expect(second.E).toBeDefined();
    ["A", "B", "C"].forEach((id) => {
      expect(Math.abs(second[id].x - first[id].x)).toBeLessThan(30);
      expect(Math.abs(second[id].y - first[id].y)).toBeLessThan(30);
    });
  });

  it("exposes a pinNode(id, x, y) on __test that forces a node's position and survives redraw", () => {
    const canvas = makeCanvas();
    const graph = {
      nodes: [{ id: "A" }, { id: "B" }, { id: "C" }],
      edges: [{ from: "A", to: "B", weight: 1 }]
    };
    window.FinCENViz.drawGraph(canvas, graph, {});
    expect(typeof window.FinCENViz.__test.pinNode).toBe("function");
    window.FinCENViz.__test.pinNode("A", 123, 45);
    window.FinCENViz.drawGraph(canvas, graph, {});
    const layout = window.FinCENViz.__test.getLayout();
    expect(layout.A.x).toBe(123);
    expect(layout.A.y).toBe(45);
  });
});
