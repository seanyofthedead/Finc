(function () {
  "use strict";

  function indexById(items) {
    const map = {};
    items.forEach((item) => {
      map[item.id] = item;
    });
    return map;
  }

  function round(v) {
    return Math.round(v * 100) / 100;
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function buildTransactionStats(data) {
    const byEntity = {};
    data.entities.forEach((e) => {
      byEntity[e.id] = { txCount: 0, crossBorder: 0, totalUsd: 0, peerSet: new Set() };
    });

    data.transactions.forEach((tx) => {
      const from = byEntity[tx.fromEntityId];
      const to = byEntity[tx.toEntityId];
      if (!from || !to) {
        return;
      }
      from.txCount += 1;
      to.txCount += 1;
      from.totalUsd += tx.amountUsd;
      to.totalUsd += tx.amountUsd;
      if (tx.isCrossBorder) {
        from.crossBorder += 1;
        to.crossBorder += 1;
      }
      from.peerSet.add(tx.toEntityId);
      to.peerSet.add(tx.fromEntityId);
    });

    return byEntity;
  }

  function deriveFeatures(data) {
    const stats = buildTransactionStats(data);
    const entityIndex = indexById(data.entities);

    return data.flaggedCases.map((c) => {
      const entity = entityIndex[c.entityId];
      const s = stats[c.entityId];
      const jurisdictionBase = (data.jurisdictionRisk[entity.jurisdiction] || 0.35) * 100;
      const typologyFactor = data.typologySeverity[c.typology] || 1;
      const velocityScore = clamp(round((s.txCount * 3.4 + c.riskScore * 0.24) * typologyFactor), 0, 100);
      const ownershipNetworkScore = clamp(round((s.peerSet.size * 9 + c.jurisdictionRelevance * 0.35)), 0, 100);
      const peerDeviation = clamp(round(Math.abs(c.riskScore - (50 + s.txCount)) * 0.92), 0, 100);
      const jurisdictionRiskScore = clamp(round(jurisdictionBase + c.jurisdictionRelevance * 0.2), 0, 100);
      const crossBorderExposure = s.crossBorder >= 4;
      const enrichmentSources = c.enrichmentSources;

      return {
        caseId: c.caseId,
        entityId: c.entityId,
        entityName: entity.name,
        typologyTag: c.typology,
        rawInputs: c.rawInputs,
        enrichmentSources,
        riskScore: c.riskScore,
        confidence: c.confidence,
        contributingFeatures: c.contributingFeatures,
        whyFlagged: c.whyFlagged,
        derived: {
          transactionVelocityScore: velocityScore,
          jurisdictionRiskScore,
          beneficialOwnershipNetworkScore: ownershipNetworkScore,
          peerGroupDeviation: peerDeviation,
          crossBorderExposureFlag: crossBorderExposure
        }
      };
    });
  }

  function scoreCase(baseCase, policy, data) {
    const typologyWeight = data.typologySeverity[baseCase.typology] || 1;
    const jurisdictionAdjust = (baseCase.jurisdictionRelevance / 100) * policy.jurisdictionWeight;
    const adjustedRisk = clamp(
      round(baseCase.riskScore * typologyWeight + jurisdictionAdjust * 12),
      0,
      100
    );
    const adjustedConfidence = clamp(round(baseCase.confidence + jurisdictionAdjust * 3), 0, 100);

    return {
      caseId: baseCase.caseId,
      entityId: baseCase.entityId,
      typology: baseCase.typology,
      baseRisk: baseCase.riskScore,
      riskScore: adjustedRisk,
      confidence: adjustedConfidence,
      jurisdictionRelevance: baseCase.jurisdictionRelevance,
      whyFlagged: baseCase.whyFlagged,
      contributingFeatures: baseCase.contributingFeatures
    };
  }

  function routeCase(scoredCase, policy) {
    if (scoredCase.riskScore >= policy.highRiskThreshold && scoredCase.confidence >= policy.confidenceThreshold) {
      return "Enforcement Referral";
    }
    if (scoredCase.riskScore >= policy.highRiskThreshold && scoredCase.confidence < policy.confidenceThreshold) {
      return "Intelligence Queue";
    }
    if (scoredCase.riskScore >= policy.mediumRiskThreshold) {
      return "Analyst Review";
    }
    return "Monitoring / Auto-close";
  }

  function computeRouting(data, policy, typologyFilter) {
    const results = data.flaggedCases
      .filter((c) => !typologyFilter || typologyFilter === "All" || c.typology === typologyFilter)
      .map((c) => scoreCase(c, policy, data))
      .map((c) => {
        const destination = routeCase(c, policy);
        return { ...c, destination };
      });

    const queues = {
      "Intelligence Queue": [],
      "Enforcement Referral": [],
      "Analyst Review": [],
      "Monitoring / Auto-close": []
    };

    results.forEach((r) => {
      queues[r.destination].push(r);
    });

    Object.keys(queues).forEach((k) => {
      queues[k].sort((a, b) => b.riskScore - a.riskScore);
    });

    return { results, queues };
  }

  function buildGraph(data) {
    const nodes = data.entities.map((e) => ({
      id: e.id,
      label: e.name,
      group: e.kind,
      jurisdiction: e.jurisdiction
    }));
    const edgeMap = {};
    data.transactions.forEach((tx) => {
      const key = tx.fromEntityId + "->" + tx.toEntityId;
      if (!edgeMap[key]) {
        edgeMap[key] = { from: tx.fromEntityId, to: tx.toEntityId, weight: 0, crossBorder: tx.isCrossBorder };
      }
      edgeMap[key].weight += 1;
    });
    const edges = Object.values(edgeMap).slice(0, 60);
    return { nodes, edges };
  }

  // Narrow the full graph to entities tied to the given typology plus their direct
  // transaction counterparties. Pure: derives a new { nodes, edges } view without
  // mutating source data. Returns the full graph when typology is falsy or "All".
  // Builds edges directly from transactions within the filtered node set so the
  // full-graph 60-edge cap doesn't starve the filtered view of relevant edges.
  function filterGraphByTypology(data, typology) {
    if (!typology || typology === "All") return buildGraph(data);

    const subjectIds = new Set(
      (data.flaggedCases || [])
        .filter((c) => c.typology === typology)
        .map((c) => c.entityId)
    );
    if (subjectIds.size === 0) return { nodes: [], edges: [] };

    const includedIds = new Set(subjectIds);
    (data.transactions || []).forEach((tx) => {
      if (subjectIds.has(tx.fromEntityId)) includedIds.add(tx.toEntityId);
      if (subjectIds.has(tx.toEntityId)) includedIds.add(tx.fromEntityId);
    });

    const nodes = (data.entities || [])
      .filter((e) => includedIds.has(e.id))
      .map((e) => ({ id: e.id, label: e.name, group: e.kind, jurisdiction: e.jurisdiction }));

    const edgeMap = {};
    (data.transactions || []).forEach((tx) => {
      if (!includedIds.has(tx.fromEntityId) || !includedIds.has(tx.toEntityId)) return;
      const key = tx.fromEntityId + "->" + tx.toEntityId;
      if (!edgeMap[key]) {
        edgeMap[key] = { from: tx.fromEntityId, to: tx.toEntityId, weight: 0, crossBorder: tx.isCrossBorder };
      }
      edgeMap[key].weight += 1;
    });
    const edges = Object.values(edgeMap).slice(0, 60);
    return { nodes, edges };
  }

  function buildHeatmap(data) {
    const typologies = ["Structuring", "TBML", "Sanctions Evasion", "Crypto Layering", "Unusual Velocity"];
    const jurisdictions = Object.keys(data.jurisdictionRisk);
    const matrix = [];
    jurisdictions.forEach((j) => {
      const row = { jurisdiction: j, cells: {} };
      typologies.forEach((t) => {
        row.cells[t] = 0;
      });
      matrix.push(row);
    });

    const entityById = indexById(data.entities);
    const typologyForTx = (tx) => {
      if (tx.channel === "crypto") {
        return "Crypto Layering";
      }
      if (tx.amountUsd >= 9800 && tx.amountUsd <= 10000) {
        return "Structuring";
      }
      if (tx.isCrossBorder && tx.amountUsd > 30000) {
        return "TBML";
      }
      if (tx.source === "SRC_XBORDER") {
        return "Unusual Velocity";
      }
      return "Sanctions Evasion";
    };

    // Build ambient volume counts from transaction flow to avoid sparse all-zero views.
    data.transactions.forEach((tx) => {
      const fromEntity = entityById[tx.fromEntityId];
      if (!fromEntity) {
        return;
      }
      const row = matrix.find((m) => m.jurisdiction === fromEntity.jurisdiction);
      if (!row) {
        return;
      }
      const bucket = typologyForTx(tx);
      row.cells[bucket] += 1;
    });

    // Normalize ambient counts into a compact range for readability.
    matrix.forEach((row) => {
      typologies.forEach((t) => {
        const base = row.cells[t];
        row.cells[t] = Math.max(1, Math.min(4, Math.round(base / 5)));
      });
    });

    // Overlay explicit flagged-case anomalies on top of ambient baseline.
    data.flaggedCases.forEach((c) => {
      const e = entityById[c.entityId];
      const row = matrix.find((m) => m.jurisdiction === e.jurisdiction);
      if (row) {
        row.cells[c.typology] += 2;
      }
    });
    return { typologies, jurisdictions, matrix };
  }

  function medianOf(arr) {
    if (!arr || !arr.length) return 0;
    const sorted = arr.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  function madOf(arr, median) {
    if (!arr || !arr.length) return 0;
    const deviations = arr.map((v) => Math.abs(v - median));
    return medianOf(deviations);
  }

  function computeBucketStats(data) {
    const BUCKETS = 8;
    const dayMs = 24 * 60 * 60 * 1000;
    const times = (data.transactions || [])
      .map((tx) => new Date(tx.timestamp).getTime())
      .filter((t) => !isNaN(t));
    const byEntity = {};
    (data.entities || []).forEach((e) => {
      byEntity[e.id] = new Array(BUCKETS).fill(0);
    });
    const firstTx = {};
    const lastTx = {};
    if (!times.length) {
      return { buckets: BUCKETS, bucketMs: 0, minTs: 0, maxTs: 0, bucketDays: 0, byEntity, firstTx, lastTx };
    }
    const minTs = Math.min.apply(null, times);
    const maxTs = Math.max.apply(null, times);
    const span = Math.max(1, maxTs - minTs);
    const bucketMs = span / BUCKETS;
    const bucketDays = Math.max(1, Math.round(bucketMs / dayMs));

    data.transactions.forEach((tx) => {
      const t = new Date(tx.timestamp).getTime();
      if (isNaN(t)) return;
      const bIdx = Math.min(BUCKETS - 1, Math.floor((t - minTs) / bucketMs));
      [tx.fromEntityId, tx.toEntityId].forEach((eid) => {
        if (!byEntity[eid]) return;
        byEntity[eid][bIdx] += 1;
        if (firstTx[eid] === undefined || t < firstTx[eid]) firstTx[eid] = t;
        if (lastTx[eid] === undefined || t > lastTx[eid]) lastTx[eid] = t;
      });
    });

    return { buckets: BUCKETS, bucketMs, minTs, maxTs, bucketDays, byEntity, firstTx, lastTx };
  }

  function buildSignalSeries(data, caseId, stats) {
    const caseRecord = (data.flaggedCases || []).find((c) => c.caseId === caseId);
    if (!caseRecord) return null;
    const entityIndex = indexById(data.entities || []);
    const entity = entityIndex[caseRecord.entityId];
    if (!entity) return null;

    const { buckets, byEntity, firstTx, lastTx, minTs, bucketMs, bucketDays } = stats;
    const dayMs = 24 * 60 * 60 * 1000;
    const velocityValues = (byEntity[entity.id] || new Array(buckets).fill(0)).slice();

    let peers = (data.entities || []).filter((e) => e.kind === entity.kind && e.id !== entity.id);
    let peerGroupLabel = "kind=" + entity.kind;
    const MIN_PEER_COUNT = 2;
    const peerCohortCounts = () => peers.map((p) => (byEntity[p.id] || []).reduce((a, b) => a + b, 0));
    const cohortMad = () => {
      const totals = peerCohortCounts();
      return madOf(totals, medianOf(totals));
    };
    // Expand cohort when it is too small OR too homogeneous/idle to be a yardstick
    // (otherwise the MAD collapses to zero and the z-score degenerates to raw velocity).
    if (peers.length < MIN_PEER_COUNT || cohortMad() < 1) {
      peers = (data.entities || []).filter((e) => e.id !== entity.id);
      peerGroupLabel = "all entities (" + entity.kind + " cohort degenerate)";
    }
    const deviationValues = velocityValues.map((ev, b) => {
      const peerCounts = peers.map((p) => (byEntity[p.id] || [])[b] || 0);
      const med = medianOf(peerCounts);
      const mad = Math.max(1, madOf(peerCounts, med));
      return round((ev - med) / mad);
    });

    const entityTotalTx = velocityValues.reduce((a, b) => a + b, 0);
    const eFirst = firstTx[entity.id];
    const eLast = lastTx[entity.id];
    const activeDays = (eFirst !== undefined && eLast !== undefined && eLast > eFirst)
      ? Math.max(1, (eLast - eFirst) / dayMs)
      : 1;
    const txPerDay = round(entityTotalTx / activeDays);

    const peerTxPerDay = peers.map((p) => {
      const arr = byEntity[p.id] || [];
      const total = arr.reduce((a, b) => a + b, 0);
      const pF = firstTx[p.id];
      const pL = lastTx[p.id];
      const pDays = (pF !== undefined && pL !== undefined && pL > pF)
        ? Math.max(1, (pL - pF) / dayMs)
        : 1;
      return total / pDays;
    });
    const peerMedTxPerDay = medianOf(peerTxPerDay);
    const peerMad = Math.max(0.01, madOf(peerTxPerDay, peerMedTxPerDay));
    const peerZ = round((txPerDay - peerMedTxPerDay) / peerMad);

    // Bucket-level deviation summaries — these mirror what the sparkline plots.
    const peerDeviationMean = deviationValues.length
      ? round(deviationValues.reduce((a, b) => a + b, 0) / deviationValues.length)
      : 0;
    const peerDeviationPeakAbs = deviationValues.length
      ? round(Math.max.apply(null, deviationValues.map(Math.abs)))
      : 0;

    const bucketLabels = velocityValues.map((_, i) => {
      if (!bucketMs) return "P" + (i + 1);
      const bStart = new Date(minTs + i * bucketMs);
      const mm = bStart.getUTCMonth() + 1;
      const yy = String(bStart.getUTCFullYear()).slice(2);
      return mm + "/" + yy;
    });

    return {
      caseId,
      bucketDays,
      bucketLabels,
      velocity: {
        values: velocityValues,
        unit: "tx / " + bucketDays + " days",
        peakLabel: (Math.max.apply(null, velocityValues.length ? velocityValues : [0])) + " tx"
      },
      peerDeviation: {
        values: deviationValues,
        unit: "\u03c3 from peer median",
        peerGroup: peerGroupLabel
      },
      summary: {
        txPerDay,
        peerMedianTxPerDay: round(peerMedTxPerDay),
        peerMad: round(peerMad),
        peerZ,
        peerDeviationMean,
        peerDeviationPeakAbs
      }
    };
  }

  function createAuditLog(data) {
    const entries = data.historicalOutcomes.map((x) => ({
      id: x.caseId + "-hist",
      timestamp: x.closeDate,
      actor: x.analyst,
      action: x.result,
      details: "Historical case outcome imported for audit context."
    }));
    entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return entries;
  }

  function buildEngine(data) {
    const state = {
      policy: {
        highRiskThreshold: 85,
        mediumRiskThreshold: 60,
        confidenceThreshold: 75,
        jurisdictionWeight: 1
      },
      selectedTypology: "All",
      overrides: {},
      auditLog: createAuditLog(data)
    };

    const bucketStats = computeBucketStats(data);
    const signalSeriesCache = {};

    return {
      getState() {
        return state;
      },
      getDerivedFeatures() {
        return deriveFeatures(data);
      },
      getSignalSeries(caseId) {
        if (!signalSeriesCache[caseId]) {
          signalSeriesCache[caseId] = buildSignalSeries(data, caseId, bucketStats);
        }
        return signalSeriesCache[caseId];
      },
      getGraph() {
        return buildGraph(data);
      },
      getFilteredGraph() {
        return filterGraphByTypology(data, state.selectedTypology);
      },
      getHeatmap() {
        return buildHeatmap(data);
      },
      getRouting() {
        const routing = computeRouting(data, state.policy, state.selectedTypology);
        routing.results = routing.results.map((r) => {
          if (state.overrides[r.caseId]) {
            return { ...r, riskScore: state.overrides[r.caseId].riskScore, destination: state.overrides[r.caseId].destination || r.destination, overridden: true };
          }
          return r;
        });
        return routing;
      },
      updatePolicy(partial) {
        state.policy = { ...state.policy, ...partial };
      },
      setTypologyFilter(typology) {
        state.selectedTypology = typology;
      },
      resolveEntities() {
        return data.entityResolution;
      },
      applyOverride(caseId, riskScore, rationale, actor) {
        const routing = computeRouting(data, state.policy, state.selectedTypology);
        const target = routing.results.find((r) => r.caseId === caseId);
        if (!target) {
          return null;
        }
        state.overrides[caseId] = {
          riskScore: clamp(Number(riskScore), 0, 100),
          rationale: rationale || "No rationale provided.",
          destination: routeCase({ ...target, riskScore: clamp(Number(riskScore), 0, 100) }, state.policy)
        };
        this.addAuditEntry({
          actor: actor || "Analyst",
          action: "Risk Score Override",
          caseId,
          details: "Risk changed from " + target.riskScore + " to " + state.overrides[caseId].riskScore + ". Rationale: " + state.overrides[caseId].rationale
        });
        return state.overrides[caseId];
      },
      routeCaseAction(caseId, action, actor, note) {
        const destinationMap = {
          escalate_intelligence: "Intelligence Queue",
          refer_enforcement: "Enforcement Referral",
          return_monitoring: "Monitoring / Auto-close",
          close_case: "Monitoring / Auto-close"
        };
        if (!destinationMap[action]) {
          return null;
        }
        state.overrides[caseId] = state.overrides[caseId] || {};
        state.overrides[caseId].destination = destinationMap[action];
        this.addAuditEntry({
          actor: actor || "Analyst",
          action: action,
          caseId,
          details: note || "Manual routing action taken."
        });
        return state.overrides[caseId];
      },
      addAuditEntry(entry) {
        state.auditLog.unshift({
          id: "AUD-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
          timestamp: new Date().toISOString(),
          actor: entry.actor,
          action: entry.action,
          caseId: entry.caseId || "N/A",
          details: entry.details
        });
      }
    };
  }

  window.FinCENEngine = {
    buildEngine
  };
})();
