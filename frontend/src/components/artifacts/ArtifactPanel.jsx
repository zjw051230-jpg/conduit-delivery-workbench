import React, { useState } from "react";
import { FileList } from "../common/FileList";
import {
  artifactTabOptions,
  deriveArtifactFilters,
  getContextEntries,
  getStage,
  getWorkBreakdownArtifact,
  hasGenericArtifacts,
} from "../../lib/taskViewModel";

export function ArtifactPanel({ config, delivery, task }) {
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
  const filterOptions = deriveArtifactFilters(artifacts);
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
