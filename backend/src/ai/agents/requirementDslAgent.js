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

function createRequirementDsl(requirement, { matchedSkill, missingQuestions = [], clarifications = {} }) {
  return {
    version: "delivery-dsl/v0.1",
    rawRequirement: requirement,
    targetSkillId: matchedSkill?.id || null,
    skillName: matchedSkill?.name || null,
    requirementType: matchedSkill?.requirementType || "unknown",
    status: missingQuestions.length > 0 ? "needs_clarification" : "ready_for_planning",
    clarifications,
    unresolvedQuestions: missingQuestions,
    targetModules: matchedSkill?.targetModules || [],
    contextHints: matchedSkill?.contextHints || [],
    acceptanceCriteria: matchedSkill?.acceptanceCriteria || [],
    testCommands: matchedSkill?.testCommands || [],
    pipeline: PIPELINE,
  };
}

module.exports = { createRequirementDsl, PIPELINE };
