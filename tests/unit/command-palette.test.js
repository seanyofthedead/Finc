import { beforeEach, describe, it, expect } from "vitest";

function reset() {
  document.body.innerHTML = "";
  if (window.FinCENCommand && window.FinCENCommand.__resetForTest) {
    window.FinCENCommand.__resetForTest();
  }
}

describe("FinCENCommand (command palette)", () => {
  beforeEach(reset);

  it("exposes fuzzyScore, registerCommand, unregisterCommand, listCommands, findMatches, execute, open, close, isOpen", () => {
    const c = window.FinCENCommand;
    expect(c).toBeDefined();
    ["fuzzyScore", "registerCommand", "unregisterCommand", "listCommands",
     "findMatches", "execute", "open", "close", "isOpen"].forEach((k) => {
       expect(typeof c[k], `missing ${k}`).toBe("function");
     });
  });

  describe("fuzzyScore", () => {
    it("returns 0 when query characters are not all present in order", () => {
      expect(window.FinCENCommand.fuzzyScore("xyz", "pipeline")).toBe(0);
      expect(window.FinCENCommand.fuzzyScore("pe", "pipeline")).toBeGreaterThan(0);
      expect(window.FinCENCommand.fuzzyScore("ep", "pipeline")).toBe(0); // wrong order
    });

    it("is case-insensitive", () => {
      expect(window.FinCENCommand.fuzzyScore("PIP", "pipeline")).toBeGreaterThan(0);
    });

    it("scores consecutive-match targets higher than scattered ones", () => {
      const consec = window.FinCENCommand.fuzzyScore("pipe", "pipeline");
      const scattered = window.FinCENCommand.fuzzyScore("pipe", "peripheral insight");
      expect(consec).toBeGreaterThan(scattered);
    });

    it("scores prefix matches higher than mid-string matches", () => {
      const prefix = window.FinCENCommand.fuzzyScore("pip", "pipeline view");
      const mid = window.FinCENCommand.fuzzyScore("pip", "graph pipeline");
      expect(prefix).toBeGreaterThan(mid);
    });

    it("exact empty query returns a score > 0 (matches everything)", () => {
      expect(window.FinCENCommand.fuzzyScore("", "anything")).toBeGreaterThan(0);
    });
  });

  describe("registry", () => {
    it("registerCommand stores a command that listCommands returns", () => {
      window.FinCENCommand.registerCommand({ id: "t.test", title: "Test command", action: () => {} });
      expect(window.FinCENCommand.listCommands().map((c) => c.id)).toContain("t.test");
    });

    it("registerCommand with duplicate id replaces the previous registration", () => {
      let firstCalled = false, secondCalled = false;
      window.FinCENCommand.registerCommand({ id: "dup", title: "First",  action: () => { firstCalled = true; } });
      window.FinCENCommand.registerCommand({ id: "dup", title: "Second", action: () => { secondCalled = true; } });
      window.FinCENCommand.execute("dup");
      expect(firstCalled).toBe(false);
      expect(secondCalled).toBe(true);
    });

    it("unregisterCommand removes a command", () => {
      window.FinCENCommand.registerCommand({ id: "gone", title: "Go", action: () => {} });
      window.FinCENCommand.unregisterCommand("gone");
      expect(window.FinCENCommand.listCommands().map((c) => c.id)).not.toContain("gone");
    });

    it("execute throws no error for unknown id (no-op)", () => {
      expect(() => window.FinCENCommand.execute("nope")).not.toThrow();
    });
  });

  describe("findMatches", () => {
    beforeEach(() => {
      [
        { id: "nav.pipeline",  title: "Go to Pipeline",  keywords: "pipeline data ingestion" },
        { id: "nav.analytics", title: "Go to Analytics", keywords: "graph network detection" },
        { id: "filter.cryp",   title: "Filter by Crypto Layering", keywords: "typology mixing" }
      ].forEach((c) => window.FinCENCommand.registerCommand({ ...c, action: () => {} }));
    });

    it("returns all commands when query is empty", () => {
      const matches = window.FinCENCommand.findMatches("");
      expect(matches.length).toBeGreaterThanOrEqual(3);
    });

    it("returns only matching commands when query is set", () => {
      const matches = window.FinCENCommand.findMatches("pipe");
      expect(matches[0].id).toBe("nav.pipeline");
    });

    it("matches on keywords too, not only title", () => {
      const matches = window.FinCENCommand.findMatches("mixing");
      expect(matches.map((m) => m.id)).toContain("filter.cryp");
    });

    it("returns results sorted by descending score", () => {
      const matches = window.FinCENCommand.findMatches("a");
      for (let i = 1; i < matches.length; i += 1) {
        expect(matches[i - 1].__score).toBeGreaterThanOrEqual(matches[i].__score);
      }
    });
  });

  describe("lifecycle", () => {
    it("open() + close() toggle isOpen()", () => {
      expect(window.FinCENCommand.isOpen()).toBe(false);
      window.FinCENCommand.open();
      expect(window.FinCENCommand.isOpen()).toBe(true);
      window.FinCENCommand.close();
      expect(window.FinCENCommand.isOpen()).toBe(false);
    });

    it("open() mounts a palette element with input and list", () => {
      window.FinCENCommand.open();
      expect(document.querySelector('[data-role="cmdk-root"]')).not.toBeNull();
      expect(document.querySelector('[data-role="cmdk-input"]')).not.toBeNull();
      expect(document.querySelector('[data-role="cmdk-list"]')).not.toBeNull();
    });

    it("typing into the input filters the visible list", () => {
      window.FinCENCommand.registerCommand({ id: "q.alpha", title: "Alpha command", action: () => {} });
      window.FinCENCommand.registerCommand({ id: "q.beta",  title: "Beta lovely",   action: () => {} });
      window.FinCENCommand.open();
      const input = document.querySelector('[data-role="cmdk-input"]');
      input.value = "alpha";
      input.dispatchEvent(new window.Event("input", { bubbles: true }));
      const items = document.querySelectorAll('[data-role="cmdk-item"]');
      const titles = Array.from(items).map((el) => el.textContent);
      expect(titles.join(" ")).toContain("Alpha command");
      expect(titles.join(" ")).not.toContain("Beta lovely");
    });

    it("execute(id) invokes the registered action and passes the id", () => {
      let calledWith = null;
      window.FinCENCommand.registerCommand({ id: "exec.target", title: "X", action: (id) => { calledWith = id; } });
      window.FinCENCommand.execute("exec.target");
      expect(calledWith).toBe("exec.target");
    });
  });
});
