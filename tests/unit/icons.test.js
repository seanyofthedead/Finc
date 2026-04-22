import { beforeEach, describe, it, expect } from "vitest";

function resetBody() {
  document.body.innerHTML = "";
}

describe("FinCENIcons", () => {
  it("exposes render, has, list, hydrate on window", () => {
    expect(window.FinCENIcons).toBeDefined();
    expect(typeof window.FinCENIcons.render).toBe("function");
    expect(typeof window.FinCENIcons.has).toBe("function");
    expect(typeof window.FinCENIcons.list).toBe("function");
    expect(typeof window.FinCENIcons.hydrate).toBe("function");
  });

  it("list() returns an array including all tab + source icon names", () => {
    const names = window.FinCENIcons.list();
    expect(Array.isArray(names)).toBe(true);
    ["pipeline", "signals", "analytics", "triage", "workspace", "enterprise",
     "database", "globe", "shield", "bitcoin", "building", "flag", "search"]
      .forEach((n) => expect(names, `missing ${n}`).toContain(n));
  });

  it("has(name) returns true for registered icons, false otherwise", () => {
    expect(window.FinCENIcons.has("pipeline")).toBe(true);
    expect(window.FinCENIcons.has("zzz-missing")).toBe(false);
  });

  it("render(name) returns an svg string with viewBox and currentColor stroke", () => {
    const out = window.FinCENIcons.render("pipeline");
    expect(out).toContain("<svg");
    expect(out).toContain('viewBox="0 0 16 16"');
    expect(out).toContain('stroke="currentColor"');
    expect(out).toContain("</svg>");
  });

  it('render(name, { size: 24 }) produces width="24" height="24"', () => {
    const out = window.FinCENIcons.render("pipeline", { size: 24 });
    expect(out).toContain('width="24"');
    expect(out).toContain('height="24"');
  });

  it("render(unknown) returns an empty string", () => {
    expect(window.FinCENIcons.render("zzz-missing")).toBe("");
  });

  describe("hydrate", () => {
    beforeEach(resetBody);

    it("replaces the innerHTML of every [data-icon] element with its rendered SVG", () => {
      const host = document.createElement("div");
      host.innerHTML = '<span data-icon="pipeline"></span><span data-icon="globe"></span><span>untouched</span>';
      document.body.appendChild(host);
      window.FinCENIcons.hydrate(host);
      const spans = host.querySelectorAll("span");
      expect(spans[0].innerHTML).toContain("<svg");
      expect(spans[1].innerHTML).toContain("<svg");
      expect(spans[2].innerHTML).toBe("untouched");
    });

    it("respects data-icon-size on the host element", () => {
      const host = document.createElement("span");
      host.setAttribute("data-icon", "pipeline");
      host.setAttribute("data-icon-size", "20");
      document.body.appendChild(host);
      window.FinCENIcons.hydrate(document.body);
      expect(host.innerHTML).toContain('width="20"');
    });

    it("skips already-hydrated elements (idempotent)", () => {
      const host = document.createElement("span");
      host.setAttribute("data-icon", "pipeline");
      document.body.appendChild(host);
      window.FinCENIcons.hydrate(document.body);
      const first = host.innerHTML;
      window.FinCENIcons.hydrate(document.body);
      expect(host.innerHTML).toBe(first);
    });

    it("hydrate() with no argument scans document", () => {
      document.body.innerHTML = '<span data-icon="search"></span>';
      window.FinCENIcons.hydrate();
      expect(document.body.querySelector("span").innerHTML).toContain("<svg");
    });
  });
});
