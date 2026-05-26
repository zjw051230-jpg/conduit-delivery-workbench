const { TASK_MODES, ALGORITHM_COMPETITION_ARTIFACTS } = require("./taskModes");
const { createPendingArtifact, getAlgorithmStageDefinitions } = require("./algorithmStageRegistry");

function createAlgorithmWorkflowTask({ taskId, createdAt, requirement, applyChanges = false, runTests = false }) {
  const stages = getAlgorithmStageDefinitions().map((definition) => createStageState(definition, createdAt));
  const artifacts = ALGORITHM_COMPETITION_ARTIFACTS.map((type) => createPendingArtifact(type, createdAt));
  const task = {
    id: taskId,
    createdAt,
    updatedAt: createdAt,
    taskMode: TASK_MODES.ALGORITHM_COMPETITION,
    requirement,
    applyChanges,
    runTests,
    status: "created",
    currentStage: "pm_input",
    stages,
    artifacts,
    completedStages: [],
    pendingStages: stages.map((stage) => stage.id),
    failedStage: null,
    errorMessage: null,
    replayCount: 0,
    nextActions: ["Run next stage: pm_input"],
    report: createReport({ taskId, requirement, artifactTypes: artifacts.map((artifact) => artifact.type) }),
  };

  return refreshAlgorithmWorkflowState(task, { now: createdAt });
}

function createStageState(definition, now) {
  return {
    id: definition.id,
    name: definition.id,
    title: definition.title,
    agent: definition.agentName,
    agentId: definition.agentId,
    agentName: definition.agentName,
    status: "pending",
    inputArtifacts: definition.requiredArtifacts,
    outputArtifacts: definition.outputArtifacts,
    canWriteRepo: definition.canWriteRepo,
    canRunCommands: definition.canRunCommands,
    canCommit: definition.canCommit,
    canPush: definition.canPush,
    canCreatePr: definition.canCreatePr,
    description: definition.description,
    summary: definition.description,
    replayCount: 0,
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    completedAt: null,
    output: null,
  };
}

function refreshAlgorithmWorkflowState(task, { now = new Date().toISOString(), preserveBlocked = false } = {}) {
  const failedStage = task.stages.find((stage) => stage.status === "failed")?.id || null;
  const completedStages = task.stages
    .filter((stage) => stage.status === "completed")
    .map((stage) => stage.id);
  const pendingStages = task.stages
    .filter((stage) => stage.status === "pending")
    .map((stage) => stage.id);
  const currentStage = pendingStages[0] || null;
  const status = workflowStatus({ task, failedStage, pendingStages, completedStages, preserveBlocked });

  return {
    ...task,
    updatedAt: now,
    status,
    currentStage,
    completedStages,
    pendingStages,
    failedStage,
    errorMessage: failedStage ? task.errorMessage : preserveBlocked ? task.errorMessage : null,
    nextActions: nextActions({ status, currentStage, failedStage, errorMessage: task.errorMessage }),
  };
}

function markWorkflowBlocked(task, { stageId, missingArtifacts, now = new Date().toISOString() }) {
  return {
    ...refreshAlgorithmWorkflowState(task, { now, preserveBlocked: true }),
    status: "blocked",
    errorMessage: `Stage ${stageId} is blocked by missing artifacts: ${missingArtifacts.join(", ")}`,
    nextActions: [`Generate required artifacts before running ${stageId}: ${missingArtifacts.join(", ")}`],
    updatedAt: now,
  };
}

function updateStage(task, stageId, updater) {
  return {
    ...task,
    stages: task.stages.map((stage) => (stage.id === stageId ? updater(stage) : stage)),
  };
}

function upsertArtifacts(task, readyArtifacts) {
  return {
    ...task,
    artifacts: task.artifacts.map((artifact) => readyArtifacts.find((readyArtifact) => readyArtifact.type === artifact.type) || artifact),
  };
}

function readyArtifactTypes(task) {
  return task.artifacts
    .filter((artifact) => artifact.status === "ready")
    .map((artifact) => artifact.type);
}

function createReport({ taskId, requirement, artifactTypes }) {
  return {
    agent: "Algorithm Competition Workflow Reporter",
    taskId,
    summary: "algorithm_competition workflow is API-drivable and safe: stages can run locally without repository writes or command execution.",
    requirement,
    changedFiles: [],
    locatedFiles: [],
    acceptanceCriteria: [
      "No Conduit files are read or written in algorithm workflow mode.",
      "No commit, push, PR, or external command execution is allowed in algorithm workflow mode.",
      "Each stage exposes stable status, input artifacts, output artifacts, and safety flags.",
    ],
    testStatus: "not_executed",
    testCommands: [],
    artifactTypes,
    nextActions: ["Use /api/ai/tasks/:taskId/run-next or /run-all to advance the workflow."],
  };
}

function workflowStatus({ task, failedStage, pendingStages, completedStages, preserveBlocked }) {
  if (failedStage) return "failed";
  if (preserveBlocked && task.status === "blocked") return "blocked";
  if (pendingStages.length === 0) return "completed";
  if (completedStages.length > 0) return "running";
  return "created";
}

function nextActions({ status, currentStage, failedStage, errorMessage }) {
  if (status === "completed") return ["Workflow completed. Review final_report and delivery_guard artifacts."];
  if (status === "failed") return [`Resolve failed stage ${failedStage}: ${errorMessage || "unknown error"}`];
  if (status === "blocked") return [errorMessage || "Resolve missing required artifacts before continuing."];
  if (currentStage) return [`Run next stage: ${currentStage}`];
  return [];
}

module.exports = {
  createAlgorithmWorkflowTask,
  markWorkflowBlocked,
  readyArtifactTypes,
  refreshAlgorithmWorkflowState,
  updateStage,
  upsertArtifacts,
};
