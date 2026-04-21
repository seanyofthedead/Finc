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

    return {
      getState() {
        return state;
      },
      getDerivedFeatures() {
        return deriveFeatures(data);
      },
      getGraph() {
        return buildGraph(data);
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
