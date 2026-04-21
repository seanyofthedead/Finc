import { beforeEach, describe, it, expect } from "vitest";

function spyContext() {
  const calls = [];
  const ctx = {
    globalAlpha: 1, fillStyle: "", strokeStyle: "", lineWidth: 1,
    beginPath() { calls.push(["beginPath"]); },
    closePath() { calls.push(["closePath"]); },
    moveTo(x, y) { calls.push(["moveTo", x, y]); },
    lineTo(x, y) { calls.push(["lineTo", x, y]); },
    arc(x, y, r, s, e) { calls.push(["arc", x, y, r, s, e]); },
    fill() { calls.push(["fill"]); },
    stroke() { calls.push(["stroke"]); },
    save() { calls.push(["save"]); },
    restore() { calls.push(["restore"]); },
    translate() {}, rotate() {}, setTransform() {}, clearRect() {},
    strokeRect() {}, setLineDash() {},
    fillRect() { calls.push(["fillRect"]); },
    rect(x, y, w, h) { calls.push(["rect", x, y, w, h]); },
    fillText() {},
    measureText: () => ({ width: 0 })
  };
  return { ctx, calls };
}

function countBy(calls, name) {
  return calls.filter((c) => c[0] === name).length;
}

function makeCanvas(width = 400, height = 300) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  document.body.appendChild(c);
  c.getBoundingClientRect = () => ({ x: 0, y: 0, left: 0, top: 0, right: width, bottom: height, width, height });
  return c;
}

function resetAll() {
  if (window.FinCENViz && window.FinCENViz.__test && window.FinCENViz.__test.resetLayout) {
    window.FinCENViz.__test.resetLayout();
  }
  document.body.innerHTML = "";
}

describe("FinCENViz.drawNodeShape — pure per-shape path emitter", () => {
  it("is exposed on FinCENViz", () => {
    expect(typeof window.FinCENViz.drawNodeShape).toBe("function");
  });

  it("diamond emits exactly 4 lineTos (4 vertices total with 1 moveTo)", () => {
    const { ctx, calls } = spyContext();
    window.FinCENViz.drawNodeShape(ctx, "diamond", 50, 50, 8);
    expect(countBy(calls, "moveTo")).toBe(1);
    expect(countBy(calls, "lineTo")).toBe(4);
  });

  it("square emits a single rect() call", () => {
    const { ctx, calls } = spyContext();
    window.FinCENViz.drawNodeShape(ctx, "square", 50, 50, 8);
    expect(countBy(calls, "rect")).toBe(1);
  });

  it("hex emits 6 lineTos", () => {
    const { ctx, calls } = spyContext();
    window.FinCENViz.drawNodeShape(ctx, "hex", 50, 50, 8);
    expect(countBy(calls, "moveTo")).toBe(1);
    expect(countBy(calls, "lineTo")).toBe(6);
  });

  it("triangle emits 3 lineTos", () => {
    const { ctx, calls } = spyContext();
    window.FinCENViz.drawNodeShape(ctx, "triangle", 50, 50, 8);
    expect(countBy(calls, "moveTo")).toBe(1);
    expect(countBy(calls, "lineTo")).toBe(3);
  });

  it("circle (default) emits exactly one arc call", () => {
    const { ctx, calls } = spyContext();
    window.FinCENViz.drawNodeShape(ctx, "circle", 50, 50, 8);
    expect(countBy(calls, "arc")).toBe(1);
    window.FinCENViz.drawNodeShape(ctx, "unknown-shape", 50, 50, 8);
    expect(countBy(calls, "arc")).toBe(2);
  });
});

describe("drawGraph uses shape dispatch and does not throw for any known kind", () => {
  beforeEach(() => {
    resetAll();
  });

  it("renders a heterogeneous graph without throwing", () => {
    const canvas = makeCanvas();
    const graph = {
      nodes: [
        { id: "S", group: "shell_company" },
        { id: "B", group: "bank" },
        { id: "I", group: "individual" },
        { id: "C", group: "crypto_service" },
        { id: "W", group: "disposable_wallet" },
        { id: "X", group: "company" }
      ],
      edges: [
        { from: "S", to: "B", weight: 1 },
        { from: "I", to: "C", weight: 1 },
        { from: "C", to: "W", weight: 1 }
      ]
    };
    expect(() => window.FinCENViz.drawGraph(canvas, graph, {})).not.toThrow();
    const layout = window.FinCENViz.__test.getLayout();
    ["S", "B", "I", "C", "W", "X"].forEach((id) => {
      expect(layout[id]).toBeDefined();
    });
  });

  it("honours the pattern overlay: drawing a graph with a shell chain in the overlay sets chain-member state detectable via __test.isChainMember", () => {
    const canvas = makeCanvas();
    const graph = {
      nodes: [{ id: "S1", group: "shell_company" }, { id: "S2", group: "shell_company" }, { id: "S3", group: "shell_company" }],
      edges: [{ from: "S1", to: "S2", weight: 1 }, { from: "S2", to: "S3", weight: 1 }]
    };
    window.FinCENViz.setPatternOverlay({
      shellChains: [["S1", "S2", "S3"]],
      mixers: [],
      disposableClusters: [],
      sanctionedIds: []
    });
    window.FinCENViz.drawGraph(canvas, graph, {});
    expect(typeof window.FinCENViz.__test.isChainMember).toBe("function");
    expect(window.FinCENViz.__test.isChainMember("S1")).toBe(true);
    expect(window.FinCENViz.__test.isChainMember("S2")).toBe(true);
    expect(window.FinCENViz.__test.isChainMember("S3")).toBe(true);
    expect(window.FinCENViz.__test.isChainMember("UNKNOWN")).toBe(false);
  });
});
