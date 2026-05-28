import React from "react";
import { WorkflowStageRow } from "./WorkflowStageRow";
import { getStageId } from "../../lib/taskViewModel";

export function AlgorithmWorkflowControl({
  onFetchArtifacts,
  onFetchStages,
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
