function createWorkBreakdownArtifact({ requirement, dsl = {}, moduleMap = {}, solutionPlan = {} }) {
  const files = Array.isArray(moduleMap.files) ? moduleMap.files : [];
  const frontendTasks = files.filter((file) => isFrontendFile(file.relativePath)).map((file) => createFileTask(file, solutionPlan));
  const backendTasks = files.filter((file) => isBackendFile(file.relativePath)).map((file) => createFileTask(file, solutionPlan));
  const dataModelTasks = files.filter((file) => isDataModelFile(file.relativePath)).map((file) => createFileTask(file, solutionPlan));
  const testTasks = (dsl.testCommands || []).map((command) => ({
    command,
    source: "skill-test-command",
    requiresNewTestFile: !files.some((file) => isTestFile(file.relativePath)),
  }));

  return {
    type: "work_breakdown",
    title: "Work Breakdown Document",
    status: dsl.status === "needs_clarification" ? "needs_clarification" : "ready",
    generatedBy: "Work Breakdown Agent",
    stage: "work-breakdown",
    content: {
      requirement,
      frontendTasks,
      backendTasks,
      dataModelTasks,
      testTasks,
      skillAssignment: createSkillAssignment(dsl),
      riskNotes: createRiskNotes({ dsl, frontendTasks, backendTasks, dataModelTasks, testTasks }),
      acceptanceCriteria: dsl.acceptanceCriteria || [],
      implementationSteps: solutionPlan.implementationSteps || [],
    },
  };
}

function createFileTask(file, solutionPlan) {
  return {
    file: file.relativePath,
    moduleType: file.moduleType || "unknown",
    source: file.source || "unknown",
    plannedChange: solutionPlan.implementationSteps?.[0] || "Apply the matched skill to this located module.",
  };
}

function createSkillAssignment(dsl) {
  return {
    skillId: dsl.targetSkillId || null,
    skillName: dsl.skillName || null,
    projectSkillId: dsl.projectSkillId || null,
    projectSkillName: dsl.projectSkillName || null,
    requirementType: dsl.requirementType || "unknown",
    riskLevel: dsl.riskLevel || null,
    testProfile: dsl.testProfile || "unknown",
    reason: dsl.targetSkillId
      ? `Matched ${dsl.requirementType || "unknown"} requirement to writer skill ${dsl.targetSkillId} and project skill ${dsl.projectSkillId || "none"}.`
      : dsl.projectSkillId
        ? `Matched requirement to project skill ${dsl.projectSkillId}, but no legacy writer is available yet.`
      : "No registered skill matched; keep the task in clarification before implementation.",
  };
}

function createRiskNotes({ dsl, frontendTasks, backendTasks, dataModelTasks, testTasks }) {
  const notes = [];

  if (!dsl.targetSkillId) {
    notes.push("No matched skill is available, so code generation should wait for clarification.");
  }
  if (frontendTasks.length > 0) {
    notes.push("Keep UI changes scoped to the located frontend files and acceptance criteria.");
  }
  if (backendTasks.length === 0) {
    notes.push("No backend API change is planned from the current module map.");
  }
  if (dataModelTasks.length === 0) {
    notes.push("No data model change is planned from the current module map.");
  }
  if (testTasks.length === 0) {
    notes.push("No test command was declared by the matched skill.");
  }
  if (dsl.forbiddenChanges?.length > 0) {
    notes.push(`Project Skill forbids: ${dsl.forbiddenChanges.slice(0, 4).join(", ")}.`);
  }

  return notes;
}

function isFrontendFile(relativePath = "") {
  return relativePath.startsWith("frontend/");
}

function isBackendFile(relativePath = "") {
  return relativePath.startsWith("backend/") && !isDataModelFile(relativePath);
}

function isDataModelFile(relativePath = "") {
  return /(^|\/)(models?|schemas?|migrations?|database|db)(\/|\.)/i.test(relativePath);
}

function isTestFile(relativePath = "") {
  return /\.(test|spec)\.[jt]sx?$/.test(relativePath);
}

module.exports = { createWorkBreakdownArtifact };
