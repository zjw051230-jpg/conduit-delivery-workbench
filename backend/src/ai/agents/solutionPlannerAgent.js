function createSolutionPlan({ dsl, moduleMap }) {
  const files = moduleMap.files.map((file) => file.relativePath);

  return {
    agent: "Solution Planner Agent",
    summary: dsl.targetSkillId
      ? `Use skill ${dsl.targetSkillId} to satisfy ${dsl.acceptanceCriteria.length} acceptance criteria.`
      : "No registered skill matched; stop before code generation.",
    implementationSteps: dsl.targetSkillId
      ? [
          "Load matched Skill definition and acceptance criteria.",
          "Retrieve only related Conduit files instead of sending the full repository.",
          "Apply the Skill writer to the target repository when applyChanges=true.",
          "Run Skill-defined test commands when runTests=true.",
          "Emit delivery report with changed files and test status.",
        ]
      : ["Ask PM clarification questions before planning code changes."],
    files,
    acceptanceCriteria: dsl.acceptanceCriteria,
    testCommands: dsl.testCommands,
  };
}

module.exports = { createSolutionPlan };
