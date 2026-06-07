const { unwrapRequirementDslV3 } = require("./validator");

const PIPELINE = [
  "pm-clarifier",
  "requirement-dsl",
  "context-rag",
  "module-locator",
  "solution-planner",
  "code-writer",
  "test-runner",
  "delivery-reporter",
];

function deriveExecutionContract(dsl) {
  const root = unwrapRequirementDslV3(dsl) || {};
  const meta = root.meta || {};
  const intent = root.intent_atoms || {};
  const task = root.task_profile || {};
  const change = root.change_atoms || {};
  const boundary = root.boundary_atoms || {};
  const execution = root.execution_atoms || {};
  const evaluation = root.evaluation_atoms || {};
  const oracle = root.test_oracle_detail || {};

  return {
    version: "requirement-dsl/v3-execution-contract",
    rawRequirement: meta.raw_requirement || intent.raw_requirement || intent.normalized_requirement || "",
    targetSkillId: intent.target_skill_id || meta.legacy_skill_id || null,
    projectSkillId: intent.project_skill_id || meta.project_skill_id || null,
    skillName: intent.skill_name || null,
    legacySkillName: intent.legacy_skill_name || null,
    projectSkillName: intent.project_skill_name || null,
    requirementType: task.task_type || change.change_type || "unknown",
    skillLayer: task.skill_layer || null,
    riskLevel: task.risk_level || root.risk_atoms?.risk_level || null,
    testProfile: task.test_profile || oracle.test_profile || "unknown",
    status: root.clarification_queue?.some((item) => item.blocking_level === "blocking" && item.status !== "resolved")
      ? "needs_clarification"
      : "ready_for_planning",
    clarifications: {},
    unresolvedQuestions: toArray(root.clarification_queue)
      .filter((item) => item.blocking_level === "blocking" && item.status !== "resolved")
      .map((item) => item.question || item.id)
      .filter(Boolean),
    targetModules: toArray(change.target_modules),
    contextHints: unique([...toArray(change.context_hints), ...toArray(execution.context_hints), ...toArray(execution.confirmed_allowed_paths)]),
    acceptanceCriteria: toArray(evaluation.acceptance_checks || evaluation.success_criteria),
    projectSuccessCriteria: toArray(evaluation.success_criteria),
    testCommands: normalizeCommands(oracle.verification_commands),
    requiredUnderstandingSkillIds: toArray(execution.required_understanding_skill_ids),
    deliverySkillIds: toArray(execution.delivery_skill_ids),
    allowedChanges: toArray(boundary.allowed_changes || execution.allowed_changes),
    forbiddenChanges: toArray(boundary.forbidden_changes || execution.forbidden_changes),
    safeDefaults: toArray(boundary.guardrails),
    pipeline: PIPELINE,
  };
}

function normalizeCommands(commands) {
  return toArray(commands)
    .map((command) => (typeof command === "string" ? command : command?.command))
    .filter((command) => command && String(command).toLowerCase() !== "unknown")
    .map(String);
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

function unique(values) {
  return [...new Set(values.filter(Boolean).map(String))];
}

module.exports = { deriveExecutionContract, PIPELINE };
