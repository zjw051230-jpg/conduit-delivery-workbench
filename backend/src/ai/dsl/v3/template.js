const DSL_V3_VERSION = "3.0.0";

function createDslV3Template({
  requirement = "",
  matchedSkill = null,
  skillPlan = null,
  missingQuestions = [],
  clarifications = {},
} = {}) {
  const primaryProjectSkill = skillPlan?.primaryProjectSkill || null;
  const contextHints = [
    ...(matchedSkill?.contextHints || []),
    ...(skillPlan?.primaryProjectContextHints?.candidatePaths || []),
  ];

  return {
    requirement_dsl_v3: {
      meta: {
        dsl_version: DSL_V3_VERSION,
        lifecycle_state: "draft",
        stage: "draft",
        source_type: "pm_text",
        raw_requirement: requirement,
        legacy_skill_id: matchedSkill?.id || null,
        project_skill_id: primaryProjectSkill?.id || null,
        enum_dictionary_ref: "RequirementDSL_v3_enum_dictionary",
      },
      readiness_gates: {
        schema_valid: null,
        blocking_clarification_resolved: missingQuestions.length === 0,
        baseline_completed: false,
        path_confirmed: false,
        oracle_ready: false,
        security_privacy_checked: false,
        ready_for_agent: false,
      },
      task_profile: {
        task_type: matchedSkill?.requirementType || primaryProjectSkill?.type || "unknown",
        delivery_mode: "code_change",
        target_user_action: null,
        success_signal: null,
        risk_level: skillPlan?.riskLevel || null,
        test_profile: skillPlan?.testProfile || "unknown",
      },
      intent_atoms: {
        raw_requirement: requirement,
        normalized_requirement: requirement,
        target_skill_id: matchedSkill?.id || null,
        project_skill_id: primaryProjectSkill?.id || null,
        tags: [],
      },
      business_semantics: {
        actors: [],
        business_goal: "",
        user_value: "",
        domain_terms: [],
      },
      baseline_behavior: {
        known_existing_capabilities: [],
        unknown_existing_capabilities: [],
        baseline_check_methods: ["repo_read"],
      },
      scope_atoms: {
        in_scope: [],
        out_of_scope: [],
        target_surfaces: [],
      },
      change_atoms: {
        change_type: matchedSkill?.requirementType || primaryProjectSkill?.type || "unknown",
        target_modules: matchedSkill?.targetModules || [],
        context_hints: [...new Set(contextHints)],
      },
      boundary_atoms: {
        allowed_changes: skillPlan?.allowedChanges || [],
        forbidden_changes: skillPlan?.forbiddenChanges || [],
        guardrails: skillPlan?.safeDefaults || [],
      },
      decision_policy: {
        must_ask_human: missingQuestions,
        must_stop: missingQuestions.length > 0 ? ["needs_human_clarification"] : [],
        implementation_strategy: "investigate_first",
      },
      risk_atoms: {
        risk_level: skillPlan?.riskLevel || null,
        risks: missingQuestions.length > 0 ? ["baseline_not_checked"] : [],
        auto_fail_conditions: ["schema_invalid", "unverified_output"],
      },
      execution_atoms: {
        required_tools: ["repo_read"],
        allowed_tools: ["repo_read"],
        expected_artifacts: ["diff_summary", "test_report", "final_report"],
        confirmed_allowed_paths: [],
        context_hints: [...new Set(contextHints)],
      },
      evaluation_atoms: {
        acceptance_checks: matchedSkill?.acceptanceCriteria || skillPlan?.successCriteria || [],
        success_criteria: skillPlan?.successCriteria || [],
        quality_scores: ["oracle_quality", "scope_control", "baseline_handling"],
      },
      test_oracle_detail: {
        verification_command_status: matchedSkill?.testCommands?.length ? "known" : "unknown",
        verification_command_discovery: matchedSkill?.testCommands?.length
          ? { required: false, owner_role: "agent_or_qa", methods: [] }
          : {
              required: true,
              owner_role: "agent_or_qa",
              methods: ["inspect_package_scripts", "inspect_ci_config", "search_existing_tests"],
            },
        verification_commands: matchedSkill?.testCommands || [],
        evidence_mapping: [],
      },
      clarification_queue: missingQuestions.map((question, index) => ({
        id: `clarification_${index + 1}`,
        question,
        blocking_level: "blocking",
        owner_role: "pm",
        status: clarifications[question] ? "resolved" : "open",
      })),
      scoring_atoms: {
        scoring_method: "gate_then_weighted_checklist",
        hard_gate_policy: "all_must_pass",
        checklist: [],
      },
    },
  };
}

module.exports = { DSL_V3_VERSION, createDslV3Template };
