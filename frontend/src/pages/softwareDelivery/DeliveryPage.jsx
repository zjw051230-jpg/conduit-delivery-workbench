import React from "react";

const artifactPackage = [
  { name: "PM Request", types: ["pm_request"], fallback: "PM request evidence pending." },
  { name: "Requirement Brief", types: ["requirement_brief"], fallback: "Requirement brief evidence pending." },
  { name: "Work Breakdown", types: ["work_breakdown"], fallback: "Work breakdown evidence pending." },
  { name: "Implementation Plan", types: ["implementation_plan"], fallback: "Implementation plan evidence pending." },
  { name: "Code Changes", types: ["code_diff", "changed_files"], fallback: "Code change evidence pending.", acceptsChangedFiles: true },
  { name: "Preview / Effect", types: ["effect_preview"], fallback: "Preview evidence pending." },
  { name: "Verification", types: ["test_result", "verification_result"], fallback: "Verification evidence pending.", acceptsTaskReport: true },
  { name: "Audit Console", types: ["review_report"], fallback: "Audit console evidence pending." },
  { name: "Delivery Report", types: ["delivery_report", "local_commit"], fallback: "Delivery report pending." },
  { name: "PR Preview", types: ["pr_readiness", "pr_preview"], fallback: "PR preview pending." },
];

const remoteSafetyItems = [
  "No automatic push",
  "No automatic gh pr create",
  "PR requires explicit user approval",
  "remote branch must be verified",
  "delivery report must exist",
  "rollback / recovery note required",
];

const handoffChecklist = [
  { label: "local work committed", types: ["local_commit"] },
  { label: "feature branch pushed", types: ["pr_readiness", "pr_preview"], pendingByDefault: true },
  { label: "tests passed", types: ["test_result", "verification_result"], acceptsTaskReport: true },
  { label: "build passed", types: ["delivery_report", "pr_readiness"], pendingByDefault: true },
  { label: "delivery reviewed", types: ["review_report", "delivery_report"] },
  { label: "PR not created automatically", safety: true },
  { label: "user approval pending", safety: true },
];

const accountableAgents = [
  { agent: "Delivery Agent", output: "Final delivery report and local handoff evidence", responsibility: "Verify local delivery evidence before remote readiness.", types: ["delivery_report", "local_commit"] },
  { agent: "PR Delivery Agent", output: "PR readiness preview only", responsibility: "Keep push and gh pr create disabled until explicit approval.", types: ["pr_readiness", "pr_preview"] },
  { agent: "Final Report / Archive", output: "Release notes and artifact package summary", responsibility: "Make the final state reviewable and archival.", types: ["delivery_report", "review_report"] },
  { agent: "Human Reviewer", output: "Explicit approval or request for changes", responsibility: "Decide whether remote publication can proceed.", humanGate: true },
];

const completionCriteria = [
  "final report visible",
  "PR readiness clear",
  "remote safety preserved",
  "user approval required",
  "product flow complete",
];

export default function DeliveryPage({ artifacts = [], currentArtifact, error, loading, pageConfig = {}, task }) {
  if (task?.taskMode === "algorithm_competition") {
    return null;
  }

  const finalReport = buildFinalReport(task, artifacts, currentArtifact);
  const prReadiness = buildPrReadiness(task, artifacts, currentArtifact);
  const packagedArtifacts = buildArtifactPackage(task, artifacts);
  const releaseNotes = buildReleaseNotes(finalReport, prReadiness);
  const handoff = buildHandoffChecklist(task, artifacts);
  const accountability = buildAgentAccountability(artifacts);

  return (
    <section className="artifact-card pm-request-workbench pr-final-report-workbench" aria-label={`${pageConfig.title || "PR / Final Report"} page`}>
      <div className="pm-request-header">
        <div>
          <p className="eyebrow">Software Delivery Final Page</p>
          <h3>{pageConfig.title || "PR / Final Report"}</h3>
          <p>{pageConfig.primaryQuestion || "Is the final report ready, and are remote actions still gated?"}</p>
        </div>
        <div className="pm-request-step">
          <span>Current page: PR / Final Report</span>
          <strong>Remote action: preview only, explicit approval required</strong>
        </div>
      </div>

      <div className="pm-request-grid">
        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>Final Report Summary</h4>
            <span>{finalReport.finalReadiness}</span>
          </div>
          <dl className="compact-list requirement-summary-list">
            <dt>requirement summary</dt>
            <dd>{finalReport.requirementSummary}</dd>
            <dt>implementation summary</dt>
            <dd>{finalReport.implementationSummary}</dd>
            <dt>changed files summary</dt>
            <dd>{finalReport.changedFilesSummary}</dd>
            <dt>test / verification summary</dt>
            <dd>{finalReport.verificationSummary}</dd>
            <dt>audit / delivery status</dt>
            <dd>{finalReport.auditDeliveryStatus}</dd>
            <dt>final readiness</dt>
            <dd>{finalReport.finalReadiness}</dd>
          </dl>
        </article>

        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>PR Readiness Panel</h4>
            <span>{prReadiness.readyState}</span>
          </div>
          <dl className="compact-list requirement-summary-list">
            <dt>branch status</dt>
            <dd>{prReadiness.branchStatus}</dd>
            <dt>remote action status</dt>
            <dd>{prReadiness.remoteActionStatus}</dd>
            <dt>PR authorization status</dt>
            <dd>{prReadiness.authorizationStatus}</dd>
            <dt>required approvals</dt>
            <dd>{prReadiness.requiredApprovals}</dd>
            <dt>blocked reasons</dt>
            <dd>{prReadiness.blockedReasons}</dd>
            <dt>ready / not ready state</dt>
            <dd>{prReadiness.readyState}</dd>
          </dl>
          <p className="muted">This page does not automatically create PR.</p>
        </article>
      </div>

      <article className="pm-request-panel remote-safety-audit">
        <div className="artifact-card-title">
          <h4>Remote Action Safety</h4>
          <span>remote locked</span>
        </div>
        <div className="pm-artifact-roadmap">
          {remoteSafetyItems.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        <dl className="compact-list pm-request-flags">
          <dt>push</dt>
          <dd>push: false</dd>
          <dt>pr</dt>
          <dd>pr: false</dd>
          <dt>gh pr create</dt>
          <dd>disabled until explicit approval</dd>
        </dl>
      </article>

      <article className="pm-request-panel">
        <div className="artifact-card-title">
          <h4>Final Artifact Package</h4>
          <span>{packagedArtifacts.filter((item) => item.status === "captured").length}/{packagedArtifacts.length} captured</span>
        </div>
        <div className="work-package-list module-touch-list">
          {packagedArtifacts.map((item) => (
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

      <div className="pm-request-grid">
        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>Release Notes Draft</h4>
            <span>deterministic</span>
          </div>
          <dl className="compact-list requirement-summary-list">
            <dt>What changed</dt>
            <dd>{releaseNotes.whatChanged}</dd>
            <dt>Why it changed</dt>
            <dd>{releaseNotes.whyChanged}</dd>
            <dt>How it was verified</dt>
            <dd>{releaseNotes.howVerified}</dd>
            <dt>Known limitations</dt>
            <dd>{releaseNotes.knownLimitations}</dd>
            <dt>Next steps</dt>
            <dd>{releaseNotes.nextSteps}</dd>
          </dl>
        </article>

        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>Handoff Checklist</h4>
            <span>{handoff.filter((item) => item.status === "pass").length}/{handoff.length} pass</span>
          </div>
          <ul className="pm-checklist">
            {handoff.map((item) => (
              <li className={item.status === "pass" ? "pm-check-ready" : "pm-check-waiting"} key={item.label}>
                <span>{item.status}</span>
                <strong>{item.label}</strong>
                <p>{item.note}</p>
              </li>
            ))}
          </ul>
        </article>
      </div>

      <div className="pm-request-grid">
        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>Agent Accountability</h4>
            <span>{accountability.filter((item) => item.status === "ready").length}/{accountability.length} ready</span>
          </div>
          <ol className="pm-agent-handoff">
            {accountability.map((item) => (
              <li key={item.agent}>
                <strong>{item.agent}</strong>
                <p>output: {item.output}</p>
                <p>responsibility: {item.responsibility}</p>
                <p>current state: {item.currentState}</p>
              </li>
            ))}
          </ol>
        </article>

        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>Completion Criteria</h4>
            <span>flow complete</span>
          </div>
          <div className="pm-artifact-roadmap">
            {completionCriteria.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </article>
      </div>

      <footer className="pm-request-footer">
        <span>Completion condition: final report is visible, PR readiness is clear, and remote safety remains preserved.</span>
        <strong>{pageConfig.primaryAction || "Review Final Report"}</strong>
      </footer>

      {loading && <p className="muted">Loading page data...</p>}
      {error && <p className="mission-alert">{error}</p>}
    </section>
  );
}

function buildFinalReport(task, artifacts, currentArtifact) {
  const reportArtifact = currentArtifact || findArtifact(artifacts, ["delivery_report", "pr_readiness", "pr_preview", "local_commit"]);
  const content = reportArtifact?.content || {};
  const changedFiles = normalizeFiles(content.changedFiles || reportArtifact?.changedFiles || task?.report?.changedFiles || task?.changedFiles);
  const verification = findArtifact(artifacts, ["test_result", "verification_result"]);
  const audit = findArtifact(artifacts, ["review_report"]);
  const delivery = findArtifact(artifacts, ["delivery_report", "local_commit"]);
  const prPreview = findArtifact(artifacts, ["pr_readiness", "pr_preview"]);

  return {
    requirementSummary: content.requirementSummary || task?.requirement || "Requirement summary pending.",
    implementationSummary: content.implementationSummary || task?.report?.summary || findArtifact(artifacts, ["implementation_plan", "code_diff"])?.summary || "Implementation summary pending.",
    changedFilesSummary: changedFiles.length ? `${changedFiles.length} changed file(s): ${changedFiles.join(", ")}` : "Changed files pending.",
    verificationSummary: content.verificationSummary || verification?.summary || task?.report?.testStatus || "Verification pending.",
    auditDeliveryStatus: content.auditDeliveryStatus || audit?.summary || delivery?.summary || "Audit or delivery report pending.",
    finalReadiness: prPreview?.status === "ready" || prPreview?.status === "passed" ? "ready after explicit approval" : "not ready for automatic remote action",
  };
}

function buildPrReadiness(task, artifacts, currentArtifact) {
  const readiness = currentArtifact || findArtifact(artifacts, ["pr_readiness", "pr_preview"]);
  const content = readiness?.content || {};
  const blocking = normalizeFiles(content.blockedReasons || content.blockingIssues || readiness?.blockingIssues);
  const hasRemoteAction = Boolean(task?.push || task?.pr || content.remoteActions?.push || content.remoteActions?.pr);

  return {
    branchStatus: content.branchStatus || content.branchName || "feature branch must be verified",
    remoteActionStatus: hasRemoteAction ? "remote action requested" : "remote actions disabled",
    authorizationStatus: content.authorizationStatus || "explicit user approval pending",
    requiredApprovals: content.requiredApprovals || "user approval for push and gh pr create",
    blockedReasons: blocking.length ? blocking.join(", ") : "PR not created automatically",
    readyState: readiness?.status === "ready" && !hasRemoteAction ? "ready after explicit approval" : "not ready for automatic remote action",
  };
}

function buildArtifactPackage(task, artifacts) {
  const changedFiles = normalizeFiles(task?.report?.changedFiles || task?.changedFiles);
  return artifactPackage.map((item) => {
    const artifact = findArtifact(artifacts, item.types);
    const taskFallback = (item.acceptsChangedFiles && changedFiles.length) || (item.acceptsTaskReport && task?.report?.testStatus);
    const status = artifact || taskFallback ? "captured" : "pending";
    return {
      ...item,
      status,
      note: artifact?.summary || artifact?.title || (taskFallback ? "Evidence available from task report." : item.fallback),
    };
  });
}

function buildReleaseNotes(finalReport, prReadiness) {
  return {
    whatChanged: finalReport.changedFilesSummary,
    whyChanged: finalReport.requirementSummary,
    howVerified: finalReport.verificationSummary,
    knownLimitations: prReadiness.blockedReasons,
    nextSteps: "Wait for explicit user approval before any remote push or gh pr create.",
  };
}

function buildHandoffChecklist(task, artifacts) {
  return handoffChecklist.map((item) => {
    if (item.safety) {
      return { ...item, status: "pass", note: "Remote publication remains gated and manual." };
    }
    const artifact = findArtifact(artifacts, item.types);
    const taskFallback = item.acceptsTaskReport && task?.report?.testStatus;
    const status = artifact || taskFallback ? "pass" : "pending";
    return {
      ...item,
      status,
      note: status === "pass" ? "Evidence is present for handoff." : item.pendingByDefault ? "Requires remote readiness evidence and user approval." : "Waiting for evidence before handoff.",
    };
  });
}

function buildAgentAccountability(artifacts) {
  return accountableAgents.map((item) => {
    const artifact = findArtifact(artifacts, item.types);
    const status = artifact || item.humanGate ? "ready" : "pending";
    return {
      ...item,
      status,
      currentState: artifact?.summary || artifact?.title || (item.humanGate ? "approval pending" : "evidence pending"),
    };
  });
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
