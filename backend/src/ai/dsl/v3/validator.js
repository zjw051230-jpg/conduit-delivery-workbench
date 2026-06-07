const { DSL_V3_VERSION } = require("./template");

function validateRequirementDslV3(dsl) {
  const errors = [];
  const warnings = [];
  const root = unwrapRequirementDslV3(dsl);

  if (!dsl || typeof dsl !== "object" || !Object.prototype.hasOwnProperty.call(dsl, "requirement_dsl_v3")) {
    errors.push("top_level_must_be_requirement_dsl_v3");
  }

  if (!root || typeof root !== "object") {
    errors.push("requirement_dsl_v3_must_be_object");
    return { valid: false, errors: [...new Set(errors)], warnings };
  }

  if (root.meta?.dsl_version !== DSL_V3_VERSION) errors.push("meta.dsl_version_must_be_3.0.0");
  if (root.meta?.lifecycle_state !== "draft") errors.push("meta.lifecycle_state_must_be_draft");
  if (root.meta?.stage !== "draft") errors.push("meta.stage_must_be_draft");
  if (root.readiness_gates?.ready_for_agent !== false) errors.push("readiness_gates.ready_for_agent_must_be_false");

  const verificationCommands = toArray(root.test_oracle_detail?.verification_commands);
  if (verificationCommands.some(isUnknownCommand)) errors.push("verification_commands_must_not_contain_unknown_command");

  if (root.test_oracle_detail?.verification_command_status === "unknown") {
    const discovery = root.test_oracle_detail?.verification_command_discovery;
    if (!discovery || discovery.required !== true) {
      errors.push("unknown_verification_command_requires_discovery");
    }
    if (verificationCommands.length > 0) {
      errors.push("unknown_verification_command_must_not_emit_commands");
    }
  }

  for (const tag of collectTags(root)) {
    if (hasMixedChineseEnglish(tag)) warnings.push(`mixed_language_tag:${tag}`);
  }

  return {
    valid: errors.length === 0,
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)],
  };
}

function unwrapRequirementDslV3(dsl) {
  return dsl?.requirement_dsl_v3 || null;
}

function isUnknownCommand(command) {
  if (typeof command === "string") return command.trim().toLowerCase() === "unknown";
  return String(command?.command || "").trim().toLowerCase() === "unknown";
}

function collectTags(root) {
  return [
    ...toArray(root.intent_atoms?.tags),
    ...toArray(root.business_semantics?.tags),
    ...toArray(root.scope_atoms?.tags),
    ...toArray(root.boundary_atoms?.guardrails),
    ...toArray(root.risk_atoms?.risks),
  ].filter((tag) => typeof tag === "string");
}

function hasMixedChineseEnglish(value) {
  return /[\u4e00-\u9fff]/.test(value) && /[A-Za-z]/.test(value);
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

module.exports = { validateRequirementDslV3, unwrapRequirementDslV3 };
