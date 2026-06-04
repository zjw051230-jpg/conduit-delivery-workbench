function selectGraphContext(input, maybeQuerySpec) {
  const graph = maybeQuerySpec ? input : input?.graph;
  const querySpec = maybeQuerySpec || input?.querySpec || {};
  const nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
  const edges = Array.isArray(graph?.edges) ? graph.edges : [];
  const nodeById = new Map(nodes.map((node) => [getNodeId(node), node]));
  const nodeScores = new Map();
  const fileRecords = new Map();
  const evidenceByFile = new Map();
  const warnings = [];

  for (const node of nodes) {
    const score = scoreNode(node, querySpec);
    if (score <= 0) continue;
    const nodeId = getNodeId(node);
    nodeScores.set(nodeId, score);
    addFileScore(fileRecords, getNodeFile(node), score, nodeId, nodeReasons(node, querySpec));
  }

  const graphEvidence = [];
  for (const edge of edges) {
    const confidenceKind = getConfidenceKind(edge);
    const sourceNode = nodeById.get(getEdgeSource(edge));
    const targetNode = nodeById.get(getEdgeTarget(edge));
    const relation = getEdgeRelation(edge);

    if (confidenceKind === "AMBIGUOUS") {
      warnings.push({
        type: "ambiguous_edge",
        relation,
        source: summarizeNode(sourceNode, getEdgeSource(edge)),
        target: summarizeNode(targetNode, getEdgeTarget(edge)),
        message: "AMBIGUOUS edge was not used as strong graph evidence.",
      });
      continue;
    }

    const edgeScore = scoreEdge(edge, sourceNode, targetNode, querySpec, nodeScores);
    if (edgeScore <= 0) continue;

    const evidence = {
      id: getEdgeId(edge, graphEvidence.length),
      relation,
      confidence: edge.confidence,
      confidenceKind,
      source: summarizeNode(sourceNode, getEdgeSource(edge)),
      target: summarizeNode(targetNode, getEdgeTarget(edge)),
      score: round(edgeScore),
    };
    graphEvidence.push(evidence);

    for (const filePath of [getNodeFile(sourceNode), getNodeFile(targetNode)].filter(Boolean)) {
      addFileScore(fileRecords, filePath, edgeScore, getNodeId(sourceNode) || getNodeId(targetNode), edgeReasons(edge, querySpec, evidence));
      if (!evidenceByFile.has(filePath)) evidenceByFile.set(filePath, []);
      evidenceByFile.get(filePath).push(evidence);
    }
  }

  const selectedNodes = [...nodeScores.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 20)
    .map(([nodeId, score]) => ({ ...summarizeNode(nodeById.get(nodeId), nodeId), score: round(score) }));

  const candidateFiles = [...fileRecords.entries()]
    .map(([relativePath, value]) => ({
      path: relativePath,
      relativePath,
      score: round(value.score),
      source: "graphify",
      matchedNodes: [...value.nodeIds].filter(Boolean),
      reasons: [...value.reasons].filter(Boolean),
      evidenceIds: (evidenceByFile.get(relativePath) || []).map((item) => item.id),
      evidenceCount: evidenceByFile.get(relativePath)?.length || 0,
    }))
    .sort((left, right) => right.score - left.score || left.relativePath.localeCompare(right.relativePath));

  return {
    candidateFiles,
    graphEvidence: graphEvidence.sort((left, right) => right.score - left.score).slice(0, 40),
    selectedNodes,
    warnings,
  };
}

function scoreNode(node, querySpec) {
  const haystack = `${getNodeLabel(node)} ${getNodeFile(node)} ${node?.type || ""}`.toLowerCase();
  let score = 0;

  for (const term of querySpec.terms || []) {
    const normalized = String(term).toLowerCase();
    if (!normalized) continue;
    if (haystack.includes(normalized)) score += getNodeFile(node)?.toLowerCase().includes(normalized) ? 8 : 5;
  }

  for (const hint of querySpec.preferredPathHints || []) {
    if (getNodeFile(node)?.toLowerCase().includes(String(hint).toLowerCase())) score += 7;
  }

  return score;
}

function scoreEdge(edge, sourceNode, targetNode, querySpec, nodeScores) {
  const relation = getEdgeRelation(edge).toLowerCase();
  const relationMatchesFilter = (querySpec.contextFilters || []).some((filter) => relation.includes(String(filter).toLowerCase()));
  const relationMatchesTerm = (querySpec.terms || []).some((term) => relation.includes(String(term).toLowerCase()));
  const connectedScore = (nodeScores.get(getNodeId(sourceNode)) || 0) + (nodeScores.get(getNodeId(targetNode)) || 0);

  if (!relationMatchesFilter && !relationMatchesTerm && connectedScore <= 0) return 0;

  const confidenceWeight = getConfidenceWeight(edge);
  const relationScore = relationMatchesFilter ? 8 : relationMatchesTerm ? 4 : 0;
  return connectedScore * 0.45 + relationScore + confidenceWeight;
}

function addFileScore(fileScores, relativePath, score, nodeId, reasons = []) {
  if (!relativePath) return;
  if (!fileScores.has(relativePath)) fileScores.set(relativePath, { score: 0, nodeIds: new Set(), reasons: new Set() });
  const current = fileScores.get(relativePath);
  current.score += score;
  if (nodeId) current.nodeIds.add(nodeId);
  for (const reason of reasons) current.reasons.add(reason);
}

function nodeReasons(node, querySpec) {
  const reasons = [];
  const label = getNodeLabel(node);
  const filePath = getNodeFile(node) || "";
  for (const term of querySpec.terms || []) {
    if (label.toLowerCase().includes(String(term).toLowerCase())) reasons.push(`node label matched ${term}`);
  }
  for (const hint of querySpec.preferredPathHints || []) {
    if (filePath.toLowerCase().includes(String(hint).toLowerCase())) reasons.push(`path matched preferred hint ${hint}`);
  }
  return reasons;
}

function edgeReasons(edge, querySpec, evidence) {
  const reasons = [];
  const relation = getEdgeRelation(edge);
  if ((querySpec.contextFilters || []).some((filter) => relation.toLowerCase().includes(String(filter).toLowerCase()))) {
    reasons.push(`edge relation matched ${relation}`);
  }
  if (evidence.confidenceKind === "EXTRACTED") reasons.push(`has EXTRACTED ${relation} edge`);
  if (evidence.confidenceKind === "INFERRED") reasons.push(`has INFERRED ${relation} edge`);
  return reasons;
}

function getConfidenceKind(edge = {}) {
  const raw = edge.confidenceKind || edge.evidenceType || edge.evidence_type || edge.provenance || edge.confidence;
  const normalized = String(raw || "").toUpperCase();
  if (normalized.includes("AMBIGUOUS")) return "AMBIGUOUS";
  if (normalized.includes("INFERRED")) return "INFERRED";
  if (normalized.includes("EXTRACTED")) return "EXTRACTED";
  return "UNKNOWN";
}

function getConfidenceWeight(edge) {
  const kind = getConfidenceKind(edge);
  if (kind === "EXTRACTED") return 16;
  if (kind === "INFERRED") return 4;
  if (typeof edge?.confidence === "number") return Math.max(0, Math.min(1, edge.confidence)) * 8;
  return 2;
}

function getNodeId(node = {}) {
  return node.id || node.node_id || node.key || node.name || null;
}

function getNodeLabel(node = {}) {
  return node.label || node.name || node.title || getNodeId(node) || "";
}

function getNodeFile(node = {}) {
  return normalizePath(node.source_file || node.sourceFile || node.file || node.path || node.relativePath);
}

function getEdgeSource(edge = {}) {
  return edge.source || edge.from || edge.source_id || edge.sourceId || edge.start || null;
}

function getEdgeTarget(edge = {}) {
  return edge.target || edge.to || edge.target_id || edge.targetId || edge.end || null;
}

function getEdgeRelation(edge = {}) {
  return edge.relation || edge.type || edge.label || edge.kind || "";
}

function getEdgeId(edge = {}, index) {
  return edge.id || edge.edge_id || `${getEdgeSource(edge) || "unknown"}-${getEdgeRelation(edge) || "edge"}-${getEdgeTarget(edge) || "unknown"}-${index}`;
}

function summarizeNode(node, fallbackId) {
  return {
    id: getNodeId(node) || fallbackId || null,
    label: getNodeLabel(node) || fallbackId || "unknown",
    source_file: getNodeFile(node) || null,
    type: node?.type || null,
  };
}

function normalizePath(filePath) {
  return filePath ? String(filePath).replace(/\\/g, "/") : null;
}

function round(value) {
  return Math.round(value * 100) / 100;
}

module.exports = { selectGraphContext };
