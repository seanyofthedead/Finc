// Dev-only smoke check: boots the app in headless Chromium, walks every tab,
// fails on console errors or on raw statistical terminology in the rendered
// default view (MP-03 acceptance), and saves screenshots for visual review.
// Usage: node scripts/smoke-screenshot.mjs [outDir]   (server must be on :4173)
import { chromium } from "@playwright/test";
import fs from "node:fs";

const outDir = process.argv[2] || "test-results/smoke";
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push("console.error: " + m.text());
});

await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
await page.waitForTimeout(800);

const tabs = await page.$$eval(".tab-btn", (btns) => btns.map((b) => b.dataset.screen));
console.log("tabs:", tabs.join(", "));

// MP-03: no raw statistical terms or formulas in the rendered default view.
const BANNED_STATS = /σ|std\s*dev|standard deviation|\bmean\b|\bMAD\b|×\s*\d|z-score/i;

for (const screen of tabs) {
  await page.click(`.tab-btn[data-screen="${screen}"]`);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${outDir}/${screen}.png`, fullPage: true });
  const text = await page.evaluate((id) => document.getElementById(id).innerText, screen);
  const hit = text.match(BANNED_STATS);
  if (hit) errors.push(`banned statistical term "${hit[0]}" rendered on ${screen}`);
}

if (errors.length) {
  console.error("FAIL — console/page errors:\n" + errors.join("\n"));
  await browser.close();
  process.exit(1);
}
console.log("smoke OK — screenshots in " + outDir);
await browser.close();
