// MP-05 demo dry run: walks the exact Friday demo path in headless Chromium
// and fails on any console error, page error, or missing demo beat.
// Path: dashboard -> lineage -> case selection -> findings -> proposed next
// steps -> examiner disposition (incl. confirm + audit trail entry).
// Usage: node scripts/demo-dry-run.mjs   (server must be on :4173)
import { chromium } from "@playwright/test";

const failures = [];
const check = (ok, label) => {
  console.log((ok ? "  ok  " : "  FAIL") + " - " + label);
  if (!ok) failures.push(label);
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on("pageerror", (e) => failures.push("pageerror: " + e.message));
page.on("console", (m) => {
  if (m.type() === "error") failures.push("console.error: " + m.text());
});

await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
await page.waitForTimeout(900);

// Beat 1 — dashboard / data pipeline with lineage visible at 1080p.
console.log("Beat 1: dashboard + lineage");
check(await page.isVisible("#screen-pipeline.active"), "pipeline screen is the landing view");
check(await page.isVisible("#lineage-panel"), "lineage panel rendered");
const lineageBottom = await page.evaluate(() =>
  Math.round(document.querySelector("#lineage-panel").getBoundingClientRect().bottom));
check(lineageBottom <= 1080, `lineage visible without scrolling (bottom ${lineageBottom}px)`);

// Beat 2 — case selection in the Examiner Workspace.
console.log("Beat 2: case selection");
await page.click('.tab-btn[data-screen="screen-workspace"]');
await page.waitForTimeout(500);
const caseCount = await page.$$eval("#workspace-case-select option", (o) => o.length);
check(caseCount > 0, `case selector populated (${caseCount} exceptions)`);
await page.selectOption("#workspace-case-select", { index: 1 });
await page.waitForTimeout(400);

// Beat 3 — findings: disclaimer + three qualitative indicators, no raw stats.
console.log("Beat 3: findings");
const disclaimer = await page.textContent("#indicators-disclaimer");
check(/determinations are made by the examiner/i.test(disclaimer || ""), "HITL disclaimer visible");
const indicatorCells = await page.$$eval("#case-indicators .evidence", (els) => els.length);
check(indicatorCells === 3, `three case indicators rendered (${indicatorCells})`);
const findingsText = await page.textContent("#ws-findings");
check(!/σ|std\s*dev|standard deviation|\bmean\b|\bMAD\b/i.test(findingsText || ""), "no raw statistics in findings");

// Beat 4 — proposed next steps: 1-3 suggestions + caption.
console.log("Beat 4: proposed next steps");
const steps = await page.$$eval("#proposed-next-steps li", (els) => els.length);
check(steps >= 1 && steps <= 3, `proposed next steps within 1-3 (${steps})`);
const caption = await page.textContent("#next-steps-caption");
check(/examiner determines/i.test(caption || ""), "suggestions-only caption visible");

// Beat 5 — examiner disposition: confirm flow writes an audit entry.
console.log("Beat 5: examiner decision");
const auditBefore = await page.$$eval("#audit-log .audit-item", (els) => els.length);
await page.click('[data-action="escalate_intelligence"]');
check(await page.isVisible("#workspace-confirm-bar.active"), "confirmation bar appears");
await page.click("#confirm-yes-btn");
await page.waitForTimeout(400);
const auditAfter = await page.$$eval("#audit-log .audit-item", (els) => els.length);
check(auditAfter === auditBefore + 1, `disposition recorded in audit trail (${auditBefore} -> ${auditAfter})`);

await browser.close();
if (failures.length) {
  console.error("\nDRY RUN FAILED:\n" + failures.join("\n"));
  process.exit(1);
}
console.log("\nDRY RUN CLEAN — all demo beats verified.");
