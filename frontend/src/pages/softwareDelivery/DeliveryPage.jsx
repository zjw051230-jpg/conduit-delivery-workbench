import React from "react";

const commitGates = [
  { label: "delivery report required", types: ["delivery_report"] },
  { label: "verification must pass", types: ["test_result", "verification_result"], acceptsTaskReport: true },
  { label: "changed files must be known", types: ["code_diff", "changed_files"], acceptsChangedFiles: true },
  { label: "user approval required", alwaysPending: true },
  { label: "no automatic commit", safety: true },
  { label: "no remote push", safety: true },
];

const handoffArtifacts = [
  { name: "Delivery Report", types: ["delivery_report"] },
  { name: "Changed Files", types: ["code_diff", "changed_files"], acceptsChangedFiles: true },
  { name: "Test Result", types: ["test_result", "verification_result"], acceptsTaskReport: true },
  { name: "Audit Console", types: ["review_report"] },
  { name: "Commit Preview", types: ["local_commit", "commit_preview"] },
  { name: "PR Preview pending", types: ["pr_preview"], pendingByDefault: true },
];

const safetyItems = [
  "No push",
  "No PR",
  "No gh pr create",
  "Local commit only",
  "User approval required",
  "Remote actions disabled",
];

const accountableAgents = [
  { agent: "Delivery Agent", expectedOutput: "Delivery report and local commit readiness", types: ["delivery_report", "local_commit"] },
  { agent: "Test Runner Agent", expectedOutput: "Passing verification evidence", types: ["test_result", "verification_result"] },
  { agent: "Code Writer Agent", expectedOutput: "Changed files and diff summary", types: ["code_diff", "changed_files"] },
  { agent: "PR Delivery Agent", expectedOutput: "PR preview remains pending until explicit approval", types: ["pr_preview"], safetyOnly: true },
];

const completionCriteria = [
  "delivery report visible",
  "local commit gate clear",
  "safety console visible",
  "user can decide next step",
  "no remote action triggered",
];

export default function DeliveryPage({ artifacts = [], currentArtifact, error, loading, pageConfig = {}, task }) {
  if (task?.taskMode === "algorithm_competition") {
    return null;
  }

  const report = buildDeliveryReport(task, artifacts, currentArtifact);
  const summary = buildDeliverySummary(task, artifacts, report);
  const gates = buildCommitGates(task, artifacts);
  const handoff = buildArtifactHandoff(task, artifacts);
  const agents = buildAgentAccountability(artifacts);

  return (
    <section className="artifact-card pm-request-workbench delivery-workbench" aria-label={`${pageConfig.title || "Delivery"} page`}>
      <div className="pm-request-header">
        <div>
          <p className="eyebrow">Software Delivery Page</p>
          <h3>{pageConfig.title || "Delivery"}</h3>
          <p>{pageConfig.primaryQuestion || "Is local delivery ready without triggering remote actions?"}</p>
        </div>
        <div className="pm-request-step">
          <span>Current page: Delivery</span>
          <strong>Next step: user decides local commit or PR preview later</strong>
        </div>
      </div>

      <div className="pm-request-grid">
        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>Delivery Summary</h4>
            <span>{summary.deliveryReadiness}</span>
          </div>
          <dl className="compact-list requirement-summary-list">
            <dt>delivery readiness</dt>
            <dd>{summary.deliveryReadiness}</dd>
            <dt>changed files status</dt>
            <dd>{summary.changedFilesStatus}</dd>
            <dt>verification status</dt>
            <dd>{summary.verificationStatus}</dd>
            <dt>audit status</dt>
            <dd>{summary.auditStatus}</dd>
            <dt>delivery report status</dt>
            <dd>{summary.reportStatus}</dd>
            <dt>local commit readiness</dt>
            <dd>{summary.localCommitReadiness}</dd>
          </dl>
        </article>

        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>Local Commit Gate</h4>
            <span>{gates.filter((gate) => gate.status === "pass").length}/{gates.length} pass</span>
          </div>
          <ul className="pm-checklist">
            {gates.map((gate) => (
              <li className={gate.status === "pass" ? "pm-check-ready" : "pm-check-waiting"} key={gate.label}>
                <span>{gate.status}</span>
                <strong>{gate.label}</strong>
                <p>{gate.note}</p>
              </li>
            ))}
          </ul>
        </article>
      </div>

      <article className="pm-request-panel">
        <div className="artifact-card-title">
          <h4>Delivery Report Preview</h4>
          <span>{report.status}</span>
        </div>
        {!report.hasRealReport && (
          <div className="pm-request-empty">
            <strong>Deterministic pending preview</strong>
            <p>Delivery Agent will populate the final report after the audit gate is accepted and user approval exists.</p>
          </div>
        )}
        <dl className="compact-list requirement-summary-list">
          <dt>requirement summary</dt>
          <dd>{report.requirementSummary}</dd>
          <dt>implementation summary</dt>
          <dd>{report.implementationSummary}</dd>
          <dt>changed files</dt>
          <dd>{report.changedFiles.length ? `${report.changedFiles.length} file(s)` : "pending"}</dd>
          <dt>tests run</dt>
          <dd>{report.testsRun}</dd>
          <dt>verification result</dt>
          <dd>{report.verificationResult}</dd>
          <dt>known risks</dt>
          <dd>{report.knownRisks}</dd>
          <dt>next action</dt>
          <dd>{report.nextAction}</dd>
        </dl>
        <div className="pm-artifact-roadmap">
          {report.changedFiles.length ? report.changedFiles.map((file) => <span key={file}>{file}</span>) : <span>No changed files recorded yet</span>}
        </div>
      </article>

      <div className="pm-request-grid">
        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>Artifact Handoff</h4>
            <span>{handoff.filter((item) => item.status === "captured").length}/{handoff.length} captured</span>
          </div>
          <div className="work-package-list module-touch-list">
            {handoff.map((item) => (
              <section className="work-package-card" key={item.name}>
                <div className="artifact-card-title">
                  <strong>{item.name}</strong>
                  <span>{item.status}</span>
                </div>
                <p className="muted">{item.note}</p>
              </section>
            ))}
          </div>
        </article>

        <article className="pm-request-panel remote-safety-audit">
          <div className="artifact-card-title">
            <h4>Safety Console</h4>
            <span>remote disabled</span>
          </div>
          <div className="pm-artifact-roadmap">
            {safetyItems.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
          <dl className="compact-list pm-request-flags">
            <dt>push</dt>
            <dd>push: false</dd>
            <dt>pr</dt>
            <dd>pr: false</dd>
            <dt>gh pr create</dt>
            <dd>disabled</dd>
          </dl>
        </article>
      </div>

      <div className="pm-request-grid">
        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>Agent Accountability</h4>
            <span>{agents.filter((agent) => agent.status === "ready").length}/{agents.length} ready</span>
          </div>
          <ol className="pm-agent-handoff">
            {agents.map((agent) => (
              <li key={agent.agent}>
                <strong>{agent.agent}</strong>
                <p>{agent.expectedOutput}</p>
                <p>evidence: {agent.evidence} / status: {agent.status}</p>
              </li>
            ))}
          </ol>
        </article>

        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>Completion Criteria</h4>
            <span>local handoff</span>
          </div>
          <div className="pm-artifact-roadmap">
            {completionCriteria.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </article>
      </div>

      <footer className="pm-request-footer">
        <span>Completion condition: delivery report is visible, local commit gate is clear, and no remote action has been triggered.</span>
        <strong>{pageConfig.primaryAction || "Prepare Delivery"}</strong>
      </footer>

      {loading && <p className="muted">Loading page data...</p>}
      {error && <p className="mission-alert">{error}</p>}
    </section>
  );
}

function buildDeliverySummary(task, artifacts, report) {
  const hasChangedFiles = report.changedFiles.length > 0;
  const verificationStatus = getVerificationStatus(task, artifacts);
  const auditReady = hasAnyArtifact(artifacts, ["review_report"]);
  const hasDeliveryReport = report.hasRealReport;
  const localCommitReady = hasDeliveryReport && hasChangedFiles && verificationStatus === "passed" ? "ready after user approval" : "pending user approval";

  return {
    deliveryReadiness: hasDeliveryReport ? "delivery report ready" : "pending delivery report",
    changedFilesStatus: hasChangedFiles ? `${report.changedFiles.length} file(s) known` : "pending changed files",
    verificationStatus,
    auditStatus: auditReady ? "audit reviewed" : "audit pending",
    reportStatus: hasDeliveryReport ? "captured" : "deterministic preview",
    localCommitReadiness: localCommitReady,
  };
}

function buildDeliveryReport(task, artifacts, currentArtifact) {
  const deliveryArtifact = currentArtifact || findArtifact(artifacts, ["delivery_report", "pr_readiness", "local_commit"]);
  const content = deliveryArtifact?.content || {};
  const changedFiles = normalizeFiles(content.changedFiles || deliveryArtifact?.changedFiles || task?.report?.changedFiles || task?.changedFiles);
  const testArtifact = findArtifact(artifacts, ["test_result", "verification_result"]);

  return {
    hasRealReport: Boolean(deliveryArtifact),
    status: deliveryArtifact?.status || "pending",
    requirementSummary: content.requirementSummary || task?.requirement || "Waiting for PM request and delivery report.",
    implementationSummary: content.implementationSummary || task?.report?.summary || findArtifact(artifacts, ["implementation_plan", "code_diff"])?.summary || "Implementation summary pending.",
    changedFiles,
    testsRun: content.testsRun || task?.report?.testCommand || testArtifact?.summary || "pending test command evidence",
    verificationResult: content.verificationResult || testArtifact?.status || task?.report?.testStatus || "pending",
    knownRisks: content.knownRisks || findArtifact(artifacts, ["review_report"])?.summary || "No final delivery report risks recorded yet.",
    nextAction: content.nextAction || normalizeFiles(task?.report?.nextActions)[0] || "Wait for user approval before any local commit action.",
  };
}

function buildCommitGates(task, artifacts) {
  return commitGates.map((gate) => {
    if (gate.safety) {
      return { ...gate, status: "pass", note: "This page only previews readiness and does not execute commit or remote actions." };
    }
    if (gate.alwaysPending) {
      return { ...gate, status: "pending", note: "Explicit user approval is required before a local commit can be created." };
    }
    const hasEvidence = hasAnyArtifact(artifacts, gate.types) || (gate.acceptsTaskReport && task?.report?.testStatus) || (gate.acceptsChangedFiles && normalizeFiles(task?.report?.changedFiles || task?.changedFiles).length > 0);
    return {
      ...gate,
      status: hasEvidence ? "pass" : "pending",
      note: hasEvidence ? "Evidence is present for this local delivery gate." : "Waiting for matching evidence before local commit readiness.",
    };
  });
}

function buildArtifactHandoff(task, artifacts) {
  return handoffArtifacts.map((item) => {
    const artifact = findArtifact(artifacts, item.types);
    const changedFiles = normalizeFiles(task?.report?.changedFiles || task?.changedFiles);
    const status = artifact || (item.acceptsChangedFiles && changedFiles.length) || (item.acceptsTaskReport && task?.report?.testStatus) ? "captured" : item.pendingByDefault ? "pending" : "missing";
    return {
      ...item,
      status,
      note: artifact?.summary || artifact?.title || (status === "captured" ? "Evidence is available from task report." : item.pendingByDefault ? "Remote PR preview remains pending and disabled." : "Artifact not captured yet."),
    };
  });
}

function buildAgentAccountability(artifacts) {
  return accountableAgents.map((agent) => {
    const artifact = findArtifact(artifacts, agent.types);
    const status = artifact || agent.safetyOnly ? "ready" : "pending";
    return {
      ...agent,
      status,
      evidence: artifact?.title || artifact?.summary || (agent.safetyOnly ? "remote action disabled" : "pending"),
    };
  });
}

function getVerificationStatus(task, artifacts) {
  const artifact = findArtifact(artifacts, ["test_result", "verification_result"]);
  return artifact?.status || task?.report?.testStatus || "pending";
}

function hasAnyArtifact(artifacts = [], types = []) {
  return artifacts.some((artifact) => types.includes(artifact.type));
}

function findArtifact(artifacts = [], types = []) {
  return artifacts.find((artifact) => types.includes(artifact.type)) || null;
}

function normalizeFiles(files) {
  if (!files) return [];
  if (Array.isArray(files)) return files.filter(Boolean);
  if (typeof files === "string") return files.split(/\r?\n|,/).map((file) => file.trim()).filter(Boolean);
  return [];
}
