import React from "react";
import { TASK_MODES, getCurrentStageLabel, getTaskMode, statusTone } from "../../lib/taskViewModel";

export function MissionStatusBar({ applyChanges, delivery, runTests, selectedTaskMode, task }) {
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
