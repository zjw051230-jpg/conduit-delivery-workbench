const { loadGraphifyGraph } = require("./graphifyGraphStore");
const { finalDslToGraphQuery } = require("./finalDslToGraphQuery");
const { selectGraphContext } = require("./graphContextSelector");
const { scoreContextSufficiency } = require("./contextSufficiencyScorer");
const { checkGraphFreshness } = require("./graphFreshnessChecker");
const { runGraphifyBuild } = require("./graphifyRunner");
const { hybridRetrieve } = require("../hybridRetriever");

const MIN_CONTEXT_SCORE = 0.55;

function compileContextPackageFromDsl({ finalDsl, repoRoot, graphifyRoot, options = {}, keywordIndex = [], contextHints = [] }) {
  const querySpec = finalDslToGraphQuery(finalDsl);
  const graph = loadGraphifyGraph(repoRoot);
  if (!graph.ready) {
    const warnings = [{ type: graph.reason || "graph_unavailable", message: graph.error || "Graphify graph is not available." }];
    if (shouldAutoBuild(options)) {
      warnings.push({
        type: "graphify_auto_build_not_run_inline",
        message: "Graphify auto build is enabled, but the synchronous context package builder does not run the async build inline.",
        graphifyRoot,
      });
    }
    const fallbackPackage = buildKeywordFallbackPackage({ finalDsl, querySpec, graphPath: graph.graphPath, keywordIndex, contextHints, warnings });
    if (fallbackPackage) {
      return {
        ready: true,
        contextPackage: fallbackPackage,
        fallbackReason: normalizeFallbackReason(graph.reason),
        ...fallbackPackage,
      };
    }
    return {
      ready: false,
      contextPackage: null,
      fallbackReason: normalizeFallbackReason(graph.reason),
      graphPath: graph.graphPath,
      warnings,
    };
  }

  const selected = selectGraphContext({ graph, querySpec });
  const candidatePaths = selected.candidateFiles.map((file) => file.path || file.relativePath);
  const freshness = checkGraphFreshness({ repoRoot, graphPath: graph.graphPath, candidateFiles: candidatePaths });
  const warnings = [...selected.warnings, ...(freshness.warnings || [])];
  if (freshness.fresh !== true) warnings.push({ type: "graph_freshness", reason: freshness.reason, fresh: freshness.fresh });
  const sufficiency = scoreContextSufficiency({
    finalDsl,
    querySpec,
    candidateFiles: selected.candidateFiles,
    graphEvidence: selected.graphEvidence,
    selectedNodes: selected.selectedNodes,
    warnings,
  });
  const needsFallback = freshness.fresh === false || sufficiency.score < MIN_CONTEXT_SCORE;
  const fallback = needsFallback
    ? hybridRetrieve({ finalDsl, graphContextPackage: { target_files: selected.candidateFiles, graph_evidence: selected.graphEvidence, warnings }, keywordIndex, contextHints })
    : null;
  const contextPackage = {
    ready: true,
    source: "graphify",
    graphPath: graph.graphPath,
    graph_path: graph.graphPath,
    graph_freshness: freshness,
    taskProfile: querySpec.taskProfile,
    query_spec: querySpec,
    target_files: selected.candidateFiles,
    graph_evidence: selected.graphEvidence,
    selected_nodes: selected.selectedNodes,
    warnings,
    context_sufficiency_score: sufficiency.score,
    missing_context: sufficiency.missing_context,
    supplemental_context: fallback?.rankedFiles || [],
  };

  if (fallback?.rankedFiles?.length) {
    contextPackage.source = sufficiency.score < MIN_CONTEXT_SCORE || freshness.fresh === false
      ? "graphify_plus_fallback"
      : "graphify";
    contextPackage.warnings.push(...(fallback.warnings || []));
  }

  return {
    ready: sufficiency.score >= MIN_CONTEXT_SCORE,
    contextPackage,
    fallbackReason: sufficiency.score < MIN_CONTEXT_SCORE ? "missing_context" : undefined,
    ...contextPackage,
  };
}

async function compileContextPackageFromDslAsync({ finalDsl, repoRoot, graphifyRoot, options = {}, keywordIndex = [], contextHints = [] }) {
  const autoBuild = shouldAutoBuild(options);
  const initialGraph = loadGraphifyGraph(repoRoot);
  if (autoBuild && !initialGraph.ready) {
    const runner = options.runGraphifyBuild || runGraphifyBuild;
    await runner({ repoRoot, graphifyRoot, mode: "build" });
  } else if (autoBuild && initialGraph.ready) {
    const querySpec = finalDslToGraphQuery(finalDsl);
    const selected = selectGraphContext({ graph: initialGraph, querySpec });
    const freshness = checkGraphFreshness({
      repoRoot,
      graphPath: initialGraph.graphPath,
      candidateFiles: selected.candidateFiles.map((file) => file.path || file.relativePath),
    });
    if (freshness.fresh === false) {
      const runner = options.runGraphifyBuild || runGraphifyBuild;
      await runner({ repoRoot, graphifyRoot, mode: "update" });
    }
  }

  return compileContextPackageFromDsl({
    finalDsl,
    repoRoot,
    graphifyRoot,
    options: { ...options, autoBuild: false },
    keywordIndex,
    contextHints,
  });
}

function shouldAutoBuild(options) {
  if (options.autoBuild !== undefined) return Boolean(options.autoBuild);
  return String(process.env.GRAPHIFY_AUTO_BUILD || "false").toLowerCase() === "true";
}

function normalizeFallbackReason(reason) {
  if (!reason || reason === "graph_missing") return "graphify_graph_missing";
  return reason;
}

function buildKeywordFallbackPackage({ finalDsl, querySpec, graphPath, keywordIndex, contextHints, warnings }) {
  if (!Array.isArray(keywordIndex) || keywordIndex.length === 0) return null;
  const fallback = hybridRetrieve({ finalDsl, graphContextPackage: { warnings }, keywordIndex, contextHints });
  return {
    ready: true,
    source: "keyword_fallback",
    graphPath,
    graph_path: graphPath,
    graph_freshness: { fresh: false, reason: "graph_missing", warnings },
    taskProfile: querySpec.taskProfile,
    query_spec: querySpec,
    target_files: fallback.rankedFiles,
    graph_evidence: [],
    selected_nodes: [],
    warnings,
    missing_context: fallback.rankedFiles.length > 0 ? [] : ["context_insufficient"],
    context_sufficiency_score: fallback.rankedFiles.length > 0 ? 0.55 : 0,
    supplemental_context: fallback.rankedFiles,
  };
}

module.exports = { compileContextPackageFromDsl, compileContextPackageFromDslAsync, MIN_CONTEXT_SCORE };
