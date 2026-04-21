import { beforeEach, describe, it, expect } from "vitest";

function makeCanvas(width = 400, height = 300) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  document.body.appendChild(c);
  c.getBoundingClientRect = () => ({ x: 0, y: 0, left: 0, top: 0, right: width, bottom: height, width, height });
  return c;
}

function fireEvent(target, type, props) {
  const evt = new window.Event(type, { bubbles: true, cancelable: true });
  Object.assign(evt, props);
  target.dispatchEvent(evt);
  return evt;
}

function resetAll() {
  if (window.FinCENViz && window.FinCENViz.__test && window.FinCENViz.__test.resetLayout) {
    window.FinCENViz.__test.resetLayout();
  }
  document.body.innerHTML = "";
}

describe("FinCENViz.computeHighlight (pure)", () => {
  it("is exposed on FinCENViz", () => {
    expect(typeof window.FinCENViz.computeHighlight).toBe("function");
  });

  it("returns null when hoveredId is null or not in the graph", () => {
    const graph = { nodes: [{ id: "A" }, { id: "B" }], edges: [{ from: "A", to: "B", weight: 1 }] };
    expect(window.FinCENViz.computeHighlight(graph, null)).toBeNull();
    expect(window.FinCENViz.computeHighlight(graph, "ZZZ")).toBeNull();
  });

  it("classifies nodes as primary / oneHop / twoHop / faded using graph adjacency (edges are undirected for highlight purposes)", () => {
    // A - B - C - D      E (unrelated)
    const graph = {
      nodes: [{ id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }, { id: "E" }],
      edges: [
        { from: "A", to: "B", weight: 1 },
        { from: "B", to: "C", weight: 1 },
        { from: "C", to: "D", weight: 1 }
      ]
    };
    const hl = window.FinCENViz.computeHighlight(graph, "A");
    expect(hl.primary).toEqual(["A"]);
    expect(hl.oneHop.sort()).toEqual(["B"]);
    expect(hl.twoHop.sort()).toEqual(["C"]);
    expect(hl.faded.sort()).toEqual(["D", "E"]);
  });

  it("handles a hub where every other node is one-hop", () => {
    const graph = {
      nodes: [{ id: "HUB" }, { id: "X1" }, { id: "X2" }, { id: "X3" }, { id: "FAR" }],
      edges: [
        { from: "HUB", to: "X1", weight: 1 },
        { from: "HUB", to: "X2", weight: 1 },
        { from: "X3", to: "HUB", weight: 1 } // reverse edge still counts
      ]
    };
    const hl = window.FinCENViz.computeHighlight(graph, "HUB");
    expect(hl.primary).toEqual(["HUB"]);
    expect(hl.oneHop.sort()).toEqual(["X1", "X2", "X3"]);
    expect(hl.twoHop).toEqual([]);
    expect(hl.faded).toEqual(["FAR"]);
  });
});

describe("Hover interaction sets highlight state; leaving clears it", () => {
  beforeEach(() => {
    resetAll();
  });

  it("pointermove over a node while NOT dragging sets getHighlightState() to that node's highlight", () => {
    const canvas = makeCanvas();
    const graph = {
      nodes: [{ id: "A" }, { id: "B" }, { id: "C" }],
      edges: [{ from: "A", to: "B", weight: 1 }, { from: "B", to: "C", weight: 1 }]
    };
    window.FinCENViz.drawGraph(canvas, graph, {});
    const layout = window.FinCENViz.__test.getLayout();
    window.FinCENGraphInteractions.attach(canvas, {
      getGraph: () => graph,
      getRiskByEntity: () => ({})
    });

    // Not currently dragging; a plain pointermove on a node should set highlight.
    fireEvent(canvas, "pointermove", { clientX: layout.B.x, clientY: layout.B.y, pointerId: 2 });
    const hl = window.FinCENViz.__test.getHighlightState();
    expect(hl).not.toBeNull();
    expect(hl.primary).toEqual(["B"]);
    expect(hl.oneHop.sort()).toEqual(["A", "C"]);
  });

  it("pointermove over empty space clears the highlight", () => {
    const canvas = makeCanvas();
    const graph = { nodes: [{ id: "A" }, { id: "B" }], edges: [{ from: "A", to: "B", weight: 1 }] };
    window.FinCENViz.drawGraph(canvas, graph, {});
    const layout = window.FinCENViz.__test.getLayout();
    window.FinCENGraphInteractions.attach(canvas, {
      getGraph: () => graph,
      getRiskByEntity: () => ({})
    });

    fireEvent(canvas, "pointermove", { clientX: layout.A.x, clientY: layout.A.y, pointerId: 2 });
    expect(window.FinCENViz.__test.getHighlightState()).not.toBeNull();
    fireEvent(canvas, "pointermove", { clientX: -9999, clientY: -9999, pointerId: 2 });
    expect(window.FinCENViz.__test.getHighlightState()).toBeNull();
  });

  it("pointerleave on the canvas clears the highlight", () => {
    const canvas = makeCanvas();
    const graph = { nodes: [{ id: "A" }], edges: [] };
    window.FinCENViz.drawGraph(canvas, graph, {});
    const layout = window.FinCENViz.__test.getLayout();
    window.FinCENGraphInteractions.attach(canvas, {
      getGraph: () => graph,
      getRiskByEntity: () => ({})
    });
    fireEvent(canvas, "pointermove", { clientX: layout.A.x, clientY: layout.A.y, pointerId: 2 });
    expect(window.FinCENViz.__test.getHighlightState()).not.toBeNull();
    fireEvent(canvas, "pointerleave", { pointerId: 2 });
    expect(window.FinCENViz.__test.getHighlightState()).toBeNull();
  });
});
