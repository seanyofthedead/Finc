/* Pure suspicion-pattern detectors. Operate on the shape of graph produced by
 * engine.getGraph() (nodes with `group` = entity kind, directed edges). */
(function () {
  "use strict";

  function buildAdjacency(graph) {
    const out = {};
    const inn = {};
    graph.nodes.forEach((n) => {
      out[n.id] = new Set();
      inn[n.id] = new Set();
    });
    graph.edges.forEach((e) => {
      if (out[e.from]) out[e.from].add(e.to);
      if (inn[e.to]) inn[e.to].add(e.from);
    });
    return { out, inn };
  }

  function detectShellChains(graph) {
    const shellIds = new Set(graph.nodes.filter((n) => n.group === "shell_company").map((n) => n.id));
    if (shellIds.size < 3) return [];
    const { out } = buildAdjacency(graph);
    const seen = new Set();
    const chains = [];

    function walk(startId) {
      const best = [];
      const stack = [{ id: startId, path: [startId] }];
      while (stack.length) {
        const node = stack.pop();
        if (node.path.length > best.length) {
          best.length = 0;
          node.path.forEach((p) => best.push(p));
        }
        (out[node.id] || new Set()).forEach((next) => {
          if (shellIds.has(next) && node.path.indexOf(next) < 0) {
            stack.push({ id: next, path: node.path.concat([next]) });
          }
        });
      }
      return best;
    }

    shellIds.forEach((id) => {
      if (seen.has(id)) return;
      const chain = walk(id);
      if (chain.length >= 3) {
        chains.push(chain);
        chain.forEach((p) => seen.add(p));
      }
    });
    return chains;
  }

  function detectMixers(graph) {
    const { out, inn } = buildAdjacency(graph);
    const mixers = [];
    graph.nodes.forEach((n) => {
      const fanIn = (inn[n.id] || new Set()).size;
      const fanOut = (out[n.id] || new Set()).size;
      if (fanIn >= 6 && fanOut >= 6) mixers.push(n.id);
    });
    return mixers;
  }

  function detectDisposableClusters(graph) {
    const disposable = new Set(graph.nodes.filter((n) => n.group === "disposable_wallet").map((n) => n.id));
    const funderMap = {};
    graph.edges.forEach((e) => {
      if (disposable.has(e.to)) {
        if (!funderMap[e.from]) funderMap[e.from] = new Set();
        funderMap[e.from].add(e.to);
      }
    });
    const clusters = [];
    Object.keys(funderMap).forEach((funderId) => {
      const walletIds = Array.from(funderMap[funderId]).sort();
      if (walletIds.length >= 4) {
        clusters.push({ funderId, walletIds });
      }
    });
    return clusters;
  }

  window.FinCENPatternDetection = {
    detectShellChains,
    detectMixers,
    detectDisposableClusters
  };
})();
