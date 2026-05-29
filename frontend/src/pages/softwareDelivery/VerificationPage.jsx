import React from "react";
import { FileList } from "../../components/common/FileList";

const defaultCommands = [
  { label: "registered skill test command", command: "Pending skill-specific command", status: "pending" },
  { label: "frontend test command", command: "npm test -- frontend/src/App.test.jsx", status: "not executed" },
  { label: "build command", command: "npm run build", status: "not executed" },
  { label: "smoke command status", command: "smoke is not run by default", status: "not executed" },
];

const qualityGates = [
  "tests must pass before delivery",
  "build must pass before delivery",
  "changed files must be known",
  "safety gate must pass",
  "no remote push / PR before approval",
];

const failureHandling = [
  { title: "capture failing command", detail: "Record the exact command that failed before attempting fixes." },
  { title: "preserve stdout / stderr", detail: "Keep concise stdout and stderr evidence for review." },
  { title: "identify failed stage", detail: "Map the failure to writer, test runner, build, or smoke stage." },
  { title: "suggest minimal fix", detail: "Propose the narrowest repair that addresses the observed failure." },
  { title: "rerun targeted test", detail: "Verify with the smallest relevant command before broadening scope." },
  { title: "block delivery commit until resolved", detail: "Do not move to delivery while exit code or build status is failing." },
];

const handoffAgents = [
  { agent: "Delivery Agent", output: "Use passing verification evidence to prepare delivery reporting." },
  { agent: "PR Delivery Agent", output: "Stay gated until explicit remote push and PR authorization exists." },
  { agent: "Final Review / Report", output: "Summarize test commands, exit codes, changed files, and residual risks." },
];

const completionCriteria = [
  "test command recorded",
  "exit code known",
  "build status known",
  "failure handling clear",
  "ready for delivery report",
  "no remote action triggered",
];

export default function VerificationPage({ artifacts = [], currentArtifact, error, loading, pageConfig = {}, task }) {
  const evidence = buildEvidence(task, artifacts, currentArtifact);
  const summary = buildVerificationSummary(task, evidence);
  const commands = buildCommandPanel(evidence);

  return (
    <section className="artifact-card pm-request-workbench verification-workbench" aria-label={`${pageConfig.title || "Verification"} page`}>
      <div className="pm-request-header">
        <div>
          <p className="eyebrow">Software Delivery Page</p>
          <h3>{pageConfig.title || "Verification"}</h3>
          <p>{pageConfig.primaryQuestion || "Is test evidence strong enough to support delivery?"}</p>
        </div>
        <div className="pm-request-step">
          <span>Current page: Verification</span>
          <strong>Next page: Review</strong>
        </div>
      </div>

      <div className="pm-request-grid">
        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>Verification Summary</h4>
            <span>{summary.verificationStatus}</span>
          </div>
          <dl className="compact-list requirement-summary-list">
            <dt>verification status</dt>
            <dd>{summary.verificationStatus}</dd>
            <dt>runTests</dt>
            <dd>runTests: {String(Boolean(task?.runTests))}</dd>
            <dt>test command source</dt>
            <dd>{summary.commandSource}</dd>
            <dt>exit code / pending</dt>
            <dd>{summary.exitCode}</dd>
            <dt>build status</dt>
            <dd>{summary.buildStatus}</dd>
            <dt>smoke status</dt>
            <dd>{summary.smokeStatus}</dd>
          </dl>
        </article>

        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>Quality Gates</h4>
            <span>delivery blockers</span>
          </div>
          <div className="pm-artifact-roadmap">
            {qualityGates.map((gate) => (
              <span key={gate}>{gate}</span>
            ))}
          </div>
          <dl className="compact-list pm-request-flags">
            <dt>push</dt>
            <dd>push: false</dd>
            <dt>pr</dt>
            <dd>pr: false</dd>
          </dl>
        </article>
      </div>

      <article className="pm-request-panel">
        <div className="artifact-card-title">
          <h4>Test Command Panel</h4>
          <span>{commands.length} commands</span>
        </div>
        {!evidence.hasRealResult && (
          <div className="pm-request-empty">
            <strong>Tests have not been executed yet</strong>
            <p>Test Runner Agent will populate this section after runTests=true.</p>
          </div>
        )}
        <div className="work-package-list module-touch-list">
          {commands.map((item) => (
            <section className="work-package-card" key={item.label}>
              <div className="artifact-card-title">
                <strong>{item.label}</strong>
                <span>{item.status}</span>
              </div>
              <p className="muted">{item.command}</p>
            </section>
          ))}
        </div>
      </article>

      <div className="pm-request-grid">
        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>Result Evidence</h4>
            <span>{evidence.resultStatus}</span>
          </div>
          <dl className="compact-list requirement-summary-list">
            <dt>stdout summary</dt>
            <dd>{evidence.stdout || "planning evidence / pending placeholder"}</dd>
            <dt>stderr summary</dt>
            <dd>{evidence.stderr || "none recorded"}</dd>
            <dt>exitCode</dt>
            <dd>{evidence.exitCode}</dd>
            <dt>duration</dt>
            <dd>{evidence.duration}</dd>
            <dt>passed / failed / skipped</dt>
            <dd>{evidence.resultStatus}</dd>
          </dl>
          <h4>Affected files</h4>
          <FileList files={evidence.affectedFiles} emptyText="Affected files are pending until writer and test evidence are linked." />
        </article>

        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>Failure Handling</h4>
            <span>blocked path</span>
          </div>
          <ul className="risk-register">
            {failureHandling.map((item) => (
              <li key={item.title}>
                <strong>{item.title}</strong>
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
            <span>delivery evidence</span>
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
            <span>ready for review</span>
          </div>
          <div className="pm-artifact-roadmap">
            {completionCriteria.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </article>
      </div>

      <footer className="pm-request-footer">
        <span>Completion condition: verification evidence is recorded and remote actions remain disabled.</span>
        <strong>{pageConfig.primaryAction || "Approve Verification"}</strong>
      </footer>

      {loading && <p className="muted">Loading page data...</p>}
      {error && <p className="mission-alert">{error}</p>}
    </section>
  );
}

function buildEvidence(task, artifacts, currentArtifact) {
  const content = currentArtifact?.content || {};
  const resultArtifact = currentArtifact || findArtifact(artifacts, ["test_result", "verification_result"]);
  const resultContent = resultArtifact?.content || {};
  const exitCode = firstDefined(content.exitCode, resultContent.exitCode, task?.testResult?.exitCode, task?.report?.exitCode);
  const status = content.status || resultArtifact?.status || task?.report?.testStatus || task?.testStatus || (exitCode === 0 ? "passed" : "pending");

  return {
    hasRealResult: Boolean(resultArtifact || task?.testResult || task?.report?.testStatus),
    command: content.command || resultContent.command || task?.testCommand || task?.report?.testCommand || "",
    stdout: content.stdout || resultContent.stdout || task?.testResult?.stdout || task?.report?.stdout || "",
    stderr: content.stderr || resultContent.stderr || task?.testResult?.stderr || task?.report?.stderr || "",
    exitCode: exitCode ?? "pending",
    duration: content.duration || resultContent.duration || task?.testResult?.duration || "pending",
    resultStatus: normalizeStatus(status, exitCode),
    affectedFiles: normalizeFiles(content.affectedFiles || resultContent.affectedFiles || task?.report?.changedFiles || task?.changedFiles),
    buildStatus: content.buildStatus || resultContent.buildStatus || task?.report?.buildStatus || "pending",
    smokeStatus: content.smokeStatus || resultContent.smokeStatus || task?.report?.smokeStatus || "not executed",
  };
}

function buildVerificationSummary(task, evidence) {
  return {
    verificationStatus: evidence.resultStatus,
    commandSource: evidence.command ? "test_result artifact" : "deterministic command plan",
    exitCode: String(evidence.exitCode),
    buildStatus: evidence.buildStatus,
    smokeStatus: evidence.smokeStatus,
  };
}

function buildCommandPanel(evidence) {
  const commands = [...defaultCommands];
  if (evidence.command) {
    commands[0] = { label: "registered skill test command", command: evidence.command, status: evidence.resultStatus };
  }
  if (evidence.resultStatus === "passed") {
    commands[1] = { ...commands[1], status: "passed" };
  }
  if (evidence.buildStatus !== "pending") {
    commands[2] = { ...commands[2], status: evidence.buildStatus };
  }
  if (evidence.smokeStatus !== "not executed") {
    commands[3] = { ...commands[3], status: evidence.smokeStatus };
  }
  return commands;
}

function findArtifact(artifacts = [], types = []) {
  return artifacts.find((artifact) => types.includes(artifact.type)) || null;
}

function normalizeStatus(status, exitCode) {
  if (status === "passed" || exitCode === 0) return "passed";
  if (status === "failed" || (typeof exitCode === "number" && exitCode !== 0)) return "failed";
  if (status === "skipped") return "skipped";
  return "pending";
}

function normalizeFiles(files) {
  if (!files) return [];
  if (Array.isArray(files)) return files.filter(Boolean);
  if (typeof files === "string") return files.split(/\r?\n|,/).map((file) => file.trim()).filter(Boolean);
  return [];
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}
