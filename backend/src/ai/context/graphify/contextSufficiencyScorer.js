const { CONTEXT_PROFILES } = require("../contextProfiles");

function scoreContextSufficiency({ finalDsl = {}, querySpec = {}, candidateFiles = [], graphEvidence = [], selectedNodes = [], warnings = [] }) {
  const profile = querySpec.taskProfile || finalDsl.taskProfile || "unknown";
  const definition = CONTEXT_PROFILES[profile] || CONTEXT_PROFILES.unknown;
  const matchedSignals = detectSignals({ candidateFiles, graphEvidence, selectedNodes, warnings });
  const missingRequired = definition.requiredSignals.filter((signal) => !matchedSignals.includes(signal));
  const matchedOptional = definition.optionalSignals.filter((signal) => matchedSignals.includes(signal));

  const requiredScore = definition.requiredSignals.length === 0
    ? 0.7
    : ((definition.requiredSignals.length - missingRequired.length) / definition.requiredSignals.length) * 0.7;
  const optionalScore = definition.optionalSignals.length === 0
    ? 0
    : Math.min(matchedOptional.length / definition.optionalSignals.length, 1) * 0.2;
  const volumeScore = Math.min(candidateFiles.length, 4) * 0.025;
  const score = Math.round(Math.min(1, requiredScore + optionalScore + volumeScore) * 100) / 100;
  const missing_context = score < 0.55 ? ["context_insufficient", ...missingRequired] : missingRequired;

  return {
    score,
    profile,
    matched_signals: matchedSignals,
    missing_context,
    warnings,
  };
}

function detectSignals({ candidateFiles, graphEvidence, selectedNodes, warnings }) {
  const paths = candidateFiles.map((file) => file.path || file.relativePath || "");
  const signals = new Set();

  if (paths.length > 0) signals.add("some_relevant_file");
  if (paths.some(isUiFile)) signals.add("ui_file");
  if (paths.some(isApiFile)) signals.add("api_file");
  if (paths.some(isRouteFile)) signals.add("route_file");
  if (paths.some(isTestFile)) signals.add("test_file");
  if (paths.some(isStyleFile)) signals.add("style_file");
  if (paths.some(isComponentFile)) signals.add("component_file");
  if (paths.some(isConfigFile)) signals.add("config_file");
  if (paths.some(isPackageFile)) signals.add("package_file");
  if (paths.some(isBuildScript)) signals.add("build_script");
  if (paths.some(isControllerFile)) signals.add("controller_file");
  if (paths.some(isServiceFile)) signals.add("service_file");
  if (paths.some(isModelFile)) signals.add("model_file");
  if (paths.some(isDocFile)) signals.add("doc_file");
  if (paths.some((filePath) => !isTestFile(filePath))) signals.add("implementation_file");
  if (paths.length > 0 || selectedNodes.length > 0) signals.add("suspected_file");
  if (graphEvidence.some((item) => item.confidenceKind === "EXTRACTED")) signals.add("graph_evidence");
  if (warnings.some((item) => String(item.type || item.reason || "").includes("error"))) signals.add("error_log");
  if (graphEvidence.length > 0) signals.add("related_callsite");
  return [...signals];
}

function isUiFile(relativePath) {
  return /(^|\/)frontend\//.test(relativePath)
    || /(^|\/)routes\//.test(relativePath)
    || /\.(jsx|tsx)$/.test(relativePath)
    || /Article\.jsx$/.test(relativePath);
}

function isApiFile(relativePath) {
  return /(^|\/)(backend|api)\//.test(relativePath)
    || /(^|\/)(agent|api|server|controllers|services)\.[jt]sx?$/.test(relativePath)
    || /\/(api|agents?|controllers?|services?)\//.test(relativePath);
}

function isRouteFile(relativePath) {
  return /(^|\/)routes?\//.test(relativePath) || /routes?\.[jt]sx?$/.test(relativePath);
}

function isTestFile(relativePath) {
  return /\.(test|spec)\.[jt]sx?$/.test(relativePath);
}

function isStyleFile(relativePath) {
  return /\.(css|scss|less)$/.test(relativePath);
}

function isComponentFile(relativePath) {
  return /(^|\/)components?\//.test(relativePath) || /\.(jsx|tsx)$/.test(relativePath);
}

function isConfigFile(relativePath) {
  return /(^|\/)(config|configs)\//.test(relativePath)
    || /(^|\/)package(-lock)?\.json$/.test(relativePath)
    || /(^|\/)[^/]*(config|rc)\.(js|mjs|cjs|ts|json)$/.test(relativePath);
}

function isPackageFile(relativePath) {
  return /(^|\/)package(-lock)?\.json$/.test(relativePath);
}

function isBuildScript(relativePath) {
  return /(^|\/)(vite|webpack|rollup|babel|tsconfig|jest|vitest)\.config/.test(relativePath) || /(^|\/)Makefile$/.test(relativePath);
}

function isControllerFile(relativePath) {
  return /(^|\/)controllers?\//.test(relativePath) || /controller\.[jt]s$/.test(relativePath);
}

function isServiceFile(relativePath) {
  return /(^|\/)services?\//.test(relativePath) || /service\.[jt]s$/.test(relativePath);
}

function isModelFile(relativePath) {
  return /(^|\/)(models?|schemas?|migrations?)\//.test(relativePath);
}

function isDocFile(relativePath) {
  return /\.(md|mdx|txt|rst)$/.test(relativePath) || /(^|\/)docs?\//.test(relativePath);
}

module.exports = { scoreContextSufficiency, isUiFile, isApiFile, detectSignals };
