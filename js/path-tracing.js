/* Pure undirected BFS shortest path. Returns ordered node ids including
 * endpoints; [] when disconnected or unknown; single-id when from === to. */
(function () {
  "use strict";

  function shortestPath(graph, from, to) {
    const nodeIds = new Set(graph.nodes.map((n) => n.id));
    if (!nodeIds.has(from) || !nodeIds.has(to)) return [];
    if (from === to) return [from];
    const adj = {};
    graph.nodes.forEach((n) => { adj[n.id] = []; });
    graph.edges.forEach((e) => {
      if (adj[e.from]) adj[e.from].push(e.to);
      if (adj[e.to]) adj[e.to].push(e.from);
    });
    const visited = new Set([from]);
    const parent = { [from]: null };
    const queue = [from];
    while (queue.length) {
      const cur = queue.shift();
      if (cur === to) break;
      const nexts = adj[cur] || [];
      for (let i = 0; i < nexts.length; i += 1) {
        const nxt = nexts[i];
        if (!visited.has(nxt)) {
          visited.add(nxt);
          parent[nxt] = cur;
          queue.push(nxt);
        }
      }
    }
    if (!visited.has(to)) return [];
    const path = [];
    let cursor = to;
    while (cursor != null) {
      path.push(cursor);
      cursor = parent[cursor];
    }
    path.reverse();
    return path;
  }

  window.FinCENPathTracing = { shortestPath };
})();
