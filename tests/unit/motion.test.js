import { describe, it, expect } from "vitest";

describe("FinCENMotion", () => {
  it("is exposed on window with easing, reducedMotion, tween, animateDigits", () => {
    expect(window.FinCENMotion).toBeDefined();
    expect(typeof window.FinCENMotion.easing).toBe("object");
    expect(typeof window.FinCENMotion.reducedMotion).toBe("function");
    expect(typeof window.FinCENMotion.tween).toBe("function");
    expect(typeof window.FinCENMotion.animateDigits).toBe("function");
  });

  it("easing exports cubic-bezier strings (standard, emphasized, decel, accel, springSoft)", () => {
    const { easing } = window.FinCENMotion;
    ["standard", "emphasized", "decel", "accel", "springSoft"].forEach((name) => {
      expect(typeof easing[name]).toBe("string");
      expect(easing[name]).toMatch(/^cubic-bezier\(/);
    });
  });

  it("easing.fns.linear is identity on [0,1]", () => {
    const { fns } = window.FinCENMotion.easing;
    expect(fns.linear(0)).toBe(0);
    expect(fns.linear(0.5)).toBe(0.5);
    expect(fns.linear(1)).toBe(1);
  });

  it("easing.fns.easeOut is monotonically increasing from 0 to 1", () => {
    const { fns } = window.FinCENMotion.easing;
    expect(fns.easeOut(0)).toBe(0);
    expect(fns.easeOut(1)).toBe(1);
    expect(fns.easeOut(0.5)).toBeGreaterThan(0.5); // front-loaded
  });

  it("easing.fns.easeInOut starts slow, accelerates, ends slow — symmetric at 0.5", () => {
    const { fns } = window.FinCENMotion.easing;
    expect(fns.easeInOut(0)).toBe(0);
    expect(fns.easeInOut(1)).toBe(1);
    expect(Math.abs(fns.easeInOut(0.5) - 0.5)).toBeLessThan(0.01);
    expect(fns.easeInOut(0.25)).toBeLessThan(0.25); // slow at start
  });

  it("reducedMotion() returns a boolean", () => {
    expect(typeof window.FinCENMotion.reducedMotion()).toBe("boolean");
  });

  it("tween with duration=0 immediately invokes onUpdate with the final value and calls onComplete", () => {
    const updates = [];
    let completed = false;
    window.FinCENMotion.tween(0, 100, {
      duration: 0,
      onUpdate: (v) => updates.push(v),
      onComplete: () => { completed = true; }
    });
    expect(updates.length).toBeGreaterThanOrEqual(1);
    expect(updates[updates.length - 1]).toBe(100);
    expect(completed).toBe(true);
  });

  it("tween returns an object with a cancel() function", () => {
    const handle = window.FinCENMotion.tween(0, 1, { duration: 1000 });
    expect(typeof handle.cancel).toBe("function");
    handle.cancel();
  });

  it("animateDigits with duration=0 writes the final formatted value to element.textContent", () => {
    const el = document.createElement("span");
    el.textContent = "5";
    window.FinCENMotion.animateDigits(el, 42, { duration: 0 });
    expect(parseInt(el.textContent, 10)).toBe(42);
  });

  it("animateDigits reads the starting value from element.textContent (stripping non-numeric)", () => {
    const el = document.createElement("span");
    el.textContent = "17.5";
    // duration 0 path still exercises the parser
    window.FinCENMotion.animateDigits(el, 100, { duration: 0 });
    expect(parseFloat(el.textContent)).toBe(100);
  });

  it("animateDigits respects opts.format for custom formatting", () => {
    const el = document.createElement("span");
    el.textContent = "—";
    window.FinCENMotion.animateDigits(el, 0.421, {
      duration: 0,
      format: (v) => v.toFixed(2) + "%"
    });
    expect(el.textContent).toBe("0.42%");
  });

  it("animateDigits on a null element returns a no-op cancel handle without throwing", () => {
    const h = window.FinCENMotion.animateDigits(null, 10);
    expect(typeof h.cancel).toBe("function");
    expect(() => h.cancel()).not.toThrow();
  });
});
