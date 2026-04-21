import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

function loadScriptIntoWindow(relativePath) {
  const code = fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
  const runInWindow = new Function("window", "self", "globalThis", code);
  runInWindow(window, window, window);
}

function stubCanvas2DContext() {
  if (typeof window.HTMLCanvasElement === "undefined") return;
  window.HTMLCanvasElement.prototype.getContext = function () {
    return {
      canvas: this,
      setTransform() {}, clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {},
      stroke() {}, fill() {}, arc() {}, fillText() {}, save() {}, restore() {},
      translate() {}, rotate() {}, scale() {}, strokeRect() {}, setLineDash() {},
      rect() {}, closePath() {}, fillRect() {},
      measureText: () => ({ width: 0 }),
      fillStyle: "", strokeStyle: "", lineWidth: 1, font: "", textAlign: ""
    };
  };
}

function installFinCEN() {
  window.__FINCEN_TEST__ = true;
  stubCanvas2DContext();
  loadScriptIntoWindow("js/data.js");
  loadScriptIntoWindow("js/engine.js");
  loadScriptIntoWindow("js/visualizations.js");
  loadScriptIntoWindow("js/demo-fixtures.js");
  loadScriptIntoWindow("js/pattern-detection.js");
  loadScriptIntoWindow("js/path-tracing.js");
  loadScriptIntoWindow("js/entity-panel.js");
  loadScriptIntoWindow("js/legend.js");
  loadScriptIntoWindow("js/graph-interactions.js");
}

installFinCEN();

beforeEach(() => {
  if (!window.FinCENData || !window.FinCENEngine || !window.FinCENViz) {
    installFinCEN();
  }
});
