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

describe("FinCENPathTracing.shortestPath — pure BFS on undirected adjacency", () => {
  it("is exposed with shortestPath(graph, from, to)", () => {
    expect(window.FinCENPathTracing).toBeDefined();
    expect(typeof window.FinCENPathTracing.shortestPath).toBe("function");
  });

  it("returns a direct path between adjacent nodes", () => {
    const graph = {
      nodes: [{ id: "A" }, { id: "B" }],
      edges: [{ from: "A", to: "B", weight: 1 }]
    };
    expect(window.FinCENPathTracing.shortestPath(graph, "A", "B")).toEqual(["A", "B"]);
  });

  it("returns the minimal-length path across the graph", () => {
    const graph = {
      nodes: [{ id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }, { id: "E" }],
      edges: [
        { from: "A", to: "B", weight: 1 },
        { from: "B", to: "C", weight: 1 },
        { from: "C", to: "D", weight: 1 },
        { from: "A", to: "E", weight: 1 },
        { from: "E", to: "D", weight: 1 }
      ]
    };
    const path = window.FinCENPathTracing.shortestPath(graph, "A", "D");
    // Two options of length 3: A-E-D or A-B-C-D; BFS finds A-E-D first
    expect(path.length).toBe(3);
    expect(path[0]).toBe("A");
    expect(path[path.length - 1]).toBe("D");
  });

  it("treats edges as undirected for path purposes", () => {
    const graph = {
      nodes: [{ id: "A" }, { id: "B" }, { id: "C" }],
      edges: [{ from: "B", to: "A", weight: 1 }, { from: "C", to: "B", weight: 1 }]
    };
    expect(window.FinCENPathTracing.shortestPath(graph, "A", "C")).toEqual(["A", "B", "C"]);
  });

  it("returns [] when nodes are disconnected", () => {
    const graph = {
      nodes: [{ id: "A" }, { id: "B" }, { id: "X" }, { id: "Y" }],
      edges: [{ from: "A", to: "B", weight: 1 }, { from: "X", to: "Y", weight: 1 }]
    };
    expect(window.FinCENPathTracing.shortestPath(graph, "A", "Y")).toEqual([]);
  });

  it("returns [] for unknown ids", () => {
    const graph = { nodes: [{ id: "A" }], edges: [] };
    expect(window.FinCENPathTracing.shortestPath(graph, "A", "ZZZ")).toEqual([]);
    expect(window.FinCENPathTracing.shortestPath(graph, "ZZZ", "A")).toEqual([]);
  });

  it("returns a single-node path when from === to", () => {
    const graph = { nodes: [{ id: "A" }], edges: [] };
    expect(window.FinCENPathTracing.shortestPath(graph, "A", "A")).toEqual(["A"]);
  });
});

describe("FinCENViz path highlight state", () => {
  beforeEach(resetAll);

  it("setPathHighlight(path) + __test.getPath() round-trip", () => {
    expect(typeof window.FinCENViz.setPathHighlight).toBe("function");
    window.FinCENViz.setPathHighlight(["A", "B", "C"]);
    expect(window.FinCENViz.__test.getPath()).toEqual(["A", "B", "C"]);
    window.FinCENViz.setPathHighlight(null);
    expect(window.FinCENViz.__test.getPath()).toBeNull();
  });

  it("resetLayout clears the path highlight", () => {
    window.FinCENViz.setPathHighlight(["A", "B"]);
    window.FinCENViz.__test.resetLayout();
    expect(window.FinCENViz.__test.getPath()).toBeNull();
  });
});

describe("Shift-click in graph-interactions", () => {
  beforeEach(resetAll);

  it("pointerdown with shiftKey + pointerup on a node fires opts.onShiftClick(id)", () => {
    const canvas = makeCanvas();
    const graph = { nodes: [{ id: "A" }, { id: "B" }], edges: [] };
    window.FinCENViz.drawGraph(canvas, graph, {});
    const layout = window.FinCENViz.__test.getLayout();
    const calls = [];
    window.FinCENGraphInteractions.attach(canvas, {
      getGraph: () => graph,
      getRiskByEntity: () => ({}),
      onClick: (id) => calls.push(["click", id]),
      onShiftClick: (id) => calls.push(["shift", id])
    });
    fireEvent(canvas, "pointerdown", {
      clientX: layout.A.x, clientY: layout.A.y, pointerId: 9, button: 0, shiftKey: true
    });
    fireEvent(window, "pointerup", {
      clientX: layout.A.x, clientY: layout.A.y, pointerId: 9, shiftKey: true
    });
    expect(calls).toEqual([["shift", "A"]]);
  });

  it("pointerdown WITHOUT shiftKey fires onClick (not onShiftClick)", () => {
    const canvas = makeCanvas();
    const graph = { nodes: [{ id: "A" }], edges: [] };
    window.FinCENViz.drawGraph(canvas, graph, {});
    const layout = window.FinCENViz.__test.getLayout();
    const calls = [];
    window.FinCENGraphInteractions.attach(canvas, {
      getGraph: () => graph,
      getRiskByEntity: () => ({}),
      onClick: (id) => calls.push(["click", id]),
      onShiftClick: (id) => calls.push(["shift", id])
    });
    fireEvent(canvas, "pointerdown", { clientX: layout.A.x, clientY: layout.A.y, pointerId: 9, button: 0 });
    fireEvent(window, "pointerup", { clientX: layout.A.x, clientY: layout.A.y, pointerId: 9 });
    expect(calls).toEqual([["click", "A"]]);
  });
});
