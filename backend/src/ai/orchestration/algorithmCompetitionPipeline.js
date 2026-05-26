const { createAlgorithmWorkflowTask } = require("./algorithmWorkflowState");

function runAlgorithmCompetitionPipeline({ taskId, createdAt, requirement, applyChanges = false, runTests = false }) {
  return createAlgorithmWorkflowTask({
    taskId,
    createdAt,
    requirement,
    applyChanges,
    runTests,
  });
}

module.exports = { runAlgorithmCompetitionPipeline };
