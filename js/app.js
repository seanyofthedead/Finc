(function () {
  "use strict";

  if (window.FinCENDemoFixtures && window.FinCENDemoFixtures.shouldActivate(window.location.search)) {
    window.FinCENDemoFixtures.activate();
  }

  const data = window.FinCENData;
  const engine = window.FinCENEngine.buildEngine(data);

  const ui = {
    tabNav: document.getElementById("tab-nav"),
    screens: Array.from(document.querySelectorAll(".screen")),
    sourceGrid: document.getElementById("source-grid"),
    batchProgressBar: document.getElementById("batch-progress-bar"),
    batchProgressLabel: document.getElementById("batch-progress-label"),
    streamToggle: document.getElementById("stream-toggle"),
    streamCount: document.getElementById("stream-count"),
    freshnessIndicator: document.getElementById("freshness-indicator"),
    beforeMergeCount: document.getElementById("before-merge-count"),
    afterMergeCount: document.getElementById("after-merge-count"),
    mergeList: document.getElementById("merge-list"),
    pipelineGraphCanvas: document.getElementById("pipeline-graph-canvas"),
    lineagePanel: document.getElementById("lineage-panel"),

    featureTableBody: document.getElementById("feature-table-body"),
    featureDetail: document.getElementById("feature-detail"),
    velocitySparkline: document.getElementById("velocity-sparkline"),
    deviationSparkline: document.getElementById("deviation-sparkline"),

    analyticsGraphCanvas: document.getElementById("analytics-graph-canvas"),
    heatmapContainer: document.getElementById("heatmap-container"),
    typologyFilterGroup: document.getElementById("typology-filter-group"),
    caseCardsContainer: document.getElementById("case-cards-container"),

    highRiskSlider: document.getElementById("high-risk-slider"),
    confidenceSlider: document.getElementById("confidence-slider"),
    jurisdictionSlider: document.getElementById("jurisdiction-slider"),
    highRiskValue: document.getElementById("high-risk-value"),
    confidenceValue: document.getElementById("confidence-value"),
    jurisdictionValue: document.getElementById("jurisdiction-value"),
    decisionPath: document.getElementById("decision-path"),
    routingBoard: document.getElementById("routing-board"),
    triageScatterCanvas: document.getElementById("triage-scatter-canvas"),

    workspaceCaseSelect: document.getElementById("workspace-case-select"),
    evidenceGrid: document.getElementById("evidence-grid"),
    overrideScore: document.getElementById("override-score"),
    overrideRationale: document.getElementById("override-rationale"),
    applyOverrideBtn: document.getElementById("apply-override-btn"),
    generateReportBtn: document.getElementById("generate-report-btn"),
    auditLog: document.getElementById("audit-log"),
    biasIndicator: document.getElementById("bias-indicator"),
    biasDetail: document.getElementById("bias-detail"),
    confirmBar: document.getElementById("workspace-confirm-bar"),
    confirmMessage: document.getElementById("confirm-message"),
    confirmYesBtn: document.getElementById("confirm-yes-btn"),
    confirmNoBtn: document.getElementById("confirm-no-btn"),

    kpiTotalCases: document.getElementById("kpi-total-cases"),
    kpiEnforcement: document.getElementById("kpi-enforcement"),
    kpiIntelligence: document.getElementById("kpi-intelligence"),
    kpiAverageRisk: document.getElementById("kpi-average-risk"),
    kpiBias: document.getElementById("kpi-bias"),

    coreCapabilities: document.getElementById("core-capabilities"),
    missionModules: document.getElementById("mission-modules"),
    moduleConnectors: document.getElementById("module-connectors"),

    guideOverlay: document.getElementById("guide-overlay"),
    launchGuideBtn: document.getElementById("launch-guide-btn"),
    guideTitle: document.getElementById("guide-title"),
    guideBody: document.getElementById("guide-body"),
    guidePrevBtn: document.getElementById("guide-prev-btn"),
    guideNextBtn: document.getElementById("guide-next-btn"),
    guideCloseBtn: document.getElementById("guide-close-btn")
  };

  const appState = {
    activeScreen: "screen-pipeline",
    batchProgress: 0,
    streamCount: 0,
    selectedFeatureCase: null,
    selectedWorkspaceCase: null,
    selectedModule: null,
    guideIndex: -1,
    pendingAction: null
  };

  const typologyList = ["All", "Structuring", "TBML", "Sanctions Evasion", "Crypto Layering", "Unusual Velocity"];

  const coreCapabilities = [
    "Data Ingestion Framework",
    "Feature Engineering Library",
    "Analytics & Detection Engine",
    "Risk Scoring & Routing Core",
    "Governance & Audit Framework",
    "DevSecOps / Model Lifecycle Management"
  ];

  const missionModules = [
    { id: "m1", label: "Crypto Intelligence Module", uses: [0, 1, 2, 3, 5] },
    { id: "m2", label: "Sanctions Evasion Detection Module", uses: [0, 1, 2, 3, 4] },
    { id: "m3", label: "Typology-Specific Detection Packs", uses: [1, 2, 3, 5] },
    { id: "m4", label: "Workflow Customization Layer", uses: [0, 3, 4, 5] },
    { id: "m5", label: "Model Validation & Tuning Toolkit", uses: [1, 2, 4, 5] }
  ];

  const guideSteps = [
    { screen: "screen-pipeline", focus: "#source-grid", title: "1. Enterprise Ingestion", body: "Review six independent data sources with batch and streaming modes." },
    { screen: "screen-pipeline", focus: "#entity-resolution-card", title: "2. Entity Resolution", body: "Duplicate profiles merge into canonical entities before analytics." },
    { screen: "screen-signals", focus: "#feature-table-body", title: "3. Derived Signals", body: "Feature engineering creates reusable velocity, jurisdiction, ownership, and deviation signals." },
    { screen: "screen-analytics", focus: "#analytics-graph-canvas", title: "4. Network Anomaly", body: "Graph and heatmap compress heterogeneous activity into analyst-relevant anomalies." },
    { screen: "screen-triage", focus: "#decision-path", title: "5. Routing Logic", body: "Deterministic rules apply score/confidence thresholds to produce queue destinations." },
    { screen: "screen-triage", focus: "#high-risk-slider", title: "6. Threshold Adjustment", body: "Policy sliders immediately re-route cases for what-if governance analysis." },
    { screen: "screen-workspace", focus: "#evidence-grid", title: "7. Analyst Review", body: "Analyst inspects evidence, model explanations, and can apply governed overrides." },
    { screen: "screen-workspace", focus: "#audit-log", title: "8. Audit Trail", body: "Every override and route action is timestamped for defensible decision records." },
    { screen: "screen-enterprise", focus: "#mission-modules", title: "9. Enterprise Deployment & Expansion", body: "Modular mission packages are layered on a shared enterprise platform backbone." }
  ];

  function setScreen(screenId) {
    appState.activeScreen = screenId;
    ui.screens.forEach((s) => s.classList.toggle("active", s.id === screenId));
    Array.from(ui.tabNav.querySelectorAll(".tab-btn")).forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.screen === screenId);
    });
    renderAnalytics();
    if (screenId === "screen-enterprise") {
      drawModuleConnections();
    }
  }

  function emptyState(opts) {
    const iconName = opts.icon || "search";
    const iconHtml = window.FinCENIcons ? window.FinCENIcons.render(iconName, { size: 22 }) : "";
    return '<div class="empty-state">' +
      '<span class="empty-state-icon">' + iconHtml + "</span>" +
      '<p class="empty-state-title">' + (opts.title || "Nothing here yet") + "</p>" +
      (opts.body ? '<p class="empty-state-body">' + opts.body + "</p>" : "") +
      (opts.hint ? '<p class="empty-state-hint">' + opts.hint + "</p>" : "") +
      "</div>";
  }

  function formatTimestamp(isoString) {
    const d = new Date(isoString);
    const p = (n) => String(n).padStart(2, "0");
    return d.getUTCFullYear() + "-" + p(d.getUTCMonth() + 1) + "-" + p(d.getUTCDate()) + " " + p(d.getUTCHours()) + ":" + p(d.getUTCMinutes()) + " UTC";
  }

  function scoreClass(score) {
    if (score >= 85) {
      return "risk-high";
    }
    if (score >= 65) {
      return "risk-medium";
    }
    return "risk-low";
  }

  const SOURCE_ICON_BY_ID = {
    SRC_SAR: "flag",
    SRC_CTR: "database",
    SRC_SAN: "shield",
    SRC_CRYPTO: "bitcoin",
    SRC_BANK: "building",
    SRC_XBORDER: "globe"
  };

  function renderPipeline() {
    ui.sourceGrid.innerHTML = "";
    data.ingestionSources.forEach((src, index) => {
      const card = document.createElement("div");
      const isStreaming = src.mode === "Streaming";
      card.className = "card source-card" + (isStreaming ? " is-streaming" : "");
      card.style.setProperty("--stagger-i", String(index));
      const iconName = SOURCE_ICON_BY_ID[src.id] || "database";
      card.innerHTML =
        '<span class="source-mode">' + src.mode + "</span>" +
        '<div class="source-card-head">' +
          '<span class="source-icon" data-icon="' + iconName + '" data-icon-size="18"></span>' +
          "<h4>" + src.label + "</h4>" +
        "</div>" +
        '<div class="metric-row"><span class="muted">Records</span><span class="mono">' + src.records.toLocaleString() + "</span></div>" +
        '<div class="metric-row"><span class="muted">Freshness</span><span class="mono">' + src.freshnessMinutes + " min</span></div>";
      card.addEventListener("mouseenter", () => {
        lineageTickerPaused = true;
        renderLineageEntry(src);
      });
      card.addEventListener("mouseleave", () => {
        lineageTickerPaused = false;
      });
      ui.sourceGrid.appendChild(card);
    });

    const resolution = engine.resolveEntities();
    ui.beforeMergeCount.textContent = resolution.beforeEntityCount;
    ui.afterMergeCount.textContent = resolution.afterEntityCount;
    ui.mergeList.innerHTML = resolution.duplicateProfiles
      .map((d) => "<div class='metric-row'><span class='muted'>" + d.observedName + "</span><span>" + d.matchedEntityId + " (" + Math.round(d.confidence * 100) + "%)</span></div>")
      .join("");

    ui.freshnessIndicator.textContent = Math.min.apply(
      null,
      data.ingestionSources.map((s) => s.freshnessMinutes)
    ) + " min ago";

    renderPipelinePreview();
    if (window.FinCENIcons) window.FinCENIcons.hydrate(ui.sourceGrid);
    startLineageTicker();
  }

  let lineageTickerId = null;
  let lineageTickerIndex = 0;
  let lineageTickerPaused = false;

  function renderLineageEntry(src) {
    if (!ui.lineagePanel || !src) return;
    const ts = formatTimestamp(new Date(Date.now() - src.freshnessMinutes * 60000).toISOString());
    ui.lineagePanel.innerHTML =
      '<div class="lineage-live">' +
        '<span class="lineage-live-dot"></span>' +
        '<span class="mono lineage-live-label">LIVE TRACE</span>' +
        '<span class="mono lineage-live-time">' + ts + '</span>' +
      '</div>' +
      '<div class="lineage-source">' + src.label + '</div>' +
      '<div class="mono lineage-path">' + src.lineage + '</div>' +
      '<div class="lineage-meta">' +
        '<span class="mono">' + src.records.toLocaleString() + ' records</span>' +
        '<span class="lineage-dot">·</span>' +
        '<span class="mono">' + src.freshnessMinutes + ' min fresh</span>' +
        '<span class="lineage-dot">·</span>' +
        '<span class="mono">' + src.mode.toUpperCase() + '</span>' +
      '</div>';
  }

  function startLineageTicker() {
    if (lineageTickerId != null) return;
    const sources = data.ingestionSources;
    if (!sources || !sources.length) return;
    renderLineageEntry(sources[0]);
    lineageTickerId = setInterval(() => {
      if (lineageTickerPaused) return;
      lineageTickerIndex = (lineageTickerIndex + 1) % sources.length;
      renderLineageEntry(sources[lineageTickerIndex]);
    }, 3500);
    if (ui.lineagePanel) {
      ui.lineagePanel.addEventListener("mouseenter", () => { lineageTickerPaused = true; });
      ui.lineagePanel.addEventListener("mouseleave", () => { lineageTickerPaused = false; });
    }
  }

  function renderPipelinePreview() {
    if (!ui.pipelineGraphCanvas) return;
    const routing = engine.getRouting();
    const riskByEntity = {};
    routing.results.forEach((r) => { riskByEntity[r.entityId] = r.riskScore; });
    const fullGraph = engine.getGraph();
    // Trim to the most-connected 36 nodes for a legible hero preview.
    const degree = {};
    fullGraph.edges.forEach((e) => {
      degree[e.from] = (degree[e.from] || 0) + 1;
      degree[e.to] = (degree[e.to] || 0) + 1;
    });
    const ranked = fullGraph.nodes.slice().sort((a, b) => (degree[b.id] || 0) - (degree[a.id] || 0));
    const keep = new Set(ranked.slice(0, 36).map((n) => n.id));
    const previewGraph = {
      nodes: fullGraph.nodes.filter((n) => keep.has(n.id)),
      edges: fullGraph.edges.filter((e) => keep.has(e.from) && keep.has(e.to))
    };
    window.FinCENViz.drawGraph(ui.pipelineGraphCanvas, previewGraph, riskByEntity, { isolated: true });
  }

  function startIngestionSimulation() {
    setInterval(() => {
      appState.batchProgress = (appState.batchProgress + 2) % 102;
      const shown = Math.min(100, appState.batchProgress);
      ui.batchProgressBar.style.width = shown + "%";
      ui.batchProgressLabel.textContent = shown + "%";
    }, 520);

    setInterval(() => {
      if (ui.streamToggle.checked) {
        appState.streamCount += 12 + Math.floor(Math.random() * 25);
        ui.streamCount.textContent = appState.streamCount.toLocaleString();
      }
    }, 900);

  }

  function renderSignalEngineering() {
    const features = engine.getDerivedFeatures();
    ui.featureTableBody.innerHTML = "";
    features.forEach((f) => {
      const tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + f.entityName + "</td>" +
        "<td>" + f.derived.transactionVelocityScore + "</td>" +
        "<td>" + f.derived.jurisdictionRiskScore + "</td>" +
        "<td>" + f.derived.beneficialOwnershipNetworkScore + "</td>" +
        "<td>" + f.derived.peerGroupDeviation + "</td>" +
        "<td><span class='pill " + scoreClass(f.riskScore) + "'>" + f.typologyTag + "</span></td>" +
        "<td>" + (f.derived.crossBorderExposureFlag ? "Yes" : "No") + "</td>";
      tr.addEventListener("click", () => {
        appState.selectedFeatureCase = f.caseId;
        Array.from(ui.featureTableBody.querySelectorAll("tr")).forEach((row) => row.classList.remove("selected"));
        tr.classList.add("selected");
        renderSignalDetail();
      });
      ui.featureTableBody.appendChild(tr);
    });
    appState.selectedFeatureCase = appState.selectedFeatureCase || features[0].caseId;
    const firstRow = ui.featureTableBody.querySelector("tr");
    if (firstRow) {
      firstRow.classList.add("selected");
    }
    renderSignalDetail();
  }

  function renderSignalDetail() {
    const features = engine.getDerivedFeatures();
    const detail = features.find((f) => f.caseId === appState.selectedFeatureCase) || features[0];
    if (!detail) {
      return;
    }
    ui.featureDetail.innerHTML =
      "<div class='metric-row'><span class='muted'>Case</span><span>" + detail.caseId + "</span></div>" +
      "<div class='metric-row'><span class='muted'>Entity</span><span>" + detail.entityName + "</span></div>" +
      "<div class='metric-row'><span class='muted'>Typology</span><span>" + detail.typologyTag + "</span></div>" +
      "<div class='metric-row'><span class='muted'>Raw Inputs</span><span>" + detail.rawInputs.join("; ") + "</span></div>" +
      "<div class='metric-row'><span class='muted'>Derived</span><span>Velocity " + detail.derived.transactionVelocityScore + ", Jurisdiction " + detail.derived.jurisdictionRiskScore + "</span></div>" +
      "<div class='metric-row'><span class='muted'>Enrichment</span><span>" + detail.enrichmentSources.join(", ") + "</span></div>";

    const v = detail.derived.transactionVelocityScore;
    const d = detail.derived.peerGroupDeviation;
    window.FinCENViz.drawSparkline(ui.velocitySparkline, [v - 20, v - 13, v - 6, v - 3, v, v + 4, v - 2]);
    window.FinCENViz.drawSparkline(ui.deviationSparkline, [d - 9, d - 2, d + 4, d - 3, d + 6, d + 1, d]);
  }

  let analyticsGraphCache = { graph: { nodes: [], edges: [] }, risk: {}, overlay: { mixers: [], shellChains: [], disposableClusters: [], sanctionedIds: [] }, pathSource: null, hasPath: false };
  let analyticsInteractionsAttached = false;
  let pulseRafId = null;

  function reduceMotionActive() {
    if (window.FinCENPrefs && window.FinCENPrefs.get("reduceMotion")) return true;
    if (window.FinCENMotion && window.FinCENMotion.reducedMotion()) return true;
    return false;
  }

  function ensurePulseLoop() {
    if (pulseRafId != null) return;
    if (reduceMotionActive()) return;
    const tick = () => {
      const onAnalytics = appState.activeScreen === "screen-analytics";
      const needsRedraw = analyticsGraphCache.overlay.mixers.length > 0 || analyticsGraphCache.hasPath;
      if (onAnalytics && needsRedraw && ui.analyticsGraphCanvas && !reduceMotionActive()) {
        window.FinCENViz.drawGraph(ui.analyticsGraphCanvas, analyticsGraphCache.graph, analyticsGraphCache.risk);
      }
      pulseRafId = window.requestAnimationFrame(tick);
    };
    pulseRafId = window.requestAnimationFrame(tick);
  }

  function renderAnalytics() {
    const routing = engine.getRouting();
    const riskByEntity = {};
    routing.results.forEach((r) => {
      riskByEntity[r.entityId] = r.riskScore;
    });

    const graph = engine.getGraph();
    analyticsGraphCache = { graph, risk: riskByEntity };

    if (window.FinCENPatternDetection && window.FinCENViz.setPatternOverlay) {
      const sanctionedNames = new Set((data.sanctionsList || []).map((s) => s.name));
      const sanctionedIds = data.entities
        .filter((e) => sanctionedNames.has(e.name) || (e.aliases || []).some((a) => sanctionedNames.has(a)))
        .map((e) => e.id);
      const overlay = {
        shellChains: window.FinCENPatternDetection.detectShellChains(graph),
        mixers: window.FinCENPatternDetection.detectMixers(graph),
        disposableClusters: window.FinCENPatternDetection.detectDisposableClusters(graph),
        sanctionedIds
      };
      window.FinCENViz.setPatternOverlay(overlay);
      analyticsGraphCache.overlay = overlay;
    }

    window.FinCENViz.drawGraph(ui.analyticsGraphCanvas, graph, riskByEntity);
    if (window.FinCENGraphA11y) {
      window.FinCENGraphA11y.update(graph, analyticsGraphCache.overlay);
    }
    ensurePulseLoop();
    window.FinCENViz.renderHeatmap(ui.heatmapContainer, engine.getHeatmap());

    if (!analyticsInteractionsAttached && window.FinCENGraphInteractions) {
      if (window.FinCENEntityPanel) {
        const host = document.getElementById("entity-panel-host") || document.body;
        window.FinCENEntityPanel.mount(host);
      }
      if (window.FinCENLegend) {
        const legendHost = document.getElementById("analytics-legend-host");
        if (legendHost) window.FinCENLegend.mount(legendHost);
      }
      window.FinCENGraphInteractions.attach(ui.analyticsGraphCanvas, {
        getGraph: () => analyticsGraphCache.graph,
        getRiskByEntity: () => analyticsGraphCache.risk,
        onShiftClick: (nodeId) => {
          if (!analyticsGraphCache.pathSource || !window.FinCENPathTracing) return;
          const path = window.FinCENPathTracing.shortestPath(analyticsGraphCache.graph, analyticsGraphCache.pathSource, nodeId);
          if (path && path.length > 1) {
            window.FinCENViz.setPathHighlight(path);
            analyticsGraphCache.hasPath = true;
            window.FinCENViz.drawGraph(ui.analyticsGraphCanvas, analyticsGraphCache.graph, analyticsGraphCache.risk);
          }
        },
        onClick: (nodeId) => {
          analyticsGraphCache.pathSource = nodeId;
          if (analyticsGraphCache.hasPath) {
            window.FinCENViz.setPathHighlight(null);
            analyticsGraphCache.hasPath = false;
          }
          const entity = data.entities.find((e) => e.id === nodeId);
          if (!entity || !window.FinCENEntityPanel) return;
          const cases = engine.getRouting().results;
          const matchedCase = cases.find((c) => c.entityId === nodeId);
          const relatedTxIds = new Set();
          data.flaggedCases
            .filter((fc) => fc.entityId === nodeId)
            .forEach((fc) => (fc.relatedTransactionIds || []).forEach((id) => relatedTxIds.add(id)));
          const recentTransactions = data.transactions
            .filter((t) => relatedTxIds.has(t.id) || t.fromEntityId === nodeId || t.toEntityId === nodeId)
            .slice(0, 6);
          window.FinCENEntityPanel.show(entity, {
            case: matchedCase ? { riskScore: matchedCase.riskScore, typology: matchedCase.typology, whyFlagged: matchedCase.whyFlagged } : null,
            sanctioned: analyticsGraphCache.overlay.sanctionedIds.indexOf(nodeId) >= 0,
            recentTransactions,
            onOpenWorkspace: (id) => {
              const picked = cases.find((c) => c.entityId === id);
              if (picked) {
                appState.selectedWorkspaceCase = picked.caseId;
              }
              setScreen("screen-workspace");
              if (ui.workspaceCaseSelect && picked) {
                ui.workspaceCaseSelect.value = picked.caseId;
                renderWorkspaceCase();
              }
              window.FinCENEntityPanel.hide();
            }
          });
        }
      });
      analyticsInteractionsAttached = true;
    }

    renderTypologyFilters();
    renderCaseCards(routing.results);
  }

  function renderTypologyFilters() {
    ui.typologyFilterGroup.innerHTML = "";
    typologyList.forEach((t) => {
      const b = document.createElement("button");
      b.className = "btn";
      b.textContent = t;
      if (engine.getState().selectedTypology === t) {
        b.classList.add("accent");
      }
      b.addEventListener("click", () => {
        engine.setTypologyFilter(t);
        renderAnalytics();
        renderRouting();
      });
      ui.typologyFilterGroup.appendChild(b);
    });
  }

  function renderCaseCards(routingResults) {
    ui.caseCardsContainer.innerHTML = "";
    if (!routingResults.length) {
      ui.caseCardsContainer.innerHTML = emptyState({
        icon: "search",
        title: "No cases match the current filter.",
        body: "Adjust the typology filter above or widen the policy thresholds on the Triage screen.",
        hint: "Filter \u00b7 No results"
      });
      if (window.FinCENIcons) window.FinCENIcons.hydrate(ui.caseCardsContainer);
      return;
    }
    routingResults.forEach((c) => {
      const card = document.createElement("div");
      card.className = "case-card";
      card.innerHTML =
        "<div class='metric-row'><strong>" + c.caseId + "</strong><span class='pill " + scoreClass(c.riskScore) + "'>" + c.typology + "</span></div>" +
        "<div class='metric-row'><span class='muted'>Confidence</span><span>" + c.confidence + "%</span></div>" +
        "<div class='metric-row'><span class='muted'>Destination</span><span>" + c.destination + "</span></div>" +
        "<div class='muted' style='font-size:0.82rem;margin:6px 0'>" + c.contributingFeatures.join(" | ") + "</div>" +
        "<div style='font-size:0.82rem'>" + c.whyFlagged + "</div>" +
        "<canvas class='mini-canvas gauge'></canvas>";
      ui.caseCardsContainer.appendChild(card);
      const gauge = card.querySelector("canvas");
      requestAnimationFrame(() => window.FinCENViz.drawGauge(gauge, c.riskScore));
    });
  }

  function renderRouting() {
    const routing = engine.getRouting();
    const queues = routing.queues;

    // Respect manual override destination mapping when present.
    routing.results.forEach((r) => {
      if (r.overridden) {
        Object.keys(queues).forEach((k) => {
          queues[k] = queues[k].filter((item) => item.caseId !== r.caseId);
        });
        queues[r.destination].push(r);
      }
    });

    ui.routingBoard.innerHTML = "";
    const QUEUE_EMPTY_COPY = {
      "Intelligence Queue":     { title: "No cases pending intelligence review.", body: "High-risk, low-confidence cases arrive here." },
      "Enforcement Referral":   { title: "No active enforcement referrals.", body: "High-risk, high-confidence cases escalate here." },
      "Analyst Review":         { title: "No cases awaiting analyst review.", body: "Medium-risk cases land here for human judgment." },
      "Monitoring / Auto-close":{ title: "No cases in passive monitoring.", body: "Low-risk cases auto-close here." }
    };
    Object.keys(queues).forEach((q) => {
      const col = document.createElement("div");
      col.className = "routing-col";
      const title = document.createElement("h4");
      title.textContent = q + " (" + queues[q].length + ")";
      col.appendChild(title);

      if (queues[q].length === 0) {
        col.insertAdjacentHTML("beforeend", emptyState({
          icon: "triage",
          title: (QUEUE_EMPTY_COPY[q] || {}).title || "Queue empty.",
          body: (QUEUE_EMPTY_COPY[q] || {}).body || ""
        }));
      } else {
        queues[q]
          .sort((a, b) => b.riskScore - a.riskScore)
          .forEach((c) => {
            const item = document.createElement("div");
            item.className = "route-card";
            item.innerHTML =
              "<strong>" + c.caseId + "</strong><br/>" +
              "<span class='muted'>" + c.typology + "</span><br/>" +
              "Risk " + c.riskScore + " | Confidence " + c.confidence +
              (c.overridden ? "<br/><span class='pill risk-medium'>Overridden</span>" : "");
            col.appendChild(item);
          });
      }
      ui.routingBoard.appendChild(col);
    });
    if (window.FinCENIcons) window.FinCENIcons.hydrate(ui.routingBoard);

    const policy = engine.getState().policy;
    ui.decisionPath.innerHTML =
      "<div>IF risk >= <strong>" + policy.highRiskThreshold + "</strong> AND confidence >= <strong>" + policy.confidenceThreshold + "</strong> -> Enforcement Referral</div>" +
      "<div>IF risk >= <strong>" + policy.highRiskThreshold + "</strong> AND confidence &lt; <strong>" + policy.confidenceThreshold + "</strong> -> Intelligence Queue</div>" +
      "<div>IF risk >= <strong>" + policy.mediumRiskThreshold + "</strong> -> Analyst Review</div>" +
      "<div>ELSE -> Monitoring / Auto-close</div>" +
      "<div class='muted' style='margin-top:8px'>Jurisdiction weight modifier: " + policy.jurisdictionWeight.toFixed(1) + "</div>";

    window.FinCENViz.drawScatter(ui.triageScatterCanvas, routing.results, policy);
    updateTabBadges(routing);
    renderKPIStrip(routing);
  }

  function updateTabBadges(routing) {
    const triageTab = ui.tabNav.querySelector('[data-screen="screen-triage"]');
    const workspaceTab = ui.tabNav.querySelector('[data-screen="screen-workspace"]');
    if (triageTab) {
      triageTab.textContent = "Risk Scoring & Triage (" + routing.results.length + ")";
    }
    if (workspaceTab) {
      workspaceTab.textContent = "Analyst Workspace (" + routing.queues["Analyst Review"].length + ")";
    }
  }

  function renderKPIStrip(precomputedRouting) {
    const routing = precomputedRouting || engine.getRouting();
    const total = routing.results.length;
    const enforcement = routing.queues["Enforcement Referral"].length;
    const intelligence = routing.queues["Intelligence Queue"].length;
    const avg = total ? (routing.results.reduce((sum, x) => sum + x.riskScore, 0) / total) : 0;
    const anim = window.FinCENMotion && window.FinCENMotion.animateDigits;
    const write = (el, val, opts) => {
      if (anim) {
        anim(el, val, opts || {});
      } else {
        el.textContent = typeof val === "number" ? (Number.isInteger(val) ? String(val) : val.toFixed(1)) : String(val);
      }
    };
    write(ui.kpiTotalCases, total);
    write(ui.kpiEnforcement, enforcement);
    write(ui.kpiIntelligence, intelligence);
    write(ui.kpiAverageRisk, avg, { format: (v) => v.toFixed(1) });
    ui.kpiBias.textContent = ui.biasIndicator ? ui.biasIndicator.textContent : "—";
  }

  function bindPolicyControls() {
    ui.highRiskSlider.addEventListener("input", () => {
      ui.highRiskValue.textContent = ui.highRiskSlider.value;
      engine.updatePolicy({ highRiskThreshold: Number(ui.highRiskSlider.value) });
      renderAnalytics();
      renderRouting();
    });
    ui.confidenceSlider.addEventListener("input", () => {
      ui.confidenceValue.textContent = ui.confidenceSlider.value;
      engine.updatePolicy({ confidenceThreshold: Number(ui.confidenceSlider.value) });
      renderAnalytics();
      renderRouting();
    });
    ui.jurisdictionSlider.addEventListener("input", () => {
      ui.jurisdictionValue.textContent = Number(ui.jurisdictionSlider.value).toFixed(1);
      engine.updatePolicy({ jurisdictionWeight: Number(ui.jurisdictionSlider.value) });
      renderAnalytics();
      renderRouting();
    });
  }

  function renderWorkspace() {
    const allCases = engine.getRouting().results;
    ui.workspaceCaseSelect.innerHTML = "";
    allCases.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.caseId;
      opt.textContent = c.caseId + " - " + c.typology + " (" + c.destination + ")";
      ui.workspaceCaseSelect.appendChild(opt);
    });
    appState.selectedWorkspaceCase = appState.selectedWorkspaceCase || allCases[0].caseId;
    ui.workspaceCaseSelect.value = appState.selectedWorkspaceCase;
    renderWorkspaceCase();
    renderAudit();
    renderBiasIndicator();
  }

  function renderWorkspaceCase() {
    const routingResults = engine.getRouting().results;
    const c = routingResults.find((x) => x.caseId === appState.selectedWorkspaceCase) || routingResults[0];
    if (!c) {
      return;
    }
    appState.selectedWorkspaceCase = c.caseId;
    ui.overrideScore.value = c.riskScore;

    const base = data.flaggedCases.find((x) => x.caseId === c.caseId);
    const entity = data.entities.find((e) => e.id === c.entityId);
    const tx = data.transactions.filter((t) => base.relatedTransactionIds.indexOf(t.id) >= 0);

    ui.evidenceGrid.innerHTML =
      "<div class='evidence'><h4>Entity Profile</h4><div>" + entity.name + "</div><div class='muted'>" + entity.jurisdiction + " | " + entity.kind + "</div></div>" +
      "<div class='evidence'><h4>Model Explanation</h4><div class='muted'>" + c.whyFlagged + "</div></div>" +
      "<div class='evidence'><h4>Contributing Features</h4><div class='muted'>" + c.contributingFeatures.join(", ") + "</div></div>" +
      "<div class='evidence'><h4>Transaction Evidence</h4><div class='muted'>" +
      tx.slice(0, 3).map((t) => t.id + " $" + t.amountUsd.toLocaleString() + " " + t.channel).join("<br/>") +
      "</div></div>";
  }

  function renderAudit() {
    const entries = engine.getState().auditLog;
    if (!entries.length) {
      ui.auditLog.innerHTML = emptyState({
        icon: "workspace",
        title: "No audit entries yet.",
        body: "Every override, route action, and supervisory approval will appear here with timestamp and actor."
      });
      if (window.FinCENIcons) window.FinCENIcons.hydrate(ui.auditLog);
      return;
    }
    ui.auditLog.innerHTML = entries
      .map((a) => "<div class='audit-item'><div><strong>" + a.action + "</strong> - " + a.caseId + "</div><div class='muted'>" + formatTimestamp(a.timestamp) + " | " + a.actor + "</div><div>" + a.details + "</div></div>")
      .join("");
  }

  function renderBiasIndicator() {
    const byJurisdiction = {};
    engine.getRouting().results.forEach((r) => {
      const e = data.entities.find((x) => x.id === r.entityId);
      byJurisdiction[e.jurisdiction] = byJurisdiction[e.jurisdiction] || { high: 0, total: 0 };
      byJurisdiction[e.jurisdiction].total += 1;
      if (r.riskScore >= 85) {
        byJurisdiction[e.jurisdiction].high += 1;
      }
    });
    const ratios = Object.values(byJurisdiction).map((x) => x.high / Math.max(1, x.total));
    const spread = Math.max.apply(null, ratios) - Math.min.apply(null, ratios);
    ui.biasIndicator.className = "pill " + (spread < 0.25 ? "risk-low" : spread < 0.45 ? "risk-medium" : "risk-high");
    ui.biasIndicator.textContent = spread < 0.25 ? "Green" : spread < 0.45 ? "Amber" : "Red";
    ui.kpiBias.textContent = ui.biasIndicator.textContent;
    ui.biasDetail.innerHTML = Object.keys(byJurisdiction)
      .sort()
      .map((j) => {
        const r = byJurisdiction[j];
        const pct = Math.round((r.high / Math.max(1, r.total)) * 100);
        return j + ": " + pct + "% high-risk (" + r.high + "/" + r.total + ")";
      })
      .join("<br/>");
  }

  function bindWorkspaceActions() {
    ui.workspaceCaseSelect.addEventListener("change", () => {
      appState.selectedWorkspaceCase = ui.workspaceCaseSelect.value;
      renderWorkspaceCase();
    });

    ui.applyOverrideBtn.addEventListener("click", () => {
      engine.applyOverride(
        appState.selectedWorkspaceCase,
        Number(ui.overrideScore.value),
        ui.overrideRationale.value,
        "Analyst K. Rivera"
      );
      renderWorkspace();
      renderAnalytics();
      renderRouting();
    });

    ui.generateReportBtn.addEventListener("click", () => {
      window.print();
    });

    ui.biasIndicator.addEventListener("click", () => {
      ui.biasDetail.classList.toggle("active");
    });

    ui.confirmNoBtn.addEventListener("click", () => {
      appState.pendingAction = null;
      ui.confirmBar.classList.remove("active");
    });

    ui.confirmYesBtn.addEventListener("click", () => {
      if (!appState.pendingAction) {
        return;
      }
      engine.routeCaseAction(
        appState.selectedWorkspaceCase,
        appState.pendingAction,
        "Analyst K. Rivera",
        ui.overrideRationale.value || "Manual analyst action."
      );
      appState.pendingAction = null;
      ui.confirmBar.classList.remove("active");
      renderWorkspace();
      renderAnalytics();
      renderRouting();
    });

    Array.from(document.querySelectorAll("[data-action]")).forEach((btn) => {
      btn.addEventListener("click", () => {
        appState.pendingAction = btn.getAttribute("data-action");
        ui.confirmMessage.textContent = "Confirm action: " + btn.textContent + "?";
        ui.confirmBar.classList.add("active");
      });
    });
  }

  function renderEnterpriseModules() {
    ui.coreCapabilities.innerHTML = "";
    ui.missionModules.innerHTML = "";
    coreCapabilities.forEach((name, i) => {
      const c = document.createElement("div");
      c.className = "module-card";
      c.id = "core-" + i;
      c.textContent = name;
      ui.coreCapabilities.appendChild(c);
    });
    missionModules.forEach((m, i) => {
      const c = document.createElement("div");
      c.className = "module-card";
      c.id = "module-" + i;
      c.textContent = m.label;
      c.addEventListener("click", () => {
        appState.selectedModule = m.id;
        renderEnterpriseModules();
        drawModuleConnections();
      });
      if (appState.selectedModule === m.id) {
        c.classList.add("active");
      }
      ui.missionModules.appendChild(c);
    });
    drawModuleConnections();
  }

  function drawModuleConnections() {
    const w = 220;
    const h = 360;
    ui.moduleConnectors.setAttribute("viewBox", "0 0 " + w + " " + h);
    ui.moduleConnectors.innerHTML = "";

    missionModules.forEach((m, mIndex) => {
      const active = !appState.selectedModule || appState.selectedModule === m.id;
      m.uses.forEach((coreIndex) => {
        const y1 = 30 + coreIndex * 56;
        const y2 = 30 + mIndex * 62;
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", "M 10 " + y1 + " C 95 " + y1 + ", 125 " + y2 + ", 210 " + y2);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", active ? "#eab873" : "#3b4a5c");
        path.setAttribute("stroke-width", active ? "2.2" : "1");
        path.setAttribute("opacity", active ? "0.9" : "0.5");
        ui.moduleConnectors.appendChild(path);
      });
    });
  }

  function clearHighlights() {
    document.querySelectorAll(".highlight-focus").forEach((n) => n.classList.remove("highlight-focus"));
  }

  function showGuideStep(index) {
    const safe = Math.max(0, Math.min(guideSteps.length - 1, index));
    appState.guideIndex = safe;
    const step = guideSteps[safe];
    setScreen(step.screen);
    ui.guideTitle.textContent = step.title;
    ui.guideBody.textContent = step.body;
    clearHighlights();
    const focusNode = document.querySelector(step.focus);
    if (focusNode) {
      focusNode.classList.add("highlight-focus");
    }
    ui.guidePrevBtn.disabled = safe === 0;
    ui.guideNextBtn.disabled = safe === guideSteps.length - 1;
  }

  function bindGuide() {
    ui.launchGuideBtn.addEventListener("click", () => {
      ui.guideOverlay.classList.add("active");
      showGuideStep(0);
    });
    ui.guideCloseBtn.addEventListener("click", () => {
      ui.guideOverlay.classList.remove("active");
      clearHighlights();
    });
    ui.guidePrevBtn.addEventListener("click", () => showGuideStep(appState.guideIndex - 1));
    ui.guideNextBtn.addEventListener("click", () => showGuideStep(appState.guideIndex + 1));
  }

  function bindNavigation() {
    ui.tabNav.addEventListener("click", (ev) => {
      const btn = ev.target.closest(".tab-btn");
      if (!btn) {
        return;
      }
      setScreen(btn.dataset.screen);
    });
    document.addEventListener("click", (ev) => {
      const link = ev.target.closest && ev.target.closest("[data-screen-link]");
      if (!link) return;
      setScreen(link.getAttribute("data-screen-link"));
    });
  }

  function bindGlobalKeys() {
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && analyticsGraphCache.hasPath) {
        window.FinCENViz.setPathHighlight(null);
        analyticsGraphCache.hasPath = false;
        analyticsGraphCache.pathSource = null;
        window.FinCENViz.drawGraph(ui.analyticsGraphCanvas, analyticsGraphCache.graph, analyticsGraphCache.risk);
      }
      if (!ui.guideOverlay.classList.contains("active")) {
        return;
      }
      if (event.key === "Escape") {
        ui.guideOverlay.classList.remove("active");
        clearHighlights();
      } else if (event.key === "ArrowRight") {
        showGuideStep(appState.guideIndex + 1);
      } else if (event.key === "ArrowLeft") {
        showGuideStep(appState.guideIndex - 1);
      }
    });
  }

  function bindScrollCompression() {
    const topbar = document.querySelector(".topbar");
    if (!topbar) return;
    let compressed = false;
    // Hysteresis: enter compressed mode at 44px, exit at 20px. The 24px
    // dead zone stops the class from flickering on slow or wheel-inertia
    // scrolling across a single threshold.
    const onScroll = () => {
      const y = window.scrollY || window.pageYOffset || 0;
      let next = compressed;
      if (!compressed && y > 44) next = true;
      else if (compressed && y < 20) next = false;
      if (next !== compressed) {
        compressed = next;
        topbar.classList.toggle("is-compressed", compressed);
        document.body.classList.toggle("is-scrolled", compressed);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  function startStatusClock() {
    const clockEl = document.getElementById("status-clock");
    if (!clockEl) return;
    const tick = () => {
      const d = new Date();
      const p = (n) => String(n).padStart(2, "0");
      clockEl.textContent = p(d.getUTCHours()) + ":" + p(d.getUTCMinutes()) + ":" + p(d.getUTCSeconds()) + " UTC";
    };
    tick();
    setInterval(tick, 1000);
  }

  function markHydrated() {
    // Defer to the next frame so the skeleton has a chance to paint.
    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => document.body.classList.add("hydrated"));
      });
    } else {
      document.body.classList.add("hydrated");
    }
  }

  function registerCommandPalette() {
    if (!window.FinCENCommand) return;
    const cmd = window.FinCENCommand;

    const screens = [
      { id: "screen-pipeline", title: "Go to Pipeline",          icon: "pipeline" },
      { id: "screen-signals",   title: "Go to Signal Engineering", icon: "signals" },
      { id: "screen-analytics", title: "Go to Analytics & Detection", icon: "analytics" },
      { id: "screen-triage",    title: "Go to Risk Scoring & Triage", icon: "triage" },
      { id: "screen-workspace", title: "Go to Analyst Workspace", icon: "workspace" },
      { id: "screen-enterprise",title: "Go to Enterprise Deployment", icon: "enterprise" }
    ];
    screens.forEach((s) => {
      cmd.registerCommand({
        id: "nav." + s.id,
        title: s.title,
        keywords: "jump navigate screen section",
        icon: s.icon,
        hint: "",
        action: () => setScreen(s.id)
      });
    });

    typologyList.forEach((t) => {
      cmd.registerCommand({
        id: "filter.typology." + t.toLowerCase().replace(/\s+/g, "-"),
        title: "Filter cases: " + t,
        keywords: "typology pattern " + t,
        icon: "triage",
        action: () => {
          engine.setTypologyFilter(t);
          setScreen("screen-analytics");
          renderAnalytics();
          renderRouting();
        }
      });
    });

    cmd.registerCommand({
      id: "action.guide",
      title: "Open guide tour",
      keywords: "demo walkthrough tutorial help",
      icon: "sparkle",
      action: () => {
        ui.guideOverlay.classList.add("active");
        showGuideStep(0);
      }
    });

    cmd.registerCommand({
      id: "action.reset-graph",
      title: "Reset graph view (0)",
      keywords: "zoom camera pan center",
      icon: "analytics",
      action: () => {
        window.FinCENViz.setCamera(0, 0, 1);
        if (ui.analyticsGraphCanvas) {
          window.FinCENViz.drawGraph(ui.analyticsGraphCanvas, analyticsGraphCache.graph, analyticsGraphCache.risk);
        }
      }
    });

    cmd.registerCommand({
      id: "action.clear-path",
      title: "Clear traced fund-flow path",
      keywords: "path trace reset",
      icon: "analytics",
      action: () => {
        window.FinCENViz.setPathHighlight(null);
        analyticsGraphCache.hasPath = false;
        analyticsGraphCache.pathSource = null;
        if (ui.analyticsGraphCanvas) {
          window.FinCENViz.drawGraph(ui.analyticsGraphCanvas, analyticsGraphCache.graph, analyticsGraphCache.risk);
        }
      }
    });

    cmd.registerCommand({
      id: "action.toggle-rich",
      title: "Toggle rich demo data (reload with ?demo=rich)",
      keywords: "synthetic fixture demo",
      icon: "sparkle",
      action: () => {
        const url = new URL(window.location.href);
        if (url.searchParams.get("demo") === "rich") {
          url.searchParams.delete("demo");
        } else {
          url.searchParams.set("demo", "rich");
        }
        window.location.href = url.toString();
      }
    });

    // Top-N flagged cases as jump-to-entity commands.
    data.flaggedCases.slice(0, 30).forEach((fc) => {
      const entity = data.entities.find((e) => e.id === fc.entityId);
      if (!entity) return;
      cmd.registerCommand({
        id: "entity." + entity.id,
        title: "Find entity: " + entity.name,
        keywords: entity.kind + " " + entity.jurisdiction + " " + fc.typology + " " + entity.id,
        hint: entity.jurisdiction,
        icon: entity.kind === "shell_company" ? "shield" : entity.kind === "crypto_service" ? "bitcoin" : "building",
        action: () => {
          setScreen("screen-workspace");
          if (ui.workspaceCaseSelect) {
            ui.workspaceCaseSelect.value = fc.caseId;
            appState.selectedWorkspaceCase = fc.caseId;
            renderWorkspaceCase();
          }
        }
      });
    });
  }

  function bindCommandPaletteHotkey() {
    document.addEventListener("keydown", (evt) => {
      const mod = evt.metaKey || evt.ctrlKey;
      if (mod && (evt.key === "k" || evt.key === "K")) {
        evt.preventDefault();
        if (window.FinCENCommand) {
          window.FinCENCommand.isOpen() ? window.FinCENCommand.close() : window.FinCENCommand.open();
        }
      } else if (mod && evt.key === ",") {
        evt.preventDefault();
        if (window.FinCENPrefsUI) window.FinCENPrefsUI.toggle();
      }
    });
    const trigger = document.getElementById("cmdk-trigger");
    if (trigger) {
      trigger.addEventListener("click", () => {
        if (window.FinCENCommand) window.FinCENCommand.open();
      });
    }
    if (window.FinCENCommand && window.FinCENPrefsUI) {
      window.FinCENCommand.registerCommand({
        id: "action.preferences",
        title: "Open preferences",
        keywords: "settings reduce motion density classification comfort",
        icon: "sparkle",
        hint: "\u2318 ,",
        action: () => window.FinCENPrefsUI.open()
      });
    }
  }

  function boot() {
    bindNavigation();
    bindPolicyControls();
    bindWorkspaceActions();
    startStatusClock();
    bindGuide();
    bindGlobalKeys();

    renderPipeline();
    startIngestionSimulation();
    renderSignalEngineering();
    renderAnalytics();
    renderRouting();
    renderWorkspace();
    renderEnterpriseModules();
    renderKPIStrip();
    registerCommandPalette();
    bindCommandPaletteHotkey();
    bindScrollCompression();
    if (window.FinCENPrefs) {
      window.FinCENPrefs.apply();
      window.FinCENPrefs.subscribe(() => {
        window.FinCENPrefs.apply();
      });
    }
    if (window.FinCENGraphA11y && ui.analyticsGraphCanvas && ui.analyticsGraphCanvas.parentNode) {
      window.FinCENGraphA11y.mount(ui.analyticsGraphCanvas.parentNode);
    }
    if (window.FinCENIcons) window.FinCENIcons.hydrate();
    markHydrated();

    window.addEventListener("resize", () => {
      renderPipelinePreview();
      renderAnalytics();
      drawModuleConnections();
    });
  }

  boot();
})();
