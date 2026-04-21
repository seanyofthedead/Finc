import { beforeEach, describe, it, expect } from "vitest";

function resetBody() {
  document.body.innerHTML = "";
}

describe("FinCENEntityPanel", () => {
  beforeEach(resetBody);

  it("is exposed on window with mount/show/hide/isVisible", () => {
    expect(window.FinCENEntityPanel).toBeDefined();
    expect(typeof window.FinCENEntityPanel.mount).toBe("function");
    expect(typeof window.FinCENEntityPanel.show).toBe("function");
    expect(typeof window.FinCENEntityPanel.hide).toBe("function");
    expect(typeof window.FinCENEntityPanel.isVisible).toBe("function");
  });

  it("mount() inserts a hidden panel element into the given container", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    window.FinCENEntityPanel.mount(host);
    const panel = host.querySelector('[data-role="entity-panel"]');
    expect(panel).not.toBeNull();
    expect(window.FinCENEntityPanel.isVisible()).toBe(false);
  });

  it("show(entity, opts) reveals the panel and renders name, kind, jurisdiction, risk", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    window.FinCENEntityPanel.mount(host);

    const entity = {
      id: "E02",
      name: "Nera Holdings Ltd",
      kind: "shell_company",
      jurisdiction: "Cayman Islands"
    };
    const caseData = { riskScore: 92, typology: "Structuring", whyFlagged: "Seven sub-threshold deposits..." };
    window.FinCENEntityPanel.show(entity, { case: caseData });

    expect(window.FinCENEntityPanel.isVisible()).toBe(true);
    const panel = host.querySelector('[data-role="entity-panel"]');
    expect(panel.textContent).toContain("Nera Holdings Ltd");
    expect(panel.textContent).toContain("shell_company");
    expect(panel.textContent).toContain("Cayman Islands");
    expect(panel.textContent).toContain("92");
  });

  it("clicking 'Open in Workspace' invokes opts.onOpenWorkspace with the entity id", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    window.FinCENEntityPanel.mount(host);
    const entity = { id: "E18", name: "Veridian Capital SA", kind: "shell_company", jurisdiction: "Panama" };
    let calledWith = null;
    window.FinCENEntityPanel.show(entity, {
      onOpenWorkspace: (id) => { calledWith = id; }
    });
    const btn = host.querySelector('[data-action="open-workspace"]');
    expect(btn).not.toBeNull();
    btn.click();
    expect(calledWith).toBe("E18");
  });

  it("hide() hides the panel", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    window.FinCENEntityPanel.mount(host);
    window.FinCENEntityPanel.show({ id: "X", name: "X", kind: "company", jurisdiction: "US" }, {});
    expect(window.FinCENEntityPanel.isVisible()).toBe(true);
    window.FinCENEntityPanel.hide();
    expect(window.FinCENEntityPanel.isVisible()).toBe(false);
  });

  it("pressing Escape on window while visible hides the panel", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    window.FinCENEntityPanel.mount(host);
    window.FinCENEntityPanel.show({ id: "X", name: "X", kind: "company", jurisdiction: "US" }, {});
    expect(window.FinCENEntityPanel.isVisible()).toBe(true);
    const evt = new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true });
    window.dispatchEvent(evt);
    expect(window.FinCENEntityPanel.isVisible()).toBe(false);
  });

  it("renders sanctioned indicator when opts.sanctioned is true", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    window.FinCENEntityPanel.mount(host);
    window.FinCENEntityPanel.show(
      { id: "E18", name: "Veridian Capital SA", kind: "shell_company", jurisdiction: "Panama" },
      { sanctioned: true }
    );
    const badge = host.querySelector('[data-role="sanctioned-badge"]');
    expect(badge).not.toBeNull();
  });

  it("renders recent transactions list when opts.recentTransactions is provided", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    window.FinCENEntityPanel.mount(host);
    window.FinCENEntityPanel.show(
      { id: "E02", name: "Nera", kind: "shell_company", jurisdiction: "Cayman Islands" },
      { recentTransactions: [{ id: "TX001", amountUsd: 9800, channel: "ach" }, { id: "TX002", amountUsd: 12000, channel: "wire" }] }
    );
    const txList = host.querySelector('[data-role="tx-list"]');
    expect(txList).not.toBeNull();
    expect(txList.textContent).toContain("TX001");
    expect(txList.textContent).toContain("TX002");
  });
});
