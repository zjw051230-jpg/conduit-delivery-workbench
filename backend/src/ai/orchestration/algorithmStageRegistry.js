const {
  buildAblationTable,
  buildAlgorithmDesign,
  buildCompetitionBrief,
  buildDataProfile,
  buildErrorAnalysis,
  buildExperimentMatrix,
  buildFinalDecision,
  buildFinalReport,
  buildInnovationCandidates,
  buildMetricAnalysis,
  buildWeaknessDiagnosis,
  loadCompetitionFixture,
  runBaseline,
  runImprovedMethod,
} = require("../evaluation/evaluationHarness");
const {
  TASK_MODES,
  ALGORITHM_COMPETITION_STAGES,
  ALGORITHM_COMPETITION_ARTIFACTS,
} = require("./taskModes");

const artifactDefinitions = {
  competition_brief: {
    title: "Competition Brief",
    stage: "competition_brief",
    generatedBy: "Competition Reader",
    summary: "Demo competition brief built from fixture metadata and split statistics.",
  },
  metric_analysis: {
    title: "Metric Analysis",
    stage: "metric_analysis",
    generatedBy: "Rule & Metric Agent",
    summary: "Accuracy analysis built from baseline and improved demo scores.",
  },
  data_profile: {
    title: "Data Profile",
    stage: "data_inspection",
    generatedBy: "Data Inspector",
    summary: "Data profile computed from demo train/dev JSONL splits.",
  },
  baseline_result: {
    title: "Baseline Result",
    stage: "baseline_reproduction",
    generatedBy: "Baseline Reproducer",
    summary: "Demo baseline score computed in-process without external commands.",
  },
  weakness_diagnosis: {
    title: "Weakness Diagnosis",
    stage: "weakness_diagnosis",
    generatedBy: "Weakness Diagnoser",
    summary: "Weakness diagnosis derived from baseline failed examples.",
  },
  innovation_candidates: {
    title: "Innovation Candidates",
    stage: "innovation_candidates",
    generatedBy: "Innovation Strategist",
    summary: "Innovation candidate generated from baseline weakness and improved score evidence.",
  },
  critic_review: {
    title: "Critic Review",
    stage: "critic_review_1",
    generatedBy: "Red Team Critic",
    summary: "Deterministic critic review checks leakage, overfit, and command-safety risks.",
  },
  algorithm_design: {
    title: "Algorithm Design",
    stage: "algorithm_design",
    generatedBy: "Algorithm Designer",
    summary: "Deterministic improved keyword-rule design selected from demo evidence.",
  },
  experiment_matrix: {
    title: "Experiment Matrix",
    stage: "experiment_plan",
    generatedBy: "Experiment Planner",
    summary: "Experiment matrix compares baseline and improved demo keyword methods.",
  },
  evaluation_result: {
    title: "Evaluation Result",
    stage: "evaluation",
    generatedBy: "Evaluation Runner",
    summary: "Demo baseline and improved scores computed in-process without external commands.",
  },
  ablation_table: {
    title: "Ablation Table",
    stage: "ablation",
    generatedBy: "Ablation Analyst",
    summary: "Demo ablation table compares baseline and improved keyword rules.",
  },
  error_analysis: {
    title: "Error Analysis",
    stage: "error_analysis",
    generatedBy: "Error Analyst",
    summary: "Demo error analysis shows baseline misses fixed by the improved rule.",
  },
  final_decision: {
    title: "Final Decision",
    stage: "final_selection",
    generatedBy: "Final Selector",
    summary: "Final decision selects the improved method using ablation delta and error analysis.",
  },
  final_report: {
    title: "Final Report",
    stage: "final_report",
    generatedBy: "Report Writer",
    summary: "Final report consolidates demo brief, profile, scores, ablation, and decision evidence.",
  },
  safety_gate: {
    title: "Safety Gate",
    stage: "delivery_guard",
    generatedBy: "Delivery Guard",
    summary: "No commit, push, or PR is allowed in algorithm competition workflow mode.",
  },
  delivery_preview: {
    title: "Delivery Preview",
    stage: "delivery_guard",
    generatedBy: "Delivery Guard",
    summary: "Algorithm workflow delivery preview confirms no repository changes are available.",
  },
};

const stageDefinitions = [
  stage("pm_input", "PM Input", "chief_commander", "Chief Commander", [], [], "Accept PM input for algorithm competition workflow."),
  stage("task_mode_detection", "Task Mode Detection", "chief_commander", "Chief Commander", [], [], "Route request to local algorithm_competition workflow."),
  stage("competition_brief", "Competition Brief", "competition_reader", "Competition Reader", [], ["competition_brief"], "Build a fixture-backed competition brief."),
  stage("metric_analysis", "Metric Analysis", "metric_agent", "Rule & Metric Agent", ["competition_brief"], ["metric_analysis"], "Explain accuracy scoring and score interpretation."),
  stage("data_inspection", "Data Inspection", "data_inspector", "Data Inspector", ["competition_brief"], ["data_profile"], "Profile train/dev splits and label distribution."),
  stage("baseline_reproduction", "Baseline Reproduction", "baseline_reproducer", "Baseline Reproducer", ["data_profile"], ["baseline_result"], "Run the deterministic keyword baseline in-process."),
  stage("weakness_diagnosis", "Weakness Diagnosis", "weakness_diagnoser", "Weakness Diagnoser", ["baseline_result"], ["weakness_diagnosis"], "Diagnose baseline failures."),
  stage("innovation_candidates", "Innovation Candidates", "innovation_strategist", "Innovation Strategist", ["weakness_diagnosis"], ["innovation_candidates"], "Propose deterministic improvement candidates."),
  stage("critic_review_1", "Critic Review 1", "red_team_critic", "Red Team Critic", ["innovation_candidates"], ["critic_review"], "Review candidate risks before design."),
  stage("algorithm_design", "Algorithm Design", "algorithm_designer", "Algorithm Designer", ["innovation_candidates"], ["algorithm_design"], "Design the improved keyword rule."),
  stage("experiment_plan", "Experiment Plan", "experiment_planner", "Experiment Planner", ["algorithm_design"], ["experiment_matrix"], "Plan baseline versus improved comparison."),
  stage("implementation", "Implementation", "code_implementer", "Code Implementer", ["algorithm_design"], [], "Simulate implementation; no repository writes."),
  stage("evaluation", "Evaluation", "evaluation_runner", "Evaluation Runner", ["experiment_matrix"], ["evaluation_result"], "Run deterministic in-process evaluation."),
  stage("ablation", "Ablation", "ablation_analyst", "Ablation Analyst", ["evaluation_result"], ["ablation_table"], "Build ablation table from scores."),
  stage("error_analysis", "Error Analysis", "error_analyst", "Error Analyst", ["evaluation_result"], ["error_analysis"], "Analyze baseline and improved failures."),
  stage("critic_review_2", "Critic Review 2", "red_team_critic", "Red Team Critic", ["ablation_table", "error_analysis"], [], "Review final evidence and safety constraints."),
  stage("final_selection", "Final Selection", "final_selector", "Final Selector", ["ablation_table", "evaluation_result", "error_analysis"], ["final_decision"], "Select the best method from evidence."),
  stage("final_report", "Final Report", "report_writer", "Report Writer", ["final_decision"], ["final_report"], "Create the final deterministic report."),
  stage("delivery_guard", "Delivery Guard", "delivery_guard", "Delivery Guard", ["final_report"], ["safety_gate", "delivery_preview"], "Confirm no commit, push, or PR actions are allowed."),
];

function getAlgorithmStageDefinitions() {
  return stageDefinitions;
}

function getAlgorithmStageDefinition(stageId) {
  return stageDefinitions.find((definition) => definition.id === stageId) || null;
}

function getAlgorithmArtifactDefinitions() {
  return ALGORITHM_COMPETITION_ARTIFACTS.map((type) => ({ type, ...artifactDefinitions[type] }));
}

function createPendingArtifact(type, now) {
  const definition = artifactDefinitions[type];
  return {
    type,
    title: definition.title,
    status: "pending",
    summary: definition.summary,
    content: {},
    generatedBy: definition.generatedBy,
    stage: definition.stage,
    createdAt: now,
    updatedAt: now,
  };
}

function buildReadyArtifact(type, requirement, context, now, existingArtifact) {
  const definition = artifactDefinitions[type];
  return {
    type,
    title: definition.title,
    status: "ready",
    summary: definition.summary,
    content: buildArtifactContent(type, requirement, context, definition.summary),
    generatedBy: definition.generatedBy,
    stage: definition.stage,
    createdAt: existingArtifact?.createdAt || now,
    updatedAt: now,
  };
}

function buildEvaluationContext() {
  const fixture = loadCompetitionFixture();
  const baseline = runBaseline(fixture);
  const improved = runImprovedMethod(fixture);
  const ablation = buildAblationTable({ baseline, improved });
  const errorAnalysis = buildErrorAnalysis({ baseline, improved });
  const competitionBrief = buildCompetitionBrief(fixture);
  const dataProfile = buildDataProfile(fixture);
  const metricAnalysis = buildMetricAnalysis(fixture, { baseline, improved });
  const weaknessDiagnosis = buildWeaknessDiagnosis(baseline, errorAnalysis);
  const innovationCandidates = buildInnovationCandidates(baseline, improved, weaknessDiagnosis);
  const algorithmDesign = buildAlgorithmDesign(innovationCandidates.selectedCandidate);
  const experimentMatrix = buildExperimentMatrix(baseline, improved);
  const finalDecision = buildFinalDecision(ablation, { baseline, improved }, errorAnalysis);
  const finalReport = buildFinalReport({
    competitionBrief,
    dataProfile,
    metricAnalysis,
    baseline,
    improved,
    ablation,
    errorAnalysis,
    finalDecision,
  });

  return {
    fixture: {
      id: fixture.id,
      name: fixture.name,
      labels: fixture.labels,
      trainSize: fixture.train.length,
      devSize: fixture.dev.length,
      scoringMetric: fixture.scoringMetric,
      taskType: fixture.taskType,
    },
    baseline,
    improved,
    ablation,
    errorAnalysis,
    competitionBrief,
    dataProfile,
    metricAnalysis,
    weaknessDiagnosis,
    innovationCandidates,
    algorithmDesign,
    experimentMatrix,
    finalDecision,
    finalReport,
  };
}

function buildArtifactContent(type, requirement, context, summary) {
  const baseContent = {
    requirement,
    mode: TASK_MODES.ALGORITHM_COMPETITION,
    evidenceSource: "demo-text-classification fixture",
    repositoryWrite: false,
    externalCommandExecution: false,
    commit: false,
    push: false,
    pr: false,
    message: summary,
  };

  if (type === "competition_brief") return { ...baseContent, ...context.competitionBrief };
  if (type === "metric_analysis") return { ...baseContent, ...context.metricAnalysis };
  if (type === "data_profile") return { ...baseContent, ...context.dataProfile };
  if (type === "baseline_result") return { ...baseContent, competitionId: context.fixture.id, method: context.baseline.method, dataset: context.baseline.dataset, predictions: context.baseline.predictions, score: context.baseline.score };
  if (type === "weakness_diagnosis") return { ...baseContent, ...context.weaknessDiagnosis };
  if (type === "innovation_candidates") return { ...baseContent, ...context.innovationCandidates };
  if (type === "critic_review") return { ...baseContent, verdict: "approved_for_demo", checks: ["no external model call", "no repository write", "candidate backed by failed examples"] };
  if (type === "algorithm_design") return { ...baseContent, ...context.algorithmDesign };
  if (type === "experiment_matrix") return { ...baseContent, ...context.experimentMatrix };
  if (type === "evaluation_result") return { ...baseContent, competitionId: context.fixture.id, baseline: context.baseline, improved: context.improved, bestMethodId: context.ablation.bestMethodId };
  if (type === "ablation_table") return { ...baseContent, ...context.ablation };
  if (type === "error_analysis") return { ...baseContent, ...context.errorAnalysis };
  if (type === "final_decision") return { ...baseContent, ...context.finalDecision };
  if (type === "final_report") return { ...baseContent, ...context.finalReport };
  if (type === "safety_gate") return { ...baseContent, allowed: true, canWriteRepo: false, canRunCommands: false, canCommit: false, canPush: false, canCreatePr: false };
  if (type === "delivery_preview") return { ...baseContent, changedFiles: [], remoteActions: { push: false, pr: false }, readyForDelivery: false };

  return baseContent;
}

function stage(id, title, agentId, agentName, requiredArtifacts, outputArtifacts, description) {
  return {
    id,
    title,
    agentId,
    agentName,
    requiredArtifacts,
    outputArtifacts,
    canWriteRepo: false,
    canRunCommands: false,
    canCommit: false,
    canPush: false,
    canCreatePr: false,
    description,
    runner: runStage,
  };
}

function runStage({ task, stageDefinition, context, now }) {
  const artifacts = stageDefinition.outputArtifacts.map((type) => {
    const existingArtifact = task.artifacts.find((artifact) => artifact.type === type);
    return buildReadyArtifact(type, task.requirement, context, now, existingArtifact);
  });

  return {
    summary: stageSummary(stageDefinition),
    artifacts,
  };
}

function stageSummary(stageDefinition) {
  if (stageDefinition.id === "implementation") return "Implementation stage simulated locally; no repository writes were executed.";
  if (stageDefinition.id === "delivery_guard") return "Delivery guard confirms no commit, push, or PR is allowed.";
  if (stageDefinition.outputArtifacts.length === 0) return `${stageDefinition.title} completed without producing a persisted artifact.`;
  return `${stageDefinition.title} produced ${stageDefinition.outputArtifacts.join(", ")}.`;
}

module.exports = {
  buildEvaluationContext,
  buildReadyArtifact,
  createPendingArtifact,
  getAlgorithmArtifactDefinitions,
  getAlgorithmStageDefinition,
  getAlgorithmStageDefinitions,
};
