import React from "react";
import { StatusBadge } from "../common/StatusBadge";
import { formatArtifactRefs, getStageId, humanizeStageName, timelineTone } from "../../lib/taskViewModel";

export function WorkflowStageRow({ onRunStage, stage, taskId, workflowLoading }) {
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
