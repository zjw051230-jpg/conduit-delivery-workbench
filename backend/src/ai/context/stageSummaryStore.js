function appendStageSummary(task = {}, summary) {
  return {
    ...task,
    stageSummaries: [...listStageSummaries(task), summary],
  };
}

function getLatestTraceSummary(task = {}) {
  const summaries = listStageSummaries(task);
  return summaries.length > 0 ? summaries[summaries.length - 1] : null;
}

function listStageSummaries(task = {}) {
  return Array.isArray(task.stageSummaries) ? [...task.stageSummaries] : [];
}

module.exports = {
  appendStageSummary,
  getLatestTraceSummary,
  listStageSummaries,
};
