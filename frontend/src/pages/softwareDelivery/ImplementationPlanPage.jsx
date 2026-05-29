import React from "react";

const implementationSequence = [
  "inspect context",
  "locate target files",
  "apply minimal code changes",
  "add or adjust tests",
  "run registered test commands",
  "generate delivery report",
  "prepare local commit only",
];

const testPlan = [
  { label: "unit / component test expectation", detail: "Cover the smallest user-visible behavior or helper logic touched by the change." },
  { label: "build check", detail: "Run the frontend production build after focused tests pass." },
  { label: "smoke check", detail: "Use only the approved narrow smoke path when explicitly requested." },
  { label: "failure handling", detail: "Stop on failing tests, report the failing name and error before widening scope." },
  { label: "no push / no PR by default", detail: "Remote delivery remains disabled until a later explicit authorization." },
];

const safetyGates = [
  "preview before write",
  "applyChanges gated",
  "runTests gated",
  "local commit only",
  "push disabled",
  "PR disabled",
  "allowed paths",
];

const handoffAgents = [
  { agent: "Code Writer Agent", output: "Apply the approved implementation sequence inside target modules." },
  { agent: "Test Runner Agent", output: "Run focused verification and record command, status, and exit code." },
  { agent: "Delivery Agent", output: "Prepare local delivery evidence while keeping push and PR disabled." },
];

const completionCriteria = [
  "target modules identified",
  "implementation sequence clear",
  "test plan defined",
  "safety gates visible",
  "next page can enter code / execution phase",
];

export default function ImplementationPlanPage({ currentArtifact, error, loading, pageConfig = {}, task }) {
  const requirement = getRequirementText(task, currentArtifact);
  const overview = buildPlanOverview(requirement, currentArtifact);
  const moduleTouchPlan = buildModuleTouchPlan(requirement, currentArtifact);
  const applyChanges = Boolean(task?.applyChanges);
  const runTests = Boolean(task?.runTests);

  return (
    <section className="artifact-card pm-request-workbench implementation-plan-workbench" aria-label={`${pageConfig.title || "Implementation Plan"} page`}>
      <div className="pm-request-header">
        <div>
          <p className="eyebrow">Software Delivery Page</p>
          <h3>{pageConfig.title || "Implementation Plan"}</h3>
          <p>{pageConfig.primaryQuestion || "Implementation order, target files, and test path need to be executable."}</p>
        </div>
        <div className="pm-request-step">
          <span>Current page: Implementation Plan</span>
          <strong>Next page: Code Changes</strong>
        </div>
      </div>

      <div className="pm-request-grid">
        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>Plan Overview</h4>
            <span>{requirement ? "derived" : "waiting"}</span>
          </div>
          <dl className="compact-list requirement-summary-list">
            <dt>user goal</dt>
            <dd>{overview.userGoal}</dd>
            <dt>target surface</dt>
            <dd>{overview.targetSurface}</dd>
            <dt>implementation intent</dt>
            <dd>{overview.implementationIntent}</dd>
            <dt>expected code areas</dt>
            <dd>{overview.expectedCodeAreas}</dd>
            <dt>validation goal</dt>
            <dd>{overview.validationGoal}</dd>
          </dl>
        </article>

        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>Safety Gates</h4>
            <span>write gated</span>
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
          <div className="pm-artifact-roadmap implementation-gates">
            {safetyGates.map((gate) => (
              <span key={gate}>{gate}</span>
            ))}
          </div>
        </article>
      </div>

      <article className="pm-request-panel">
        <div className="artifact-card-title">
          <h4>Module Touch Plan</h4>
          <span>{moduleTouchPlan.length} areas</span>
        </div>
        <div className="work-package-list module-touch-list">
          {moduleTouchPlan.map((item) => (
            <section className="work-package-card" key={item.area}>
              <div className="artifact-card-title">
                <strong>{item.area}</strong>
                <span>{item.riskLevel}</span>
              </div>
              <dl className="compact-list work-package-meta">
                <dt>Reason</dt>
                <dd>{item.reason}</dd>
                <dt>Change</dt>
                <dd>{item.expectedChange}</dd>
              </dl>
            </section>
          ))}
        </div>
      </article>

      <div className="pm-request-grid">
        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>Step-by-step Implementation Sequence</h4>
            <span>ordered</span>
          </div>
          <ol className="dependency-chain">
            {implementationSequence.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </article>

        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>Test Plan</h4>
            <span>verification</span>
          </div>
          <ul className="risk-register">
            {testPlan.map((item) => (
              <li key={item.label}>
                <strong>{item.label}</strong>
                <p>{item.detail}</p>
              </li>
            ))}
          </ul>
        </article>
      </div>

      <div className="pm-request-grid">
        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>Agent Handoff</h4>
            <span>execution agents</span>
          </div>
          <ol className="pm-agent-handoff">
            {handoffAgents.map((item) => (
              <li key={item.agent}>
                <strong>{item.agent}</strong>
                <p>{item.output}</p>
              </li>
            ))}
          </ol>
        </article>

        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>Completion Criteria</h4>
            <span>ready for code</span>
          </div>
          <div className="pm-artifact-roadmap">
            {completionCriteria.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </article>
      </div>

      <footer className="pm-request-footer">
        <span>Completion condition: target modules, sequence, tests, and safety gates are clear before code execution.</span>
        <strong>{pageConfig.primaryAction || "Approve Plan"}</strong>
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

function buildPlanOverview(requirement, currentArtifact) {
  const content = currentArtifact?.content || {};
  return {
    userGoal: content.userGoal || requirement || "Waiting for approved Requirement Brief and Work Breakdown.",
    targetSurface: content.targetSurface || inferTargetSurface(requirement),
    implementationIntent: content.implementationIntent || inferImplementationIntent(requirement),
    expectedCodeAreas: content.expectedCodeAreas || inferExpectedCodeAreas(requirement),
    validationGoal: content.validationGoal || "Focused frontend test plus production build before delivery evidence.",
  };
}

function buildModuleTouchPlan(requirement, currentArtifact) {
  const content = currentArtifact?.content || {};
  const declaredModules = Array.isArray(content.moduleTouchPlan) ? content.moduleTouchPlan : [];
  if (declaredModules.length) return declaredModules;

  const needsBackend = /api|endpoint|controller|model|schema|field|字段|接口|后端|数据/i.test(requirement);
  return [
    {
      area: "Frontend route / page",
      reason: "Primary user-visible surface must expose the requested behavior.",
      expectedChange: inferTargetSurface(requirement),
      riskLevel: "medium",
    },
    {
      area: "Frontend component",
      reason: "Most delivery changes should be isolated to the smallest reusable UI unit.",
      expectedChange: "Add or adjust display logic without duplicating existing components.",
      riskLevel: "medium",
    },
    {
      area: "Service / API client",
      reason: needsBackend ? "Requirement hints at data or API contract usage." : "Confirm no new service call is needed.",
      expectedChange: needsBackend ? "Review client contract before UI wiring." : "Prefer no change unless Module Locator finds an existing data dependency.",
      riskLevel: needsBackend ? "high" : "low",
    },
    {
      area: "Backend controller / model",
      reason: needsBackend ? "Data/API wording requires explicit impact review." : "No backend change is implied by the current requirement.",
      expectedChange: needsBackend ? "Flag for later contract-safe backend planning." : "Keep out of scope for this frontend execution plan.",
      riskLevel: needsBackend ? "high" : "low",
    },
    {
      area: "Test files",
      reason: "The implementation needs a repeatable verification signal.",
      expectedChange: "Add or adjust the narrowest test around the changed behavior.",
      riskLevel: "medium",
    },
    {
      area: "Styles",
      reason: "User-visible UI changes may require small layout or state styling.",
      expectedChange: "Use existing design tokens and avoid broad visual refactors.",
      riskLevel: "low",
    },
  ];
}

function inferTargetSurface(requirement) {
  if (!requirement) return "Target surface to be confirmed by Module Locator.";
  if (/article|文章|详情/i.test(requirement)) return "Article detail page / article route surface.";
  if (/tag|标签|热门|TOP/i.test(requirement)) return "Tag list or popular tags component.";
  if (/cover|封面|image|图片/i.test(requirement)) return "Article editor form and preview surface.";
  return "Target page, route, or component identified during context inspection.";
}

function inferImplementationIntent(requirement) {
  if (!requirement) return "Wait for upstream artifacts, then produce a narrow code execution plan.";
  if (/reading time|word count|阅读|字数/i.test(requirement)) return "Compute and display reading metadata without changing remote delivery defaults.";
  if (/hot|popular|热门|TOP/i.test(requirement)) return "Add visible ranking or badge treatment to the existing tag UI.";
  return "Apply the smallest code change that satisfies the approved user-visible behavior.";
}

function inferExpectedCodeAreas(requirement) {
  const areas = ["route/page", "component", "tests"];
  if (/style|layout|css|样式|布局/i.test(requirement)) areas.push("styles");
  if (/api|endpoint|field|schema|字段|接口|数据/i.test(requirement)) areas.push("service/API client", "backend impact review");
  return areas.join(", ");
}
