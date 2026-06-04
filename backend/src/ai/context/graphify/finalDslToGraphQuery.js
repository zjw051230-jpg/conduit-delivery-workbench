const DEFAULT_CONTEXT_FILTERS = ["call", "calls", "import", "imports", "export", "exports", "reference", "uses", "contains"];

function finalDslToGraphQuery(finalDsl = {}) {
  const terms = new Set();
  const preferredPathHints = new Set();
  const textParts = [
    finalDsl.rawRequirement,
    finalDsl.requirementType,
    finalDsl.targetSkillId,
    finalDsl.projectSkillId,
    finalDsl.operation,
    finalDsl.action,
    finalDsl.entity,
    finalDsl.targetSurface,
    finalDsl.surface,
    finalDsl.page,
    finalDsl.crud?.action,
    finalDsl.crud?.entity,
    finalDsl.crud?.target,
    finalDsl.taskProfile,
    finalDsl.errorType,
    ...(finalDsl.targetModules || []),
    ...(finalDsl.contextHints || []),
    ...(finalDsl.acceptanceCriteria || []),
  ].filter(Boolean);

  for (const part of textParts) {
    for (const token of tokenize(part)) terms.add(token);
  }

  const action = String(finalDsl.crud?.action || finalDsl.action || finalDsl.operation || "").toLowerCase();
  const entity = String(finalDsl.crud?.entity || finalDsl.entity || finalDsl.target || "").toLowerCase();
  const combined = `${textParts.join(" ")} ${action} ${entity}`.toLowerCase();

  if (combined.includes("article")) {
    for (const term of ["article", "Article", "articles"]) terms.add(term);
  }

  if (action === "delete" || combined.includes("crud.delete") || combined.includes("delete article")) {
    for (const term of ["delete", "del", "remove", "destroy", "article", "Article", "articles"]) terms.add(term);
  }

  const surfaceText = String(finalDsl.targetSurface || finalDsl.surface || finalDsl.page || combined).toLowerCase();
  if (surfaceText.includes("article_detail") || surfaceText.includes("article detail") || surfaceText.includes("article")) {
    for (const hint of ["routes", "Article", "agent", "api"]) preferredPathHints.add(hint);
  }

  for (const hint of finalDsl.contextHints || []) {
    if (String(hint).includes("/") || String(hint).includes("\\")) {
      preferredPathHints.add(String(hint).replace(/\\/g, "/"));
    }
  }

  return {
    terms: [...terms],
    contextFilters: DEFAULT_CONTEXT_FILTERS,
    preferredPathHints: [...preferredPathHints],
    depth: Number(finalDsl.graphDepth || finalDsl.depth || 2),
    tokenBudget: Number(finalDsl.contextTokenBudget || finalDsl.tokenBudget || 6000),
    taskProfile: inferTaskProfile(finalDsl, combined),
  };
}

function inferTaskProfile(finalDsl, combinedText) {
  if (finalDsl.taskProfile) return finalDsl.taskProfile;
  const type = String(finalDsl.requirementType || "").toLowerCase();
  const action = String(finalDsl.crud?.action || finalDsl.action || finalDsl.operation || "").toLowerCase();
  const text = `${combinedText} ${type} ${action}`.toLowerCase();

  if (text.includes("config") || text.includes("package.json") || text.includes("build script")) return "config_change";
  if (text.includes("docs") || text.includes("readme") || text.includes("documentation")) return "docs_change";
  if (text.includes("test") && (text.includes("fix") || text.includes("failed") || text.includes("failure"))) return "test_fix";
  if (text.includes("bug") || text.includes("fix") || text.includes("error")) return "bugfix";
  if (text.includes("backend") || text.includes("api") || text.includes("controller")) return "backend_api";
  if (type.includes("crud") || ["create", "update", "delete", "remove", "destroy"].includes(action)) return "crud.fullstack";
  if (text.includes("ui") || text.includes("frontend") || text.includes("page") || text.includes("component") || text.includes("article")) return "ui_change";
  return "unknown";
}

function tokenize(value) {
  return String(value)
    .split(/[^A-Za-z0-9_./-]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

module.exports = { finalDslToGraphQuery, DEFAULT_CONTEXT_FILTERS };
