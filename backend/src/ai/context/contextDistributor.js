const {
  compressPatchArtifact,
  compressPlanArtifact,
  compressSandboxResult,
} = require("./traceCompressor");

const SNIPPET_LIMIT = 1200;
const EXECUTION_POLICY_KEYS = ["canWriteRepo", "canRunCommands", "canCommit", "canPush", "canCreatePr"];
const CORE_DSL_FIELDS = [
  "version",
  "rawRequirement",
  "targetSkillId",
  "projectSkillId",
  "requirementType",
  "targetModules",
  "acceptanceCriteria",
  "testCommands",
  "allowedChanges",
  "forbiddenChanges",
  "riskLevel",
  "testProfile",
];
const FORBIDDEN_CONTEXT_KEYS = new Set([
  "graph",
  "nodes",
  "edges",
  "links",
  "graphJson",
  "sandboxLog",
  "stdout",
  "stderr",
  "conversation",
  "messages",
  "history",
  "oldDialogue",
]);

function buildPlanContext(state = {}) {
  return {
    finalDsl: clonePlain(resolveFinalDsl(state)),
    contextPackage: summarizeContextPackage(state.contextPackage || state.graphifyContextPackage),
    assumptionLedger: clonePlain(state.assumptionLedger || state.assumptions || []),
    executionPolicy: buildExecutionPolicy(state.executionPolicy),
    traceSummary: summarizeTrace(state),
  };
}

function buildCodegenContext(state = {}) {
  return {
    finalDsl: pickCoreFinalDsl(resolveFinalDsl(state)),
    verifiedPlan: state.verifiedPlan ? sanitizeValue(state.verifiedPlan) : compressPlanArtifact(state.plan || state.solutionPlan || {}),
    targetSnippets: buildSnippetList(state.targetSnippets || state.retrievedContext),
    patchConstraints: sanitizeValue(state.patchConstraints || state.constraints || []),
    executionPolicy: buildExecutionPolicy(state.executionPolicy),
  };
}

function buildRepairContext(state = {}) {
  return {
    finalDsl: pickCoreFinalDsl(resolveFinalDsl(state)),
    failedPatchSummary: state.failedPatchSummary ? pickPatchSummary(state.failedPatchSummary) : compressPatchArtifact(state.failedPatch || state.patch || {}),
    errorSummary: state.errorSummary ? pickErrorSummary(state.errorSummary) : compressSandboxResult(state.latestError || state.sandboxResult || {}),
    relevantSnippets: buildSnippetList(state.relevantSnippets || state.targetSnippets || state.retrievedContext),
    repairAttemptCount: getRepairAttemptCount(state),
  };
}

function buildAgentContext(agentName, state = {}) {
  const normalizedName = String(agentName || "").toLowerCase();
  if (/(repair|fix|test|runner)/.test(normalizedName)) return buildRepairContext(state);
  if (/(code|writer|implement)/.test(normalizedName)) return buildCodegenContext(state);
  if (/(plan|planner|locator|rag|clarifier|dsl)/.test(normalizedName)) return buildPlanContext(state);
  return buildPlanContext(state);
}

function resolveFinalDsl(state) {
  return state.finalDsl || state.dsl || null;
}

function summarizeContextPackage(contextPackage = {}) {
  if (!contextPackage) return null;
  return {
    source: contextPackage.source || null,
    target_files: buildTargetFileList(contextPackage.target_files || contextPackage.targetFiles),
    graph_evidence: sanitizeValue(contextPackage.graph_evidence || contextPackage.graphEvidence || []),
    warnings: sanitizeValue(contextPackage.warnings || []),
    context_sufficiency_score: contextPackage.context_sufficiency_score ?? contextPackage.contextSufficiencyScore ?? null,
    missing_context: sanitizeValue(contextPackage.missing_context || contextPackage.missingContext || []),
  };
}

function buildTargetFileList(files) {
  return toArray(files).map((file) => ({
    relativePath: normalizePath(typeof file === "string" ? file : file?.relativePath || file?.path || file?.file),
    score: typeof file === "object" ? file.score : undefined,
    source: typeof file === "object" ? file.source : undefined,
    matchedNodes: typeof file === "object" ? clonePlain(file.matchedNodes || []) : [],
    evidenceCount: typeof file === "object" ? file.evidenceCount : undefined,
  })).filter((file) => file.relativePath);
}

function pickCoreFinalDsl(finalDsl = {}) {
  const result = {};
  if (!finalDsl) return result;
  for (const field of CORE_DSL_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(finalDsl, field)) {
      result[field] = clonePlain(finalDsl[field]);
    }
  }
  return result;
}

function buildExecutionPolicy(executionPolicy = {}) {
  const result = {};
  for (const key of EXECUTION_POLICY_KEYS) {
    result[key] = Boolean(executionPolicy[key]);
  }
  return result;
}

function summarizeTrace(state = {}) {
  const traceSummary = state.traceSummary || state.trace_summary || {};
  const latestError = traceSummary.latest_error || traceSummary.latestError || state.latestError || null;
  const latestErrorType = latestError?.error_type || latestError?.errorType || null;

  return {
    completed_stage_count: toArray(traceSummary.completed_stages || traceSummary.completedStages || state.completedStages).length,
    compressed_artifact_count: toArray(traceSummary.compressed_artifacts || traceSummary.compressedArtifacts || []).length,
    latest_error_type: latestErrorType,
    next_action: traceSummary.next_action || traceSummary.nextAction || state.nextAction || null,
  };
}

function buildSnippetList(snippets) {
  return toArray(snippets).map((entry) => ({
    relativePath: normalizePath(entry.relativePath || entry.path || entry.file),
    snippet: truncate(entry.snippet || entry.summary || "", SNIPPET_LIMIT),
    score: entry.score,
    source: entry.source,
  })).filter((entry) => entry.relativePath || entry.snippet);
}

function pickPatchSummary(patchSummary = {}) {
  return {
    changed_files: clonePlain(patchSummary.changed_files || patchSummary.changedFiles || []),
    summary: String(patchSummary.summary || patchSummary.message || ""),
    important_hunks: sanitizeValue(patchSummary.important_hunks || patchSummary.importantHunks || []),
  };
}

function pickErrorSummary(errorSummary = {}) {
  return {
    failed_command: errorSummary.failed_command || errorSummary.failedCommand || null,
    error_type: errorSummary.error_type || errorSummary.errorType || "unknown",
    key_error_lines: toArray(errorSummary.key_error_lines || errorSummary.keyErrorLines).map(String),
  };
}

function getRepairAttemptCount(state = {}) {
  if (state.repairAttemptCount !== undefined) return Number(state.repairAttemptCount);
  const repairHistory = state.repairHistory || state.repair?.history || state.repair?.attempts;
  if (Array.isArray(repairHistory)) return repairHistory.length;
  if (state.repair?.attempt_count !== undefined) return Number(state.repair.attempt_count);
  if (state.repair?.attemptCount !== undefined) return Number(state.repair.attemptCount);
  return 0;
}

function sanitizeValue(value) {
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (!value || typeof value !== "object") return clonePlain(value);

  const result = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    if (FORBIDDEN_CONTEXT_KEYS.has(key)) continue;
    result[key] = sanitizeValue(nestedValue);
  }
  return result;
}

function clonePlain(value) {
  if (Array.isArray(value)) return value.map(clonePlain);
  if (!value || typeof value !== "object") return value;

  const result = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    result[key] = clonePlain(nestedValue);
  }
  return result;
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

function normalizePath(filePath) {
  return filePath ? String(filePath).replace(/\\/g, "/") : null;
}

function truncate(value, limit) {
  const text = String(value || "");
  return text.length > limit ? text.slice(0, limit) : text;
}

module.exports = {
  buildPlanContext,
  buildCodegenContext,
  buildRepairContext,
  buildAgentContext,
};
