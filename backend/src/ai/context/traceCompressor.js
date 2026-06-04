const MAX_ERROR_LINES = 20;

function compressPlanArtifact(plan = {}) {
  const steps = getPlanSteps(plan);
  const fallbackFiles = toFileList(plan.target_files || plan.targetFiles || plan.files);
  const fallbackRisks = toStringList(plan.risk_points || plan.riskPoints || plan.riskNotes || plan.risks);

  return {
    steps: steps.map((step, index) => {
      const stepObject = typeof step === "string" ? { goal: step } : step || {};
      return {
        id: String(stepObject.id || stepObject.stepId || stepObject.key || `step-${index + 1}`),
        goal: String(stepObject.goal || stepObject.summary || stepObject.description || stepObject.title || step || ""),
        target_files: toFileList(stepObject.target_files || stepObject.targetFiles || stepObject.files || stepObject.file || fallbackFiles),
        risk_points: toStringList(stepObject.risk_points || stepObject.riskPoints || stepObject.riskNotes || stepObject.risks || fallbackRisks),
      };
    }),
  };
}

function compressPatchArtifact(patch = {}) {
  return {
    changed_files: toFileList(patch.changed_files || patch.changedFiles || patch.files || patch.changedFilePaths),
    summary: String(patch.summary || patch.message || patch.diffSummary || patch.status || ""),
    important_hunks: toArray(patch.important_hunks || patch.importantHunks || patch.hunks).map(compressHunk),
  };
}

function compressSandboxResult(result = {}) {
  const failed = findFailedCommand(result);
  const logText = [
    failed?.stderr,
    failed?.stdout,
    failed?.log,
    result.stderr,
    result.stdout,
    result.log,
    result.error,
    result.message,
  ].filter(Boolean).join("\n");

  return {
    failed_command: failed?.command || result.failed_command || result.failedCommand || result.command || null,
    error_type: result.error_type || result.errorType || failed?.error_type || failed?.errorType || classifyError(logText, failed?.exitCode ?? result.exitCode),
    key_error_lines: extractKeyErrorLines(logText, MAX_ERROR_LINES),
  };
}

function compressRepairAttempt(repair = {}) {
  const attempts = toArray(repair.attempts || repair.history || repair.repairHistory);
  const lastAttempt = attempts.length > 0 ? attempts[attempts.length - 1] : repair;
  const attemptCount = Number(repair.attempt_count || repair.attemptCount || attempts.length || (repair && Object.keys(repair).length > 0 ? 1 : 0));
  const errorText = [lastAttempt?.stderr, lastAttempt?.stdout, lastAttempt?.log, lastAttempt?.message].filter(Boolean).join("\n");

  return {
    attempt_count: attemptCount,
    last_error_type: repair.last_error_type || repair.lastErrorType || lastAttempt?.error_type || lastAttempt?.errorType || classifyError(errorText, lastAttempt?.exitCode),
    last_fix_summary: String(repair.last_fix_summary || repair.lastFixSummary || lastAttempt?.fix_summary || lastAttempt?.fixSummary || lastAttempt?.summary || ""),
  };
}

function compressStageTrace(stageId, artifact = {}) {
  const kind = inferArtifactKind(stageId, artifact);
  const compressors = {
    plan: compressPlanArtifact,
    patch: compressPatchArtifact,
    sandbox_result: compressSandboxResult,
    repair_attempt: compressRepairAttempt,
  };

  return {
    stage_id: stageId,
    kind,
    summary: compressors[kind] ? compressors[kind](artifact) : compressGenericArtifact(artifact),
  };
}

function buildTraceSummary({ finalDsl, completedStages = [], artifacts = [], latestError = null, nextAction = null } = {}) {
  return {
    final_dsl: finalDsl || null,
    completed_stages: [...completedStages],
    compressed_artifacts: artifacts.map((artifact, index) => compressStageTrace(artifact.stage || artifact.stageId || artifact.type || `artifact-${index + 1}`, artifact)),
    latest_error: latestError ? compressSandboxResult(latestError) : null,
    next_action: nextAction || null,
  };
}

function getPlanSteps(plan) {
  const steps = toArray(plan.steps || plan.implementationSteps || plan.planSteps);
  if (steps.length > 0) return steps;
  if (plan.goal || plan.summary || plan.description || plan.title) return [plan];
  return [];
}

function compressHunk(hunk) {
  if (typeof hunk === "string") {
    return {
      summary: summarizeText(hunk, 160),
      line_count: countLines(hunk),
    };
  }

  const hunkText = hunk?.summary || hunk?.header || hunk?.description || hunk?.content || hunk?.diff || hunk?.patch || "";
  return {
    file: normalizeFilePath(hunk?.file || hunk?.relativePath || hunk?.path),
    summary: summarizeText(hunkText, 160),
    line_count: countLines(hunk?.content || hunk?.diff || hunk?.patch || hunkText),
  };
}

function findFailedCommand(result) {
  const results = toArray(result.results || result.commands || result.commandResults);
  return results.find((entry) => Number(entry.exitCode ?? entry.status ?? 0) !== 0) || (Number(result.exitCode ?? result.status ?? 0) !== 0 ? result : null);
}

function extractKeyErrorLines(text, limit) {
  const lines = String(text || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const criticalLines = lines.filter((line) => /error|failed|failure|exception|traceback|cannot|not found|enoent|timeout|syntax|assert/i.test(line));
  return (criticalLines.length > 0 ? criticalLines : lines).slice(0, limit);
}

function classifyError(text = "", exitCode) {
  const normalized = String(text || "").toLowerCase();
  if (normalized.includes("timeout") || normalized.includes("timed out")) return "timeout";
  if (normalized.includes("syntaxerror") || normalized.includes("syntax error")) return "syntax_error";
  if (normalized.includes("cannot find module") || normalized.includes("module not found") || normalized.includes("err_module")) return "module_resolution";
  if (normalized.includes("assert") || normalized.includes("expected") || normalized.includes("received")) return "assertion_failure";
  if (normalized.includes("enoent") || normalized.includes("not found")) return "missing_file";
  if (Number(exitCode || 0) !== 0) return "command_failed";
  return "unknown";
}

function inferArtifactKind(stageId, artifact) {
  const marker = `${stageId || ""} ${artifact.type || ""} ${artifact.kind || ""}`.toLowerCase();
  if (marker.includes("repair") || artifact.attempts || artifact.attempt_count || artifact.attemptCount) return "repair_attempt";
  if (marker.includes("sandbox") || marker.includes("test") || artifact.results || artifact.exitCode !== undefined || artifact.stderr || artifact.stdout || artifact.log) return "sandbox_result";
  if (marker.includes("patch") || marker.includes("code") || marker.includes("diff") || artifact.changedFiles || artifact.changed_files || artifact.diff || artifact.patch || artifact.hunks) return "patch";
  if (marker.includes("plan") || artifact.steps || artifact.implementationSteps || artifact.riskNotes) return "plan";
  return "artifact";
}

function compressGenericArtifact(artifact) {
  return {
    type: artifact?.type || null,
    status: artifact?.status || null,
    summary: String(artifact?.summary || artifact?.message || ""),
  };
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

function toStringList(value) {
  return toArray(value)
    .map((item) => (typeof item === "string" ? item : item?.summary || item?.message || item?.risk || item?.description || item?.goal || ""))
    .filter(Boolean)
    .map(String);
}

function toFileList(value) {
  return [...new Set(toArray(value)
    .map((item) => normalizeFilePath(typeof item === "string" ? item : item?.relativePath || item?.file || item?.path))
    .filter(Boolean))];
}

function normalizeFilePath(filePath) {
  return filePath ? String(filePath).replace(/\\/g, "/") : null;
}

function summarizeText(text, maxLength) {
  const normalized = String(text || "").replace(/\r/g, "").split("\n").map((line) => line.trim()).filter(Boolean).join(" ");
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 3)}...` : normalized;
}

function countLines(text) {
  return String(text || "").replace(/\r/g, "").split("\n").filter((line) => line.length > 0).length;
}

module.exports = {
  compressPlanArtifact,
  compressPatchArtifact,
  compressSandboxResult,
  compressRepairAttempt,
  compressStageTrace,
  buildTraceSummary,
};
