const { TASK_MODES } = require("./taskModes");
const { buildEvaluationContext, getAlgorithmStageDefinition, getAlgorithmStageDefinitions } = require("./algorithmStageRegistry");
const {
  markWorkflowBlocked,
  readyArtifactTypes,
  refreshAlgorithmWorkflowState,
  updateStage,
  upsertArtifacts,
} = require("./algorithmWorkflowState");

function runAlgorithmStage(task, stageId, options = {}) {
  assertAlgorithmTask(task);
  const stageDefinition = getAlgorithmStageDefinition(stageId);
  if (!stageDefinition) {
    const error = new Error(`unknown algorithm stage: ${stageId}`);
    error.statusCode = 404;
    throw error;
  }

  const stageState = task.stages.find((stage) => stage.id === stageId);
  if (!stageState) {
    const error = new Error(`stage not found on task: ${stageId}`);
    error.statusCode = 404;
    throw error;
  }

  if (stageState.status === "completed" && !options.force) {
    return {
      task: refreshAlgorithmWorkflowState(task),
      result: {
        status: "already_completed",
        stageId,
        generatedArtifacts: [],
        replayCount: stageState.replayCount || 0,
        summary: `${stageDefinition.title} is already completed.`,
      },
    };
  }

  const availableArtifacts = readyArtifactTypes(task);
  const missingArtifacts = stageDefinition.requiredArtifacts.filter((artifactType) => !availableArtifacts.includes(artifactType));
  if (missingArtifacts.length > 0) {
    const blockedTask = markWorkflowBlocked(task, { stageId, missingArtifacts });
    return {
      task: blockedTask,
      result: {
        status: "blocked",
        stageId,
        missingArtifacts,
        generatedArtifacts: [],
        summary: blockedTask.errorMessage,
      },
    };
  }

  const now = new Date().toISOString();
  let runningTask = updateStage(task, stageId, (stage) => ({
    ...stage,
    status: "running",
    startedAt: stage.startedAt || now,
    updatedAt: now,
  }));
  const context = buildEvaluationContext();
  const output = stageDefinition.runner({ task: runningTask, stageDefinition, context, now });
  runningTask = upsertArtifacts(runningTask, output.artifacts);
  const replayCount = options.force ? (stageState.replayCount || 0) + 1 : stageState.replayCount || 0;
  let completedTask = updateStage(runningTask, stageId, (stage) => ({
    ...stage,
    status: "completed",
    summary: output.summary,
    output: {
      agent: stageDefinition.agentName,
      summary: output.summary,
      generatedArtifacts: output.artifacts.map((artifact) => artifact.type),
      canWriteRepo: false,
      canRunCommands: false,
      canCommit: false,
      canPush: false,
      canCreatePr: false,
    },
    replayCount,
    completedAt: now,
    updatedAt: now,
  }));

  if (options.force) {
    completedTask = {
      ...completedTask,
      replayCount: (completedTask.replayCount || 0) + 1,
    };
  }

  completedTask = refreshAlgorithmWorkflowState(completedTask, { now });

  return {
    task: completedTask,
    result: {
      status: "completed",
      stageId,
      generatedArtifacts: output.artifacts.map((artifact) => artifact.type),
      replayCount,
      summary: output.summary,
    },
  };
}

function runNextAlgorithmStage(task) {
  assertAlgorithmTask(task);
  const refreshedTask = refreshAlgorithmWorkflowState(task);
  if (!refreshedTask.currentStage) {
    return {
      task: refreshedTask,
      result: {
        status: "already_completed",
        stageId: null,
        generatedArtifacts: [],
        summary: "Workflow has no pending stages.",
      },
    };
  }

  return runAlgorithmStage(refreshedTask, refreshedTask.currentStage);
}

function runAllAlgorithmStages(task, options = {}) {
  assertAlgorithmTask(task);
  let currentTask = refreshAlgorithmWorkflowState(task);
  const stageDefinitions = getAlgorithmStageDefinitions();
  const startIndex = options.fromStage
    ? Math.max(stageDefinitions.findIndex((definition) => definition.id === options.fromStage), 0)
    : 0;
  const results = [];

  if (options.fromStage) {
    for (const stageDefinition of stageDefinitions.slice(0, startIndex)) {
      const stageState = currentTask.stages.find((stage) => stage.id === stageDefinition.id);
      if (stageState?.status !== "completed") {
        const run = runAlgorithmStage(currentTask, stageDefinition.id);
        currentTask = run.task;
        results.push(run.result);
        if (run.result.status === "blocked") return { task: currentTask, results };
      }
    }
  }

  for (const stageDefinition of stageDefinitions.slice(startIndex)) {
    const stageState = currentTask.stages.find((stage) => stage.id === stageDefinition.id);
    if (stageState?.status === "completed") continue;

    const run = runAlgorithmStage(currentTask, stageDefinition.id);
    currentTask = run.task;
    results.push(run.result);
    if (run.result.status === "blocked") return { task: currentTask, results };
  }

  return { task: refreshAlgorithmWorkflowState(currentTask), results };
}

function assertAlgorithmTask(task) {
  if (task?.taskMode !== TASK_MODES.ALGORITHM_COMPETITION) {
    const error = new Error("task is not an algorithm_competition workflow");
    error.statusCode = 400;
    throw error;
  }
}

module.exports = {
  runAlgorithmStage,
  runAllAlgorithmStages,
  runNextAlgorithmStage,
};
