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

describe("FinCENViz.__test.getNodeAt — real hit test", () => {
  beforeEach(() => {
    resetAll();
  });

  it("returns the node id when (x, y) falls within the node's hit radius", () => {
    const canvas = makeCanvas();
    const graph = {
      nodes: [{ id: "A" }, { id: "B" }, { id: "C" }],
      edges: [{ from: "A", to: "B", weight: 1 }]
    };
    window.FinCENViz.drawGraph(canvas, graph, {});
    const layout = window.FinCENViz.__test.getLayout();
    const aId = window.FinCENViz.__test.getNodeAt(layout.A.x, layout.A.y);
    expect(aId).toBe("A");
  });

  it("returns null when (x, y) is far from every node", () => {
    const canvas = makeCanvas();
    const graph = {
      nodes: [{ id: "A" }, { id: "B" }],
      edges: []
    };
    window.FinCENViz.drawGraph(canvas, graph, {});
    expect(window.FinCENViz.__test.getNodeAt(-1000, -1000)).toBeNull();
  });
});

describe("FinCENGraphInteractions.attach — pointer drag", () => {
  beforeEach(() => {
    resetAll();
  });

  it("is exposed on window and returns a detach function", () => {
    const canvas = makeCanvas();
    const graph = { nodes: [{ id: "A" }], edges: [] };
    window.FinCENViz.drawGraph(canvas, graph, {});
    expect(window.FinCENGraphInteractions).toBeDefined();
    expect(typeof window.FinCENGraphInteractions.attach).toBe("function");
    const detach = window.FinCENGraphInteractions.attach(canvas, {
      getGraph: () => graph,
      getRiskByEntity: () => ({}),
      onDrag: () => {}
    });
    expect(typeof detach).toBe("function");
    detach();
  });

  it("pins the node under the pointer on pointerdown and moves the pin on pointermove", () => {
    const canvas = makeCanvas();
    const graph = {
      nodes: [{ id: "A" }, { id: "B" }],
      edges: [{ from: "A", to: "B", weight: 1 }]
    };
    window.FinCENViz.drawGraph(canvas, graph, {});
    const layout = window.FinCENViz.__test.getLayout();

    window.FinCENGraphInteractions.attach(canvas, {
      getGraph: () => graph,
      getRiskByEntity: () => ({}),
      onDrag: () => {}
    });

    fireEvent(canvas, "pointerdown", { clientX: layout.A.x, clientY: layout.A.y, pointerId: 1, button: 0 });
    const pinnedAfterDown = window.FinCENViz.__test.getHighlightState();
    // Pin exists for A:
    expect(window.FinCENViz.__test.isPinned("A")).toBe(true);

    fireEvent(window, "pointermove", { clientX: 250, clientY: 150, pointerId: 1 });
    const layout2 = window.FinCENViz.__test.getLayout();
    expect(Math.abs(layout2.A.x - 250)).toBeLessThan(2);
    expect(Math.abs(layout2.A.y - 150)).toBeLessThan(2);
  });

  it("releases the pin on pointerup", () => {
    const canvas = makeCanvas();
    const graph = { nodes: [{ id: "A" }], edges: [] };
    window.FinCENViz.drawGraph(canvas, graph, {});
    const layout = window.FinCENViz.__test.getLayout();
    window.FinCENGraphInteractions.attach(canvas, {
      getGraph: () => graph,
      getRiskByEntity: () => ({}),
      onDrag: () => {}
    });
    fireEvent(canvas, "pointerdown", { clientX: layout.A.x, clientY: layout.A.y, pointerId: 1, button: 0 });
    expect(window.FinCENViz.__test.isPinned("A")).toBe(true);
    fireEvent(window, "pointerup", { clientX: layout.A.x, clientY: layout.A.y, pointerId: 1 });
    expect(window.FinCENViz.__test.isPinned("A")).toBe(false);
  });

  it("pointerdown + pointerup without significant move fires opts.onClick with the node id", () => {
    const canvas = makeCanvas();
    const graph = { nodes: [{ id: "A" }, { id: "B" }], edges: [] };
    window.FinCENViz.drawGraph(canvas, graph, {});
    const layout = window.FinCENViz.__test.getLayout();
    const clicks = [];
    window.FinCENGraphInteractions.attach(canvas, {
      getGraph: () => graph,
      getRiskByEntity: () => ({}),
      onClick: (id) => clicks.push(id)
    });
    fireEvent(canvas, "pointerdown", { clientX: layout.A.x, clientY: layout.A.y, pointerId: 3, button: 0 });
    fireEvent(window, "pointerup", { clientX: layout.A.x + 1, clientY: layout.A.y - 1, pointerId: 3 });
    expect(clicks).toEqual(["A"]);
  });

  it("pointerdown + significant move + pointerup does NOT fire onClick (it was a drag)", () => {
    const canvas = makeCanvas();
    const graph = { nodes: [{ id: "A" }, { id: "B" }], edges: [] };
    window.FinCENViz.drawGraph(canvas, graph, {});
    const layout = window.FinCENViz.__test.getLayout();
    const clicks = [];
    window.FinCENGraphInteractions.attach(canvas, {
      getGraph: () => graph,
      getRiskByEntity: () => ({}),
      onClick: (id) => clicks.push(id)
    });
    fireEvent(canvas, "pointerdown", { clientX: layout.A.x, clientY: layout.A.y, pointerId: 3, button: 0 });
    fireEvent(window, "pointermove", { clientX: layout.A.x + 80, clientY: layout.A.y + 80, pointerId: 3 });
    fireEvent(window, "pointerup", { clientX: layout.A.x + 80, clientY: layout.A.y + 80, pointerId: 3 });
    expect(clicks).toEqual([]);
  });

  it("does not start a drag when pointerdown lands on empty space", () => {
    const canvas = makeCanvas();
    const graph = { nodes: [{ id: "A" }], edges: [] };
    window.FinCENViz.drawGraph(canvas, graph, {});
    window.FinCENGraphInteractions.attach(canvas, {
      getGraph: () => graph,
      getRiskByEntity: () => ({}),
      onDrag: () => {}
    });
    fireEvent(canvas, "pointerdown", { clientX: -500, clientY: -500, pointerId: 1, button: 0 });
    expect(window.FinCENViz.__test.isPinned("A")).toBe(false);
  });
});
