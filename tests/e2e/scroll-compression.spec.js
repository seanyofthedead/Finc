import { test, expect } from "@playwright/test";

/*
 * Layout-invariance guard for the scroll-compression UI.
 *
 * These tests verify that the topbar compression is a purely *visual* change
 * — the outer box height must stay constant, the document height must not
 * change, and browser scroll-anchoring must not need to intervene. Together
 * those invariants prevent the class-oscillation bug from regressing.
 *
 * Written against a real Chromium via Playwright because jsdom (our vitest
 * environment) does not implement CSS layout — only the real browser can
 * observe topbar.getBoundingClientRect().height changing or not.
 */

async function topbarHeight(page) {
  return page.evaluate(() => document.querySelector(".topbar").getBoundingClientRect().height);
}

async function docScrollHeight(page) {
  return page.evaluate(() => document.documentElement.scrollHeight);
}

test.describe("topbar scroll compression", () => {
  test("topbar outer-box height is stable across compression", async ({ page }) => {
    await page.goto("/");
    // Wait for the app to hydrate and bindScrollCompression to register.
    await page.waitForFunction(() => document.body.classList.contains("hydrated"));
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(200);

    const heightBefore = await topbarHeight(page);
    const docHBefore = await docScrollHeight(page);

    await page.evaluate(() => window.scrollTo(0, 100));
    // Give CSS transition (--dur-base = 260ms) plenty of time to settle.
    await page.waitForTimeout(500);

    // Compression fired.
    await expect.poll(() => page.evaluate(() => document.body.classList.contains("is-scrolled"))).toBe(true);

    const heightAfter = await topbarHeight(page);
    const docHAfter = await docScrollHeight(page);
    const finalScrollY = await page.evaluate(() => window.scrollY);

    // Outer box height must not change — this is the core invariant.
    expect(Math.abs(heightAfter - heightBefore)).toBeLessThan(0.5);
    // Document height unchanged → nothing above scroll shrank → no anchor shift.
    expect(docHAfter).toBe(docHBefore);
    // ScrollY stays where the user put it; no anchor displacement.
    expect(Math.abs(finalScrollY - 100)).toBeLessThan(1);
  });

  test("overflow-anchor is restored to auto on body", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => document.body.classList.contains("hydrated"));
    const anchor = await page.evaluate(() => getComputedStyle(document.body).overflowAnchor);
    expect(anchor).toBe("auto");
  });

  test("no oscillation under rapid scroll across the threshold", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => document.body.classList.contains("hydrated"));

    // Install a MutationObserver that records every class-attribute change on
    // body and topbar. The expected count is EXACTLY 2 per threshold crossing
    // (one body, one topbar). Anything more indicates oscillation.
    await page.evaluate(() => {
      window.__toggleLog = [];
      const record = (el, label) =>
        new MutationObserver((muts) => {
          for (const m of muts) {
            if (m.attributeName === "class") {
              window.__toggleLog.push({
                el: label,
                y: Math.round(window.scrollY),
                cls: el.className
              });
            }
          }
        }).observe(el, { attributes: true, attributeFilter: ["class"] });
      record(document.body, "body");
      record(document.querySelector(".topbar"), "topbar");
    });

    // Start at 0 (no compression).
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    // Clear any startup toggles.
    await page.evaluate(() => { window.__toggleLog = []; });

    // Four deliberate threshold crossings: 0→100 (enter), 100→10 (exit),
    // 10→100 (enter), 100→0 (exit). Each crossing should produce EXACTLY 2
    // class mutations (body + topbar).
    const sequence = [100, 10, 100, 0];
    for (const y of sequence) {
      await page.evaluate((target) => window.scrollTo(0, target), y);
      await page.waitForTimeout(400);
    }

    const log = await page.evaluate(() => window.__toggleLog);

    // Exactly 4 crossings × 2 elements = 8 toggles. Anything more = regression.
    expect(log.length).toBe(8);

    // The body sequence must alternate on/off cleanly.
    const bodyCls = log.filter((e) => e.el === "body").map((e) => e.cls);
    expect(bodyCls.length).toBe(4);
    expect(bodyCls[0]).toContain("is-scrolled");
    expect(bodyCls[1]).not.toContain("is-scrolled");
    expect(bodyCls[2]).toContain("is-scrolled");
    expect(bodyCls[3]).not.toContain("is-scrolled");
  });
});
