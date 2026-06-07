const { validateRequirementDslV3, unwrapRequirementDslV3 } = require("./validator");

function computeReadinessGates(dsl) {
  const root = unwrapRequirementDslV3(dsl);
  const current = root?.readiness_gates || {};
  const validation = validateRequirementDslV3(dsl);
  const gates = {
    schema_valid: validation.valid,
    blocking_clarification_resolved: Boolean(current.blocking_clarification_resolved),
    baseline_completed: Boolean(current.baseline_completed),
    path_confirmed: Boolean(current.path_confirmed),
    oracle_ready: Boolean(current.oracle_ready),
    security_privacy_checked: Boolean(current.security_privacy_checked),
    ready_for_agent: false,
  };

  gates.ready_for_agent = [
    gates.schema_valid,
    gates.blocking_clarification_resolved,
    gates.baseline_completed,
    gates.path_confirmed,
    gates.oracle_ready,
    gates.security_privacy_checked,
  ].every(Boolean);

  return gates;
}

module.exports = { computeReadinessGates };
