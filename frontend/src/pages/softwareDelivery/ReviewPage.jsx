import React from "react";

const checklist = [
  { label: "requirement captured", types: ["pm_request"] },
  { label: "brief structured", types: ["requirement_brief"] },
  { label: "work breakdown defined", types: ["work_breakdown"] },
  { label: "implementation plan clear", types: ["implementation_plan"] },
  { label: "code changes recorded", types: ["code_diff", "changed_files"] },
  { label: "preview / effect reviewed", types: ["effect_preview"] },
  { label: "verification evidence recorded", types: ["test_result", "verification_result"] },
  { label: "remote actions disabled", alwaysReady: true },
];

const evidenceBoard = [
  { label: "PM Request", types: ["pm_request"] },
  { label: "Requirement Brief", types: ["requirement_brief"] },
  { label: "Work Breakdown", types: ["work_breakdown"] },
  { label: "Implementation Plan", types: ["implementation_plan"] },
  { label: "Code Changes", types: ["code_diff", "changed_files"] },
  { label: "Preview / Effect", types: ["effect_preview"] },
  { label: "Verification Result", types: ["test_result", "verification_result"] },
  { label: "Delivery Report pending", types: ["delivery_report"] },
];

const decisions = [
  "ready for delivery report",
  "needs clarification",
  "needs test rerun",
  "needs code adjustment",
  "blocked by safety gate",
];

const risks = [
  { title: "ambiguous requirement", mitigation: "Return to Requirement Brief if the user goal or target surface is unclear." },
  { title: "missing changed files", mitigation: "Block delivery until Code Changes records file-level evidence." },
  { title: "failing tests", mitigation: "Route back to Verification and require a passing targeted command." },
  { title: "incomplete preview", mitigation: "Capture expected user-visible effect before delivery report handoff." },
  { title: "unsafe remote action", mitigation: "Keep push and PR disabled until explicit user authorization." },
  { title: "stale artifact", mitigation: "Regenerate or annotate artifacts that no longer match the latest task state." },
];

const safetyGates = [
  "no push by default",
  "no PR by default",
  "local commit only after review",
  "user approval required for remote action",
  "delivery report required before handoff",
];

const handoffAgents = [
  { agent: "Delivery Agent", output: "Prepare delivery report and local commit readiness from reviewed evidence." },
  { agent: "PR Delivery Agent", output: "Remain idle until remote push and PR creation are explicitly authorized." },
  { agent: "Final Report / Archive", output: "Summarize decision, artifacts, risks, and remaining manual checks." },
];

const completionCriteria = [
  "all review checks visible",
  "evidence board populated or pending",
  "decision state clear",
  "ready for delivery page",
  "no remote action triggered",
];

export default function ReviewPage({ artifacts = [], currentArtifact, error, loading, pageConfig = {}, task }) {
  const summary = buildReviewSummary(task, artifacts);
  const checks = buildChecklist(artifacts);
  const evidence = buildEvidenceBoard(artifacts);
  const decisionState = buildDecisionState(summary, currentArtifact);

  return (
    <section className="artifact-card pm-request-workbench review-workbench" aria-label={`${pageConfig.title || "Review"} page`}>
      <div className="pm-request-header">
        <div>
          <p className="eyebrow">Software Delivery Page</p>
          <h3>{pageConfig.title || "Review"}</h3>
          <p>{pageConfig.primaryQuestion || "Are safety gates, scope, and delivery notes acceptable?"}</p>
        </div>
        <div className="pm-request-step">
          <span>Current page: Review</span>
          <strong>Next page: Delivery</strong>
        </div>
      </div>

      <div className="pm-request-grid">
        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>Review Summary</h4>
            <span>{decisionState.primary}</span>
          </div>
          <dl className="compact-list requirement-summary-list">
            <dt>requirement readiness</dt>
            <dd>{summary.requirementReadiness}</dd>
            <dt>implementation readiness</dt>
            <dd>{summary.implementationReadiness}</dd>
            <dt>verification readiness</dt>
            <dd>{summary.verificationReadiness}</dd>
            <dt>delivery readiness</dt>
            <dd>{summary.deliveryReadiness}</dd>
            <dt>remaining blockers</dt>
            <dd>{summary.remainingBlockers}</dd>
          </dl>
        </article>

        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>Decision Panel</h4>
            <span>{decisionState.primary}</span>
          </div>
          <ul className="risk-register">
            {decisions.map((decision) => (
              <li className={decision === decisionState.primary ? "pm-check-ready" : "pm-check-waiting"} key={decision}>
                <strong>{decision}</strong>
                <p>{decision === decisionState.primary ? decisionState.detail : "Available review state if evidence changes."}</p>
              </li>
            ))}
          </ul>
        </article>
      </div>

      <div className="pm-request-grid">
        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>Review Checklist</h4>
            <span>{checks.filter((check) => check.ready).length}/{checks.length} ready</span>
          </div>
          <ul className="pm-checklist">
            {checks.map((check) => (
              <li className={check.ready ? "pm-check-ready" : "pm-check-waiting"} key={check.label}>
                <span>{check.ready ? "ready" : "pending"}</span>
                <strong>{check.label}</strong>
                <p>{check.detail}</p>
              </li>
            ))}
          </ul>
        </article>

        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>Safety Gates</h4>
            <span>remote locked</span>
          </div>
          <div className="pm-artifact-roadmap">
            {safetyGates.map((gate) => (
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
          <h4>Evidence Board</h4>
          <span>{evidence.filter((item) => item.ready).length}/{evidence.length} available</span>
        </div>
        <div className="work-package-list module-touch-list">
          {evidence.map((item) => (
            <section className="work-package-card" key={item.label}>
              <div className="artifact-card-title">
                <strong>{item.label}</strong>
                <span>{item.ready ? "available" : "pending"}</span>
              </div>
              <p className="muted">{item.summary}</p>
            </section>
          ))}
        </div>
      </article>

      <div className="pm-request-grid">
        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>Risk Review</h4>
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
            <span>delivery prep</span>
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
          <span>ready for delivery</span>
        </div>
        <div className="pm-artifact-roadmap">
          {completionCriteria.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </article>

      <footer className="pm-request-footer">
        <span>Completion condition: review decision is clear and no remote action has been triggered.</span>
        <strong>{pageConfig.primaryAction || "Approve Review"}</strong>
      </footer>

      {loading && <p className="muted">Loading page data...</p>}
      {error && <p className="mission-alert">{error}</p>}
    </section>
  );
}

function buildReviewSummary(task, artifacts) {
  const hasRequirement = hasAnyArtifact(artifacts, ["pm_request", "requirement_brief"]) || Boolean(task?.requirement);
  const hasImplementation = hasAnyArtifact(artifacts, ["work_breakdown", "implementation_plan", "code_diff"]);
  const hasVerification = hasAnyArtifact(artifacts, ["test_result", "verification_result"]) || Boolean(task?.report?.testStatus);
  const hasDelivery = hasAnyArtifact(artifacts, ["delivery_report", "pr_readiness", "local_commit"]);
  const blockers = [];
  if (!hasRequirement) blockers.push("requirement evidence");
  if (!hasImplementation) blockers.push("implementation evidence");
  if (!hasVerification) blockers.push("verification evidence");

  return {
    requirementReadiness: hasRequirement ? "ready" : "pending",
    implementationReadiness: hasImplementation ? "ready" : "pending",
    verificationReadiness: hasVerification ? "ready" : "pending",
    deliveryReadiness: hasDelivery ? "delivery report pending" : "pending delivery report",
    remainingBlockers: blockers.length ? blockers.join(", ") : "none before delivery report",
  };
}

function buildChecklist(artifacts) {
  return checklist.map((item) => {
    const ready = item.alwaysReady || hasAnyArtifact(artifacts, item.types);
    return {
      ...item,
      ready,
      detail: ready ? "Evidence is present or safety default is enforced." : "Waiting for artifact evidence or review confirmation.",
    };
  });
}

function buildEvidenceBoard(artifacts) {
  return evidenceBoard.map((item) => {
    const artifact = findArtifact(artifacts, item.types);
    return {
      ...item,
      ready: Boolean(artifact),
      summary: artifact?.summary || artifact?.title || "Pending deterministic review evidence.",
    };
  });
}

function buildDecisionState(summary, currentArtifact) {
  const explicitDecision = currentArtifact?.content?.decision || currentArtifact?.decision;
  if (explicitDecision) return { primary: explicitDecision, detail: "Decision supplied by review artifact." };
  if (summary.remainingBlockers === "none before delivery report") {
    return { primary: "ready for delivery report", detail: "All pre-delivery evidence is visible; delivery report is next." };
  }
  if (summary.verificationReadiness !== "ready") return { primary: "needs test rerun", detail: "Verification evidence is missing or not yet trusted." };
  if (summary.implementationReadiness !== "ready") return { primary: "needs code adjustment", detail: "Implementation evidence is incomplete." };
  if (summary.requirementReadiness !== "ready") return { primary: "needs clarification", detail: "Requirement evidence is incomplete." };
  return { primary: "blocked by safety gate", detail: "Remote action remains gated until explicit approval." };
}

function hasAnyArtifact(artifacts = [], types = []) {
  return artifacts.some((artifact) => types.includes(artifact.type));
}

function findArtifact(artifacts = [], types = []) {
  return artifacts.find((artifact) => types.includes(artifact.type));
}
