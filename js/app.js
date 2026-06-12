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

    analyticsGraphCanvas: document.getElementById("analytics-graph-canvas"),
    heatmapContainer: document.getElementById("heatmap-container"),
    testingPresets: document.getElementById("testing-presets"),
    typologyFilterGroup: document.getElementById("typology-filter-group"),
    caseCardsContainer: document.getElementById("case-cards-container"),
    caseCardsSearch: document.getElementById("case-cards-search"),
    caseCardsSort: document.getElementById("case-cards-sort"),
    caseCardsResultCount: document.getElementById("case-cards-result-count"),

    highRiskSlider: document.getElementById("high-risk-slider"),
    confidenceSlider: document.getElementById("confidence-slider"),
    jurisdictionSlider: document.getElementById("jurisdiction-slider"),
    highRiskValue: document.getElementById("high-risk-value"),
    confidenceValue: document.getElementById("confidence-value"),
    jurisdictionValue: document.getElementById("jurisdiction-value"),
    decisionPath: document.getElementById("decision-path"),
    routingBoard: document.getElementById("routing-board"),
    routingSearch: document.getElementById("routing-search"),
    routingResultCount: document.getElementById("routing-result-count"),
    triageScatterCanvas: document.getElementById("triage-scatter-canvas"),

    workspaceCaseSearch: document.getElementById("workspace-case-search"),
    workspaceCaseSelect: document.getElementById("workspace-case-select"),
    caseIndicators: document.getElementById("case-indicators"),
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

    kpiTotalEntities: document.getElementById("kpi-total-entities"),
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
    workspaceSearch: "",
    routingSearch: "",
    caseCardsSearch: "",
    caseCardsSort: "risk-desc",
    selectedWorkspaceCase: null,
    selectedModule: null,
    guideIndex: -1,
    pendingAction: null
  };

  const typologyList = ["All"].concat(data.typologies);

  const typologyDisplay = {
    "Structuring": "CTR Threshold Pattern",
    "TBML": "Trade Finance / Funds Transfer Review",
    "Sanctions Evasion": "OFAC/BSA Risk Indicator",
    "Crypto Layering": "Digital Asset Exposure",
    "Unusual Velocity": "Reporting Velocity Indicator"
  };

  function displayTypology(typology) {
    return typologyDisplay[typology] || typology;
  }

  function displayText(value) {
    return String(value == null ? "" : value)
      .replace(/Sanctions Evasion/g, "OFAC/BSA Risk Indicator")
      .replace(/Crypto Layering/g, "Digital Asset Exposure")
      .replace(/TBML/g, "Trade Finance / Funds Transfer Review")
      .replace(/Unusual Velocity/g, "Reporting Velocity Indicator")
      .replace(/Structuring/g, "CTR Threshold Pattern")
      .replace(/shell-company chain/gi, "complex ownership chain")
      .replace(/shell accounts/gi, "linked legal-entity records")
      .replace(/sanctions graph/gi, "OFAC/BSA reference data")
      .replace(/detector threshold crossed/gi, "examiner testing threshold crossed")
      .replace(/anonymous marketplace escrow/gi, "digital asset exposure pattern")
      .replace(/canonical mixer\/tumbler signature/gi, "digital asset counterparty concentration pattern")
      .replace(/classic peel-chain obfuscation/gi, "layered digital asset transfer pattern")
      .replace(/marketplace proceeds/gi, "digital asset activity")
      .replace(/bribery typology/gi, "control-validation pattern")
      .replace(/value to /gi, "activity to ");
  }

  const coreCapabilities = [
    "Data Ingestion Framework",
    "Feature Engineering Library",
    "Examiner Testing Engine",
    "Supervisory Prioritization Core",
    "Governance & Audit Framework",
    "DevSecOps / Model Lifecycle Management"
  ];

  const missionModules = [
    { id: "m1", label: "Crypto & Digital Asset Supervision", uses: [0, 1, 2, 3, 5] },
    { id: "m2", label: "SAR/CTR Reporting Quality", uses: [0, 1, 2, 3, 4] },
    { id: "m3", label: "FFIEC Transaction Testing Presets", uses: [1, 2, 3, 5] },
    { id: "m4", label: "Examiner Workflow Configuration", uses: [0, 3, 4, 5] },
    { id: "m5", label: "Model Governance & Validation Toolkit", uses: [1, 2, 4, 5] }
  ];

  const guideSteps = [
    { screen: "screen-pipeline", focus: "#source-grid", title: "1. Bank Data Ingestion", body: "Review SAR, CTR, customer, account, funds transfer, and digital asset feeds with batch and streaming modes." },
    { screen: "screen-pipeline", focus: "#entity-resolution-card", title: "2. Entity Resolution", body: "Duplicate source records merge into canonical customers, accounts, and counterparties before examiner testing." },
    { screen: "screen-analytics", focus: "#analytics-graph-canvas", title: "3. Transaction Testing", body: "Graph and heatmap compress heterogeneous activity into examiner-relevant testing patterns." },
    { screen: "screen-triage", focus: "#decision-path", title: "4. Supervisory Routing", body: "Deterministic rules apply score and confidence thresholds to produce examiner review paths." },
    { screen: "screen-triage", focus: "#high-risk-slider", title: "5. Threshold Adjustment", body: "Policy sliders immediately re-route exceptions for what-if governance analysis." },
    { screen: "screen-workspace", focus: "#case-indicators", title: "6. Examiner Review", body: "Examiner reviews per-case FFIEC-aligned indicators, evidence, model explanations, and SAR/CTR lineage, and can apply governed overrides." },
    { screen: "screen-workspace", focus: "#audit-log", title: "7. Audit Trail", body: "Every override and review action is timestamped for defensible examination records." },
    { screen: "screen-enterprise", focus: "#mission-modules", title: "8. Enterprise Deployment & Expansion", body: "Configurable supervisory modules are layered on a shared enterprise platform backbone." }
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
    if (score >= 60) {
      return "risk-medium";
    }
    return "risk-low";
  }

  const TYPOLOGY_PILL_CLASS = {
    "Structuring": "risk-low",
    "TBML": "risk-medium",
    "Sanctions Evasion": "risk-medium",
    "Crypto Layering": "risk-high",
    "Unusual Velocity": "risk-high"
  };

  function typologyPillClass(typology) {
    return TYPOLOGY_PILL_CLASS[typology] || "risk-low";
  }

  function formatSigned(value, decimals) {
    if (value == null || isNaN(value)) return "0";
    const d = decimals == null ? 1 : decimals;
    const sign = value > 0 ? "+" : (value < 0 ? "" : "");
    return sign + value.toFixed(d);
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

    const graph = engine.getFilteredGraph();
    analyticsGraphCache = { graph, risk: riskByEntity };

    if (window.FinCENPatternDetection && window.FinCENViz.setPatternOverlay) {
      const sanctionedNames = new Set((data.sanctionsList || []).map((s) => s.name));
      const survivingIds = new Set(graph.nodes.map((n) => n.id));
      const sanctionedIds = data.entities
        .filter((e) => sanctionedNames.has(e.name) || (e.aliases || []).some((a) => sanctionedNames.has(a)))
        .map((e) => e.id)
        .filter((id) => survivingIds.has(id));
      const overlay = {
        shellChains: window.FinCENPatternDetection.detectShellChains(graph),
        mixers: window.FinCENPatternDetection.detectMixers(graph),
        disposableClusters: window.FinCENPatternDetection.detectDisposableClusters(graph),
        sanctionedIds
      };
      window.FinCENViz.setPatternOverlay(overlay);
      analyticsGraphCache.overlay = overlay;
    }

    renderAnalyticsEmptyState(graph);
    window.FinCENViz.drawGraph(ui.analyticsGraphCanvas, graph, riskByEntity);
    if (window.FinCENGraphA11y) {
      window.FinCENGraphA11y.update(graph, analyticsGraphCache.overlay);
    }
    ensurePulseLoop();
    window.FinCENViz.renderHeatmap(ui.heatmapContainer, engine.getHeatmap());
    renderTestingPresets();

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
            case: matchedCase ? { riskScore: matchedCase.riskScore, typology: displayTypology(matchedCase.typology), whyFlagged: displayText(matchedCase.whyFlagged) } : null,
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
      b.textContent = displayTypology(t);
      b.setAttribute("aria-pressed", engine.getState().selectedTypology === t ? "true" : "false");
      if (engine.getState().selectedTypology === t) {
        b.classList.add("accent");
      }
      b.addEventListener("click", () => {
        engine.setTypologyFilter(t);
        // Clear any stale path/source state tied to nodes that may now be filtered out.
        if (window.FinCENViz.setPathHighlight) window.FinCENViz.setPathHighlight(null);
        analyticsGraphCache.pathSource = null;
        analyticsGraphCache.hasPath = false;
        renderAnalytics();
        renderRouting();
      });
      ui.typologyFilterGroup.appendChild(b);
    });
  }

  function renderAnalyticsEmptyState(graph) {
    const card = ui.analyticsGraphCanvas ? ui.analyticsGraphCanvas.closest(".card") : null;
    if (!card) return;
    let empty = card.querySelector(".graph-empty-state");
    const isEmpty = !graph || !graph.nodes || graph.nodes.length === 0;
    if (isEmpty) {
      if (!empty) {
        empty = document.createElement("div");
        empty.className = "graph-empty-state";
        empty.setAttribute("role", "status");
        empty.setAttribute("aria-live", "polite");
        card.appendChild(empty);
      }
      const typology = engine.getState().selectedTypology;
      empty.textContent = "No entities match the \u201C" + displayTypology(typology) + "\u201D pattern. Select \u201CAll\u201D to restore the full network.";
      ui.analyticsGraphCanvas.setAttribute("aria-hidden", "true");
      ui.analyticsGraphCanvas.style.visibility = "hidden";
    } else {
      if (empty) empty.remove();
      ui.analyticsGraphCanvas.setAttribute("aria-hidden", "false");
      ui.analyticsGraphCanvas.style.visibility = "";
    }
  }

  function renderTestingPresets() {
    if (!ui.testingPresets) return;
    const presets = data.transactionTestingPresets || [];
    ui.testingPresets.innerHTML = presets.map((preset) =>
      "<div class='testing-preset'>" +
        "<div class='metric-row'><strong>" + preset.label + "</strong><span class='pill risk-low'>Preset</span></div>" +
        "<p class='muted'>" + preset.description + "</p>" +
        "<div class='preset-criteria'>" + (preset.criteria || []).map((criterion) => "<span>" + criterion + "</span>").join("") + "</div>" +
      "</div>"
    ).join("");
  }

  function renderCaseCards(routingResults) {
    ui.caseCardsContainer.innerHTML = "";
    const entityById = {};
    data.entities.forEach((e) => { entityById[e.id] = e; });

    // Apply search filter
    const q = (appState.caseCardsSearch || "").toLowerCase();
    const filtered = routingResults.filter((c) => {
      if (!q) return true;
      const entityName = entityById[c.entityId] ? entityById[c.entityId].name.toLowerCase() : "";
      return c.caseId.toLowerCase().indexOf(q) !== -1
        || c.typology.toLowerCase().indexOf(q) !== -1
        || displayTypology(c.typology).toLowerCase().indexOf(q) !== -1
        || (c.entityId || "").toLowerCase().indexOf(q) !== -1
        || entityName.indexOf(q) !== -1;
    });

    // Apply sort
    const sorted = filtered.slice();
    const sortKey = appState.caseCardsSort || "risk-desc";
    const comparators = {
      "risk-desc":       (a, b) => b.riskScore - a.riskScore,
      "risk-asc":        (a, b) => a.riskScore - b.riskScore,
      "confidence-desc": (a, b) => b.confidence - a.confidence,
      "confidence-asc":  (a, b) => a.confidence - b.confidence,
      "typology-asc":    (a, b) => a.typology.localeCompare(b.typology) || b.riskScore - a.riskScore,
      "caseId-asc":      (a, b) => a.caseId.localeCompare(b.caseId)
    };
    sorted.sort(comparators[sortKey] || comparators["risk-desc"]);

    if (ui.caseCardsResultCount) {
      ui.caseCardsResultCount.textContent = q
        ? "Showing " + sorted.length + " of " + routingResults.length
        : "";
    }

    if (!sorted.length) {
      ui.caseCardsContainer.innerHTML = emptyState(
        q
          ? { icon: "search", title: "No exceptions match '" + q + "'.", body: "Clear the search or broaden the testing-pattern filter.", hint: "Search \u00b7 No results" }
          : { icon: "search", title: "No exceptions match the current filter.", body: "Adjust the testing-pattern filter above or widen the supervisory thresholds.", hint: "Filter \u00b7 No results" }
      );
      if (window.FinCENIcons) window.FinCENIcons.hydrate(ui.caseCardsContainer);
      return;
    }
    sorted.forEach((c) => {
      const entity = entityById[c.entityId];
      const entityName = entity ? entity.name : c.entityId;
      const card = document.createElement("div");
      card.className = "case-card";
      card.innerHTML =
        "<div class='metric-row'><strong>" + c.caseId + "</strong><span class='pill " + scoreClass(c.riskScore) + "'>" + displayTypology(c.typology) + "</span></div>" +
        "<div class='metric-row'><span class='muted'>Entity</span><span>" + entityName + "</span></div>" +
        "<div class='metric-row'><span class='muted'>Confidence</span><span>" + c.confidence + "%</span></div>" +
        "<div class='metric-row'><span class='muted'>Review Path</span><span>" + c.destination + "</span></div>" +
        "<div class='muted' style='font-size:0.82rem;margin:6px 0'>" + c.contributingFeatures.map(displayText).join(" | ") + "</div>" +
        "<div style='font-size:0.82rem'>" + displayText(c.whyFlagged) + "</div>" +
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
    const Q = window.FinCENEngine.QUEUE_NAMES;
    const QUEUE_EMPTY_COPY = {
      [Q.INTELLIGENCE]: { title: "No exceptions pending additional examiner review.", body: "High-risk, lower-confidence exceptions arrive here." },
      [Q.ENFORCEMENT]:  { title: "No active supervisory escalations.", body: "High-risk, high-confidence exceptions escalate here." },
      [Q.ANALYST_REVIEW]: { title: "No exceptions awaiting examiner review.", body: "Medium-risk exceptions land here for examiner judgment." },
      [Q.MONITORING]:   { title: "No exceptions in monitoring / no finding.", body: "Low-risk exceptions close here with documented rationale." }
    };
    const entityById = {};
    data.entities.forEach((e) => { entityById[e.id] = e; });
    const q = (appState.routingSearch || "").toLowerCase();
    const matchesSearch = (c) => {
      if (!q) return true;
      const entity = entityById[c.entityId];
      const name = entity ? entity.name.toLowerCase() : "";
      return c.caseId.toLowerCase().indexOf(q) !== -1
        || c.typology.toLowerCase().indexOf(q) !== -1
        || displayTypology(c.typology).toLowerCase().indexOf(q) !== -1
        || (c.entityId || "").toLowerCase().indexOf(q) !== -1
        || name.indexOf(q) !== -1;
    };
    let totalShown = 0;
    let totalCases = 0;
    Object.keys(queues).forEach((qname) => {
      const allInQueue = queues[qname];
      totalCases += allInQueue.length;
      const filtered = allInQueue.filter(matchesSearch);
      totalShown += filtered.length;
      const col = document.createElement("div");
      col.className = "routing-col";
      const title = document.createElement("h4");
      title.textContent = q
        ? qname + " (" + filtered.length + " / " + allInQueue.length + ")"
        : qname + " (" + allInQueue.length + ")";
      col.appendChild(title);

      if (filtered.length === 0) {
        const copy = q
          ? { icon: "search", title: "No matches in this queue", body: "Try a different search or clear the input." }
          : {
              icon: "triage",
              title: (QUEUE_EMPTY_COPY[qname] || {}).title || "Queue empty.",
              body: (QUEUE_EMPTY_COPY[qname] || {}).body || ""
            };
        col.insertAdjacentHTML("beforeend", emptyState(copy));
      } else {
        filtered
          .sort((a, b) => b.riskScore - a.riskScore)
          .forEach((c) => {
            const entity = entityById[c.entityId];
            const entityName = entity ? entity.name : c.entityId;
            const item = document.createElement("div");
            item.className = "route-card";
            item.innerHTML =
              "<strong>" + c.caseId + "</strong> <span class='muted'>" + entityName + "</span><br/>" +
              "<span class='muted'>" + displayTypology(c.typology) + "</span><br/>" +
              "Risk " + c.riskScore + " | Confidence " + c.confidence +
              (c.overridden ? "<br/><span class='pill risk-medium'>Overridden</span>" : "");
            col.appendChild(item);
          });
      }
      ui.routingBoard.appendChild(col);
    });
    if (ui.routingResultCount) {
      ui.routingResultCount.textContent = q
        ? "Showing " + totalShown + " of " + totalCases + " exceptions"
        : "";
    }
    if (window.FinCENIcons) window.FinCENIcons.hydrate(ui.routingBoard);

    const policy = engine.getState().policy;
    ui.decisionPath.innerHTML =
      "<div>IF risk >= <strong>" + policy.highRiskThreshold + "</strong> AND confidence >= <strong>" + policy.confidenceThreshold + "</strong> -> " + Q.ENFORCEMENT + "</div>" +
      "<div>IF risk >= <strong>" + policy.highRiskThreshold + "</strong> AND confidence &lt; <strong>" + policy.confidenceThreshold + "</strong> -> " + Q.INTELLIGENCE + "</div>" +
      "<div>IF risk >= <strong>" + policy.mediumRiskThreshold + "</strong> -> " + Q.ANALYST_REVIEW + "</div>" +
      "<div>ELSE -> " + Q.MONITORING + "</div>" +
      "<div class='muted' style='margin-top:8px'>Jurisdiction weight modifier: " + policy.jurisdictionWeight.toFixed(1) + "</div>";

    window.FinCENViz.drawScatter(ui.triageScatterCanvas, routing.results, policy);
    updateTabBadges(routing);
    renderKPIStrip(routing);
    ui.kpiBias.textContent = window.FinCENEngine.computeReviewBalance(
      routing.results,
      data.entities,
      { highRiskThreshold: policy.highRiskThreshold }
    ).label;
  }

  function updateTabBadges(routing) {
    const triageTab = ui.tabNav.querySelector('[data-screen="screen-triage"]');
    const workspaceTab = ui.tabNav.querySelector('[data-screen="screen-workspace"]');
    if (triageTab) {
      triageTab.textContent = "Supervisory Prioritization (" + routing.results.length + ")";
    }
    if (workspaceTab) {
      workspaceTab.textContent = "Examiner Workspace (" + routing.queues[window.FinCENEngine.QUEUE_NAMES.ANALYST_REVIEW].length + ")";
    }
  }

  function renderKPIStrip(precomputedRouting) {
    const routing = precomputedRouting || engine.getRouting();
    const total = routing.results.length;
    const QN = window.FinCENEngine.QUEUE_NAMES;
    const enforcement = routing.queues[QN.ENFORCEMENT].length;
    const intelligence = routing.queues[QN.INTELLIGENCE].length;
    const avg = total ? (routing.results.reduce((sum, x) => sum + x.riskScore, 0) / total) : 0;
    const anim = window.FinCENMotion && window.FinCENMotion.animateDigits;
    const write = (el, val, opts) => {
      if (anim) {
        anim(el, val, opts || {});
      } else {
        el.textContent = typeof val === "number" ? (Number.isInteger(val) ? String(val) : val.toFixed(1)) : String(val);
      }
    };
    // Total Entities reflects the ER graph's current typology-filtered population
    // so the KPI moves in lockstep with the graph and Signal table.
    const totalEntities = engine.getFilteredGraph().nodes.length;
    write(ui.kpiTotalEntities, totalEntities);
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
    const entityById = (function () {
      const idx = {};
      data.entities.forEach((e) => { idx[e.id] = e; });
      return idx;
    })();
    const q = (appState.workspaceSearch || "").toLowerCase();
    const matches = (c) => {
      if (!q) return true;
      const entity = entityById[c.entityId];
      const entityName = entity ? entity.name : "";
      return c.caseId.toLowerCase().indexOf(q) !== -1
        || c.typology.toLowerCase().indexOf(q) !== -1
        || displayTypology(c.typology).toLowerCase().indexOf(q) !== -1
        || entityName.toLowerCase().indexOf(q) !== -1
        || (c.entityId || "").toLowerCase().indexOf(q) !== -1;
    };
    const filtered = allCases.filter(matches);
    ui.workspaceCaseSelect.innerHTML = "";
    filtered.forEach((c) => {
      const entity = entityById[c.entityId];
      const entityName = entity ? entity.name : c.entityId;
      const opt = document.createElement("option");
      opt.value = c.caseId;
      opt.textContent = c.caseId + " - " + entityName + " - " + displayTypology(c.typology) + " (" + c.destination + ")";
      ui.workspaceCaseSelect.appendChild(opt);
    });
    if (filtered.length === 0) {
      // Keep the select empty and surface a placeholder; selection stays on
      // whatever it was so the user can clear search to restore context.
      const opt = document.createElement("option");
      opt.disabled = true;
      opt.textContent = "No exceptions match '" + (appState.workspaceSearch || "") + "'";
      ui.workspaceCaseSelect.appendChild(opt);
    } else {
      const stillVisible = filtered.some((c) => c.caseId === appState.selectedWorkspaceCase);
      if (!stillVisible) {
        appState.selectedWorkspaceCase = filtered[0].caseId;
      }
      ui.workspaceCaseSelect.value = appState.selectedWorkspaceCase;
    }
    renderWorkspaceCase();
    renderAudit();
    renderBiasIndicator();
  }

  // Per-case indicator components (transaction velocity, jurisdiction
  // exposure, ownership depth) — consolidated here from the former Signal
  // Engineering tab, scoped to the currently selected exception.
  function renderCaseIndicators(c) {
    if (!ui.caseIndicators) return;
    const entity = data.entities.find((e) => e.id === c.entityId);
    const feature = engine.getDerivedFeatures().find((f) => f.entityId === c.entityId);
    if (!feature) {
      ui.caseIndicators.innerHTML = "<div class='evidence'><h4>Indicators</h4><div class='muted'>No indicator data available for this exception.</div></div>";
      return;
    }
    const d = feature.derived;
    const series = engine.getSignalSeriesByEntity(c.entityId);
    const txPerDay = series ? series.summary.txPerDay.toFixed(2) + " tx/day" : "—";
    const indicatorCell = (label, score, detail) =>
      "<div class='evidence'><h4>" + label + "</h4>" +
      "<div class='metric-row'><span class='muted'>Score</span><span class='pill " + scoreClass(score) + "'>" + score + "</span></div>" +
      "<div class='muted'>" + detail + "</div></div>";
    ui.caseIndicators.innerHTML =
      indicatorCell("Transaction Velocity", d.transactionVelocityScore, "Observed activity rate: " + txPerDay) +
      indicatorCell("Jurisdiction Exposure", d.jurisdictionRiskScore, "Jurisdiction: " + ((entity && entity.jurisdiction) || "—") + (d.crossBorderExposureFlag ? " · cross-border activity present" : "")) +
      indicatorCell("Ownership Depth", d.beneficialOwnershipNetworkScore, "Beneficial-ownership network depth across linked counterparties");
  }

  // Hydrate every [data-copy] node from the centralized copy file so all
  // user-facing HITL wording stays editable in js/copy.js alone.
  function applyCentralizedCopy() {
    if (!window.FinCENCopy) return;
    Array.from(document.querySelectorAll("[data-copy]")).forEach((node) => {
      const key = node.getAttribute("data-copy");
      if (typeof window.FinCENCopy[key] === "string") {
        node.textContent = window.FinCENCopy[key];
      }
    });
  }

  function renderProposedNextSteps(c) {
    const list = document.getElementById("proposed-next-steps");
    if (!list || !window.FinCENNextSteps || !window.FinCENCopy) return;
    const feature = engine.getDerivedFeatures().find((f) => f.entityId === c.entityId);
    const base = data.flaggedCases.find((x) => x.caseId === c.caseId);
    const record = {
      derived: feature ? feature.derived : {},
      regulatoryReview: base ? base.regulatoryReview : {}
    };
    const keys = window.FinCENNextSteps.suggest(record);
    list.innerHTML = keys
      .map((key) => "<li>" + window.FinCENCopy.NEXT_STEPS[key] + "</li>")
      .join("");
  }

  function renderWorkspaceCase() {
    const routingResults = engine.getRouting().results;
    const c = routingResults.find((x) => x.caseId === appState.selectedWorkspaceCase) || routingResults[0];
    if (!c) {
      return;
    }
    appState.selectedWorkspaceCase = c.caseId;
    ui.overrideScore.value = c.riskScore;
    renderCaseIndicators(c);
    renderProposedNextSteps(c);

    const base = data.flaggedCases.find((x) => x.caseId === c.caseId);
    const entity = data.entities.find((e) => e.id === c.entityId);
    const tx = data.transactions.filter((t) => base.relatedTransactionIds.indexOf(t.id) >= 0);
    const review = base.regulatoryReview || {};
    const fieldStatusClass = review.requiredFieldsComplete ? "risk-low" : "risk-medium";
    const reconciliationClass = review.sourceRecordsReconciled ? "risk-low" : "risk-medium";
    const timelinessClass = review.timelinessStatus === "On time" ? "risk-low" : review.timelinessStatus === "Late" ? "risk-high" : "risk-medium";

    ui.evidenceGrid.innerHTML =
      "<div class='evidence'><h4>Entity Profile</h4><div>" + entity.name + "</div><div class='muted'>" + entity.jurisdiction + " | " + entity.kind + "</div></div>" +
      "<div class='evidence'><h4>Examiner Testing Rationale</h4><div class='muted'>" + displayText(c.whyFlagged) + "</div></div>" +
      "<div class='evidence'><h4>FFIEC-Aligned Indicators</h4><div class='muted'>" + c.contributingFeatures.map(displayText).join(", ") + "</div></div>" +
      "<div class='evidence'><h4>SAR/CTR Validation</h4>" +
        "<div class='metric-row'><span class='muted'>Filing Type</span><span>" + (review.filingType || "SAR/CTR") + "</span></div>" +
        "<div class='metric-row'><span class='muted'>Required Fields</span><span class='pill " + fieldStatusClass + "'>" + (review.requiredFieldsComplete ? "Complete" : "Exception") + "</span></div>" +
        "<div class='metric-row'><span class='muted'>Timeliness</span><span class='pill " + timelinessClass + "'>" + (review.timelinessStatus || "Pending") + "</span></div>" +
        "<div class='metric-row'><span class='muted'>Source Records</span><span class='pill " + reconciliationClass + "'>" + (review.sourceRecordsReconciled ? "Reconciled" : "Gap") + "</span></div>" +
      "</div>" +
      "<div class='evidence'><h4>Reporting Lineage</h4>" +
        "<div class='muted'>" + (review.reportableTrigger || "Source transactions traced to SAR/CTR candidate record, filing status, timeliness window, and supporting customer/account evidence.") + "</div>" +
        "<div class='spacer-sm'></div>" +
        "<div class='metric-row'><span class='muted'>Due</span><span>" + (review.dueDate || "Pending") + "</span></div>" +
        "<div class='metric-row'><span class='muted'>Filed</span><span>" + (review.filedDate || "Pending") + "</span></div>" +
      "</div>" +
      "<div class='evidence'><h4>Examiner Disposition</h4><div class='muted'>" + (review.examinerDisposition || "Document review rationale before closure or escalation.") + "</div></div>" +
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
    const status = window.FinCENEngine.computeReviewBalance(
      engine.getRouting().results,
      data.entities,
      { highRiskThreshold: engine.getState().policy.highRiskThreshold }
    );
    ui.biasIndicator.className = "pill " + status.className;
    ui.biasIndicator.textContent = status.label;
    ui.kpiBias.textContent = ui.biasIndicator.textContent;
    ui.biasDetail.innerHTML =
      "<div>" + status.detail + "</div>" +
      "<div class='spacer-sm'></div>" +
      status.rows.map((r) => {
        const pct = Math.round(r.rate * 100);
        return r.jurisdiction + ": " + pct + "% high-risk (" + r.high + "/" + r.total + ")";
      })
      .join("<br/>");
  }

  function bindWorkspaceActions() {
    ui.workspaceCaseSelect.addEventListener("change", () => {
      appState.selectedWorkspaceCase = ui.workspaceCaseSelect.value;
      renderWorkspaceCase();
    });

    if (ui.workspaceCaseSearch) {
      ui.workspaceCaseSearch.addEventListener("input", (ev) => {
        appState.workspaceSearch = ev.target.value || "";
        renderWorkspace();
      });
    }

    ui.applyOverrideBtn.addEventListener("click", () => {
      engine.applyOverride(
        appState.selectedWorkspaceCase,
        Number(ui.overrideScore.value),
        ui.overrideRationale.value,
        "Examiner K. Rivera"
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
        "Examiner K. Rivera",
        ui.overrideRationale.value || "Manual examiner action."
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
    if (!topbar || !window.FinCENScrollClassToggle) return;
    // Hysteresis: enter compressed mode at 44px, exit at 20px. The 24px
    // dead zone stops the class from flickering on slow or wheel-inertia
    // scrolling across a single threshold. The shared FinCENScrollClassToggle
    // primitive enforces the hysteresis contract (see js/scroll-class.js).
    return window.FinCENScrollClassToggle.bind({
      enterAt: 44,
      exitAt: 20,
      toggle(on) {
        topbar.classList.toggle("is-compressed", on);
        document.body.classList.toggle("is-scrolled", on);
      }
    });
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
      { id: "screen-analytics", title: "Go to Transaction Testing", icon: "analytics" },
      { id: "screen-triage",    title: "Go to Supervisory Prioritization", icon: "triage" },
      { id: "screen-workspace", title: "Go to Examiner Workspace", icon: "workspace" },
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
        title: "Filter exceptions: " + displayTypology(t),
        keywords: "typology pattern testing exception " + t + " " + displayTypology(t),
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
      title: "Clear traced transaction path",
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

    // Top-N exceptions as jump-to-entity commands.
    data.flaggedCases.slice(0, 30).forEach((fc) => {
      const entity = data.entities.find((e) => e.id === fc.entityId);
      if (!entity) return;
      cmd.registerCommand({
        id: "entity." + entity.id,
        title: "Find entity: " + entity.name,
        keywords: entity.kind + " " + entity.jurisdiction + " " + fc.typology + " " + displayTypology(fc.typology) + " " + entity.id,
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

  function bindRoutingSearch() {
    if (!ui.routingSearch) return;
    ui.routingSearch.addEventListener("input", (ev) => {
      appState.routingSearch = ev.target.value || "";
      renderRouting();
    });
  }

  function bindCaseCardsControls() {
    if (ui.caseCardsSearch) {
      ui.caseCardsSearch.addEventListener("input", (ev) => {
        appState.caseCardsSearch = ev.target.value || "";
        renderAnalytics();
      });
    }
    if (ui.caseCardsSort) {
      ui.caseCardsSort.addEventListener("change", (ev) => {
        appState.caseCardsSort = ev.target.value || "risk-desc";
        renderAnalytics();
      });
    }
  }

  function boot() {
    applyCentralizedCopy();
    bindNavigation();
    bindPolicyControls();
    bindWorkspaceActions();
    bindRoutingSearch();
    bindCaseCardsControls();
    startStatusClock();
    bindGuide();
    bindGlobalKeys();

    renderPipeline();
    startIngestionSimulation();
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
