import { getDefaultSoftwareDeliveryPage, getVisibleSoftwareDeliveryPages } from "../productFlow/stepNavigation";

export const TASK_MODES = {
  SOFTWARE_DELIVERY: "software_delivery",
  ALGORITHM_COMPETITION: "algorithm_competition",
};

export const softwareAgentDefinitions = [
  {
    stage: "pm-clarifier",
    label: "Clarifier Agent",
    shortLabel: "Clarify",
    role: "把 PM 口语需求收敛成可执行目标",
  },
  {
    stage: "requirement-dsl",
    label: "Requirement DSL Agent",
    shortLabel: "DSL",
    role: "生成结构化交付 DSL 和验收条件",
  },
  {
    stage: "context-rag",
    label: "Context RAG Agent",
    shortLabel: "RAG",
    role: "从 Conduit 沙箱中召回相关上下文",
  },
  {
    stage: "module-locator",
    label: "Module Locator Agent",
    shortLabel: "Locate",
    role: "定位需要读写的前后端模块",
  },
  {
    stage: "solution-planner",
    label: "Solution Planner Agent",
    shortLabel: "Plan",
    role: "把需求拆成实现步骤和测试路径",
  },
  {
    stage: "code-writer",
    label: "Code Writer Agent",
    shortLabel: "Write",
    role: "按 Skill Writer 预览或写入 Conduit",
  },
  {
    stage: "test-runner",
    label: "Test Runner / Fix Agent",
    shortLabel: "Test",
    role: "执行 Skill 注册的真实测试命令",
  },
  {
    stage: "delivery-reporter",
    label: "Delivery Reporter Agent",
    shortLabel: "Report",
    role: "汇总变更、证据和下一步交付动作",
  },
];

export const algorithmAgentDefinitions = [
  { stage: "task_mode_detection", label: "Chief Commander", shortLabel: "Commander", role: "统筹算法比赛任务空跑阶段和安全边界" },
  { stage: "competition_brief", label: "Competition Reader", shortLabel: "Reader", role: "读懂比赛任务、输入输出和约束" },
  { stage: "metric_analysis", label: "Rule & Metric Agent", shortLabel: "Metric", role: "分析评分规则和指标方向" },
  { stage: "data_inspection", label: "Data Inspector", shortLabel: "Data", role: "检查数据结构、字段和质量风险" },
  { stage: "baseline_reproduction", label: "Baseline Reproducer", shortLabel: "Baseline", role: "复现 baseline 并建立对照证据" },
  { stage: "weakness_diagnosis", label: "Weakness Diagnoser", shortLabel: "Weakness", role: "诊断 baseline 弱点和误差来源" },
  { stage: "innovation_candidates", label: "Innovation Strategist", shortLabel: "Innovate", role: "提出可验证的算法创新候选" },
  { stage: "algorithm_design", label: "Algorithm Designer", shortLabel: "Design", role: "把候选方案转成算法设计" },
  { stage: "experiment_plan", label: "Experiment Planner", shortLabel: "Experiment", role: "设计实验矩阵和对照顺序" },
  { stage: "implementation", label: "Code Implementer", shortLabel: "Implement", role: "骨架模式下只展示实现占位，不写仓库" },
  { stage: "evaluation", label: "Evaluation Runner", shortLabel: "Evaluate", role: "骨架模式下只展示评估占位，不执行命令" },
  { stage: "ablation", label: "Ablation Analyst", shortLabel: "Ablation", role: "设计消融分析视图" },
  { stage: "error_analysis", label: "Error Analyst", shortLabel: "Errors", role: "设计错误分析视图" },
  { stage: "critic_review_1", label: "Red Team Critic", shortLabel: "Critic", role: "质疑方案、检查泄漏和过拟合风险" },
  { stage: "final_selection", label: "Final Selector", shortLabel: "Select", role: "根据证据选择最终方案" },
  { stage: "final_report", label: "Report Writer", shortLabel: "Report", role: "生成最终报告骨架" },
  { stage: "delivery_guard", label: "Delivery Guard", shortLabel: "Guard", role: "展示不提交、不推送、不创建 PR 的安全闸门" },
];

export const labDebugSteps = [
  { key: "pm-request", label: "PM Request", producedArtifact: "PM 原文", viewLocation: "Right panel → Requirement", nextAction: "Review requirement brief" },
  { key: "requirement-brief", label: "Requirement Brief", producedArtifact: "Requirement DSL", viewLocation: "Right panel → Requirement", nextAction: "Review work breakdown" },
  { key: "work-breakdown", label: "Work Breakdown", producedArtifact: "Work Breakdown Document", viewLocation: "Right panel → Breakdown", nextAction: "Generate implementation plan" },
  { key: "implementation-plan", label: "Implementation Plan", producedArtifact: "Module plan + selected skill", viewLocation: "Right panel → Plan", nextAction: "Review code change targets" },
  { key: "code-changes", label: "Code Changes", producedArtifact: "Changed files + diff summary", viewLocation: "Right panel → Code", nextAction: "Open preview / effect" },
  { key: "preview-effect", label: "Preview / Effect", producedArtifact: "Effect summary", viewLocation: "Right panel → Preview", nextAction: "Run verification" },
  { key: "verification", label: "Verification", producedArtifact: "Test result", viewLocation: "Right panel → Tests", nextAction: "Open review panel" },
  { key: "review-delivery", label: "Review & Delivery", producedArtifact: "Safety Gate + PR readiness", viewLocation: "Right panel → Review / PR", nextAction: "Generate PR preparation report" },
];

export const artifactTabOptions = ["Requirement", "Breakdown", "Plan", "Code", "Preview", "Tests", "Review", "PR"];

export function getTaskMode(task, fallback = TASK_MODES.SOFTWARE_DELIVERY) {
  return task?.taskMode || fallback || TASK_MODES.SOFTWARE_DELIVERY;
}

export function getStageId(stage) {
  return stage?.id || stage?.name || "unknown-stage";
}

export function formatArtifactRefs(artifacts) {
  return artifacts?.length ? artifacts.join(", ") : "none";
}

export function formatWorkflowResult(result) {
  if (!result) return "";
  if (result.status === "blocked") {
    const missing = result.missingArtifacts?.length ? ` Missing artifacts: ${result.missingArtifacts.join(", ")}.` : "";
    return result.summary || `Stage ${result.stageId} blocked.${missing}`;
  }
  if (result.status === "already_completed") return `Stage already completed: ${result.stageId}`;
  if (result.status === "failed") return result.summary || `Stage failed: ${result.stageId}`;
  if (result.status === "completed") return `Stage completed: ${result.stageId}`;
  return result.summary || result.status || "Workflow updated";
}

export function getWorkBreakdownArtifact(task) {
  return task?.artifacts?.find((artifact) => artifact.type === "work_breakdown") || null;
}

export function hasGenericArtifacts(task) {
  return getTaskMode(task) === TASK_MODES.ALGORITHM_COMPETITION && Array.isArray(task?.artifacts) && task.artifacts.length > 0;
}

export function deriveArtifactFilters() {
  return ["All", "baseline_result", "evaluation_result", "ablation_table", "error_analysis", "final_report"];
}

export function buildTimelineSteps(task, delivery, isAlgorithm = false) {
  return getTimelineStepDefinitions(isAlgorithm).map((step) => ({
    ...step,
    status: productStepStatus(step.key, task, delivery, isAlgorithm),
  }));
}

export function getTimelineStepDefinitions(isAlgorithm) {
  if (isAlgorithm) return labDebugSteps;
  return getVisibleSoftwareDeliveryPages().map((page) => ({
    key: page.id,
    label: page.title,
    producedArtifact: page.producedArtifact,
    viewLocation: page.viewLocation,
    nextAction: page.primaryAction,
  }));
}

export function getCurrentProductStepKey(task, delivery, isAlgorithm = false) {
  if (isAlgorithm) {
    if (delivery?.readiness || delivery?.proposal || delivery?.commitHash) return "review-delivery";
    if (!task) return "pm-request";
    if (["failed", "needs_clarification", "blocked"].includes(task.status)) return "review-delivery";
    if (getStage(task, "test-runner") || task.report?.testStatus) return "verification";
    if (task.report?.changedFiles?.length) return "code-changes";
    if (getStage(task, "solution-planner") || task.report?.locatedFiles?.length) return "implementation-plan";
    if (task.dsl) return "work-breakdown";
    return "requirement-brief";
  }

  if (delivery?.readiness || delivery?.proposal || delivery?.commitHash) return "delivery";
  if (!task) return getDefaultSoftwareDeliveryPage().id;
  if (["failed", "needs_clarification", "blocked"].includes(task.status)) return "review";
  if (getStage(task, "test-runner") || task.report?.testStatus) return "verification";
  if (task.report?.changedFiles?.length) return "code_changes";
  if (getStage(task, "solution-planner") || task.report?.locatedFiles?.length) return "implementation_plan";
  if (task.dsl) return "work_breakdown";
  return "requirement_brief";
}

export function productStepStatus(stepKey, task, delivery, isAlgorithm = false) {
  const steps = getTimelineStepDefinitions(isAlgorithm);
  const currentKey = getCurrentProductStepKey(task, delivery, isAlgorithm);
  const currentIndex = steps.findIndex((step) => step.key === currentKey);
  const stepIndex = steps.findIndex((step) => step.key === stepKey);
  if ((stepKey === "review-delivery" || stepKey === "delivery") && delivery?.status) return statusTone(delivery.status) === "danger" ? "blocked" : "done";
  if (stepIndex < currentIndex) return "done";
  if (stepIndex === currentIndex) return task ? "active" : ["pm-request", getDefaultSoftwareDeliveryPage().id].includes(stepKey) ? "active" : "pending";
  return "pending";
}

export function getProductStepFailure(stepKey, task, delivery, isAlgorithm = false) {
  if (stepKey !== getCurrentProductStepKey(task, delivery, isAlgorithm)) return "";
  if (delivery?.blockingIssues?.length) return delivery.blockingIssues.join(", ");
  if (task?.failedStage) return task.failedStage;
  if (task?.status === "blocked" || task?.errorMessage) return "workflow blocked";
  const failedStage = task?.stages?.find((stage) => ["failed", "needs_clarification", "blocked"].includes(stage.status));
  return failedStage ? getStageId(failedStage) : "";
}

export function humanizeStageName(name) {
  return String(name).replace(/[-_]/g, " ");
}

export function buildRunFeed(task) {
  if (!task) {
    return [
      {
        id: "standby",
        title: "Mission Control standby",
        status: "idle",
        detail: "等待 PM 输入软件交付任务。",
        evidence: "Preview only / Write + Test / Full local delivery",
      },
    ];
  }

  const messages = [
    {
      id: `${task.id}-pm`,
      title: "PM Input accepted",
      status: "completed",
      detail: task.requirement || "需求已进入 Agent 编排链路。",
      evidence: `Mission ${task.id}`,
    },
  ];

  if (task.report?.summary) {
    messages.push({
      id: `${task.id}-summary`,
      title: "Delivery summary",
      status: task.status || "completed",
      detail: task.report.summary,
      evidence: task.report?.testStatus || "report ready",
    });
  }

  for (const action of task.report?.nextActions || []) {
    messages.push({
      id: `${task.id}-next-${action}`,
      title: "Next action",
      status: "ready",
      detail: action,
      evidence: "Review & Delivery",
    });
  }

  for (const stage of task.stages || []) {
    const stageId = getStageId(stage);
    messages.push({
      id: `${task.id}-${stageId}-${stage.completedAt || stage.status}`,
      title: stageId === "context-rag" ? "Context Evidence" : stageId,
      status: stage.status,
      detail: `Output summary: ${summarizeStageOutput(stage)}`,
      evidence: stage.completedAt || executionEvidence(stage),
    });
  }

  return messages;
}

export function getContextEntries(task) {
  const ragOutput = getStage(task, "context-rag")?.output;
  return ragOutput?.retrievedContext || [];
}

export function getStage(task, stageName) {
  return task?.stages?.find((stage) => getStageId(stage) === stageName) || null;
}

export function getCurrentStageLabel(task, delivery) {
  if (delivery?.status) return delivery.status;
  if (!task) return "waiting for PM input";
  if (getTaskMode(task) === TASK_MODES.ALGORITHM_COMPETITION) {
    if (task.currentStage) return task.currentStage;
    return task.status === "completed" ? "completed" : "none";
  }
  const failedStage = task.stages?.find((stage) => ["failed", "needs_clarification"].includes(stage.status));
  if (failedStage) return getStageId(failedStage);
  return getStageId(task.stages?.at(-1)) || "pm-input";
}

export function summarizeStageInput(stageName, task) {
  if (!task) return "等待 PM 输入";
  if (getTaskMode(task) === TASK_MODES.ALGORITHM_COMPETITION) return task.requirement || "Algorithm competition requirement";
  if (stageName === "pm-clarifier") return task.requirement || "PM requirement";
  if (stageName === "requirement-dsl") return getStage(task, "pm-clarifier")?.status || "clarifier output";
  if (stageName === "context-rag") return task.dsl?.targetSkillId || "requirement query";
  if (stageName === "module-locator") return `${getContextEntries(task).length} context entries`;
  if (stageName === "solution-planner") return `${task.dsl?.acceptanceCriteria?.length || 0} acceptance criteria`;
  if (stageName === "code-writer") return task.dsl?.targetSkillId || "matched skill";
  if (stageName === "test-runner") return `${task.dsl?.testCommands?.length || 0} test commands`;
  return "delivery report inputs";
}

export function summarizeStageOutput(stage) {
  if (!stage) return "尚未执行";
  if (stage.output?.message) return stage.output.message;
  if (stage.output?.summary) return stage.output.summary;
  if (stage.output?.normalizedRequirement) return stage.output.normalizedRequirement;
  if (stage.output?.changedFiles?.length) return `${stage.output.changedFiles.length} changed files`;
  if (stage.output?.retrievedContext?.length) return `${stage.output.retrievedContext.length} context matches`;
  if (stage.output?.files?.length) return `${stage.output.files.length} module files`;
  if (stage.output?.results?.length) return `${stage.output.results.length} test commands`;
  if (stage.output?.status) return stage.output.status;
  return stage.status || "completed";
}

export function executionLabel(stageName, { applyChanges, runTests, taskMode }) {
  if (taskMode === TASK_MODES.ALGORITHM_COMPETITION) return "skeleton mode / no side effects";
  if (stageName === "code-writer") return applyChanges ? "real write enabled" : "preview only";
  if (stageName === "test-runner") return runTests ? "real command execution" : "test execution skipped";
  if (["context-rag", "module-locator", "solution-planner"].includes(stageName)) return "real local analysis";
  return "deterministic orchestration";
}

export function formatDuration(stage) {
  if (!stage?.completedAt) return "n/a";
  return "completed";
}

export function failureReason(stage) {
  if (!stage || !["failed", "needs_clarification"].includes(stage.status)) return "none";
  return stage.output?.message || stage.output?.missingQuestions?.join(" ") || "see output";
}

export function executionEvidence(stage) {
  if (stage.output?.changedFiles?.length) return stage.output.changedFiles.join(", ");
  if (stage.output?.retrievedContext?.length) return `${stage.output.retrievedContext.length} retrieved files`;
  if (stage.output?.results?.length) return `${stage.output.results.length} command results`;
  return stage.status || "event recorded";
}

export function timelineTone(status = "") {
  if (["completed", "passed", "ready", "ready_for_planning", "preview", "skeleton", "done"].includes(status)) return "done";
  if (["failed", "needs_clarification", "blocked", "remote_readiness_blocked"].includes(status)) return "blocked";
  if (["skipped", "not_executed", "pending", "standby", "idle"].includes(status)) return "skipped";
  if (status === "ready") return "ready";
  return status || "pending";
}

export function timelineStatus(key, task, delivery) {
  if (key === "pm-input") return task ? "done" : "active";
  if (key === "local-commit") return delivery?.commitHash || delivery?.status === "local_commit_created" ? "done" : task ? "ready" : "pending";
  if (key === "remote-preview") return delivery?.readiness || delivery?.proposal ? "done" : task ? "ready" : "pending";

  const stage = getStage(task, key);
  if (!stage) return task ? "pending" : "pending";
  if (["failed", "needs_clarification"].includes(stage.status)) return "blocked";
  if (["completed", "passed", "ready", "ready_for_planning", "preview"].includes(stage.status)) return "done";
  if (stage.status === "skipped") return "skipped";
  return "active";
}

export function statusTone(status = "") {
  if (["completed", "passed", "ready", "delivery_ready", "local_commit_created", "remote_preview", "pr_created", "done", "skeleton", "skeleton_ready"].includes(status)) return "success";
  if (["failed", "needs_fix", "blocked", "remote_readiness_blocked"].includes(status)) return "danger";
  if (["skipped", "not_executed", "pending", "standby", "idle"].includes(status)) return "muted";
  return "neutral";
}
