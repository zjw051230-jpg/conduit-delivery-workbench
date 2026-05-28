import React from "react";
import { FileList } from "../../components/common/FileList";

const writerState = [
  { label: "preview only", detail: "Code changes are reviewed as evidence before any write path is trusted." },
  { label: "applyChanges gated", detail: "Repository writes only occur when applyChanges is explicitly enabled upstream." },
  { label: "writer unchanged / modified", detail: "The writer result must say whether files stayed unchanged or were modified." },
  { label: "idempotency expectation", detail: "A replay should update the same target surface without duplicating code." },
  { label: "duplicate insertion guard", detail: "Prefer existing component and route patterns before adding new branches." },
];

const safetyGates = [
  "No direct push",
  "No PR by default",
  "allowed repository paths",
  "local commit only after delivery preview",
  "test required before delivery",
];

const handoffAgents = [
  { agent: "Test Runner Agent", output: "Run focused verification against changed files and record exit code." },
  { agent: "Delivery Agent", output: "Prepare delivery report, changed file list, and local commit readiness." },
  { agent: "PR Delivery Agent", output: "Wait for explicit remote authorization before push or PR creation." },
];

const completionCriteria = [
  "changed files captured",
  "diff summary available",
  "writer result recorded",
  "tests ready to run",
  "no remote action triggered",
];

export default function CodeChangesPage({ artifacts = [], currentArtifact, error, loading, pageConfig = {}, task }) {
  const changedFiles = getChangedFiles(task, artifacts, currentArtifact);
  const diffSummary = getDiffSummary(task, artifacts, currentArtifact);
  const changeSummary = buildChangeSummary(task, currentArtifact, changedFiles);
  const fileCards = buildFileCards(changedFiles, task, currentArtifact);
  const hasChanges = changedFiles.length > 0;

  return (
    <section className="artifact-card pm-request-workbench code-changes-workbench" aria-label={`${pageConfig.title || "Code Changes"} page`}>
      <div className="pm-request-header">
        <div>
          <p className="eyebrow">Software Delivery Page</p>
          <h3>{pageConfig.title || "Code Changes"}</h3>
          <p>{pageConfig.primaryQuestion || "Which file-level changes did the writer produce?"}</p>
        </div>
        <div className="pm-request-step">
          <span>Current page: Code Changes</span>
          <strong>Next page: Preview / Effect</strong>
        </div>
      </div>

      <div className="pm-request-grid">
        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>Change Summary</h4>
            <span>{hasChanges ? `${changedFiles.length} files` : "preview"}</span>
          </div>
          <dl className="compact-list requirement-summary-list">
            <dt>change intent</dt>
            <dd>{changeSummary.intent}</dd>
            <dt>target repository</dt>
            <dd>{changeSummary.repository}</dd>
            <dt>applyChanges</dt>
            <dd>applyChanges: {String(Boolean(task?.applyChanges))}</dd>
            <dt>changed files</dt>
            <dd>{hasChanges ? String(changedFiles.length) : "0 / preview placeholder"}</dd>
            <dt>writer status</dt>
            <dd>{changeSummary.writerStatus}</dd>
            <dt>safety status</dt>
            <dd>{changeSummary.safetyStatus}</dd>
          </dl>
        </article>

        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>Safety Gates</h4>
            <span>remote locked</span>
          </div>
          <dl className="compact-list pm-request-flags">
            <dt>mode</dt>
            <dd>software_delivery</dd>
            <dt>push</dt>
            <dd>push: false</dd>
            <dt>pr</dt>
            <dd>pr: false</dd>
            <dt>tests</dt>
            <dd>runTests: {String(Boolean(task?.runTests))}</dd>
          </dl>
          <div className="pm-artifact-roadmap implementation-gates">
            {safetyGates.map((gate) => (
              <span key={gate}>{gate}</span>
            ))}
          </div>
        </article>
      </div>

      <div className="pm-request-grid">
        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>Changed Files</h4>
            <span>{hasChanges ? "captured" : "waiting"}</span>
          </div>
          {hasChanges ? (
            <FileList files={changedFiles} emptyText="No code changes have been applied yet" />
          ) : (
            <div className="pm-request-empty">
              <strong>No code changes have been applied yet</strong>
              <p>Code Writer will populate this section after applyChanges=true.</p>
            </div>
          )}
        </article>

        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>Writer Execution State</h4>
            <span>{Boolean(task?.applyChanges) ? "write enabled" : "preview locked"}</span>
          </div>
          <ul className="risk-register">
            {writerState.map((item) => (
              <li key={item.label}>
                <strong>{item.label}</strong>
                <p>{item.detail}</p>
              </li>
            ))}
          </ul>
        </article>
      </div>

      <article className="pm-request-panel">
        <div className="artifact-card-title">
          <h4>File Change Cards</h4>
          <span>{fileCards.length || "planned"}</span>
        </div>
        {fileCards.length ? (
          <div className="work-package-list module-touch-list">
            {fileCards.map((file) => (
              <section className="work-package-card" key={file.path}>
                <div className="artifact-card-title">
                  <strong>{file.path}</strong>
                  <span>{file.riskLevel}</span>
                </div>
                <dl className="compact-list work-package-meta">
                  <dt>Type</dt>
                  <dd>{file.changeType}</dd>
                  <dt>Owner</dt>
                  <dd>{file.ownerAgent}</dd>
                  <dt>Reason</dt>
                  <dd>{file.reason}</dd>
                  <dt>Validation</dt>
                  <dd>{file.expectedValidation}</dd>
                </dl>
              </section>
            ))}
          </div>
        ) : (
          <p className="muted">Waiting for Code Writer output before file cards can be finalized.</p>
        )}
      </article>

      <div className="pm-request-grid">
        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>Diff / Patch Preview</h4>
            <span>{diffSummary ? "available" : "waiting"}</span>
          </div>
          {diffSummary ? (
            <pre>{diffSummary}</pre>
          ) : (
            <div className="pm-request-empty">
              <strong>Waiting for Code Writer output</strong>
              <p>Delivery Preview will provide git diff summary.</p>
            </div>
          )}
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
          <span>ready for tests</span>
        </div>
        <div className="pm-artifact-roadmap">
          {completionCriteria.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </article>

      <footer className="pm-request-footer">
        <span>Completion condition: writer evidence is captured and ready for test execution without remote action.</span>
        <strong>{pageConfig.primaryAction || "Open Diff Review"}</strong>
      </footer>

      {loading && <p className="muted">Loading page data...</p>}
      {error && <p className="mission-alert">{error}</p>}
    </section>
  );
}

function getChangedFiles(task, artifacts, currentArtifact) {
  const sources = [
    task?.changedFiles,
    task?.report?.changedFiles,
    task?.delivery?.changedFiles,
    currentArtifact?.content?.changedFiles,
    currentArtifact?.changedFiles,
    findArtifactContent(artifacts, ["changed_files", "delivery_report", "implementation_plan", "code_diff"])?.changedFiles,
  ];

  for (const source of sources) {
    const files = normalizeFiles(source);
    if (files.length) return files;
  }
  return [];
}

function getDiffSummary(task, artifacts, currentArtifact) {
  return (
    task?.diffSummary ||
    task?.delivery?.diffSummary ||
    currentArtifact?.content?.diffSummary ||
    currentArtifact?.diffSummary ||
    findArtifactContent(artifacts, ["delivery_report", "code_diff"])?.diffSummary ||
    ""
  );
}

function buildChangeSummary(task, currentArtifact, changedFiles) {
  const requirement = task?.requirement || currentArtifact?.summary || "Waiting for Code Writer output";
  return {
    intent: requirement,
    repository: task?.repoPath || task?.repository || "Conduit sandbox repository",
    writerStatus: changedFiles.length ? "writer modified / evidence captured" : "writer unchanged / waiting for applyChanges",
    safetyStatus: "No direct push; no PR by default; local delivery remains gated.",
  };
}

function buildFileCards(changedFiles, task, currentArtifact) {
  const declaredCards = currentArtifact?.content?.fileChangeCards;
  if (Array.isArray(declaredCards) && declaredCards.length) return declaredCards;

  return changedFiles.map((path) => ({
    path,
    changeType: inferChangeType(path, task),
    ownerAgent: "Code Writer Agent",
    reason: inferReason(path, task?.requirement || currentArtifact?.summary || ""),
    riskLevel: inferRisk(path),
    expectedValidation: inferValidation(path),
  }));
}

function findArtifactContent(artifacts = [], types = []) {
  const artifact = artifacts.find((item) => types.includes(item.type));
  return artifact?.content || artifact || null;
}

function normalizeFiles(files) {
  if (!files) return [];
  if (Array.isArray(files)) return files.filter(Boolean);
  if (typeof files === "string") return files.split(/\r?\n|,/).map((file) => file.trim()).filter(Boolean);
  return [];
}

function inferChangeType(path, task) {
  const addedFiles = normalizeFiles(task?.addedFiles);
  if (addedFiles.includes(path)) return "added";
  if (!task?.applyChanges) return "planned";
  return "modified";
}

function inferReason(path, requirement) {
  if (/test|spec/i.test(path)) return "Verification surface for the requested behavior.";
  if (/css|style/i.test(path)) return "Style adjustment for the visible UI change.";
  if (/api|service|client/i.test(path)) return "Data access boundary for the implementation.";
  if (/article|route|page|component/i.test(path) || /article|阅读|字数/i.test(requirement)) return "Primary frontend surface for the user-visible change.";
  return "File selected by implementation plan or writer evidence.";
}

function inferRisk(path) {
  if (/backend|api|service|client/i.test(path)) return "high";
  if (/test|spec|css|style/i.test(path)) return "low";
  return "medium";
}

function inferValidation(path) {
  if (/test|spec/i.test(path)) return "Run the updated test file and record exit code.";
  if (/css|style/i.test(path)) return "Run build and inspect the affected UI surface.";
  return "Run focused component or route test plus build check.";
}
