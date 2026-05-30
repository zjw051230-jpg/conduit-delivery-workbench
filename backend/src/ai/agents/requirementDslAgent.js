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

function createRequirementDsl(requirement, { matchedSkill, skillPlan, missingQuestions = [], clarifications = {} }) {
  const primaryProjectSkill = skillPlan?.primaryProjectSkill || null;
  const projectCandidatePaths = skillPlan?.primaryProjectContextHints?.candidatePaths || [];

  return {
    version: "delivery-dsl/v0.1",
    rawRequirement: requirement,
    targetSkillId: matchedSkill?.id || null,
    projectSkillId: primaryProjectSkill?.id || null,
    skillName: matchedSkill?.name || primaryProjectSkill?.name || null,
    legacySkillName: matchedSkill?.name || null,
    projectSkillName: primaryProjectSkill?.name || null,
    requirementType: matchedSkill?.requirementType || primaryProjectSkill?.type || "unknown",
    skillLayer: skillPlan?.skillLayer || null,
    riskLevel: skillPlan?.riskLevel || null,
    testProfile: skillPlan?.testProfile || "unknown",
    status: missingQuestions.length > 0 ? "needs_clarification" : "ready_for_planning",
    clarifications,
    unresolvedQuestions: missingQuestions,
    targetModules: matchedSkill?.targetModules || [],
    contextHints: [...new Set([...(matchedSkill?.contextHints || []), ...projectCandidatePaths])],
    legacyContextHints: matchedSkill?.contextHints || [],
    projectContextHints: skillPlan?.projectContextHints || {},
    acceptanceCriteria: matchedSkill?.acceptanceCriteria || skillPlan?.successCriteria || [],
    projectSuccessCriteria: skillPlan?.successCriteria || [],
    testCommands: matchedSkill?.testCommands || [],
    requiredUnderstandingSkillIds: skillPlan?.requiredUnderstandingSkills?.map((skill) => skill.id) || [],
    deliverySkillIds: skillPlan?.deliverySkills?.map((skill) => skill.id) || [],
    allowedChanges: skillPlan?.allowedChanges || [],
    forbiddenChanges: skillPlan?.forbiddenChanges || [],
    safeDefaults: skillPlan?.safeDefaults || [],
    skillPlan,
    pipeline: PIPELINE,
  };
}

module.exports = { createRequirementDsl, PIPELINE };
