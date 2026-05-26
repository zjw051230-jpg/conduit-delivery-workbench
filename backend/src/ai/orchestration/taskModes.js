const TASK_MODES = Object.freeze({
  SOFTWARE_DELIVERY: "software_delivery",
  ALGORITHM_COMPETITION: "algorithm_competition",
});

const DEFAULT_TASK_MODE = TASK_MODES.SOFTWARE_DELIVERY;

const ALGORITHM_COMPETITION_STAGES = Object.freeze([
  "pm_input",
  "task_mode_detection",
  "competition_brief",
  "metric_analysis",
  "data_inspection",
  "baseline_reproduction",
  "weakness_diagnosis",
  "innovation_candidates",
  "critic_review_1",
  "algorithm_design",
  "experiment_plan",
  "implementation",
  "evaluation",
  "ablation",
  "error_analysis",
  "critic_review_2",
  "final_selection",
  "final_report",
  "delivery_guard",
]);

const ALGORITHM_COMPETITION_ARTIFACTS = Object.freeze([
  "competition_brief",
  "metric_analysis",
  "data_profile",
  "baseline_result",
  "weakness_diagnosis",
  "innovation_candidates",
  "critic_review",
  "algorithm_design",
  "experiment_matrix",
  "evaluation_result",
  "ablation_table",
  "error_analysis",
  "final_decision",
  "final_report",
  "safety_gate",
  "delivery_preview",
]);

function normalizeTaskMode(taskMode) {
  if (taskMode === TASK_MODES.ALGORITHM_COMPETITION) return TASK_MODES.ALGORITHM_COMPETITION;
  return DEFAULT_TASK_MODE;
}

module.exports = {
  TASK_MODES,
  DEFAULT_TASK_MODE,
  ALGORITHM_COMPETITION_STAGES,
  ALGORITHM_COMPETITION_ARTIFACTS,
  normalizeTaskMode,
};
