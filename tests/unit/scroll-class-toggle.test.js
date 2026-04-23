import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function setScrollY(y) {
  Object.defineProperty(window, "scrollY", { value: y, configurable: true, writable: true });
  Object.defineProperty(window, "pageYOffset", { value: y, configurable: true, writable: true });
}

describe("FinCENScrollClassToggle.bind — hysteresis contract", () => {
  let disposes = [];

  beforeEach(() => {
    setScrollY(0);
    disposes = [];
  });

  afterEach(() => {
    disposes.forEach((d) => { try { d(); } catch (e) {} });
  });

  it("exposes window.FinCENScrollClassToggle.bind as a function", () => {
    expect(window.FinCENScrollClassToggle).toBeDefined();
    expect(typeof window.FinCENScrollClassToggle.bind).toBe("function");
  });

  it("invokes toggle(false) once synchronously on bind (initial sync)", () => {
    const toggle = vi.fn();
    const { dispose } = window.FinCENScrollClassToggle.bind({ enterAt: 44, exitAt: 20, toggle });
    disposes.push(dispose);
    expect(toggle).toHaveBeenCalledTimes(1);
    expect(toggle).toHaveBeenLastCalledWith(false);
  });

  it("dispatching scroll above enterAt invokes toggle(true) exactly once", () => {
    const toggle = vi.fn();
    const { dispose } = window.FinCENScrollClassToggle.bind({ enterAt: 44, exitAt: 20, toggle });
    disposes.push(dispose);
    toggle.mockClear();

    setScrollY(50);
    window.dispatchEvent(new Event("scroll"));

    expect(toggle).toHaveBeenCalledTimes(1);
    expect(toggle).toHaveBeenLastCalledWith(true);
  });

  it("dispatching scroll inside the dead zone does NOT re-invoke toggle", () => {
    const toggle = vi.fn();
    const { dispose } = window.FinCENScrollClassToggle.bind({ enterAt: 44, exitAt: 20, toggle });
    disposes.push(dispose);

    setScrollY(50);
    window.dispatchEvent(new Event("scroll")); // enter
    toggle.mockClear();

    setScrollY(30); // between 20 and 44 — dead zone
    window.dispatchEvent(new Event("scroll"));
    setScrollY(25);
    window.dispatchEvent(new Event("scroll"));
    setScrollY(35);
    window.dispatchEvent(new Event("scroll"));

    expect(toggle).not.toHaveBeenCalled();
  });

  it("dispatching scroll below exitAt invokes toggle(false) exactly once", () => {
    const toggle = vi.fn();
    const { dispose } = window.FinCENScrollClassToggle.bind({ enterAt: 44, exitAt: 20, toggle });
    disposes.push(dispose);

    setScrollY(50);
    window.dispatchEvent(new Event("scroll")); // enter
    toggle.mockClear();

    setScrollY(10);
    window.dispatchEvent(new Event("scroll"));

    expect(toggle).toHaveBeenCalledTimes(1);
    expect(toggle).toHaveBeenLastCalledWith(false);
  });

  it("a full up-and-back cycle produces exactly 3 toggle invocations (initial false, enter true, exit false)", () => {
    const toggle = vi.fn();
    const { dispose } = window.FinCENScrollClassToggle.bind({ enterAt: 44, exitAt: 20, toggle });
    disposes.push(dispose);

    setScrollY(50);
    window.dispatchEvent(new Event("scroll"));
    setScrollY(10);
    window.dispatchEvent(new Event("scroll"));

    expect(toggle).toHaveBeenCalledTimes(3);
    expect(toggle.mock.calls.map((c) => c[0])).toEqual([false, true, false]);
  });

  it("dispose() removes the scroll listener so subsequent scrolls do not call toggle", () => {
    const toggle = vi.fn();
    const { dispose } = window.FinCENScrollClassToggle.bind({ enterAt: 44, exitAt: 20, toggle });
    toggle.mockClear();

    dispose();

    setScrollY(100);
    window.dispatchEvent(new Event("scroll"));
    setScrollY(0);
    window.dispatchEvent(new Event("scroll"));

    expect(toggle).not.toHaveBeenCalled();
  });
});
