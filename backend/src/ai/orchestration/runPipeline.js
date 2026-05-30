const path = require("node:path");
const { loadSkills } = require("../skills/skillLoader");
const { loadProjectSkills } = require("../skills/projectSkillLoader");
const { SkillRegistry } = require("../skills/skillRegistry");
const { resolveSkillPlan } = require("../skills/skillPlanResolver");
const { buildRepositoryIndex } = require("../context/repositoryIndexer");
const { retrieveContext } = require("../context/retriever");
const { clarifyRequirement } = require("../agents/pmClarifierAgent");
const { createRequirementDsl } = require("../agents/requirementDslAgent");
const { locateModules } = require("../agents/moduleLocatorAgent");
const { createSolutionPlan } = require("../agents/solutionPlannerAgent");
const { applyCodeChanges, previewCodeChanges } = require("../agents/codeWriterAgent");
const { runTestCommands } = require("../agents/testRunnerAgent");
const { createDeliveryReport } = require("../agents/deliveryReporterAgent");
const { createWorkBreakdownArtifact } = require("../agents/workBreakdownAgent");
const { writeChangeMemory } = require("../memory/changeMemoryStore");
const { runAlgorithmCompetitionPipeline } = require("./algorithmCompetitionPipeline");
const { TASK_MODES, normalizeTaskMode } = require("./taskModes");

function runPipeline({ requirement, taskMode, applyChanges = false, runTests = false, config }) {
  const normalizedTaskMode = normalizeTaskMode(taskMode);
  const taskId = createTaskId();
  const createdAt = new Date().toISOString();

  if (normalizedTaskMode === TASK_MODES.ALGORITHM_COMPETITION) {
    return runAlgorithmCompetitionPipeline({
      taskId,
      createdAt,
      requirement,
      applyChanges,
      runTests,
    });
  }

  const skillsDirectory = path.join(__dirname, "../skills/definitions");
  const projectSkillsDirectory = path.join(__dirname, "../skills/project");
  const skills = loadSkills(skillsDirectory);
  const projectSkills = loadProjectSkills(projectSkillsDirectory);
  const registry = new SkillRegistry(skills);
  const matchedSkill = registry.match(requirement);
  const skillPlan = resolveSkillPlan({ requirement, legacySkill: matchedSkill, projectSkills });
  const stages = [];

  const clarification = clarifyRequirement(requirement, matchedSkill || skillPlan.primaryProjectSkill);
  stages.push(stage("pm-clarifier", clarification.status, clarification));

  const dsl = createRequirementDsl(requirement, {
    matchedSkill,
    skillPlan,
    missingQuestions: clarification.missingQuestions,
    clarifications: {},
  });
  stages.push(stage("requirement-dsl", dsl.status, dsl));

  const index = buildRepositoryIndex(config.conduitRepoPath);
  const retrievedContext = retrieveContext({
    query: requirement,
    index,
    contextHints: dsl.contextHints,
    limit: 8,
  });
  stages.push(stage("context-rag", "completed", { filesIndexed: index.length, retrievedContext }));

  const moduleMap = locateModules({ dsl, retrievedContext });
  stages.push(stage("module-locator", "completed", moduleMap));

  const solutionPlan = createSolutionPlan({ dsl, moduleMap });
  stages.push(stage("solution-planner", "completed", solutionPlan));

  const workBreakdownArtifact = createWorkBreakdownArtifact({
    requirement,
    dsl,
    moduleMap,
    solutionPlan,
  });

  const writeResult = applyChanges
    ? applyCodeChanges({ repoRoot: config.conduitRepoPath, dsl })
    : previewCodeChanges({ dsl });
  stages.push(stage("code-writer", writeResult.status, writeResult));

  const testResult = runTestCommands({
    repoRoot: config.conduitRepoPath,
    commands: dsl.testCommands,
    enabled: runTests,
  });
  stages.push(stage("test-runner", testResult.status, testResult));

  const report = createDeliveryReport({
    taskId,
    dsl,
    moduleMap,
    solutionPlan,
    writeResult,
    testResult,
  });
  stages.push(stage("delivery-reporter", "completed", report));

  const memoryResult = writeChangeMemory({
    runDirectory: config.projectRoot ? path.join(config.projectRoot, ".ai-runs") : null,
    taskId,
    createdAt,
    requirement,
    dsl,
    writeResult,
    testResult,
    report,
    skillPlan,
  });
  stages.push(stage("change-memory", memoryResult.status, memoryResult));

  return {
    id: taskId,
    createdAt,
    taskMode: normalizedTaskMode,
    requirement,
    applyChanges,
    runTests,
    status: testResult.status === "failed" ? "needs_fix" : "completed",
    matchedSkill,
    projectMatchedSkill: skillPlan.primaryProjectSkill,
    skillPlan,
    dsl,
    stages,
    artifacts: [workBreakdownArtifact],
    report,
  };
}

function stage(name, status, output) {
  return {
    name,
    status,
    completedAt: new Date().toISOString(),
    output,
  };
}

function createTaskId() {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

module.exports = { runPipeline };
