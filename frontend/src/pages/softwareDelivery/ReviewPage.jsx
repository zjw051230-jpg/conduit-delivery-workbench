import React from "react";

const evidenceLedger = [
  { name: "PM Request", types: ["pm_request"], source: "PM Request page", owner: "PM Clarifier" },
  { name: "Requirement Brief", types: ["requirement_brief"], source: "Requirement Brief page", owner: "Requirement DSL Agent" },
  { name: "Work Breakdown", types: ["work_breakdown"], source: "Work Breakdown page", owner: "Solution Planner" },
  { name: "Implementation Plan", types: ["implementation_plan"], source: "Implementation Plan page", owner: "Solution Planner" },
  { name: "Code Changes", types: ["code_diff", "changed_files"], source: "Code Changes page", owner: "Code Writer Agent" },
  { name: "Preview / Effect", types: ["effect_preview"], source: "Preview / Effect page", owner: "QA / Verification stage" },
  { name: "Verification", types: ["test_result", "verification_result"], source: "Verification page", owner: "Test Runner Agent" },
  { name: "Delivery Report pending", types: ["delivery_report"], source: "Delivery page", owner: "Delivery Agent", pendingByDefault: true },
];

const risks = [
  { title: "ambiguous requirement", severity: "medium", likelihood: "medium", mitigation: "Return to Requirement Brief and capture missing user goal or target surface.", types: ["pm_request", "requirement_brief"] },
  { title: "missing changed files", severity: "high", likelihood: "medium", mitigation: "Block delivery until Code Changes records file-level evidence.", types: ["code_diff", "changed_files"] },
  { title: "incomplete preview evidence", severity: "medium", likelihood: "medium", mitigation: "Require Preview / Effect notes for visible behavior and edge states.", types: ["effect_preview"] },
  { title: "failing or missing tests", severity: "high", likelihood: "medium", mitigation: "Route back to Verification and rerun the smallest relevant command.", types: ["test_result", "verification_result"] },
  { title: "stale artifact", severity: "medium", likelihood: "low", mitigation: "Regenerate or annotate artifacts that no longer match the latest task state.", types: ["implementation_plan", "code_diff"] },
  { title: "unsafe remote action", severity: "critical", likelihood: "low", mitigation: "Keep push, gh pr create, and PR delivery locked until explicit user approval.", alwaysControlled: true },
  { title: "delivery report missing", severity: "medium", likelihood: "high", mitigation: "Enter Delivery page only after audit state is clear and evidence is reviewed.", types: ["delivery_report"], pendingRisk: true },
];

const gateChecklist = [
  { label: "requirement captured", types: ["pm_request"] },
  { label: "brief structured", types: ["requirement_brief"] },
  { label: "work breakdown defined", types: ["work_breakdown"] },
  { label: "implementation plan clear", types: ["implementation_plan"] },
  { label: "code changes recorded", types: ["code_diff", "changed_files"] },
  { label: "preview reviewed", types: ["effect_preview"] },
  { label: "verification evidence recorded", types: ["test_result", "verification_result"] },
  { label: "push disabled", safetyGate: "push" },
  { label: "PR disabled", safetyGate: "pr" },
  { label: "user approval required for remote action", safetyGate: "approval" },
];

const decisions = [
  "ready for delivery page",
  "needs clarification",
  "needs code adjustment",
  "needs test rerun",
  "blocked by safety gate",
];

const remoteSafety = [
  "No push by default",
  "No PR by default",
  "No gh pr create",
  "Local commit only",
  "User approval required before remote action",
  "Delivery report required before handoff",
];

const agentAccountability = [
  { agent: "PM Clarifier", expectedOutput: "Captured PM request", responsibility: "Confirm the user goal is preserved.", types: ["pm_request"] },
  { agent: "Requirement DSL Agent", expectedOutput: "Structured requirement brief", responsibility: "Expose acceptance criteria and unresolved questions.", types: ["requirement_brief"] },
  { agent: "Context / RAG Agent", expectedOutput: "Context evidence", responsibility: "Tie implementation choices to retrieved context.", types: ["context_evidence"] },
  { agent: "Module Locator", expectedOutput: "Target module map", responsibility: "Prevent wrong-file edits and duplicate insertion.", types: ["module_locator", "implementation_plan"] },
  { agent: "Solution Planner", expectedOutput: "Work plan and implementation sequence", responsibility: "Keep scope minimal and executable.", types: ["work_breakdown", "implementation_plan"] },
  { agent: "Code Writer Agent", expectedOutput: "Changed files and diff summary", responsibility: "Record writer result and idempotency expectations.", types: ["code_diff", "changed_files"] },
  { agent: "Test Runner Agent", expectedOutput: "Test command evidence", responsibility: "Record exit code, build status, and failure notes.", types: ["test_result", "verification_result"] },
  { agent: "Delivery Agent", expectedOutput: "Delivery report", responsibility: "Prepare local handoff without remote action.", types: ["delivery_report"] },
  { agent: "PR Delivery Agent", expectedOutput: "Remote PR proposal only after approval", responsibility: "Stay idle while push and PR are disabled.", safetyGate: true },
];

const completionCriteria = [
  "evidence ledger reviewed",
  "risks acknowledged",
  "gate checklist visible",
  "decision state clear",
  "remote safety preserved",
  "ready to enter Delivery page",
  "no remote action triggered",
];

export default function ReviewPage({ artifacts = [], currentArtifact, error, loading, pageConfig = {}, task }) {
  const ledger = buildEvidenceLedger(task, artifacts);
  const gates = buildGateChecklist(task, artifacts);
  const riskRegister = buildRiskRegister(artifacts);
  const auditSummary = buildAuditSummary(task, ledger, gates);
  const decision = buildDecision(auditSummary, currentArtifact);
  const accountability = buildAgentAccountability(artifacts);

  return (
    <section className="artifact-card pm-request-workbench audit-console-workbench" aria-label={`${pageConfig.title || "Audit Console"} page`}>
      <div className="pm-request-header">
        <div>
          <p className="eyebrow">Software Delivery Audit</p>
          <h3>{pageConfig.title || "Audit Console"}</h3>
          <p>Are evidence, risks, gates, and delivery readiness acceptable before handoff?</p>
        </div>
        <div className="pm-request-step">
          <span>Current page: Audit Console</span>
          <strong>Next page: Delivery</strong>
        </div>
      </div>

      <div className="pm-request-grid">
        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>Audit Summary</h4>
            <span>{auditSummary.auditStatus}</span>
          </div>
          <dl className="compact-list requirement-summary-list">
            <dt>audit status</dt>
            <dd>{auditSummary.auditStatus}</dd>
            <dt>requirement readiness</dt>
            <dd>{auditSummary.requirementReadiness}</dd>
            <dt>implementation readiness</dt>
            <dd>{auditSummary.implementationReadiness}</dd>
            <dt>verification readiness</dt>
            <dd>{auditSummary.verificationReadiness}</dd>
            <dt>delivery readiness</dt>
            <dd>{auditSummary.deliveryReadiness}</dd>
            <dt>blocker count</dt>
            <dd>{auditSummary.blockerCount}</dd>
            <dt>safety posture</dt>
            <dd>{auditSummary.safetyPosture}</dd>
          </dl>
        </article>

        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>Decision Panel</h4>
            <span>{decision.primary}</span>
          </div>
          <ul className="risk-register">
            {decisions.map((item) => (
              <li className={item === decision.primary ? "pm-check-ready" : "pm-check-waiting"} key={item}>
                <strong>{item}</strong>
                <p>{item === decision.primary ? decision.detail : "Available audit conclusion if evidence or gates change."}</p>
              </li>
            ))}
          </ul>
        </article>
      </div>

      <article className="pm-request-panel">
        <div className="artifact-card-title">
          <h4>Evidence Ledger</h4>
          <span>{ledger.filter((item) => item.status === "captured").length}/{ledger.length} captured</span>
        </div>
        <div className="work-package-list module-touch-list">
          {ledger.map((item) => (
            <section className="work-package-card" key={item.name}>
              <div className="artifact-card-title">
                <strong>{item.name}</strong>
                <span>{item.status}</span>
              </div>
              <dl className="compact-list work-package-meta">
                <dt>source</dt>
                <dd>{item.source}</dd>
                <dt>owner agent</dt>
                <dd>{item.owner}</dd>
                <dt>audit note</dt>
                <dd>{item.auditNote}</dd>
              </dl>
            </section>
          ))}
        </div>
      </article>

      <div className="pm-request-grid">
        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>Risk Register</h4>
            <span>{riskRegister.length} tracked</span>
          </div>
          <ul className="risk-register">
            {riskRegister.map((risk) => (
              <li key={risk.title}>
                <strong>{risk.title}</strong>
                <dl className="compact-list work-package-meta">
                  <dt>severity</dt>
                  <dd>{risk.severity}</dd>
                  <dt>likelihood</dt>
                  <dd>{risk.likelihood}</dd>
                  <dt>current state</dt>
                  <dd>{risk.currentState}</dd>
                  <dt>mitigation</dt>
                  <dd>{risk.mitigation}</dd>
                </dl>
              </li>
            ))}
          </ul>
        </article>

        <article className="pm-request-panel">
          <div className="artifact-card-title">
            <h4>Gate Checklist</h4>
            <span>{gates.filter((gate) => gate.status === "pass").length}/{gates.length} pass</span>
          </div>
          <ul className="pm-checklist">
            {gates.map((gate) => (
              <li className={gate.status === "pass" ? "pm-check-ready" : gate.status === "blocked" ? "pm-check-blocked" : "pm-check-waiting"} key={gate.label}>
                <span>{gate.status}</span>
                <strong>{gate.label}</strong>
                <p>{gate.auditNote}</p>
              </li>
            ))}
          </ul>
        </article>
      </div>

      <article className="pm-request-panel remote-safety-audit">
        <div className="artifact-card-title">
          <h4>Remote Safety Audit</h4>
          <span>remote actions locked</span>
        </div>
        <div className="pm-artifact-roadmap">
          {remoteSafety.map((item) => (
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

      <article className="pm-request-panel">
        <div className="artifact-card-title">
          <h4>Agent Accountability</h4>
          <span>{accountability.filter((item) => item.status === "captured").length}/{accountability.length} evidence linked</span>
        </div>
        <div className="work-package-list module-touch-list">
          {accountability.map((item) => (
            <section className="work-package-card" key={item.agent}>
              <div className="artifact-card-title">
                <strong>{item.agent}</strong>
                <span>{item.status}</span>
              </div>
              <dl className="compact-list work-package-meta">
                <dt>expected output</dt>
                <dd>{item.expectedOutput}</dd>
                <dt>audit responsibility</dt>
                <dd>{item.responsibility}</dd>
                <dt>current evidence status</dt>
                <dd>{item.currentEvidenceStatus}</dd>
              </dl>
            </section>
          ))}
        </div>
      </article>

      <article className="pm-request-panel">
        <div className="artifact-card-title">
          <h4>Completion Criteria</h4>
          <span>delivery gate</span>
        </div>
        <div className="pm-artifact-roadmap">
          {completionCriteria.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </article>

      <footer className="pm-request-footer">
        <span>Completion condition: audit evidence is reviewed, remote safety is preserved, and no remote action has been triggered.</span>
        <strong>{pageConfig.primaryAction || "Approve Audit"}</strong>
      </footer>

      {loading && <p className="muted">Loading page data...</p>}
      {error && <p className="mission-alert">{error}</p>}
    </section>
  );
}

function buildEvidenceLedger(task, artifacts) {
  return evidenceLedger.map((item) => {
    const artifact = findArtifact(artifacts, item.types);
    const hasTaskFallback = item.name === "PM Request" && Boolean(task?.requirement);
    const status = artifact || hasTaskFallback ? "captured" : item.pendingByDefault ? "pending" : "missing";
    return {
      ...item,
      status,
      auditNote: artifact?.summary || artifact?.title || (hasTaskFallback ? "Requirement text is present on the task." : item.pendingByDefault ? "Expected on Delivery page after audit approval." : "Evidence not present in current artifact set."),
    };
  });
}

function buildRiskRegister(artifacts) {
  return risks.map((risk) => {
    const controlled = risk.alwaysControlled || hasAnyArtifact(artifacts, risk.types);
    return {
      ...risk,
      currentState: risk.pendingRisk ? "pending delivery report" : controlled ? "controlled" : "needs review",
    };
  });
}

function buildGateChecklist(task, artifacts) {
  return gateChecklist.map((gate) => {
    if (gate.safetyGate) {
      const status = gate.safetyGate === "approval" || !task?.[gate.safetyGate] ? "pass" : "blocked";
      return {
        ...gate,
        status,
        auditNote: status === "pass" ? "Remote action remains disabled or approval-gated." : "Remote action is enabled and must be blocked before delivery.",
      };
    }
    const status = hasAnyArtifact(artifacts, gate.types) || (gate.label === "requirement captured" && task?.requirement) ? "pass" : "pending";
    return {
      ...gate,
      status,
      auditNote: status === "pass" ? "Evidence is captured for this gate." : "Gate remains pending until evidence is captured.",
    };
  });
}

function buildAuditSummary(task, ledger, gates) {
  const requirementReady = isCaptured(ledger, ["PM Request", "Requirement Brief"]);
  const implementationReady = isCaptured(ledger, ["Work Breakdown", "Implementation Plan", "Code Changes"]);
  const verificationReady = isCaptured(ledger, ["Preview / Effect", "Verification"]);
  const deliveryReady = ledger.find((item) => item.name === "Delivery Report pending")?.status === "captured" ? "ready" : "pending delivery report";
  const blockerCount = gates.filter((gate) => gate.status === "blocked").length;
  const pendingCount = gates.filter((gate) => gate.status === "pending").length;

  return {
    auditStatus: blockerCount > 0 ? "blocked by safety gate" : pendingCount > 0 ? "review required" : "ready for delivery page",
    requirementReadiness: requirementReady ? "ready" : "pending",
    implementationReadiness: implementationReady ? "ready" : "pending",
    verificationReadiness: verificationReady ? "ready" : "pending",
    deliveryReadiness: deliveryReady,
    blockerCount,
    safetyPosture: task?.push || task?.pr ? "remote action enabled" : "remote locked / local only",
  };
}

function buildDecision(summary, currentArtifact) {
  const explicitDecision = currentArtifact?.content?.decision || currentArtifact?.decision;
  if (explicitDecision) return { primary: explicitDecision, detail: "Decision supplied by audit artifact." };
  if (summary.blockerCount > 0 || summary.safetyPosture === "remote action enabled") {
    return { primary: "blocked by safety gate", detail: "Remote or safety state must be corrected before delivery." };
  }
  if (summary.verificationReadiness !== "ready") return { primary: "needs test rerun", detail: "Verification evidence is missing or not yet trusted." };
  if (summary.implementationReadiness !== "ready") return { primary: "needs code adjustment", detail: "Implementation or changed-file evidence is incomplete." };
  if (summary.requirementReadiness !== "ready") return { primary: "needs clarification", detail: "Requirement evidence is incomplete." };
  return { primary: "ready for delivery page", detail: "Audit evidence is visible; delivery report is the next local handoff." };
}

function buildAgentAccountability(artifacts) {
  return agentAccountability.map((item) => {
    const hasEvidence = item.safetyGate || hasAnyArtifact(artifacts, item.types);
    return {
      ...item,
      status: hasEvidence ? "captured" : "pending",
      currentEvidenceStatus: hasEvidence ? "Evidence linked or safety gate enforced." : "Awaiting matching artifact evidence.",
    };
  });
}

function isCaptured(ledger, names) {
  return names.every((name) => ledger.find((item) => item.name === name)?.status === "captured");
}

function hasAnyArtifact(artifacts = [], types = []) {
  return artifacts.some((artifact) => types.includes(artifact.type));
}

function findArtifact(artifacts = [], types = []) {
  return artifacts.find((artifact) => types.includes(artifact.type)) || null;
}
