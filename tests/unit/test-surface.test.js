import { describe, it, expect } from "vitest";

describe("FinCENViz.__test surface (behavior contract for e2e + unit tests)", () => {
  it("exposes a __test namespace when window.__FINCEN_TEST__ is truthy", () => {
    expect(window.FinCENViz).toBeDefined();
    expect(window.FinCENViz.__test).toBeDefined();
    expect(typeof window.FinCENViz.__test).toBe("object");
  });

  it("exposes getCamera() returning {x, y, zoom} with sensible defaults", () => {
    const cam = window.FinCENViz.__test.getCamera();
    expect(cam).toEqual({ x: 0, y: 0, zoom: 1 });
  });

  it("exposes getLayout() returning an object keyed by node id (empty before first draw)", () => {
    const layout = window.FinCENViz.__test.getLayout();
    expect(layout).toEqual({});
  });

  it("exposes getHighlightState() returning null when nothing is selected", () => {
    const hl = window.FinCENViz.__test.getHighlightState();
    expect(hl).toBeNull();
  });

  it("exposes getNodeAt(x, y) returning null when no graph has been drawn", () => {
    expect(window.FinCENViz.__test.getNodeAt(0, 0)).toBeNull();
    expect(window.FinCENViz.__test.getNodeAt(100, 100)).toBeNull();
  });
});
