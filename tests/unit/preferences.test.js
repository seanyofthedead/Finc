import { beforeEach, describe, it, expect } from "vitest";

function reset() {
  if (window.localStorage && window.localStorage.clear) window.localStorage.clear();
  document.body.className = "";
  if (window.FinCENPrefs && window.FinCENPrefs.__resetForTest) {
    window.FinCENPrefs.__resetForTest();
  }
}

describe("FinCENPrefs", () => {
  beforeEach(reset);

  it("exposes get, set, subscribe, apply, defaults", () => {
    ["get", "set", "subscribe", "apply", "defaults"].forEach((k) => {
      expect(typeof window.FinCENPrefs[k], `missing ${k}`).toBe("function");
    });
  });

  it("defaults() returns the known keys with sensible defaults", () => {
    const d = window.FinCENPrefs.defaults();
    expect(d).toHaveProperty("reduceMotion");
    expect(d).toHaveProperty("readingComfort");
    expect(d).toHaveProperty("hideClassification");
    expect(d).toHaveProperty("compactDensity");
    expect(d.reduceMotion).toBe(false);
  });

  it("get returns the default value when nothing is set", () => {
    expect(window.FinCENPrefs.get("reduceMotion")).toBe(false);
  });

  it("set persists to localStorage and get reflects it", () => {
    window.FinCENPrefs.set("reduceMotion", true);
    expect(window.FinCENPrefs.get("reduceMotion")).toBe(true);
    expect(window.localStorage.getItem("fincen:prefs")).toContain("reduceMotion");
  });

  it("subscribe is called when a value changes", () => {
    let called = 0;
    let last = null;
    const un = window.FinCENPrefs.subscribe((key, value) => { called += 1; last = { key, value }; });
    window.FinCENPrefs.set("compactDensity", true);
    expect(called).toBe(1);
    expect(last).toEqual({ key: "compactDensity", value: true });
    un();
    window.FinCENPrefs.set("compactDensity", false);
    expect(called).toBe(1); // unsubscribed
  });

  it("apply() writes known preferences as classes on document.body", () => {
    window.FinCENPrefs.set("reduceMotion", true);
    window.FinCENPrefs.set("compactDensity", true);
    window.FinCENPrefs.apply();
    expect(document.body.classList.contains("prefs-reduce-motion")).toBe(true);
    expect(document.body.classList.contains("prefs-compact-density")).toBe(true);
  });

  it("apply() removes classes when a pref is false", () => {
    window.FinCENPrefs.set("hideClassification", true);
    window.FinCENPrefs.apply();
    expect(document.body.classList.contains("prefs-hide-classification")).toBe(true);
    window.FinCENPrefs.set("hideClassification", false);
    window.FinCENPrefs.apply();
    expect(document.body.classList.contains("prefs-hide-classification")).toBe(false);
  });

  it("loads previously stored preferences on module import (new session persistence)", () => {
    window.localStorage.setItem("fincen:prefs", JSON.stringify({ reduceMotion: true }));
    window.FinCENPrefs.__resetForTest();
    expect(window.FinCENPrefs.get("reduceMotion")).toBe(true);
  });
});
