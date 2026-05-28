import React from "react";

const dependencyChain = [
  "PM Request",
  "Requirement Brief",
  "Context Evidence",
  "Module Locator",
  "Implementation Plan",
  "Test Result",
  "Delivery Report",
];

const executionStrategy = [
  "preview first",
  "applyChanges gated",
  "runTests gated",
  "local commit only",
  "push / PR disabled by default",
];

const agentAssignments = [
  { agent: "Context / RAG Agent", responsibility: "Collect nearby files, prior artifacts, and implementation evidence." },
  { agent: "Module Locator", responsibility: "Identify the target route, component, data boundary, and test surface." },
  { agent: "Solution Planner", responsibility: "Turn the breakdown into a narrow implementation sequence." },
  { agent: "Code Writer", responsibility: "Apply the approved frontend change inside the located modules." },
  { agent: "Test Runner", responsibility: "Run the narrowest relevant checks and record the exit code." },
  { agent: "Delivery Agent", responsibility: "Prepare local delivery evidence while keeping remote actions gated." },
];

const completionCriteria = [
  "work packages defined",
  "dependencies visible",
  "safety gates clear",
  "next page can enter context / module discovery",
];

export default function WorkBreakdownPage({ currentArtifact, error, loading, pageConfig = {}, task }) {
  const requirement = getRequirementText(task, currentArtifact);
  const workPackages = buildWorkPackages(requirement, currentArtifact);
  const risks = buildRiskRegister(requirement);
  const applyChanges = Boolean(task?.applyChanges);
  const runTests = Boolean(task?.runTests);

  return (
    <section className="artifact-card pm-request-workbench work-breakdown-workbench" aria-label={`${pageConfig.title || "Work Breakdown"} page`}>
      <div className="pm-request-header">
        <div>
          <p className="eyebrow">Software Delivery Page</p>
          <h3>{pageConfig.title || "Work Breakdown"}</h3>
          <p>{pageConfig.primaryQuestion || "这次任务会改哪里？谁负责？怎么测？"}</p>
        </div>
        <div className="pm-request-step">
          <span>Current page: Work Breakdown</span>
          <strong>Next page: Context and module discovery</strong>
        </div>
      </div>

      <div className="pm-request-grid">
        <article className="pm-request-panel work-breakdown-main">
          <div className="artifact-card-title">
            <h4>Work Packages</h4>
            <span>{workPackages.length} packages</span>
          </div>
          <div className="work-package-list">
            {workPackages.map((item) => (
              <section className="work-package-card" key={item.title}>
                <div className="artifact-card-title">
                  <strong>{item.title}</strong>
                  <span>{item.riskLevel}</span>
                </div>
                <dl className="compact-list work-package-meta">
                  <dt>Owner</dt>
                  <dd>{item.ownerAgent}</dd>
                  <dt>Scope</dt>
                  <dd>{item.scope}</dd>
                  <dt>Output</dt>
                  <dd>{item.expectedOutput}</dd>
                  <dt>Status</dt>
                  <dd>{item.status}</dd>
                </dl>
              </section>
            ))}
          </div>
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
            <h4>Dependency Map</h4>
            <span>ordered chain</span>
          </div>
          <ol className="dependency-chain">
            {dependencyChain.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </article>

        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>Execution Strategy</h4>
            <span>gated</span>
          </div>
          <ul className="requirement-question-list">
            {executionStrategy.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </div>

      <div className="pm-request-grid">
        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>Risk Register</h4>
            <span>{risks.length} risks</span>
          </div>
          <ul className="risk-register">
            {risks.map((risk) => (
              <li key={risk.title}>
                <strong>{risk.title}</strong>
                <p>{risk.mitigation}</p>
              </li>
            ))}
          </ul>
        </article>

        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>Agent Assignment</h4>
            <span>handoff</span>
          </div>
          <ol className="pm-agent-handoff">
            {agentAssignments.map((item) => (
              <li key={item.agent}>
                <strong>{item.agent}</strong>
                <p>{item.responsibility}</p>
              </li>
            ))}
          </ol>
        </article>
      </div>

      <article className="pm-request-panel">
        <div className="artifact-card-title">
          <h4>Completion Criteria</h4>
          <span>ready for plan</span>
        </div>
        <div className="pm-artifact-roadmap">
          {completionCriteria.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </article>

      <footer className="pm-request-footer">
        <span>Completion condition: work is split, dependencies are visible, and safety gates are explicit.</span>
        <strong>{pageConfig.primaryAction || "Approve Breakdown"}</strong>
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

function buildWorkPackages(requirement, currentArtifact) {
  const content = currentArtifact?.content || {};
  const frontendTasks = Array.isArray(content.frontendTasks) ? content.frontendTasks : [];
  const testTasks = Array.isArray(content.testTasks) ? content.testTasks : [];
  const target = inferTarget(requirement, frontendTasks);
  const testScope = testTasks[0]?.command || "narrow frontend test command";

  return [
    {
      title: "Frontend surface update",
      ownerAgent: "Code Writer",
      scope: target,
      expectedOutput: "Target UI surface updated with the requested user-visible behavior.",
      riskLevel: "medium",
      status: requirement ? "ready for planning" : "waiting for PM Request",
    },
    {
      title: "Data model / API impact check",
      ownerAgent: "Module Locator",
      scope: inferDataScope(requirement),
      expectedOutput: "Decision on whether the change stays frontend-only or needs contract review.",
      riskLevel: /api|field|schema|endpoint|字段|接口|数据/i.test(requirement) ? "high" : "low",
      status: "needs confirmation",
    },
    {
      title: "Context retrieval",
      ownerAgent: "Context / RAG Agent",
      scope: "Nearby routes, components, tests, and existing artifacts.",
      expectedOutput: "Context Evidence with candidate files and rationale.",
      riskLevel: "medium",
      status: "next up",
    },
    {
      title: "Code writer task",
      ownerAgent: "Code Writer",
      scope: "Smallest implementation slice after module location is approved.",
      expectedOutput: "Changed files plus diff summary.",
      riskLevel: "medium",
      status: "blocked by Implementation Plan",
    },
    {
      title: "Test and verification",
      ownerAgent: "Test Runner",
      scope: testScope,
      expectedOutput: "Test Result artifact with command, status, and exit code.",
      riskLevel: "medium",
      status: "gated by runTests",
    },
    {
      title: "Delivery / PR preparation",
      ownerAgent: "Delivery Agent",
      scope: "Local delivery evidence only; remote push and PR stay disabled by default.",
      expectedOutput: "Delivery Report with changed files, safety notes, and next action.",
      riskLevel: "high",
      status: "remote gated",
    },
  ];
}

function buildRiskRegister(requirement) {
  const ambiguityMitigation = requirement
    ? "Use Requirement Brief questions before implementation if target, behavior, or acceptance remains vague."
    : "Wait for PM Request before assigning implementation work.";

  return [
    { title: "Requirement ambiguity", mitigation: ambiguityMitigation },
    { title: "Wrong module targeting", mitigation: "Require Context Evidence and Module Locator output before writing code." },
    { title: "Duplicate code insertion", mitigation: "Prefer existing route/component patterns and avoid parallel UI paths." },
    { title: "Failing tests", mitigation: "Run the narrowest relevant test first, then build only after page tests pass." },
    { title: "Unsafe git action", mitigation: "Keep local commit only; push and PR require explicit later authorization." },
  ];
}

function inferTarget(requirement, frontendTasks) {
  if (frontendTasks[0]?.file) return frontendTasks[0].file;
  if (!requirement) return "Waiting for PM Request target surface";
  if (/article|文章|详情/i.test(requirement)) return "Article detail page / article route surface";
  if (/tag|标签|热门|TOP/i.test(requirement)) return "Tag list or popular tags component";
  if (/cover|封面|image|图片/i.test(requirement)) return "Article editor form and preview surface";
  return "Target module to be confirmed by Module Locator";
}

function inferDataScope(requirement) {
  if (!requirement) return "Unknown until Requirement Brief is available";
  if (/api|field|schema|endpoint|字段|接口|数据/i.test(requirement)) return "Potential data field or API contract impact";
  return "No explicit backend field or API change detected; start with frontend impact check";
}
