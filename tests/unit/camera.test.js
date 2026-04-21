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

describe("FinCENViz camera API", () => {
  beforeEach(resetAll);

  it("exposes setCamera(x, y, zoom), screenToWorld(x, y), worldToScreen(x, y)", () => {
    expect(typeof window.FinCENViz.setCamera).toBe("function");
    expect(typeof window.FinCENViz.screenToWorld).toBe("function");
    expect(typeof window.FinCENViz.worldToScreen).toBe("function");
  });

  it("setCamera clamps zoom to [0.2, 4.0] and updates getCamera()", () => {
    window.FinCENViz.setCamera(10, 20, 2);
    expect(window.FinCENViz.__test.getCamera()).toEqual({ x: 10, y: 20, zoom: 2 });
    window.FinCENViz.setCamera(0, 0, 10);
    expect(window.FinCENViz.__test.getCamera().zoom).toBe(4);
    window.FinCENViz.setCamera(0, 0, 0.01);
    expect(window.FinCENViz.__test.getCamera().zoom).toBe(0.2);
  });

  it("worldToScreen and screenToWorld are inverses", () => {
    window.FinCENViz.setCamera(30, 40, 1.5);
    const w = { x: 120, y: 80 };
    const s = window.FinCENViz.worldToScreen(w.x, w.y);
    const back = window.FinCENViz.screenToWorld(s.x, s.y);
    expect(Math.abs(back.x - w.x)).toBeLessThan(1e-6);
    expect(Math.abs(back.y - w.y)).toBeLessThan(1e-6);
  });
});

describe("Hit-test respects camera transform", () => {
  beforeEach(resetAll);

  it("after zooming 2x, a node at world (50, 50) is hit at screen (100, 100) when camera at origin", () => {
    const canvas = makeCanvas(400, 300);
    const graph = { nodes: [{ id: "A" }, { id: "B" }], edges: [] };
    window.FinCENViz.drawGraph(canvas, graph, {});
    const layout = window.FinCENViz.__test.getLayout();
    // Move node A to world (50, 50) via pin
    window.FinCENViz.pinNode("A", 50, 50);
    window.FinCENViz.drawGraph(canvas, graph, {});
    window.FinCENViz.unpinNode("A");

    // With zoom 1 at origin, world (50,50) hits at screen (50,50).
    expect(window.FinCENViz.hitTestNode(50, 50)).toBe("A");

    // Zoom 2x centered at origin: world (50,50) -> screen (100,100).
    window.FinCENViz.setCamera(0, 0, 2);
    expect(window.FinCENViz.hitTestNode(100, 100)).toBe("A");
    expect(window.FinCENViz.hitTestNode(50, 50)).not.toBe("A");
  });
});

describe("Wheel zoom with cursor anchor + background-drag pan", () => {
  beforeEach(resetAll);

  it("wheel over canvas updates camera.zoom with clamp", () => {
    const canvas = makeCanvas();
    const graph = { nodes: [{ id: "A" }], edges: [] };
    window.FinCENViz.drawGraph(canvas, graph, {});
    window.FinCENGraphInteractions.attach(canvas, {
      getGraph: () => graph,
      getRiskByEntity: () => ({})
    });
    const before = window.FinCENViz.__test.getCamera().zoom;
    fireEvent(canvas, "wheel", { deltaY: -200, clientX: 100, clientY: 100 });
    const after = window.FinCENViz.__test.getCamera().zoom;
    expect(after).toBeGreaterThan(before);
  });

  it("wheel at (sx, sy) keeps the world point at that screen location stable (zoom-to-cursor)", () => {
    const canvas = makeCanvas();
    const graph = { nodes: [{ id: "A" }], edges: [] };
    window.FinCENViz.drawGraph(canvas, graph, {});
    window.FinCENGraphInteractions.attach(canvas, {
      getGraph: () => graph,
      getRiskByEntity: () => ({})
    });
    const cursor = { x: 120, y: 90 };
    const worldBefore = window.FinCENViz.screenToWorld(cursor.x, cursor.y);
    fireEvent(canvas, "wheel", { deltaY: -200, clientX: cursor.x, clientY: cursor.y });
    const worldAfter = window.FinCENViz.screenToWorld(cursor.x, cursor.y);
    expect(Math.abs(worldAfter.x - worldBefore.x)).toBeLessThan(1);
    expect(Math.abs(worldAfter.y - worldBefore.y)).toBeLessThan(1);
  });

  it("pointerdown on empty space + pointermove pans camera in world space", () => {
    const canvas = makeCanvas();
    const graph = { nodes: [{ id: "A" }], edges: [] };
    window.FinCENViz.drawGraph(canvas, graph, {});
    // Make sure A is not at origin — pin it far away so pointerdown at origin hits nothing.
    window.FinCENViz.pinNode("A", 300, 200);
    window.FinCENViz.drawGraph(canvas, graph, {});
    window.FinCENViz.unpinNode("A");
    window.FinCENGraphInteractions.attach(canvas, {
      getGraph: () => graph,
      getRiskByEntity: () => ({})
    });
    const camBefore = window.FinCENViz.__test.getCamera();
    fireEvent(canvas, "pointerdown", { clientX: 20, clientY: 20, pointerId: 5, button: 0 });
    fireEvent(window, "pointermove", { clientX: 70, clientY: 90, pointerId: 5 });
    fireEvent(window, "pointerup", { clientX: 70, clientY: 90, pointerId: 5 });
    const camAfter = window.FinCENViz.__test.getCamera();
    expect(camAfter.x).not.toBe(camBefore.x);
    expect(camAfter.y).not.toBe(camBefore.y);
  });
});

describe("Keyboard zoom controls", () => {
  beforeEach(resetAll);

  it("keydown '0' resets the camera to origin/zoom=1", () => {
    const canvas = makeCanvas();
    const graph = { nodes: [{ id: "A" }], edges: [] };
    window.FinCENViz.drawGraph(canvas, graph, {});
    window.FinCENGraphInteractions.attach(canvas, {
      getGraph: () => graph,
      getRiskByEntity: () => ({})
    });
    window.FinCENViz.setCamera(50, 60, 2);
    fireEvent(window, "keydown", { key: "0" });
    expect(window.FinCENViz.__test.getCamera()).toEqual({ x: 0, y: 0, zoom: 1 });
  });

  it("keydown does NOT zoom while focus is inside an input/textarea/select", () => {
    const canvas = makeCanvas();
    const input = document.createElement("textarea");
    document.body.appendChild(input);
    const graph = { nodes: [{ id: "A" }], edges: [] };
    window.FinCENViz.drawGraph(canvas, graph, {});
    window.FinCENGraphInteractions.attach(canvas, {
      getGraph: () => graph,
      getRiskByEntity: () => ({})
    });
    window.FinCENViz.setCamera(10, 20, 2);
    const before = window.FinCENViz.__test.getCamera();
    const evt = new window.KeyboardEvent("keydown", { key: "0", bubbles: true });
    input.dispatchEvent(evt);
    const after = window.FinCENViz.__test.getCamera();
    expect(after).toEqual(before);
  });

  it("keydown '+' and '-' zoom in and out", () => {
    const canvas = makeCanvas();
    const graph = { nodes: [{ id: "A" }], edges: [] };
    window.FinCENViz.drawGraph(canvas, graph, {});
    window.FinCENGraphInteractions.attach(canvas, {
      getGraph: () => graph,
      getRiskByEntity: () => ({})
    });
    const start = window.FinCENViz.__test.getCamera().zoom;
    fireEvent(window, "keydown", { key: "+" });
    const afterPlus = window.FinCENViz.__test.getCamera().zoom;
    expect(afterPlus).toBeGreaterThan(start);
    fireEvent(window, "keydown", { key: "-" });
    fireEvent(window, "keydown", { key: "-" });
    const afterMinus = window.FinCENViz.__test.getCamera().zoom;
    expect(afterMinus).toBeLessThan(afterPlus);
  });
});
