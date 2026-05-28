import React, { useEffect, useState } from "react";
import { ArtifactPanel } from "./components/artifacts/ArtifactPanel";
import { DeliveryPanel, DeliveryReport } from "./components/delivery/DeliveryPanel";
import { AgentMessageFeed } from "./components/mission/AgentMessageFeed";
import { AgentTeamView } from "./components/mission/AgentTeamView";
import { MissionStatusBar } from "./components/mission/MissionStatusBar";
import { RunTimeline } from "./components/mission/RunTimeline";
import {
  deliveryCommit,
  deliveryPreview,
  fetchArtifacts as fetchArtifactsRequest,
  fetchConfig,
  fetchStages as fetchStagesRequest,
  fetchTask as fetchTaskRequest,
  remotePreview,
  replayTask as replayTaskRequest,
  runAllStages as runAllStagesRequest,
  runNextStage as runNextStageRequest,
  runStage as runStageRequest,
  submitRemotePrAuthorization,
  submitTask as submitTaskRequest,
} from "./lib/apiClient";
import { TASK_MODES, formatWorkflowResult, getTaskMode } from "./lib/taskViewModel";
import { SoftwareDeliveryPageRenderer } from "./pages/softwareDelivery/SoftwareDeliveryPageRenderer";
import { getDefaultSoftwareDeliveryPage } from "./productFlow/stepNavigation";

const defaultRequirement = "文章详情页新增字数统计，展示本文共多少字和预计阅读时间";

const taskModeOptions = [
  { value: TASK_MODES.SOFTWARE_DELIVERY, label: "Software delivery" },
  { value: TASK_MODES.ALGORITHM_COMPETITION, label: "Labs / Debug Workflow" },
];

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
  const [currentProductPageId, setCurrentProductPageId] = useState(getDefaultSoftwareDeliveryPage().id);
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
    fetchConfig().then((data) => setConfig(data));
  }, []);

  async function submitTask(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setDelivery(null);
    setRemoteApproval(createEmptyRemoteApproval());
    try {
      const data = await submitTaskRequest({
        requirement,
        taskMode,
        applyChanges,
        runTests,
      });
      setTask(data.task);
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
      const data = await fetchTaskRequest(taskId);
      setTask(data.task);
      return { task: data.task, result: { status: "refreshed", summary: "Task refreshed" } };
    });
  }

  async function fetchStages(taskId = task?.id) {
    if (!taskId) return;

    await runWorkflowRequest(async () => {
      const data = await fetchStagesRequest(taskId);
      setTask((currentTask) => (currentTask?.id === taskId ? { ...currentTask, stages: data.stages } : currentTask));
      return { result: { status: "refreshed", summary: "Stages refreshed" } };
    });
  }

  async function fetchArtifacts(taskId = task?.id, type) {
    if (!taskId) return;

    await runWorkflowRequest(async () => {
      const data = await fetchArtifactsRequest(taskId, type);
      setTask((currentTask) => (currentTask?.id === taskId ? { ...currentTask, artifacts: data.artifacts } : currentTask));
      return { result: { status: "refreshed", summary: "Artifacts refreshed" } };
    });
  }

  async function runNextStage(taskId = task?.id) {
    if (!taskId) return;

    await runWorkflowRequest(async () => {
      const data = await runNextStageRequest(taskId);
      setTask(data.task);
      return data;
    });
  }

  async function runAllStages(taskId = task?.id) {
    if (!taskId) return;

    await runWorkflowRequest(async () => {
      const data = await runAllStagesRequest(taskId);
      setTask(data.task);
      return data;
    });
  }

  async function runStage(taskId = task?.id, stageId, options) {
    if (!taskId || !stageId) return;

    await runWorkflowRequest(async () => {
      const data = await runStageRequest(taskId, stageId, options);
      setTask(data.task);
      return data;
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
      const data = await replayTaskRequest(task.id, options);
      setTask(data.task);
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
      const data = await deliveryPreview(task.id);
      setDelivery(data.delivery);
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
      const data = await deliveryCommit(task.id);
      setTask(data.task);
      setDelivery(data.delivery);
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
      const data = await remotePreview(task.id);
      setDelivery(data.delivery);
      setRemoteApproval({
        ...createEmptyRemoteApproval(),
        confirmedBranchName: data.delivery.readiness?.currentBranch || "",
        confirmedCommitHash: data.delivery.readiness?.currentCommit || "",
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
      const data = await submitRemotePrAuthorization(task.id, remoteApproval);
      setTask(data.task);
      setDelivery(data.delivery);
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
  const isSoftwareDelivery = getTaskMode(task, taskMode) === TASK_MODES.SOFTWARE_DELIVERY;

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
        <AgentTeamView
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
          <RunTimeline
            currentProductPageId={currentProductPageId}
            delivery={activeDelivery}
            onProductPageChange={setCurrentProductPageId}
            selectedTaskMode={taskMode}
            task={task}
          />
          {isSoftwareDelivery && (
            <SoftwareDeliveryPageRenderer
              actions={{}}
              artifacts={task?.artifacts || []}
              currentProductPageId={currentProductPageId}
              error={error}
              loading={loading || replayLoading || deliveryLoading}
              onNavigate={setCurrentProductPageId}
              task={task}
            />
          )}
          <AgentMessageFeed task={task} />
        </section>

        <section className="mission-right">
          <ArtifactPanel config={config} delivery={activeDelivery} task={task} />
          {task && (
            <DeliveryPanel
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

const TaskResult = DeliveryPanel;

export { App, TaskResult, DeliveryReport };
