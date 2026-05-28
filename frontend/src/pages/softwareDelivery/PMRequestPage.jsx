import React from "react";

const exampleRequests = [
  "例如：给文章详情页增加阅读时间统计",
  "例如：给标签列表增加热门标识",
  "例如：给文章编辑页增加封面图字段",
];

const handoffAgents = [
  "PM Clarifier",
  "Requirement DSL Agent",
  "Context / RAG Agent",
  "Module Locator",
  "Solution Planner",
  "Code Writer",
  "Test Runner",
  "Delivery Agent",
];

const artifactRoadmap = [
  "PM Request",
  "Clarification Notes",
  "Requirement DSL",
  "Context Evidence",
  "Implementation Plan",
  "Test Result",
  "Delivery Report",
];

export default function PMRequestPage({ artifacts = [], currentArtifact, error, loading, pageConfig = {}, task }) {
  const requirement = getRequirementText(task, currentArtifact);
  const checks = buildQualityChecks(requirement);
  const hasRequirement = Boolean(requirement);
  const applyChanges = Boolean(task?.applyChanges);
  const runTests = Boolean(task?.runTests);

  return (
    <section className="artifact-card pm-request-workbench" aria-label={`${pageConfig.title || "PM Request"} page`}>
      <div className="pm-request-header">
        <div>
          <p className="eyebrow">Software Delivery Page</p>
          <h3>{pageConfig.title || "PM Request"}</h3>
          <p>{pageConfig.primaryQuestion || "PM 的原始交付意图是什么？"}</p>
        </div>
        <div className="pm-request-step">
          <span>当前页：PM Request</span>
          <strong>下一步：生成 Requirement Brief</strong>
        </div>
      </div>

      <div className="pm-request-grid">
        <article className="pm-request-panel pm-request-primary">
          <div className="artifact-card-title">
            <h4>PM 原始需求</h4>
            <span>{hasRequirement ? "recorded" : "waiting input"}</span>
          </div>
          <dl className="compact-list pm-request-meta">
            <dt>Produced artifact</dt>
            <dd>{pageConfig.producedArtifact || "PM original request"}</dd>
            <dt>View location</dt>
            <dd>{pageConfig.viewLocation || "Current page + Evidence Drawer → Requirement"}</dd>
          </dl>
          {hasRequirement ? (
            <p className="pm-request-text">{requirement}</p>
          ) : (
            <div className="pm-request-empty">
              <strong>输入一个软件交付需求</strong>
              <ul>
                {exampleRequests.map((example) => (
                  <li key={example}>{example}</li>
                ))}
              </ul>
            </div>
          )}
        </article>

        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>任务模式与安全开关</h4>
            <span>remote locked</span>
          </div>
          <dl className="compact-list pm-request-flags">
            <dt>taskMode</dt>
            <dd>taskMode: software_delivery</dd>
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
            <h4>PM Request 质量检查</h4>
            <span>{checks.filter((check) => check.ready).length}/{checks.length} ready</span>
          </div>
          <ul className="pm-checklist">
            {checks.map((check) => (
              <li className={check.ready ? "pm-check-ready" : "pm-check-waiting"} key={check.label}>
                <span>{check.ready ? "ready" : "check"}</span>
                <strong>{check.label}</strong>
                <p>{check.detail}</p>
              </li>
            ))}
          </ul>
        </article>

        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>Agent 接力预览</h4>
            <span>handoff</span>
          </div>
          <ol className="pm-agent-handoff">
            {handoffAgents.map((agent) => (
              <li key={agent}>{agent}</li>
            ))}
          </ol>
        </article>
      </div>

      <article className="pm-request-panel">
        <div className="artifact-card-title">
          <h4>Artifacts 入口</h4>
          <span>{artifacts.length || "planned"}</span>
        </div>
        <div className="pm-artifact-roadmap">
          {artifactRoadmap.map((artifact) => (
            <span key={artifact}>{artifact}</span>
          ))}
        </div>
      </article>

      <footer className="pm-request-footer">
        <span>完成条件：PM 需求已记录并可进入澄清阶段</span>
        <strong>{pageConfig.primaryAction || "Submit PM Request"}</strong>
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
  return "";
}

function buildQualityChecks(requirement) {
  const text = requirement.toLowerCase();
  const hasRequirement = Boolean(requirement);
  const hasTarget = /页|页面|模块|列表|详情|编辑|article|tag|component|route|form/.test(text);
  const hasVisibleBehavior = /展示|显示|增加|新增|标识|按钮|输入|可见|show|display|render|add/.test(text);
  const hasDataOrApi = /字段|接口|api|数据|schema|field|endpoint|request|response/.test(text);
  const hasAcceptance = /验收|标准|测试|通过|确认|期望|acceptance|test|should/.test(text);
  const needsClarification = !hasRequirement || !hasTarget || !hasVisibleBehavior || !hasAcceptance;

  return [
    {
      label: "目标页面 / 模块",
      ready: hasTarget,
      detail: hasTarget ? "已识别可能的页面、模块或组件目标。" : "还需要说明目标页面、模块或组件。",
    },
    {
      label: "用户可见行为",
      ready: hasVisibleBehavior,
      detail: hasVisibleBehavior ? "已包含用户能看到的行为变化。" : "还需要说明用户最终会看到什么变化。",
    },
    {
      label: "数据字段或接口变化",
      ready: hasDataOrApi,
      detail: hasDataOrApi ? "需求提到了字段、接口或数据变化。" : "未发现明确数据字段或接口变化，可保持前端展示范围。",
    },
    {
      label: "验收标准",
      ready: hasAcceptance,
      detail: hasAcceptance ? "已包含验收、测试或通过条件。" : "建议补充验收标准或测试期望。",
    },
    {
      label: "是否需要澄清",
      ready: !needsClarification,
      detail: needsClarification ? "进入 PM Clarifier 前仍有信息可补充。" : "信息足够进入 Requirement Brief。",
    },
  ];
}
