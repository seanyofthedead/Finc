(function () {
  "use strict";

  const EMPTY_OVERLAY = { shellChains: [], mixers: [], disposableClusters: [], sanctionedIds: [] };

  const vizState = {
    camera: { x: 0, y: 0, zoom: 1 },
    layout: {},
    pinned: {},
    highlight: null,
    overlay: { shellChains: [], mixers: [], disposableClusters: [], sanctionedIds: [] },
    path: null,
    lastGraph: null,
    lastCanvas: null,
    lastTopologyKey: null
  };

  function topologyKey(graph) {
    const nodeIds = graph.nodes.map((n) => n.id).sort().join("|");
    const edgeIds = graph.edges.map((e) => e.from + ">" + e.to).sort().join("|");
    return nodeIds + "::" + edgeIds;
  }

  const ZOOM_MIN = 0.2;
  const ZOOM_MAX = 4.0;
  const HIT_RADIUS = 12;

  function clampZoom(z) {
    return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));
  }

  function setCamera(x, y, zoom) {
    vizState.camera = {
      x: Number.isFinite(x) ? x : 0,
      y: Number.isFinite(y) ? y : 0,
      zoom: clampZoom(Number.isFinite(zoom) ? zoom : 1)
    };
  }

  function getCamera() {
    return { x: vizState.camera.x, y: vizState.camera.y, zoom: vizState.camera.zoom };
  }

  function worldToScreen(wx, wy) {
    const cam = vizState.camera;
    return { x: (wx - cam.x) * cam.zoom, y: (wy - cam.y) * cam.zoom };
  }

  function screenToWorld(sx, sy) {
    const cam = vizState.camera;
    return { x: sx / cam.zoom + cam.x, y: sy / cam.zoom + cam.y };
  }

  function hitTestNode(x, y) {
    const layout = vizState.layout;
    let best = null;
    let bestDistSq = HIT_RADIUS * HIT_RADIUS;
    Object.keys(layout).forEach((id) => {
      const p = layout[id];
      const screen = worldToScreen(p.x, p.y);
      const dx = screen.x - x;
      const dy = screen.y - y;
      const d = dx * dx + dy * dy;
      if (d < bestDistSq) {
        bestDistSq = d;
        best = id;
      }
    });
    return best;
  }

  function pinNode(id, x, y) {
    vizState.pinned[id] = { x, y };
    vizState.layout[id] = { x, y };
  }

  function unpinNode(id) {
    delete vizState.pinned[id];
  }

  function computeHighlight(graph, hoveredId) {
    if (!hoveredId) return null;
    const nodeIds = new Set(graph.nodes.map((n) => n.id));
    if (!nodeIds.has(hoveredId)) return null;

    const neighbors = {};
    graph.nodes.forEach((n) => { neighbors[n.id] = new Set(); });
    graph.edges.forEach((e) => {
      if (neighbors[e.from]) neighbors[e.from].add(e.to);
      if (neighbors[e.to]) neighbors[e.to].add(e.from);
    });

    const oneHop = new Set(neighbors[hoveredId] || []);
    const twoHop = new Set();
    oneHop.forEach((nid) => {
      (neighbors[nid] || new Set()).forEach((nn) => {
        if (nn !== hoveredId && !oneHop.has(nn)) twoHop.add(nn);
      });
    });
    const faded = [];
    nodeIds.forEach((id) => {
      if (id !== hoveredId && !oneHop.has(id) && !twoHop.has(id)) faded.push(id);
    });

    return {
      primary: [hoveredId],
      oneHop: Array.from(oneHop).sort(),
      twoHop: Array.from(twoHop).sort(),
      faded: faded.sort()
    };
  }

  function setHighlight(state) {
    vizState.highlight = state;
  }

  function shapeForKind(kind) {
    switch (kind) {
      case "shell_company": return "diamond";
      case "bank": return "square";
      case "crypto_service": return "hex";
      case "disposable_wallet": return "triangle";
      case "individual": return "circle";
      default: return "circle";
    }
  }

  function setPathHighlight(path) {
    vizState.path = Array.isArray(path) && path.length > 0 ? path.slice() : null;
  }

  function setPatternOverlay(overlay) {
    const ov = overlay || {};
    vizState.overlay = {
      shellChains: Array.isArray(ov.shellChains) ? ov.shellChains : [],
      mixers: Array.isArray(ov.mixers) ? ov.mixers : [],
      disposableClusters: Array.isArray(ov.disposableClusters) ? ov.disposableClusters : [],
      sanctionedIds: Array.isArray(ov.sanctionedIds) ? ov.sanctionedIds : []
    };
  }

  function drawNodeShape(ctx, shape, x, y, size) {
    const s = size || 5;
    switch (shape) {
      case "diamond":
        ctx.beginPath();
        ctx.moveTo(x, y - s);
        ctx.lineTo(x + s, y);
        ctx.lineTo(x, y + s);
        ctx.lineTo(x - s, y);
        ctx.lineTo(x, y - s);
        ctx.fill();
        return;
      case "square":
        ctx.beginPath();
        ctx.rect(x - s, y - s, s * 2, s * 2);
        ctx.fill();
        return;
      case "hex":
        ctx.beginPath();
        ctx.moveTo(x + s, y);
        for (let i = 1; i <= 6; i += 1) {
          const ang = (Math.PI / 3) * i;
          ctx.lineTo(x + s * Math.cos(ang), y + s * Math.sin(ang));
        }
        ctx.fill();
        return;
      case "triangle":
        ctx.beginPath();
        ctx.moveTo(x, y - s);
        ctx.lineTo(x + s, y + s * 0.85);
        ctx.lineTo(x - s, y + s * 0.85);
        ctx.lineTo(x, y - s);
        ctx.fill();
        return;
      case "circle":
      default:
        ctx.beginPath();
        ctx.arc(x, y, s, 0, Math.PI * 2);
        ctx.fill();
        return;
    }
  }

  function drawGraph(canvas, graph, riskByEntity) {
    if (!canvas || !graph) {
      return;
    }
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const n = graph.nodes.length;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const baseRadius = Math.min(rect.width, rect.height) * 0.34;
    const positions = {};
    const velocities = {};
    graph.nodes.forEach((node, i) => {
      const cached = vizState.layout[node.id];
      if (cached && Number.isFinite(cached.x) && Number.isFinite(cached.y)) {
        positions[node.id] = { x: cached.x, y: cached.y };
      } else {
        const angle = (Math.PI * 2 * i) / n;
        const risk = (riskByEntity[node.id] || 50) / 100;
        const radialBias = 0.7 + (1 - risk) * 0.5;
        positions[node.id] = {
          x: cx + Math.cos(angle) * baseRadius * radialBias,
          y: cy + Math.sin(angle) * baseRadius * radialBias
        };
      }
      velocities[node.id] = { x: 0, y: 0 };
    });

    const currentTopology = topologyKey(graph);
    const topologyUnchanged = vizState.lastTopologyKey === currentTopology;
    const allNodesCached = graph.nodes.every((node) => vizState.layout[node.id]);
    const iterations = (topologyUnchanged && allNodesCached) ? 0 : 50;

    // Lightweight force simulation for more natural clustering than a fixed circle.
    for (let iter = 0; iter < iterations; iter += 1) {
      for (let i = 0; i < n; i += 1) {
        const a = graph.nodes[i];
        for (let j = i + 1; j < n; j += 1) {
          const b = graph.nodes[j];
          const pa = positions[a.id];
          const pb = positions[b.id];
          const dx = pb.x - pa.x;
          const dy = pb.y - pa.y;
          const distSq = Math.max(25, dx * dx + dy * dy);
          const force = 70 / distSq;
          const fx = (dx / Math.sqrt(distSq)) * force;
          const fy = (dy / Math.sqrt(distSq)) * force;
          velocities[a.id].x -= fx;
          velocities[a.id].y -= fy;
          velocities[b.id].x += fx;
          velocities[b.id].y += fy;
        }
      }

      graph.edges.forEach((edge) => {
        const pa = positions[edge.from];
        const pb = positions[edge.to];
        if (!pa || !pb) {
          return;
        }
        const dx = pb.x - pa.x;
        const dy = pb.y - pa.y;
        const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const target = 44 + edge.weight * 1.6;
        const spring = (dist - target) * 0.002;
        const fx = (dx / dist) * spring;
        const fy = (dy / dist) * spring;
        velocities[edge.from].x += fx;
        velocities[edge.from].y += fy;
        velocities[edge.to].x -= fx;
        velocities[edge.to].y -= fy;
      });

      graph.nodes.forEach((node) => {
        if (vizState.pinned[node.id]) {
          const pin = vizState.pinned[node.id];
          positions[node.id].x = pin.x;
          positions[node.id].y = pin.y;
          velocities[node.id].x = 0;
          velocities[node.id].y = 0;
          return;
        }
        const p = positions[node.id];
        const v = velocities[node.id];
        p.x += v.x;
        p.y += v.y;
        v.x *= 0.86;
        v.y *= 0.86;
        p.x = Math.max(16, Math.min(rect.width - 16, p.x));
        p.y = Math.max(16, Math.min(rect.height - 16, p.y));
      });
    }

    graph.nodes.forEach((node) => {
      vizState.layout[node.id] = { x: positions[node.id].x, y: positions[node.id].y };
    });
    vizState.lastGraph = graph;
    vizState.lastCanvas = canvas;
    vizState.lastTopologyKey = currentTopology;

    // Apply camera transform: screen = (world - camera) * zoom, composed with DPR.
    ctx.save();
    ctx.translate(-vizState.camera.x * vizState.camera.zoom, -vizState.camera.y * vizState.camera.zoom);
    ctx.scale(vizState.camera.zoom, vizState.camera.zoom);

    const hl = vizState.highlight;
    const classFor = (id) => {
      if (!hl) return "neutral";
      if (hl.primary.indexOf(id) >= 0) return "primary";
      if (hl.oneHop.indexOf(id) >= 0) return "oneHop";
      if (hl.twoHop.indexOf(id) >= 0) return "twoHop";
      return "faded";
    };
    const edgeAlpha = (fromCls, toCls) => {
      if (!hl) return 0.25;
      const min = fromCls === "faded" || toCls === "faded" ? "faded" : (fromCls === "twoHop" || toCls === "twoHop" ? "twoHop" : "lit");
      if (min === "lit") return 0.55;
      if (min === "twoHop") return 0.22;
      return 0.07;
    };
    const nodeAlpha = (cls) => {
      if (!hl) return 1;
      if (cls === "primary" || cls === "oneHop") return 1;
      if (cls === "twoHop") return 0.55;
      return 0.15;
    };

    const pathSet = new Set(vizState.path || []);
    const pathEdges = new Set();
    if (vizState.path && vizState.path.length > 1) {
      for (let i = 0; i < vizState.path.length - 1; i += 1) {
        const a = vizState.path[i];
        const b = vizState.path[i + 1];
        pathEdges.add(a + ">" + b);
        pathEdges.add(b + ">" + a);
      }
    }

    graph.edges.forEach((edge) => {
      const a = positions[edge.from];
      const b = positions[edge.to];
      if (!a || !b) {
        return;
      }
      const onPath = pathEdges.has(edge.from + ">" + edge.to);
      if (onPath) {
        // Defer path-edge render so it draws on top.
        return;
      }
      const effectiveAlpha = vizState.path ? 0.15 : edgeAlpha(classFor(edge.from), classFor(edge.to));
      ctx.globalAlpha = effectiveAlpha;
      ctx.strokeStyle = "rgba(130,160,190,1)";
      ctx.lineWidth = 0.8 + edge.weight * 0.1;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;

    if (vizState.path && vizState.path.length > 1) {
      const dashPhase = -((typeof performance !== "undefined" && performance.now ? performance.now() : Date.now()) / 40) % 16;
      ctx.save();
      ctx.strokeStyle = "#67a3ff";
      ctx.lineWidth = 2.4;
      ctx.setLineDash([8, 6]);
      ctx.lineDashOffset = dashPhase;
      for (let i = 0; i < vizState.path.length - 1; i += 1) {
        const a = positions[vizState.path[i]];
        const b = positions[vizState.path[i + 1]];
        if (!a || !b) continue;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      ctx.restore();
    }

    const sanctioned = new Set(vizState.overlay.sanctionedIds);
    const mixers = new Set(vizState.overlay.mixers);
    const chainMembers = new Set();
    vizState.overlay.shellChains.forEach((chain) => chain.forEach((id) => chainMembers.add(id)));
    const pulsePhase = (typeof performance !== "undefined" && performance.now ? performance.now() : Date.now()) / 900;

    graph.nodes.forEach((node) => {
      const p = positions[node.id];
      const risk = riskByEntity[node.id] || 50;
      const color = risk >= 85 ? "#ef4444" : risk >= 65 ? "#f59e0b" : "#22c55e";
      const cls = classFor(node.id);
      ctx.globalAlpha = nodeAlpha(cls);

      // Halo for sanctioned entities (drawn first, behind shape)
      if (sanctioned.has(node.id)) {
        ctx.strokeStyle = "rgba(239,68,68,0.65)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Pulse for mixer nodes
      if (mixers.has(node.id)) {
        const pulse = 0.5 + 0.5 * Math.sin(pulsePhase);
        ctx.strokeStyle = "rgba(59,130,246," + (0.25 + pulse * 0.45).toFixed(3) + ")";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 9 + pulse * 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Chain member highlight stroke
      if (chainMembers.has(node.id)) {
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = color;
      const shape = shapeForKind(node.group);
      drawNodeShape(ctx, shape, p.x, p.y, 6);
    });
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawMiniRelationship(canvas, entities) {
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const points = [
      { x: rect.width * 0.2, y: rect.height * 0.45, id: entities[0] },
      { x: rect.width * 0.45, y: rect.height * 0.2, id: entities[1] },
      { x: rect.width * 0.68, y: rect.height * 0.52, id: entities[2] },
      { x: rect.width * 0.42, y: rect.height * 0.74, id: entities[3] }
    ];

    ctx.strokeStyle = "rgba(107,149,204,0.4)";
    ctx.lineWidth = 1.4;
    for (let i = 0; i < points.length; i += 1) {
      for (let j = i + 1; j < points.length; j += 1) {
        ctx.beginPath();
        ctx.moveTo(points[i].x, points[i].y);
        ctx.lineTo(points[j].x, points[j].y);
        ctx.stroke();
      }
    }
    points.forEach((p) => {
      ctx.fillStyle = "#3b82f6";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#d7e3f0";
      ctx.font = "11px system-ui";
      ctx.fillText(p.id, p.x + 9, p.y + 4);
    });
  }

  function renderHeatmap(container, heatmapData) {
    container.innerHTML = "";
    const header = document.createElement("div");
    header.className = "heatmap-row";
    header.appendChild(cell("Jurisdiction", "heatmap-label"));
    heatmapData.typologies.forEach((t) => header.appendChild(cell(t, "heatmap-label")));
    container.appendChild(header);

    let max = 1;
    heatmapData.matrix.forEach((row) => {
      heatmapData.typologies.forEach((t) => {
        max = Math.max(max, row.cells[t]);
      });
    });

    heatmapData.matrix.forEach((row) => {
      const r = document.createElement("div");
      r.className = "heatmap-row";
      r.appendChild(cell(row.jurisdiction, "heatmap-label"));
      heatmapData.typologies.forEach((t) => {
        const value = row.cells[t];
        const intensity = value / max;
        const c = cell(String(value), "heatmap-cell");
        c.style.background = "rgba(59,130,246," + (0.1 + intensity * 0.55) + ")";
        c.title = row.jurisdiction + " | " + t + ": " + value;
        r.appendChild(c);
      });
      container.appendChild(r);
    });
  }

  function cell(text, cls) {
    const div = document.createElement("div");
    div.className = cls;
    div.textContent = text;
    return div;
  }

  function drawGauge(canvas, value) {
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const cx = rect.width / 2;
    const cy = rect.height - 8;
    const r = Math.min(rect.width / 2 - 8, rect.height - 10);
    ctx.lineWidth = 10;
    ctx.strokeStyle = "#2a3b53";
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI, 2 * Math.PI);
    ctx.stroke();

    const ratio = Math.max(0, Math.min(1, value / 100));
    ctx.strokeStyle = value >= 85 ? "#ef4444" : value >= 65 ? "#f59e0b" : "#22c55e";
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI, Math.PI + Math.PI * ratio);
    ctx.stroke();

    ctx.fillStyle = "#e8edf2";
    ctx.font = "bold 14px system-ui";
    ctx.textAlign = "center";
    ctx.fillStyle = "#93a7be";
    ctx.font = "10px system-ui";
    ctx.fillText("RISK SCORE", cx, cy - 28);
    ctx.fillStyle = "#e8edf2";
    ctx.font = "bold 14px system-ui";
    ctx.fillText(String(Math.round(value)), cx, cy - 10);
  }

  function drawSparkline(canvas, values) {
    if (!canvas || !values || !values.length) {
      return;
    }
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const min = Math.min.apply(null, values);
    const max = Math.max.apply(null, values);
    const span = Math.max(1, max - min);
    const step = rect.width / (values.length - 1);

    ctx.strokeStyle = "#67a3ff";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    values.forEach((v, i) => {
      const x = i * step;
      const y = rect.height - ((v - min) / span) * (rect.height - 4) - 2;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
  }

  function drawScatter(canvas, cases, policy) {
    if (!canvas || !cases) {
      return;
    }
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const pad = { l: 38, r: 16, t: 14, b: 30 };
    const w = rect.width - pad.l - pad.r;
    const h = rect.height - pad.t - pad.b;

    ctx.strokeStyle = "rgba(140,166,193,0.3)";
    ctx.strokeRect(pad.l, pad.t, w, h);

    const xThreshold = pad.l + (policy.highRiskThreshold / 100) * w;
    const yThreshold = pad.t + h - (policy.confidenceThreshold / 100) * h;
    ctx.strokeStyle = "rgba(59,130,246,0.7)";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(xThreshold, pad.t);
    ctx.lineTo(xThreshold, pad.t + h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pad.l, yThreshold);
    ctx.lineTo(pad.l + w, yThreshold);
    ctx.stroke();
    ctx.setLineDash([]);

    cases.forEach((c) => {
      const x = pad.l + (c.riskScore / 100) * w;
      const y = pad.t + h - (c.confidence / 100) * h;
      ctx.fillStyle = c.riskScore >= 85 ? "#ef4444" : c.riskScore >= 65 ? "#f59e0b" : "#22c55e";
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = "#90a5bc";
    ctx.font = "10px system-ui";
    ctx.fillText("Monitoring", pad.l + 4, pad.t + h - 6);
    ctx.fillText("Analyst Review", xThreshold + 6, pad.t + h - 6);
    ctx.fillText("Intelligence", xThreshold + 6, yThreshold - 8);
    ctx.fillText("Enforcement", pad.l + w - 68, pad.t + 12);
    ctx.fillText("Risk →", pad.l + w - 36, rect.height - 10);
    ctx.save();
    ctx.translate(10, pad.t + h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Confidence →", 0, 0);
    ctx.restore();
  }

  window.FinCENViz = {
    drawGraph,
    drawMiniRelationship,
    renderHeatmap,
    drawGauge,
    drawSparkline,
    drawScatter,
    hitTestNode,
    pinNode,
    unpinNode,
    computeHighlight,
    setHighlight,
    shapeForKind,
    setPatternOverlay,
    drawNodeShape,
    setCamera,
    getCamera,
    worldToScreen,
    screenToWorld,
    setPathHighlight
  };

  if (window.__FINCEN_TEST__) {
    window.FinCENViz.__test = {
      getCamera() {
        return { x: vizState.camera.x, y: vizState.camera.y, zoom: vizState.camera.zoom };
      },
      getLayout() {
        const copy = {};
        Object.keys(vizState.layout).forEach((k) => {
          copy[k] = { x: vizState.layout[k].x, y: vizState.layout[k].y };
        });
        return copy;
      },
      getHighlightState() {
        return vizState.highlight;
      },
      getNodeAt(x, y) {
        return hitTestNode(x, y);
      },
      isPinned(id) {
        return Boolean(vizState.pinned[id]);
      },
      pinNode(id, x, y) {
        vizState.pinned[id] = { x, y };
        vizState.layout[id] = { x, y };
      },
      unpinNode(id) {
        delete vizState.pinned[id];
      },
      resetLayout() {
        vizState.layout = {};
        vizState.pinned = {};
        vizState.highlight = null;
        vizState.camera = { x: 0, y: 0, zoom: 1 };
        vizState.overlay = { shellChains: [], mixers: [], disposableClusters: [], sanctionedIds: [] };
        vizState.path = null;
        vizState.lastTopologyKey = null;
      },
      getPath() {
        return vizState.path ? vizState.path.slice() : null;
      },
      getPatternOverlay() {
        return {
          shellChains: vizState.overlay.shellChains.map((c) => c.slice()),
          mixers: vizState.overlay.mixers.slice(),
          disposableClusters: vizState.overlay.disposableClusters.map((c) => ({ funderId: c.funderId, walletIds: c.walletIds.slice() })),
          sanctionedIds: vizState.overlay.sanctionedIds.slice()
        };
      },
      isChainMember(id) {
        return vizState.overlay.shellChains.some((chain) => chain.indexOf(id) >= 0);
      }
    };
  }
})();
