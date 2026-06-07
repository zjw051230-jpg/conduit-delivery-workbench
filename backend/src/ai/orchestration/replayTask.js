const { runPipelineAsync } = require("./runPipeline");
const { runAllAlgorithmStages } = require("./algorithmStageRunner");
const { TASK_MODES } = require("./taskModes");

async function replayTask({ taskStore, taskId, config, taskMode, fromStage, runAll = false, applyChanges = false, runTests = false }) {
  const savedTask = taskStore.get(taskId);
  if (!savedTask) {
    const error = new Error("task not found");
    error.statusCode = 404;
    throw error;
  }

  const replayTaskMode = taskMode || savedTask.taskMode;
  let replayedTask = await runPipelineAsync({
    requirement: savedTask.requirement,
    taskMode: replayTaskMode,
    applyChanges,
    runTests,
    config,
  });

  if (replayedTask.taskMode === TASK_MODES.ALGORITHM_COMPETITION && runAll) {
    replayedTask = runAllAlgorithmStages(replayedTask, { fromStage }).task;
  }

  replayedTask.replayedFrom = savedTask.id;
  replayedTask.replayOptions = {
    taskMode: replayTaskMode || replayedTask.taskMode,
    fromStage,
    runAll,
    applyChanges,
    runTests,
  };

  return taskStore.save(replayedTask);
}

module.exports = { replayTask };
