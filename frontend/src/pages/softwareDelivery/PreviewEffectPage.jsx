import React from "react";

const previewStates = [
  { label: "UI impact preview", detail: "Show the target surface and the visible product behavior users should notice." },
  { label: "changed behavior preview", detail: "Describe what changes in the existing workflow after the code update." },
  { label: "data display preview", detail: "Confirm whether new values are computed, fetched, or displayed from existing data." },
  { label: "empty state consideration", detail: "State what users see when the required data is missing or unavailable." },
  { label: "loading state consideration", detail: "Keep loading behavior consistent with the existing page pattern." },
  { label: "error state consideration", detail: "Avoid hiding failures; preserve the current error affordance." },
];

const acceptanceSignals = [
  "visible UI change",
  "no regression to existing flow",
  "output matches requirement",
  "tests ready / pending",
  "delivery report pending",
];

const risks = [
  { title: "unclear UI placement", mitigation: "Use the target surface from Requirement Brief and confirm placement before verification." },
  { title: "incomplete backend data", mitigation: "Prefer existing data when possible; flag API gaps before claiming the effect is complete." },
  { title: "visual regression", mitigation: "Keep styling local to the changed surface and compare before / after behavior." },
  { title: "edge states missing", mitigation: "List empty, loading, and error states in the preview before tests run." },
  { title: "test coverage gap", mitigation: "Hand off explicit acceptance signals to Verification for focused checks." },
];

const handoffAgents = [
  { agent: "Test Runner Agent", output: "Convert acceptance signals into focused verification commands." },
  { agent: "QA / Verification stage", output: "Review visible behavior, edge states, and regression risk." },
  { agent: "Delivery Agent", output: "Carry preview evidence into the final delivery report without remote action." },
];

const completionCriteria = [
  "expected effect described",
  "preview states listed",
  "acceptance signals clear",
  "ready for test result review",
  "no remote action triggered",
];

export default function PreviewEffectPage({ currentArtifact, error, loading, pageConfig = {}, task }) {
  const summary = buildEffectSummary(task, currentArtifact);
  const comparison = buildComparison(summary);

  return (
    <section className="artifact-card pm-request-workbench preview-effect-workbench" aria-label={`${pageConfig.title || "Preview / Effect"} page`}>
      <div className="pm-request-header">
        <div>
          <p className="eyebrow">Software Delivery Page</p>
          <h3>{pageConfig.title || "Preview / Effect"}</h3>
          <p>{pageConfig.primaryQuestion || "Does the user-visible effect match the PM goal?"}</p>
        </div>
        <div className="pm-request-step">
          <span>Current page: Preview / Effect</span>
          <strong>Next page: Verification</strong>
        </div>
      </div>

      <div className="pm-request-grid">
        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>Effect Summary</h4>
            <span>{summary.hasArtifact ? "artifact backed" : "deterministic"}</span>
          </div>
          <dl className="compact-list requirement-summary-list">
            <dt>user-visible outcome</dt>
            <dd>{summary.userVisibleOutcome}</dd>
            <dt>target surface</dt>
            <dd>{summary.targetSurface}</dd>
            <dt>before / after expectation</dt>
            <dd>{summary.beforeAfterExpectation}</dd>
            <dt>affected workflow</dt>
            <dd>{summary.affectedWorkflow}</dd>
            <dt>validation status</dt>
            <dd>{summary.validationStatus}</dd>
          </dl>
        </article>

        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>Preview Surface</h4>
            <span>planning preview</span>
          </div>
          <div className="pm-request-empty">
            <strong>Preview will be populated after code changes and test run</strong>
            <p>Current view is deterministic planning preview.</p>
          </div>
          <ul className="risk-register">
            {previewStates.map((state) => (
              <li key={state.label}>
                <strong>{state.label}</strong>
                <p>{state.detail}</p>
              </li>
            ))}
          </ul>
        </article>
      </div>

      <div className="pm-request-grid">
        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>Before / After Comparison</h4>
            <span>delta</span>
          </div>
          <dl className="compact-list requirement-summary-list">
            <dt>before: current product behavior</dt>
            <dd>{comparison.before}</dd>
            <dt>after: expected new behavior</dt>
            <dd>{comparison.after}</dd>
            <dt>delta: what changes for the user</dt>
            <dd>{comparison.delta}</dd>
          </dl>
        </article>

        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>Acceptance Signal</h4>
            <span>review cues</span>
          </div>
          <div className="pm-artifact-roadmap">
            {acceptanceSignals.map((signal) => (
              <span key={signal}>{signal}</span>
            ))}
          </div>
        </article>
      </div>

      <div className="pm-request-grid">
        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>Risk / UX Impact</h4>
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
            <h4>Agent Handoff</h4>
            <span>next agents</span>
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
      </div>

      <article className="pm-request-panel">
        <div className="artifact-card-title">
          <h4>Completion Criteria</h4>
          <span>ready for verification</span>
        </div>
        <div className="pm-artifact-roadmap">
          {completionCriteria.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </article>

      <footer className="pm-request-footer">
        <span>Completion condition: expected user effect is clear and ready for test result review.</span>
        <strong>{pageConfig.primaryAction || "Approve Effect Preview"}</strong>
      </footer>

      {loading && <p className="muted">Loading page data...</p>}
      {error && <p className="mission-alert">{error}</p>}
    </section>
  );
}

function buildEffectSummary(task, currentArtifact) {
  const content = currentArtifact?.content || {};
  const requirement = task?.requirement || currentArtifact?.summary || "";
  const userVisibleOutcome = content.userVisibleOutcome || inferOutcome(requirement);
  const targetSurface = content.targetSurface || inferTargetSurface(requirement);

  return {
    hasArtifact: Boolean(currentArtifact),
    userVisibleOutcome,
    targetSurface,
    beforeAfterExpectation: content.beforeAfterExpectation || `${targetSurface}: current behavior -> ${userVisibleOutcome}`,
    affectedWorkflow: content.affectedWorkflow || inferWorkflow(requirement),
    validationStatus: content.validationStatus || (task?.runTests ? "tests ready / pending" : "verification pending"),
  };
}

function buildComparison(summary) {
  return {
    before: "The current product behavior does not yet surface the requested effect in a verified way.",
    after: summary.userVisibleOutcome,
    delta: `Users should see the new effect on ${summary.targetSurface} without losing the existing flow.`,
  };
}

function inferOutcome(requirement) {
  if (/reading time|word count|阅读|字数/i.test(requirement)) return "Readers can see word count and estimated reading time.";
  if (/hot|popular|热门|TOP|tag|标签/i.test(requirement)) return "Users can identify popular tags from the tag list.";
  if (/cover|封面|image|图片/i.test(requirement)) return "Editors can see or manage the cover image field.";
  if (requirement) return requirement;
  return "Preview will be populated after code changes and test run.";
}

function inferTargetSurface(requirement) {
  if (/article|文章|详情/i.test(requirement)) return "Article detail page";
  if (/tag|标签|热门|TOP/i.test(requirement)) return "Tag list";
  if (/cover|封面|editor|编辑/i.test(requirement)) return "Article editor";
  return "Target product surface from the approved implementation plan";
}

function inferWorkflow(requirement) {
  if (/article|文章|详情/i.test(requirement)) return "reader article consumption flow";
  if (/tag|标签|热门|TOP/i.test(requirement)) return "tag discovery flow";
  if (/cover|封面|editor|编辑/i.test(requirement)) return "article editing flow";
  return "software delivery user-facing workflow";
}
