const MIN_GRAPHIFY_CONTEXT_SCORE = 0.55;

function locateModules({ dsl, retrievedContext, graphifyContextPackage }) {
  if (isUsableGraphifyPackage(graphifyContextPackage)) {
    return locateFromGraphify({ dsl, graphifyContextPackage });
  }

  const files = new Map();

  for (const filePath of dsl.contextHints || []) {
    if (filePath.includes("/") && filePath.includes(".")) {
      files.set(filePath, { relativePath: filePath, source: "skill-hint" });
    }
  }

  for (const entry of retrievedContext || []) {
    files.set(entry.relativePath, {
      relativePath: entry.relativePath,
      layer: entry.layer,
      moduleType: entry.moduleType,
      source: files.has(entry.relativePath) ? "skill-hint+rag" : "rag",
      score: entry.score,
    });
  }

  return {
    agent: "Module Locator Agent",
    source: "keyword_fallback",
    fallbackReason: graphifyContextPackage ? "graphify_context_insufficient" : "graphify_context_unavailable",
    targetModules: dsl.targetModules,
    files: [...files.values()],
  };
}

function locateFromGraphify({ dsl, graphifyContextPackage }) {
  return {
    agent: "Module Locator Agent",
    source: "graphify",
    targetModules: dsl.targetModules,
    files: graphifyContextPackage.target_files.map((file) => ({
      relativePath: file.relativePath || file.path,
      source: "graphify",
      score: file.score,
      matchedNodes: file.matchedNodes || [],
      evidenceCount: file.evidenceCount || 0,
    })),
    graphEvidence: graphifyContextPackage.graph_evidence || [],
    warnings: graphifyContextPackage.warnings || [],
    contextSufficiencyScore: graphifyContextPackage.context_sufficiency_score,
    missingContext: graphifyContextPackage.missing_context || [],
  };
}

function isUsableGraphifyPackage(contextPackage) {
  return Boolean(
    contextPackage
      && Array.isArray(contextPackage.target_files)
      && contextPackage.target_files.length > 0
      && Number(contextPackage.context_sufficiency_score || 0) >= MIN_GRAPHIFY_CONTEXT_SCORE,
  );
}

module.exports = { locateModules, isUsableGraphifyPackage, MIN_GRAPHIFY_CONTEXT_SCORE };
