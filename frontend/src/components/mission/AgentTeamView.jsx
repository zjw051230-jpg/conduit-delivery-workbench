import React from "react";
import { StatusBadge } from "../common/StatusBadge";
import {
  TASK_MODES,
  algorithmAgentDefinitions,
  executionLabel,
  failureReason,
  formatDuration,
  getStage,
  getTaskMode,
  softwareAgentDefinitions,
  summarizeStageInput,
  summarizeStageOutput,
} from "../../lib/taskViewModel";

export function AgentTeamView({ applyChanges, config, runTests, selectedTaskMode, task }) {
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
