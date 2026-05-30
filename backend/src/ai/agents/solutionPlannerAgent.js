function createSolutionPlan({ dsl, moduleMap }) {
  const files = moduleMap.files.map((file) => file.relativePath);

  return {
    agent: "Solution Planner Agent",
    summary: dsl.targetSkillId
      ? `Use writer skill ${dsl.targetSkillId} with project skill ${dsl.projectSkillId || "none"} to satisfy ${dsl.acceptanceCriteria.length} acceptance criteria.`
      : dsl.projectSkillId
        ? `Use project skill ${dsl.projectSkillId} for planning; no legacy writer is implemented yet.`
      : "No registered skill matched; stop before code generation.",
    implementationSteps: dsl.targetSkillId
      ? [
          "Load matched Skill definition and acceptance criteria.",
          "Apply project Skill risk, forbidden-change, and context-selection rules.",
          "Retrieve only related Conduit files instead of sending the full repository.",
          "Apply the Skill writer to the target repository when applyChanges=true.",
          "Run Skill-defined test commands when runTests=true.",
          "Emit delivery report with changed files and test status.",
        ]
      : dsl.projectSkillId
        ? [
            "Load project Skill manifest, SKILL.md path, and context-selection rules.",
            "Use required understanding Skills before implementation.",
            "Keep the task planner-only until a legacy writer or code generation path exists.",
            "Emit delivery and memory artifacts without modifying Conduit source code.",
          ]
      : ["Ask PM clarification questions before planning code changes."],
    files,
    acceptanceCriteria: dsl.acceptanceCriteria,
    testCommands: dsl.testCommands,
    projectSkill: {
      id: dsl.projectSkillId,
      riskLevel: dsl.riskLevel,
      testProfile: dsl.testProfile,
      forbiddenChanges: dsl.forbiddenChanges,
      safeDefaults: dsl.safeDefaults,
    },
  };
}

module.exports = { createSolutionPlan };
