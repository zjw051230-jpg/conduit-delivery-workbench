const { finalDslToGraphQuery } = require("./graphify/finalDslToGraphQuery");
const { retrieveContext } = require("./retriever");

function hybridRetrieve({ finalDsl = {}, graphContextPackage = {}, keywordIndex = [], contextHints = [], limit = 8 }) {
  const querySpec = finalDslToGraphQuery(finalDsl);
  const fileScores = new Map();
  const evidence = [];
  const warnings = [...(graphContextPackage.warnings || [])];

  for (const file of graphContextPackage.target_files || []) {
    addScore(fileScores, file.path || file.relativePath, {
      score: 60 + Number(file.score || 0),
      source: "graphify",
      reason: "Graphify target file evidence",
    });
  }

  for (const item of graphContextPackage.graph_evidence || []) {
    for (const node of [item.source, item.target]) {
      const filePath = node?.source_file || node?.relativePath || node?.path;
      if (filePath) {
        addScore(fileScores, filePath, {
          score: item.confidenceKind === "EXTRACTED" ? 35 : 12,
          source: "graphify_edge",
          reason: `${item.confidenceKind || "UNKNOWN"} ${item.relation || "edge"} evidence`,
        });
      }
    }
    evidence.push(item);
  }

  const keywordResults = retrieveContext({
    query: querySpec.terms.join(" "),
    index: keywordIndex,
    contextHints: [],
    limit: Math.max(limit * 3, 12),
  });

  for (const result of keywordResults) {
    const symbolScore = scoreSymbolLikeMatch(result, querySpec);
    addScore(fileScores, result.relativePath, {
      score: 8 + symbolScore + Number(result.score || 0) * 0.2,
      source: "keyword",
      reason: symbolScore > 0 ? "symbol-like or keyword match" : "keyword match",
      snippet: result.snippet,
    });
  }

  for (const hint of contextHints || finalDsl.contextHints || []) {
    const hintedEntry = keywordIndex.find((entry) => entry.relativePath === hint || entry.relativePath.includes(String(hint)));
    addScore(fileScores, String(hint).replace(/\\/g, "/"), {
      score: hintedEntry ? 6 : 2,
      source: "skill_hint",
      reason: hintedEntry ? "skill hint with repository entry support" : "skill hint only, weak evidence",
    });
  }

  const rankedFiles = [...fileScores.entries()]
    .map(([relativePath, record]) => ({
      relativePath,
      path: relativePath,
      score: round(record.score),
      sources: [...record.sources],
      reasons: [...record.reasons],
      snippet: record.snippet || "",
    }))
    .sort((left, right) => right.score - left.score || left.relativePath.localeCompare(right.relativePath))
    .slice(0, limit);

  return {
    rankedFiles,
    evidence,
    retrieval_sources: [...new Set(rankedFiles.flatMap((file) => file.sources))],
    warnings,
  };
}

function scoreSymbolLikeMatch(entry, querySpec) {
  const text = `${entry.relativePath}\n${entry.snippet || entry.content || ""}`;
  let score = 0;
  for (const term of querySpec.terms || []) {
    if (!term || term.length < 3) continue;
    const symbolRegex = new RegExp(`\\b${escapeRegex(term)}\\b`, "i");
    if (symbolRegex.test(text)) score += 8;
  }
  if (/export\s+(default\s+)?(function|const|class)|function\s+[A-Z_a-z]/.test(text)) score += 5;
  return score;
}

function addScore(fileScores, filePath, contribution) {
  if (!filePath) return;
  const relativePath = String(filePath).replace(/\\/g, "/");
  if (!fileScores.has(relativePath)) {
    fileScores.set(relativePath, { score: 0, sources: new Set(), reasons: new Set(), snippet: "" });
  }
  const record = fileScores.get(relativePath);
  record.score += contribution.score;
  record.sources.add(contribution.source);
  record.reasons.add(contribution.reason);
  if (!record.snippet && contribution.snippet) record.snippet = contribution.snippet;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function round(value) {
  return Math.round(value * 100) / 100;
}

module.exports = { hybridRetrieve };
