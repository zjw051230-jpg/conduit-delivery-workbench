import React, { useEffect, useState } from "react";
import axios from "axios";

const defaultRequirement = "文章详情页新增字数统计，展示本文共多少字和预计阅读时间";
const TASK_MODES = {
  SOFTWARE_DELIVERY: "software_delivery",
  ALGORITHM_COMPETITION: "algorithm_competition",
};

const taskModeOptions = [
  { value: TASK_MODES.SOFTWARE_DELIVERY, label: "Software delivery" },
  { value: TASK_MODES.ALGORITHM_COMPETITION, label: "Labs / Debug Workflow" },
];

const softwareAgentDefinitions = [
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

const algorithmAgentDefinitions = [
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

const productDeliverySteps = [
  { key: "pm-request", label: "PM Request", producedArtifact: "PM 原文", viewLocation: "Right panel → Requirement", nextAction: "Review requirement brief" },
  { key: "requirement-brief", label: "Requirement Brief", producedArtifact: "Requirement DSL", viewLocation: "Right panel → Requirement", nextAction: "Review work breakdown" },
  { key: "work-breakdown", label: "Work Breakdown", producedArtifact: "Work Breakdown Document", viewLocation: "Right panel → Breakdown", nextAction: "Generate implementation plan" },
  { key: "implementation-plan", label: "Implementation Plan", producedArtifact: "Module plan + selected skill", viewLocation: "Right panel → Plan", nextAction: "Review code change targets" },
  { key: "code-changes", label: "Code Changes", producedArtifact: "Changed files + diff summary", viewLocation: "Right panel → Code", nextAction: "Open preview / effect" },
  { key: "preview-effect", label: "Preview / Effect", producedArtifact: "Effect summary", viewLocation: "Right panel → Preview", nextAction: "Run verification" },
  { key: "verification", label: "Verification", producedArtifact: "Test result", viewLocation: "Right panel → Tests", nextAction: "Open review panel" },
  { key: "review-delivery", label: "Review & Delivery", producedArtifact: "Safety Gate + PR readiness", viewLocation: "Right panel → Review / PR", nextAction: "Generate PR preparation report" },
];

const artifactTabOptions = ["Requirement", "Breakdown", "Plan", "Code", "Preview", "Tests", "Review", "PR"];

function createEmptyRemoteApproval() {
  return {
    explicitApproval: false,
    allowPush: false,
    allowPrCreate: false,
    confirmedBranchName: "",
    confirmedCommitHash: "",
  };
}

function App() {
  const [config, setConfig] = useState(null);
  const [requirement, setRequirement] = useState(defaultRequirement);
  const [taskMode, setTaskMode] = useState(TASK_MODES.SOFTWARE_DELIVERY);
  const [applyChanges, setApplyChanges] = useState(false);
  const [runTests, setRunTests] = useState(false);
  const [task, setTask] = useState(null);
  const [delivery, setDelivery] = useState(null);
  const [remoteApproval, setRemoteApproval] = useState(createEmptyRemoteApproval());
  const [loading, setLoading] = useState(false);
  const [replayLoading, setReplayLoading] = useState(false);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [workflowMessage, setWorkflowMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    axios.get("/api/ai/config").then((response) => setConfig(response.data));
  }, []);

  async function submitTask(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setDelivery(null);
    setRemoteApproval(createEmptyRemoteApproval());
    try {
      const response = await axios.post("/api/ai/tasks", {
        requirement,
        taskMode,
        applyChanges,
        runTests,
      });
      setTask(response.data.task);
      setWorkflowMessage("");
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTask(taskId = task?.id) {
    if (!taskId) return;

    await runWorkflowRequest(async () => {
      const response = await axios.get(`/api/ai/tasks/${taskId}`);
      setTask(response.data.task);
      return { task: response.data.task, result: { status: "refreshed", summary: "Task refreshed" } };
    });
  }

  async function fetchStages(taskId = task?.id) {
    if (!taskId) return;

    await runWorkflowRequest(async () => {
      const response = await axios.get(`/api/ai/tasks/${taskId}/stages`);
      setTask((currentTask) => (currentTask?.id === taskId ? { ...currentTask, stages: response.data.stages } : currentTask));
      return { result: { status: "refreshed", summary: "Stages refreshed" } };
    });
  }

  async function fetchArtifacts(taskId = task?.id, type) {
    if (!taskId) return;

    await runWorkflowRequest(async () => {
      const suffix = type ? `?type=${encodeURIComponent(type)}` : "";
      const response = await axios.get(`/api/ai/tasks/${taskId}/artifacts${suffix}`);
      setTask((currentTask) => (currentTask?.id === taskId ? { ...currentTask, artifacts: response.data.artifacts } : currentTask));
      return { result: { status: "refreshed", summary: "Artifacts refreshed" } };
    });
  }

  async function runNextStage(taskId = task?.id) {
    if (!taskId) return;

    await runWorkflowRequest(async () => {
      const response = await axios.post(`/api/ai/tasks/${taskId}/run-next`);
      setTask(response.data.task);
      return response.data;
    });
  }

  async function runAllStages(taskId = task?.id) {
    if (!taskId) return;

    await runWorkflowRequest(async () => {
      const response = await axios.post(`/api/ai/tasks/${taskId}/run-all`);
      setTask(response.data.task);
      return response.data;
    });
  }

  async function runStage(taskId = task?.id, stageId, options) {
    if (!taskId || !stageId) return;

    await runWorkflowRequest(async () => {
      const response = await axios.post(`/api/ai/tasks/${taskId}/stages/${stageId}/run`, options);
      setTask(response.data.task);
      return response.data;
    });
  }

  async function runWorkflowRequest(request) {
    setWorkflowLoading(true);
    setWorkflowMessage("");
    setError("");
    try {
      const data = await request();
      setWorkflowMessage(formatWorkflowResult(data?.result));
    } catch (requestError) {
      const responseData = requestError.response?.data;
      if (responseData?.task) setTask(responseData.task);
      const message = formatWorkflowResult(responseData?.result) || responseData?.error || requestError.message;
      setWorkflowMessage(message);
    } finally {
      setWorkflowLoading(false);
    }
  }

  async function replayTask(options) {
    if (!task) return;

    setReplayLoading(true);
    setError("");
    setDelivery(null);
    setRemoteApproval(createEmptyRemoteApproval());
    try {
      const response = await axios.post(`/api/ai/tasks/${task.id}/replay`, options);
      setTask(response.data.task);
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.message);
    } finally {
      setReplayLoading(false);
    }
  }

  async function loadDeliveryPreview() {
    if (!task) return;

    setDeliveryLoading(true);
    setError("");
    try {
      const response = await axios.get(`/api/ai/tasks/${task.id}/delivery/preview`);
      setDelivery(response.data.delivery);
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.message);
    } finally {
      setDeliveryLoading(false);
    }
  }

  async function createLocalCommit() {
    if (!task) return;

    setDeliveryLoading(true);
    setError("");
    try {
      const response = await axios.post(`/api/ai/tasks/${task.id}/delivery/commit`);
      setTask(response.data.task);
      setDelivery(response.data.delivery);
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.message);
    } finally {
      setDeliveryLoading(false);
    }
  }

  async function loadRemotePreview() {
    if (!task) return;

    setDeliveryLoading(true);
    setError("");
    try {
      const response = await axios.get(`/api/ai/tasks/${task.id}/delivery/remote-preview`);
      setDelivery(response.data.delivery);
      setRemoteApproval({
        ...createEmptyRemoteApproval(),
        confirmedBranchName: response.data.delivery.readiness?.currentBranch || "",
        confirmedCommitHash: response.data.delivery.readiness?.currentCommit || "",
      });
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.message);
    } finally {
      setDeliveryLoading(false);
    }
  }

  async function confirmRemotePr() {
    if (!task) return;

    setDeliveryLoading(true);
    setError("");
    try {
      const response = await axios.post(`/api/ai/tasks/${task.id}/delivery/pr`, remoteApproval);
      setTask(response.data.task);
      setDelivery(response.data.delivery);
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.message);
    } finally {
      setDeliveryLoading(false);
    }
  }

  function setRunMode(nextApplyChanges, nextRunTests) {
    setApplyChanges(nextApplyChanges);
    setRunTests(nextRunTests);
  }

  const activeDelivery = delivery || task?.delivery || null;

  return (
    <main className="mission-shell">
      <section className="mission-hero">
        <div className="hero-copy">
          <p className="eyebrow">PM → Agent Team → Conduit Sandbox</p>
          <h1>Agent Mission Control</h1>
          <p>
            面向 PM 需求的 AI 交付工作台：从澄清、DSL、RAG、模块定位、方案、写入、测试，到本地提交与 PR Preview，全链路可观察。
          </p>
        </div>
        <MissionStatusBar
          applyChanges={applyChanges}
          delivery={activeDelivery}
          runTests={runTests}
          selectedTaskMode={taskMode}
          task={task}
        />
      </section>

      {error && <p className="mission-alert">{error}</p>}

      <section className="mission-grid">
        <AgentSidebar
          applyChanges={applyChanges}
          config={config}
          runTests={runTests}
          selectedTaskMode={taskMode}
          task={task}
        />

        <section className="mission-center">
          <MissionComposer
            applyChanges={applyChanges}
            loading={loading}
            onApplyChangesChange={setApplyChanges}
            onRequirementChange={setRequirement}
            onRunModeChange={setRunMode}
            onRunTestsChange={setRunTests}
            onSubmit={submitTask}
            onTaskModeChange={setTaskMode}
            requirement={requirement}
            runTests={runTests}
            taskMode={taskMode}
          />
          <RunTimeline delivery={activeDelivery} task={task} />
          <AgentMessageFeed task={task} />
        </section>

        <section className="mission-right">
          <ArtifactPanel config={config} delivery={activeDelivery} task={task} />
          {task && (
            <TaskResult
              delivery={activeDelivery}
              deliveryLoading={deliveryLoading}
              onDeliveryCommit={createLocalCommit}
              onDeliveryPreview={loadDeliveryPreview}
              onFetchArtifacts={fetchArtifacts}
              onFetchStages={fetchStages}
              onFetchTask={fetchTask}
              onRemoteApprovalChange={setRemoteApproval}
              onRemoteConfirm={confirmRemotePr}
              onRemotePreview={loadRemotePreview}
              onReplay={replayTask}
              onRunAllStages={runAllStages}
              onRunNextStage={runNextStage}
              onRunStage={runStage}
              remoteApproval={remoteApproval}
              replayLoading={replayLoading}
              task={task}
              workflowLoading={workflowLoading}
              workflowMessage={workflowMessage}
            />
          )}
        </section>
      </section>
    </main>
  );
}

function MissionStatusBar({ applyChanges, delivery, runTests, selectedTaskMode, task }) {
  const currentStage = getCurrentStageLabel(task, delivery);
  const overallStatus = delivery?.status || task?.status || "idle";
  const taskMode = getTaskMode(task, selectedTaskMode);
  const skill = taskMode === TASK_MODES.ALGORITHM_COMPETITION ? "algorithm_competition" : task?.dsl?.targetSkillId || "waiting-skill";
  const remoteActions = delivery?.remoteActions || { push: false, pr: false };
  const isAlgorithm = taskMode === TASK_MODES.ALGORITHM_COMPETITION;

  return (
    <div className="status-bar" aria-label="mission status">
      <StatusCell label="Task" value={task?.id || "no active task"} />
      <StatusCell label="Mode" value={taskMode} />
      <StatusCell label="Skill" value={skill} />
      <StatusCell label="Current stage" value={isAlgorithm ? `currentStage: ${currentStage}` : `stage: ${currentStage}`} />
      <StatusCell label="Overall status" value={`status: ${overallStatus}`} tone={statusTone(overallStatus)} />
      {isAlgorithm ? (
        <>
          <StatusCell label="Completed" value={`completedStages: ${task?.completedStages?.length || 0}`} tone="success" />
          <StatusCell label="Pending" value={`pendingStages: ${task?.pendingStages?.length || 0}`} tone="muted" />
          <StatusCell label="Failed" value={`failedStage: ${task?.failedStage || "none"}`} tone={task?.failedStage ? "danger" : "muted"} />
          <StatusCell label="Replay" value={`replayCount: ${task?.replayCount || 0}`} />
        </>
      ) : (
        <>
          <StatusCell label="Write" value={applyChanges ? "applyChanges: true" : "applyChanges: false"} />
          <StatusCell label="Tests" value={runTests ? "runTests: true" : "runTests: false"} />
          <span className="remote-pill">push: {String(Boolean(remoteActions.push))}</span>
          <span className="remote-pill">pr: {String(Boolean(remoteActions.pr))}</span>
        </>
      )}
    </div>
  );
}

function StatusCell({ label, tone = "neutral", value }) {
  return (
    <div className={`status-cell status-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MissionComposer({
  applyChanges,
  loading,
  onApplyChangesChange,
  onRequirementChange,
  onRunModeChange,
  onRunTestsChange,
  onSubmit,
  onTaskModeChange,
  requirement,
  runTests,
  taskMode,
}) {
  return (
    <form className="mission-card mission-composer" onSubmit={onSubmit}>
      <div className="section-heading">
        <p>PM Command</p>
        <h2>把软件任务派发给 Agent Team</h2>
      </div>
      <div className="task-mode-grid" aria-label="task modes">
        {taskModeOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={taskMode === option.value ? "mode-button active" : "mode-button"}
            onClick={() => onTaskModeChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <textarea
        aria-label="PM 需求"
        value={requirement}
        onChange={(event) => onRequirementChange(event.target.value)}
        rows={5}
      />
      <div className="mode-grid" aria-label="run modes">
        <button type="button" className={!applyChanges && !runTests ? "mode-button active" : "mode-button"} onClick={() => onRunModeChange(false, false)}>
          Preview only
        </button>
        <button type="button" className={applyChanges && runTests ? "mode-button active" : "mode-button"} onClick={() => onRunModeChange(true, true)}>
          Write + Test
        </button>
        <button type="button" className={applyChanges && runTests ? "mode-button active" : "mode-button"} onClick={() => onRunModeChange(true, true)}>
          Full local delivery
        </button>
      </div>
      <details className="advanced-options">
        <summary>Advanced options / dry-run controls</summary>
        <label className="check-row">
          <input
            type="checkbox"
            checked={applyChanges}
            onChange={(event) => onApplyChangesChange(event.target.checked)}
          />
          写入 Conduit 目标仓库
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={runTests}
            onChange={(event) => onRunTestsChange(event.target.checked)}
          />
          执行 Skill 注册的测试命令
        </label>
      </details>
      <button className="primary-action" disabled={loading} type="submit">
        {loading ? "编排中..." : "启动 AI 编排链路"}
      </button>
    </form>
  );
}

function AgentSidebar({ applyChanges, config, runTests, selectedTaskMode, task }) {
  const taskMode = getTaskMode(task, selectedTaskMode);
  const agents = taskMode === TASK_MODES.ALGORITHM_COMPETITION ? algorithmAgentDefinitions : softwareAgentDefinitions;
  return (
    <aside className="mission-card agent-sidebar">
      <div className="section-heading">
        <p>Agent Team View</p>
        <h2>{taskMode === TASK_MODES.ALGORITHM_COMPETITION ? "算法创新小队" : "交付小队"}</h2>
      </div>
      <div className="agent-list">
        {agents.map((agent) => {
          const stage = getStage(task, agent.stage);
          const status = stage?.status || (task ? "pending" : "standby");
          return (
            <article className="agent-card" key={`${agent.stage}-${agent.label}`}>
              <div className="agent-card-title">
                <strong>{agent.label}</strong>
                <StatusBadge status={status} />
              </div>
              <p>{agent.role}</p>
              <dl>
                <dt>Input</dt>
                <dd>{summarizeStageInput(agent.stage, task)}</dd>
                <dt>Output</dt>
                <dd>{summarizeStageOutput(stage)}</dd>
                <dt>Execution</dt>
                <dd>{executionLabel(agent.stage, { applyChanges, runTests, taskMode })}</dd>
                <dt>Duration</dt>
                <dd>{formatDuration(stage)}</dd>
                <dt>Failed reason</dt>
                <dd>{failureReason(stage)}</dd>
              </dl>
            </article>
          );
        })}
      </div>
      <SystemContext config={config} />
    </aside>
  );
}

function SystemContext({ config }) {
  return (
    <section className="system-context">
      <h3>Runtime Context</h3>
      {config ? (
        <dl className="compact-list">
          <dt>Conduit 目标仓库</dt>
          <dd>{config.repoPath}</dd>
          <dt>Skill 数量</dt>
          <dd>{config.skillCount}</dd>
          <dt>ARK 模型</dt>
          <dd>{config.ark?.modelConfigured ? "已配置" : "未配置"}</dd>
          <dt>ARK API Key</dt>
          <dd>{config.ark?.apiKeyConfigured ? "已配置" : "未配置"}</dd>
        </dl>
      ) : (
        <p className="muted">加载配置中...</p>
      )}
    </section>
  );
}

function RunTimeline({ delivery, task }) {
  const steps = buildTimelineSteps(task, delivery);
  return (
    <section className="mission-card timeline-panel">
      <div className="section-heading horizontal">
        <div>
          <p>Pipeline Timeline</p>
          <h2>{getTaskMode(task) === TASK_MODES.ALGORITHM_COMPETITION ? "Labs / Debug Workflow" : "Conduit Delivery Path"}</h2>
        </div>
        <span className="safety-pill">Dangerous remote actions isolated</span>
      </div>
      <div className="timeline-rail product-flow-rail">
        {steps.map((step) => {
          const status = step.status || productStepStatus(step.key, task, delivery);
          const isCurrent = step.key === getCurrentProductStepKey(task, delivery);
          const failure = getProductStepFailure(step.key, task, delivery);
          return (
            <article className={`timeline-step timeline-${timelineTone(status)}${isCurrent ? " timeline-current" : ""}`} key={step.key}>
              <span>{step.label}</span>
              <strong>{isCurrent ? `current / ${status}` : status}</strong>
              <dl className="product-step-meta">
                <dt>Produced artifact</dt>
                <dd>{step.producedArtifact}</dd>
                <dt>View location</dt>
                <dd>{step.viewLocation}</dd>
                <dt>Next action</dt>
                <dd>{step.nextAction}</dd>
                {failure && (
                  <>
                    <dt>Failure</dt>
                    <dd>{failure}</dd>
                  </>
                )}
              </dl>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function AgentMessageFeed({ task }) {
  const messages = buildRunFeed(task);

  return (
    <section className="mission-card feed-panel">
      <div className="section-heading horizontal">
        <div>
          <p>Live Run Feed</p>
          <h2>Agent 事件流</h2>
        </div>
        <span className="feed-count">{messages.length} events</span>
      </div>
      <div className="feed-list">
        {messages.map((message) => (
          <article className="feed-item" key={message.id}>
            <span className="feed-dot" />
            <div>
              <div className="feed-title">
                <strong>{message.title}</strong>
                <StatusBadge status={message.status} />
              </div>
              <p>{message.detail}</p>
              {message.evidence && <code>{message.evidence}</code>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ArtifactPanel({ config, delivery, task }) {
  const [activeArtifactTab, setActiveArtifactTab] = useState("Requirement");
  const contextEntries = getContextEntries(task);
  const plannerOutput = getStage(task, "solution-planner")?.output;
  const testOutput = getStage(task, "test-runner")?.output;

  return (
    <section className="mission-card artifact-panel">
      <div className="section-heading">
        <p>Artifact / Evidence</p>
        <h2>交付证据板</h2>
      </div>

      {hasGenericArtifacts(task) ? (
        <GenericArtifactStack artifacts={task.artifacts} report={task.report} />
      ) : (
        <>
          <ArtifactTabBar activeTab={activeArtifactTab} onTabChange={setActiveArtifactTab} />
          <DeliveryArtifactGroup
            activeTab={activeArtifactTab}
            config={config}
            contextEntries={contextEntries}
            delivery={delivery}
            plannerOutput={plannerOutput}
            task={task}
            testOutput={testOutput}
          />
        </>
      )}
    </section>
  );
}

function ArtifactTabBar({ activeTab, onTabChange }) {
  return (
    <div className="artifact-tabs" aria-label="artifact tabs">
      {artifactTabOptions.map((tab) => (
        <button key={tab} type="button" className={activeTab === tab ? "mode-button active" : "mode-button"} onClick={() => onTabChange(tab)}>
          {tab}
        </button>
      ))}
    </div>
  );
}

function DeliveryArtifactGroup({ activeTab, config, contextEntries, delivery, plannerOutput, task, testOutput }) {
  if (!task) {
    return (
      <div className="artifact-stack">
        <ArtifactCard title="Requirement" meta="waiting for PM input">
          <p>运行后这里会按 Requirement、Breakdown、Plan、Code、Preview、Tests、Review、PR 分组展示交付产物。</p>
          <p className="muted">当前目标仓库：{config?.repoPath || "加载中..."}</p>
        </ArtifactCard>
      </div>
    );
  }

  if (activeTab === "Requirement") {
    return (
      <div className="artifact-stack">
        <ArtifactCard title="Requirement" meta="PM original + DSL">
          <p>{task.requirement || "PM 原始需求已进入编排链路。"}</p>
          <h4>Requirement DSL</h4>
          <pre>{JSON.stringify(task.dsl || {}, null, 2)}</pre>
          <h4>验收标准</h4>
          <FileList files={task.dsl?.acceptanceCriteria} emptyText="暂无结构化验收标准。" />
        </ArtifactCard>
      </div>
    );
  }

  if (activeTab === "Breakdown") {
    const workBreakdown = getWorkBreakdownArtifact(task);
    if (workBreakdown) return <WorkBreakdownArtifact artifact={workBreakdown} />;

    return (
      <div className="artifact-stack">
        <ArtifactCard title="Work Breakdown" meta="需求到分工文档">
          <h4>前端任务</h4>
          <FileList files={task.report?.locatedFiles || task.report?.changedFiles} emptyText="暂无前端定位文件。" />
          <h4>后端任务</h4>
          <p className="muted">当前任务未声明后端接口变更。</p>
          <h4>数据模型任务</h4>
          <p className="muted">当前任务未声明数据模型变更。</p>
          <h4>测试任务</h4>
          <FileList files={task.dsl?.testCommands} emptyText="暂无测试命令。" />
          <h4>Agent / Skill 分工</h4>
          <p>{task.dsl?.targetSkillId || "等待 Skill 匹配。"}</p>
        </ArtifactCard>
      </div>
    );
  }

  if (activeTab === "Plan") {
    return (
      <div className="artifact-stack">
        <ArtifactCard title="Implementation Plan" meta={plannerOutput?.agent || "Solution Planner Agent"}>
          {plannerOutput ? <pre>{JSON.stringify(plannerOutput, null, 2)}</pre> : <p className="muted">暂无方案输出。</p>}
        </ArtifactCard>
        <ArtifactCard title="Context Evidence" meta={`${contextEntries.length} retrieved`}>
          {contextEntries.length > 0 ? (
            <div className="evidence-list">
              {contextEntries.map((entry) => (
                <article className="evidence-card" key={`${entry.relativePath}-${entry.score || 0}`}>
                  <strong>{entry.relativePath}</strong>
                  <span>score: {entry.score ?? "n/a"}</span>
                  {entry.snippet && <p>{entry.snippet}</p>}
                </article>
              ))}
            </div>
          ) : (
            <p className="muted">暂无 RAG 召回证据。</p>
          )}
        </ArtifactCard>
      </div>
    );
  }

  if (activeTab === "Code") {
    return (
      <div className="artifact-stack">
        <ArtifactCard title="Code Changes" meta={`${task.report?.changedFiles?.length || 0} files`}>
          <FileList files={task.report?.changedFiles} emptyText="当前是预览模式，尚未写入。" />
          <h4>Diff Summary</h4>
          <pre>{delivery?.diffSummary || "暂无 diff summary。"}</pre>
        </ArtifactCard>
      </div>
    );
  }

  if (activeTab === "Preview") {
    return (
      <div className="artifact-stack">
        <ArtifactCard title="Preview / Effect" meta="effect summary">
          <p>{task.report?.summary || "暂无效果说明。"}</p>
          <p className="muted">前端任务展示 UI 行为变化；后端任务展示 API / 数据变化。</p>
        </ArtifactCard>
      </div>
    );
  }

  if (activeTab === "Tests") {
    return (
      <div className="artifact-stack">
        <ArtifactCard title="Test Results" meta={task.report?.testStatus || testOutput?.status || "unknown"}>
          <TestResultList output={testOutput} task={task} />
        </ArtifactCard>
      </div>
    );
  }

  if (activeTab === "Review") {
    const safety = delivery?.safety || delivery?.proposal?.safety;
    return (
      <div className="artifact-stack">
        <ArtifactCard title="Review" meta={safety?.allowed ? "Safety Gate: PASS" : "Safety Gate pending"}>
          <p>{safety?.message || "生成 PR 准备报告后会显示 Safety Gate。"}</p>
          <h4>Changed Files</h4>
          <FileList files={task.report?.changedFiles} emptyText="暂无变更文件。" />
        </ArtifactCard>
      </div>
    );
  }

  return (
    <div className="artifact-stack">
      <ArtifactCard title="PR" meta={delivery?.status || "PR readiness pending"}>
        <p>Branch: {delivery?.branchName || delivery?.proposal?.sourceBranch || delivery?.readiness?.currentBranch || "unknown"}</p>
        <p>Commit message: {delivery?.commitMessage || delivery?.proposal?.prTitle || "not generated"}</p>
        <p>Local commit hash: {delivery?.commitHash || "not created"}</p>
        <p>push / PR disabled by default: {String(!delivery?.remoteActions?.push && !delivery?.remoteActions?.pr)}</p>
        <h4>Command Preview</h4>
        <FileList files={delivery?.commandPreview} emptyText="暂无命令预览。" />
      </ArtifactCard>
    </div>
  );
}

function WorkBreakdownArtifact({ artifact }) {
  const content = artifact.content || {};

  return (
    <div className="artifact-stack">
      <ArtifactCard title={artifact.title || "Work Breakdown Document"} meta={`${artifact.generatedBy || "Work Breakdown Agent"} / ${artifact.status || "unknown"}`}>
        <h4>Frontend Tasks</h4>
        <WorkBreakdownTaskList items={content.frontendTasks} emptyText="No frontend tasks declared." />
        <h4>Backend Tasks</h4>
        <WorkBreakdownTaskList items={content.backendTasks} emptyText="No backend tasks declared." />
        <h4>Data Model Tasks</h4>
        <WorkBreakdownTaskList items={content.dataModelTasks} emptyText="No data model tasks declared." />
        <h4>Test Tasks</h4>
        <WorkBreakdownTaskList items={content.testTasks} emptyText="No test tasks declared." />
        <h4>Skill Assignment</h4>
        <p>
          {content.skillAssignment?.skillId || "No skill matched"}
          {content.skillAssignment?.skillName ? ` · ${content.skillAssignment.skillName}` : ""}
        </p>
        {content.skillAssignment?.reason && <p className="muted">{content.skillAssignment.reason}</p>}
        <h4>Risk Notes</h4>
        <FileList files={content.riskNotes} emptyText="No risk notes." />
        <h4>Acceptance Criteria</h4>
        <FileList files={content.acceptanceCriteria} emptyText="No acceptance criteria." />
      </ArtifactCard>
    </div>
  );
}

function WorkBreakdownTaskList({ emptyText, items }) {
  if (!items || items.length === 0) return <p className="muted">{emptyText}</p>;

  return (
    <ul className="file-list">
      {items.map((item) => {
        const primary = item.file || item.command || item.title || JSON.stringify(item);
        const detail = item.plannedChange || item.uiBehavior || item.reason || item.source;
        return (
          <li key={primary}>
            {primary}
            {detail ? <span className="muted"> — {detail}</span> : null}
          </li>
        );
      })}
    </ul>
  );
}

function GenericArtifactStack({ artifacts, report }) {
  const [artifactFilter, setArtifactFilter] = useState("All");
  const filterOptions = ["All", "baseline_result", "evaluation_result", "ablation_table", "error_analysis", "final_report"];
  const visibleArtifacts = artifactFilter === "All" ? artifacts : artifacts.filter((artifact) => artifact.type === artifactFilter);

  return (
    <div className="artifact-stack">
      <ArtifactCard title="Delivery Summary" meta={`task: ${report?.testStatus || "skeleton"}`}>
        <p>{report?.summary || "Algorithm competition skeleton artifacts are ready."}</p>
        <h4>Next Actions</h4>
        <FileList files={report?.nextActions} emptyText="暂无下一步动作。" />
      </ArtifactCard>
      <div className="artifact-filter" aria-label="artifact filters">
        <strong>Artifact Filter</strong>
        <div className="button-row">
          {filterOptions.map((option) => (
            <button
              key={option}
              type="button"
              className={artifactFilter === option ? "mode-button active" : "mode-button"}
              onClick={() => setArtifactFilter(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      {visibleArtifacts.map((artifact) => (
        <ArtifactCard key={`${artifact.stage}-${artifact.type}`} title={artifact.title || artifact.type} meta={`${artifact.type} / ${artifact.status || "unknown"}`}>
          <dl className="compact-list artifact-meta-list">
            <dt>type</dt>
            <dd>{artifact.type}</dd>
            <dt>status</dt>
            <dd>{artifact.status || "unknown"}</dd>
            <dt>generatedBy</dt>
            <dd>{artifact.generatedBy || "unknown"}</dd>
            <dt>stage</dt>
            <dd>{artifact.stage || "unknown"}</dd>
            {artifact.createdAt && (
              <>
                <dt>createdAt</dt>
                <dd>{artifact.createdAt}</dd>
              </>
            )}
            {artifact.updatedAt && (
              <>
                <dt>updatedAt</dt>
                <dd>{artifact.updatedAt}</dd>
              </>
            )}
          </dl>
          <p>{artifact.summary || "暂无摘要。"}</p>
          <p className="muted">{artifact.generatedBy || "unknown"} · {artifact.stage || "unknown"}</p>
          <pre>{JSON.stringify(artifact.content ?? {}, null, 2)}</pre>
        </ArtifactCard>
      ))}
    </div>
  );
}

function ArtifactCard({ children, meta, title }) {
  return (
    <article className="artifact-card">
      <div className="artifact-card-title">
        <h3>{title}</h3>
        <span>{meta}</span>
      </div>
      {children}
    </article>
  );
}

function TaskResult({
  delivery,
  deliveryLoading,
  onDeliveryCommit,
  onDeliveryPreview,
  onFetchArtifacts,
  onFetchStages,
  onFetchTask,
  onRemoteApprovalChange,
  onRemoteConfirm,
  onRemotePreview,
  onReplay,
  onRunAllStages,
  onRunNextStage,
  onRunStage,
  remoteApproval,
  replayLoading,
  task,
  workflowLoading,
  workflowMessage,
}) {
  if (getTaskMode(task) === TASK_MODES.ALGORITHM_COMPETITION) {
    return (
      <section className="mission-card delivery-console">
        <AlgorithmWorkflowControl
          onFetchArtifacts={onFetchArtifacts}
          onFetchStages={onFetchStages}
          onFetchTask={onFetchTask}
          onRunAllStages={onRunAllStages}
          onRunNextStage={onRunNextStage}
          onRunStage={onRunStage}
          task={task}
          workflowLoading={workflowLoading}
          workflowMessage={workflowMessage}
        />
        <div className="section-heading">
          <p>Delivery / PR Control</p>
          <h2>算法比赛工作流安全闸门</h2>
        </div>
        <AlgorithmSafetyNotice />
        <p className="muted delivery-task-ref">Active task: {task.id}</p>
      </section>
    );
  }

  return (
    <section className="mission-card delivery-console">
      <div className="section-heading">
        <p>Delivery / PR Control</p>
        <h2>本地交付与远端 PR 闸门</h2>
      </div>

      <div className="replay-actions">
        <h3>Replay Controls</h3>
        <p className="muted">基于当前需求重新跑编排链路，可先预览，也可以写入 Conduit 目标仓库。</p>
        <div className="button-row">
          <button
            disabled={replayLoading}
            type="button"
            onClick={() => onReplay({ applyChanges: false, runTests: false })}
          >
            {replayLoading ? "重放中..." : "重新预览"}
          </button>
          <button
            disabled={replayLoading}
            type="button"
            onClick={() => onReplay({ applyChanges: true, runTests: false })}
          >
            重放并写入 Conduit
          </button>
          <button
            disabled={replayLoading}
            type="button"
            onClick={() => onReplay({ applyChanges: true, runTests: true })}
          >
            重放写入并测试
          </button>
        </div>
      </div>

      <div className="delivery-actions">
        <h3>PR Delivery</h3>
        <p className="muted">安全版保留准备报告、本地分支/提交、远端 readiness 预览；git push / gh pr create 默认禁用。</p>
        <div className="button-row">
          <button disabled={deliveryLoading} type="button" onClick={onDeliveryPreview}>
            {deliveryLoading ? "处理中..." : "生成 PR 准备报告"}
          </button>
          <button disabled={deliveryLoading} type="button" onClick={onDeliveryCommit}>
            创建本地提交
          </button>
          <button disabled={deliveryLoading} type="button" onClick={onRemotePreview}>
            检查远端 PR 条件
          </button>
          <button disabled type="button">
            创建远端 PR（需要授权）
          </button>
        </div>
        {delivery && <DeliveryReport delivery={delivery} />}
        {delivery?.readiness && (
          <RemotePrConfirmation
            approval={remoteApproval}
            deliveryLoading={deliveryLoading}
            onApprovalChange={onRemoteApprovalChange}
            onConfirm={onRemoteConfirm}
          />
        )}
      </div>
      <p className="muted delivery-task-ref">Active task: {task.id}</p>
    </section>
  );
}

function AlgorithmWorkflowControl({
  onFetchArtifacts,
  onFetchStages,
  onFetchTask,
  onRunAllStages,
  onRunNextStage,
  onRunStage,
  task,
  workflowLoading,
  workflowMessage,
}) {
  const stages = task?.stages || [];

  return (
    <div className="workflow-control">
      <div className="section-heading">
        <p>Workflow Control</p>
        <h2>Algorithm stage runner</h2>
      </div>
      <dl className="compact-list workflow-status-list">
        <dt>status</dt>
        <dd>{task.status || "unknown"}</dd>
        <dt>currentStage</dt>
        <dd>{task.currentStage || "none"}</dd>
        <dt>completedStages</dt>
        <dd>{task.completedStages?.length || 0}</dd>
        <dt>pendingStages</dt>
        <dd>{task.pendingStages?.length || 0}</dd>
        <dt>failedStage</dt>
        <dd>{task.failedStage || "none"}</dd>
        <dt>replayCount</dt>
        <dd>{task.replayCount || 0}</dd>
      </dl>
      <div className="button-row workflow-actions">
        <button disabled={workflowLoading} type="button" onClick={() => onFetchStages(task.id)}>Refresh stages</button>
        <button disabled={workflowLoading} type="button" onClick={() => onFetchArtifacts(task.id)}>Refresh artifacts</button>
        <button disabled={workflowLoading} type="button" onClick={() => onRunNextStage(task.id)}>Run next stage</button>
        <button disabled={workflowLoading} type="button" onClick={() => onRunAllStages(task.id)}>Run all stages</button>
      </div>
      {workflowMessage && <p className={`workflow-message ${workflowMessage.includes("blocked") || workflowMessage.includes("failed") ? "error" : "success"}`}>{workflowMessage}</p>}
      {task.errorMessage && task.errorMessage !== workflowMessage && <p className="workflow-message error">{task.errorMessage}</p>}
      <div className="workflow-stage-list">
        {stages.map((stage) => (
          <WorkflowStageRow
            key={getStageId(stage)}
            onRunStage={onRunStage}
            stage={stage}
            taskId={task.id}
            workflowLoading={workflowLoading}
          />
        ))}
      </div>
    </div>
  );
}

function WorkflowStageRow({ onRunStage, stage, taskId, workflowLoading }) {
  const stageId = getStageId(stage);
  const isCompleted = stage.status === "completed";

  return (
    <article className={`workflow-stage-row workflow-stage-${timelineTone(stage.status)}`}>
      <div className="workflow-stage-header">
        <div>
          <strong>{stageId} / {stage.title || humanizeStageName(stageId)}</strong>
          <p className="muted">{stage.agent || stage.agentName || stage.output?.agent || "unknown agent"}</p>
        </div>
        <StatusBadge status={stage.status} />
      </div>
      <dl className="compact-list">
        <dt>inputArtifacts</dt>
        <dd>{formatArtifactRefs(stage.inputArtifacts)}</dd>
        <dt>outputArtifacts</dt>
        <dd>{formatArtifactRefs(stage.outputArtifacts)}</dd>
        <dt>summary</dt>
        <dd>{stage.summary || stage.output?.summary || "暂无摘要。"}</dd>
        {(stage.replayCount || 0) > 0 && (
          <>
            <dt>replayCount</dt>
            <dd>{stage.replayCount}</dd>
          </>
        )}
      </dl>
      <div className="button-row workflow-stage-actions">
        <button type="button" onClick={() => onRunStage(taskId, stageId)}>
          Run stage
        </button>
        {isCompleted && <span className="muted already-completed">already completed</span>}
      </div>
    </article>
  );
}

function AlgorithmSafetyNotice() {
  return (
    <div className="algorithm-safety-notice">
      <strong>Skeleton mode</strong>
      <p>Algorithm competition skeleton mode does not run repository writes, tests, commits, push, or PR actions.</p>
      <ul className="safety-list">
        <li>No repository write</li>
        <li>No test command execution</li>
        <li>No commit</li>
        <li>No push</li>
        <li>No PR</li>
      </ul>
    </div>
  );
}

function DeliveryReport({ delivery }) {
  const readiness = delivery.readiness;
  const proposal = delivery.proposal;
  const safety = delivery.safety || proposal?.safety;
  const changedFiles = delivery.changedFiles || proposal?.changedFiles || [];
  const diffSummary = delivery.diffSummary || proposal?.diffSummary || "No diff.";
  const branchName = delivery.branchName || proposal?.sourceBranch || readiness?.currentBranch || "unknown";
  const testStatus = delivery.testStatus || proposal?.testSummary || "unknown";

  return (
    <div className="delivery-report">
      <dl className="compact-list">
        <dt>Delivery 状态</dt>
        <dd>{delivery.status}</dd>
        <dt>Safety Gate</dt>
        <dd>{safety?.allowed ? "Safety Gate: PASS" : "Safety Gate: BLOCKED"}</dd>
        <dt>测试结果</dt>
        <dd>{testStatus}</dd>
        <dt>分支名</dt>
        <dd>{branchName}</dd>
        {delivery.commitHash && (
          <>
            <dt>本地提交</dt>
            <dd>{delivery.commitHash}</dd>
          </>
        )}
      </dl>

      {readiness && (
        <>
          <h4>Remote Readiness</h4>
          <dl className="compact-list">
            <dt>状态</dt>
            <dd>{readiness.ready ? "Remote Readiness: READY" : "Remote Readiness: BLOCKED"}</dd>
            <dt>远端</dt>
            <dd>{readiness.remote || "none"}</dd>
            <dt>base branch</dt>
            <dd>{readiness.baseBranch || "unknown"}</dd>
            <dt>current branch</dt>
            <dd>{readiness.currentBranch || "unknown"}</dd>
            <dt>current commit</dt>
            <dd>{readiness.currentCommit || "unknown"}</dd>
            <dt>gh auth</dt>
            <dd>{readiness.ghAuth?.ok ? "gh auth: OK" : "gh auth: BLOCKED"}</dd>
          </dl>
          <h4>Blocking Issues</h4>
          <FileList files={delivery.blockingIssues || readiness.blockingIssues} emptyText="无阻塞项。" />
        </>
      )}

      {proposal && (
        <>
          <h4>PR Proposal</h4>
          <dl className="compact-list">
            <dt>PR title</dt>
            <dd>{proposal.prTitle}</dd>
            <dt>target remote</dt>
            <dd>{proposal.targetRemote}</dd>
            <dt>source branch</dt>
            <dd>{proposal.sourceBranch}</dd>
            <dt>base branch</dt>
            <dd>{proposal.baseBranch}</dd>
          </dl>
          <h4>PR Body</h4>
          <pre>{proposal.prBody}</pre>
        </>
      )}

      {delivery.commandPreview?.length > 0 && (
        <>
          <h4>Command Preview</h4>
          <FileList files={delivery.commandPreview} emptyText="暂无命令预览。" />
        </>
      )}

      <h4>变更文件</h4>
      <FileList files={changedFiles} emptyText="暂无 Git 变更。" />

      <h4>Diff Summary</h4>
      <pre>{diffSummary}</pre>

      {delivery.commitMessage && (
        <>
          <h4>Commit Message</h4>
          <pre>{delivery.commitMessage}</pre>
        </>
      )}

      {delivery.message && <p className="muted">{delivery.message}</p>}
      <p className={safety?.allowed ? "success" : "error"}>{safety?.message}</p>
      <p className="muted">push: {String(delivery.remoteActions?.push)} / pr: {String(delivery.remoteActions?.pr)}</p>
    </div>
  );
}

function RemotePrConfirmation({ approval, deliveryLoading, onApprovalChange, onConfirm }) {
  function updateApproval(field, value) {
    onApprovalChange({ ...approval, [field]: value });
  }

  return (
    <form
      className="remote-confirmation"
      onSubmit={(event) => {
        event.preventDefault();
        onConfirm();
      }}
    >
      <h4>远端 PR 二次确认</h4>
      <p className="muted">提交前会再次校验分支、提交、origin、gh auth、base branch 和 PR 冲突；授权字段不完整时不会执行远端动作。</p>
      <label className="check-row">
        <input
          type="checkbox"
          checked={approval.explicitApproval}
          onChange={(event) => updateApproval("explicitApproval", event.target.checked)}
        />
        我已确认这是要交付的远端 PR
      </label>
      <label className="check-row">
        <input
          type="checkbox"
          checked={approval.allowPush}
          onChange={(event) => updateApproval("allowPush", event.target.checked)}
        />
        授权执行 git push
      </label>
      <label className="check-row">
        <input
          type="checkbox"
          checked={approval.allowPrCreate}
          onChange={(event) => updateApproval("allowPrCreate", event.target.checked)}
        />
        授权执行 gh pr create
      </label>
      <label className="field-row">
        确认分支名
        <input
          aria-label="确认分支名"
          value={approval.confirmedBranchName}
          onChange={(event) => updateApproval("confirmedBranchName", event.target.value)}
        />
      </label>
      <label className="field-row">
        确认提交 hash
        <input
          aria-label="确认提交 hash"
          value={approval.confirmedCommitHash}
          onChange={(event) => updateApproval("confirmedCommitHash", event.target.value)}
        />
      </label>
      <button disabled={deliveryLoading} type="submit">
        提交远端 PR 二次确认
      </button>
    </form>
  );
}

function StatusBadge({ status }) {
  return <span className={`status-badge badge-${statusTone(status)}`}>{status || "pending"}</span>;
}

function FileList({ files, emptyText }) {
  if (!files || files.length === 0) return <p className="muted">{emptyText}</p>;
  return (
    <ul className="file-list">
      {files.map((file) => (
        <li key={file}>{file}</li>
      ))}
    </ul>
  );
}

function TestResultList({ output, task }) {
  const results = output?.results || [];
  if (results.length === 0) {
    return <p className="muted">测试状态：{task.report?.testStatus || output?.status || "unknown"}</p>;
  }

  return (
    <div className="test-results">
      {results.map((result) => (
        <article className="test-result" key={result.command}>
          <strong>{result.command}</strong>
          <span>exit: {result.exitCode}</span>
          {result.stdoutSummary && <pre>{result.stdoutSummary}</pre>}
          {result.stderrSummary && <pre>{result.stderrSummary}</pre>}
        </article>
      ))}
    </div>
  );
}

function formatWorkflowResult(result) {
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

function getTaskMode(task, fallback = TASK_MODES.SOFTWARE_DELIVERY) {
  return task?.taskMode || fallback || TASK_MODES.SOFTWARE_DELIVERY;
}

function getStageId(stage) {
  return stage?.id || stage?.name || "unknown-stage";
}

function formatArtifactRefs(artifacts) {
  return artifacts?.length ? artifacts.join(", ") : "none";
}

function getWorkBreakdownArtifact(task) {
  return task?.artifacts?.find((artifact) => artifact.type === "work_breakdown") || null;
}

function hasGenericArtifacts(task) {
  return getTaskMode(task) === TASK_MODES.ALGORITHM_COMPETITION && Array.isArray(task?.artifacts) && task.artifacts.length > 0;
}

function buildTimelineSteps(task, delivery) {
  return productDeliverySteps.map((step) => ({
    ...step,
    status: productStepStatus(step.key, task, delivery),
  }));
}

function getCurrentProductStepKey(task, delivery) {
  if (delivery?.readiness || delivery?.proposal || delivery?.commitHash) return "review-delivery";
  if (!task) return "pm-request";
  if (["failed", "needs_clarification", "blocked"].includes(task.status)) return "review-delivery";
  if (getStage(task, "test-runner") || task.report?.testStatus) return "verification";
  if (task.report?.changedFiles?.length) return "code-changes";
  if (getStage(task, "solution-planner") || task.report?.locatedFiles?.length) return "implementation-plan";
  if (task.dsl) return "work-breakdown";
  return "requirement-brief";
}

function productStepStatus(stepKey, task, delivery) {
  const currentKey = getCurrentProductStepKey(task, delivery);
  const currentIndex = productDeliverySteps.findIndex((step) => step.key === currentKey);
  const stepIndex = productDeliverySteps.findIndex((step) => step.key === stepKey);
  if (stepKey === "review-delivery" && delivery?.status) return statusTone(delivery.status) === "danger" ? "blocked" : "done";
  if (stepIndex < currentIndex) return "done";
  if (stepIndex === currentIndex) return task ? "active" : stepKey === "pm-request" ? "active" : "pending";
  return "pending";
}

function getProductStepFailure(stepKey, task, delivery) {
  if (stepKey !== getCurrentProductStepKey(task, delivery)) return "";
  if (delivery?.blockingIssues?.length) return delivery.blockingIssues.join(", ");
  if (task?.failedStage) return task.failedStage;
  if (task?.status === "blocked" || task?.errorMessage) return "workflow blocked";
  const failedStage = task?.stages?.find((stage) => ["failed", "needs_clarification", "blocked"].includes(stage.status));
  return failedStage ? getStageId(failedStage) : "";
}

function humanizeStageName(name) {
  return String(name).replace(/[-_]/g, " ");
}

function buildRunFeed(task) {
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

function getContextEntries(task) {
  const ragOutput = getStage(task, "context-rag")?.output;
  return ragOutput?.retrievedContext || [];
}

function getStage(task, stageName) {
  return task?.stages?.find((stage) => getStageId(stage) === stageName) || null;
}

function getCurrentStageLabel(task, delivery) {
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

function summarizeStageInput(stageName, task) {
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

function summarizeStageOutput(stage) {
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

function executionLabel(stageName, { applyChanges, runTests, taskMode }) {
  if (taskMode === TASK_MODES.ALGORITHM_COMPETITION) return "skeleton mode / no side effects";
  if (stageName === "code-writer") return applyChanges ? "real write enabled" : "preview only";
  if (stageName === "test-runner") return runTests ? "real command execution" : "test execution skipped";
  if (["context-rag", "module-locator", "solution-planner"].includes(stageName)) return "real local analysis";
  return "deterministic orchestration";
}

function formatDuration(stage) {
  if (!stage?.completedAt) return "n/a";
  return "completed";
}

function failureReason(stage) {
  if (!stage || !["failed", "needs_clarification"].includes(stage.status)) return "none";
  return stage.output?.message || stage.output?.missingQuestions?.join(" ") || "see output";
}

function executionEvidence(stage) {
  if (stage.output?.changedFiles?.length) return stage.output.changedFiles.join(", ");
  if (stage.output?.retrievedContext?.length) return `${stage.output.retrievedContext.length} retrieved files`;
  if (stage.output?.results?.length) return `${stage.output.results.length} command results`;
  return stage.status || "event recorded";
}

function timelineTone(status = "") {
  if (["completed", "passed", "ready", "ready_for_planning", "preview", "skeleton", "done"].includes(status)) return "done";
  if (["failed", "needs_clarification", "blocked", "remote_readiness_blocked"].includes(status)) return "blocked";
  if (["skipped", "not_executed", "pending", "standby", "idle"].includes(status)) return "skipped";
  if (status === "ready") return "ready";
  return status || "pending";
}

function timelineStatus(key, task, delivery) {
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

function statusTone(status = "") {
  if (["completed", "passed", "ready", "delivery_ready", "local_commit_created", "remote_preview", "pr_created", "done", "skeleton", "skeleton_ready"].includes(status)) return "success";
  if (["failed", "needs_fix", "blocked", "remote_readiness_blocked"].includes(status)) return "danger";
  if (["skipped", "not_executed", "pending", "standby", "idle"].includes(status)) return "muted";
  return "neutral";
}

export { App, TaskResult, DeliveryReport };
