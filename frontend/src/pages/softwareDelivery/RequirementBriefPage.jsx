import React from "react";

const handoffAgents = ["Context / RAG Agent", "Module Locator", "Solution Planner"];

const defaultQuestions = [
  "目标用户是谁？",
  "UI 应该展示在哪里？",
  "是否需要后端字段？",
  "成功验收标准是什么？",
  "是否需要兼容已有数据？",
];

export default function RequirementBriefPage({ currentArtifact, error, loading, pageConfig = {}, task }) {
  const requirement = getRequirementText(task, currentArtifact);
  const summary = buildBriefSummary(requirement, currentArtifact);
  const questions = buildClarificationQuestions(requirement);
  const acceptanceCriteria = buildAcceptanceCriteria(requirement);
  const dslPreview = buildDslPreview({ requirement, summary, task });
  const applyChanges = Boolean(task?.applyChanges);
  const runTests = Boolean(task?.runTests);
  const hasRequirement = Boolean(requirement);

  return (
    <section className="artifact-card pm-request-workbench requirement-brief-workbench" aria-label={`${pageConfig.title || "Requirement Brief"} page`}>
      <div className="pm-request-header">
        <div>
          <p className="eyebrow">Software Delivery Page</p>
          <h3>{pageConfig.title || "Requirement Brief"}</h3>
          <p>{pageConfig.primaryQuestion || "这次需求是否已经足够清楚，可以进入分工？"}</p>
        </div>
        <div className="pm-request-step">
          <span>当前页：Requirement Brief</span>
          <strong>{hasRequirement ? "下一步：交给 Context / RAG Agent" : "等待 PM Request"}</strong>
        </div>
      </div>

      <div className="pm-request-grid">
        <article className="pm-request-panel requirement-brief-summary">
          <div className="artifact-card-title">
            <h4>Brief Summary</h4>
            <span>{hasRequirement ? "structured" : "waiting"}</span>
          </div>
          <dl className="compact-list pm-request-meta">
            <dt>Produced artifact</dt>
            <dd>{pageConfig.producedArtifact || "Requirement DSL"}</dd>
            <dt>View location</dt>
            <dd>{pageConfig.viewLocation || "Current page + Evidence Drawer → Requirement"}</dd>
            <dt>Primary action</dt>
            <dd>{pageConfig.primaryAction || "Approve Requirement Brief"}</dd>
          </dl>
          {hasRequirement ? (
            <dl className="compact-list requirement-summary-list">
              <dt>用户目标</dt>
              <dd>{summary.intent}</dd>
              <dt>目标对象 / 页面 / 模块</dt>
              <dd>{summary.targetSurface}</dd>
              <dt>预期用户可见行为</dt>
              <dd>{summary.userVisibleBehavior}</dd>
              <dt>数据 / API / UI 改动</dt>
              <dd>{summary.dataImpact}</dd>
            </dl>
          ) : (
            <div className="pm-request-empty">
              <strong>等待 PM Request</strong>
              <p>下一步会由 Clarifier / Requirement DSL Agent 生成 brief。</p>
            </div>
          )}
        </article>

        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>Safety</h4>
            <span>remote locked</span>
          </div>
          <dl className="compact-list pm-request-flags">
            <dt>mode</dt>
            <dd>software_delivery</dd>
            <dt>applyChanges</dt>
            <dd>applyChanges: {String(applyChanges)}</dd>
            <dt>runTests</dt>
            <dd>runTests: {String(runTests)}</dd>
            <dt>push</dt>
            <dd>push: false</dd>
            <dt>pr</dt>
            <dd>pr: false</dd>
          </dl>
        </article>
      </div>

      <div className="pm-request-grid">
        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>Clarification Questions</h4>
            <span>{questions.length} prompts</span>
          </div>
          <ul className="requirement-question-list">
            {questions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </article>

        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>Acceptance Criteria</h4>
            <span>checklist</span>
          </div>
          <ul className="pm-checklist">
            {acceptanceCriteria.map((criterion) => (
              <li className="pm-check-ready" key={criterion}>
                <span>ready</span>
                <strong>{criterion}</strong>
                <p>{criterion === "不触发 push / PR" ? "远端动作保持关闭，交付只进入本地准备与显式授权边界。" : "作为后续验证和 Delivery Report 的检查点。"}</p>
              </li>
            ))}
          </ul>
        </article>
      </div>

      <div className="pm-request-grid">
        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>Requirement DSL Preview</h4>
            <span>deterministic</span>
          </div>
          <pre>{JSON.stringify(dslPreview, null, 2)}</pre>
        </article>

        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>Agent Handoff</h4>
            <span>next agents</span>
          </div>
          <ol className="pm-agent-handoff">
            {handoffAgents.map((agent) => (
              <li key={agent}>{agent}</li>
            ))}
          </ol>
        </article>
      </div>

      <footer className="pm-request-footer">
        <span>完成条件：结构化简报可交给 Context / RAG、模块定位和方案规划。</span>
        <strong>{pageConfig.primaryAction || "Approve Requirement Brief"}</strong>
      </footer>

      {loading && <p className="muted">Loading page data...</p>}
      {error && <p className="mission-alert">{error}</p>}
    </section>
  );
}

function getRequirementText(task, currentArtifact) {
  if (task?.requirement) return task.requirement;
  if (currentArtifact?.summary) return currentArtifact.summary;
  if (typeof currentArtifact?.content === "string") return currentArtifact.content;
  if (currentArtifact?.content?.requirement) return currentArtifact.content.requirement;
  if (currentArtifact?.content?.intent) return currentArtifact.content.intent;
  return "";
}

function buildBriefSummary(requirement, currentArtifact) {
  const content = currentArtifact?.content || {};
  return {
    intent: content.intent || requirement || "等待 PM Request 记录用户目标。",
    targetSurface: content.targetSurface || inferTargetSurface(requirement),
    userVisibleBehavior: content.userVisibleBehavior || inferVisibleBehavior(requirement),
    dataImpact: content.dataImpact || inferDataImpact(requirement),
  };
}

function buildClarificationQuestions(requirement) {
  if (!requirement) return defaultQuestions;

  return defaultQuestions;
}

function buildAcceptanceCriteria(requirement) {
  return [
    "用户能看到新增 UI 行为",
    "代码写入目标模块",
    "测试命令执行并记录 exit code",
    "Delivery report 能列出 changed files",
    "不触发 push / PR",
  ].map((criterion) => (requirement ? criterion : criterion));
}

function buildDslPreview({ requirement, summary, task }) {
  return {
    intent: summary.intent,
    targetSurface: summary.targetSurface,
    userVisibleBehavior: summary.userVisibleBehavior,
    dataImpact: summary.dataImpact,
    testExpectation: /测试|test|验收|通过/i.test(requirement)
      ? "Run registered test command and record exit code."
      : "Add or run the narrowest relevant frontend verification.",
    safety: {
      taskMode: "software_delivery",
      applyChanges: Boolean(task?.applyChanges),
      runTests: Boolean(task?.runTests),
      push: false,
      pr: false,
    },
  };
}

function inferTargetSurface(requirement) {
  if (!requirement) return "等待 PM Request";
  const match = requirement.match(/([\u4e00-\u9fa5A-Za-z0-9/_-]*(?:页|页面|列表|详情|编辑|模块|组件|表单))/);
  return match?.[1] || "待 Clarifier 确认目标页面 / 模块";
}

function inferVisibleBehavior(requirement) {
  if (!requirement) return "等待 Clarifier 提取用户可见行为";
  if (/阅读时间|字数/.test(requirement)) return "展示字数和预计阅读时间";
  if (/热门|TOP|标识/.test(requirement)) return "展示热门或 TOP 标识";
  if (/封面图|图片/.test(requirement)) return "展示或编辑封面图字段";
  return "根据 PM Request 展示新增 UI 行为";
}

function inferDataImpact(requirement) {
  if (!requirement) return "等待 Requirement DSL Agent 判断";
  if (/字段|接口|api|数据|schema|field|endpoint/i.test(requirement)) return "可能涉及数据字段或 API contract，需要后续确认";
  return "暂未发现明确后端字段或 API 变化，优先按前端 UI 改动处理";
}
