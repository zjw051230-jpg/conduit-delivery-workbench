import React, { useMemo, useState } from "react";

const stepScreens = {
  task_inbox: {
    title: "Task Inbox",
    intent: "Select the PM request that should enter the delivery line.",
    currentAgent: "PM Clarifier",
    nextAgent: "Requirement DSL Agent",
    handoff: "Waiting for a concrete PM request before the delivery chain starts.",
    mainTitle: "Request Queue",
    panels: [
      ["Incoming requests", "Article detail page needs reading metadata."],
      ["Selection state", "No remote action. Pick one request and keep delivery in preview mode."],
    ],
  },
  pm_request: {
    title: "PM Request",
    intent: "Task intake and intent capture",
    currentAgent: "PM Clarifier",
    nextAgent: "Requirement DSL Agent",
    handoff: "Convert the PM sentence into a scoped, testable product change.",
    mainTitle: "Requirement Input",
    panels: [
      ["Intent Understanding", "Capture target surface, user-visible behavior, and acceptance hints."],
      ["Input Quality", "Goal, module, visible behavior, data impact, and test expectation are checked before planning."],
    ],
  },
  requirement_brief: {
    title: "Requirement Brief",
    intent: "Structured Requirement Brief",
    currentAgent: "Requirement DSL Agent",
    nextAgent: "Context / RAG Agent",
    handoff: "Freeze the product intent into a small requirement DSL and open questions.",
    mainTitle: "Brief Summary",
    panels: [
      ["Structured Requirement Brief", "User goal, target page, constraints, and acceptance criteria are ready to inspect."],
      ["Clarification Lane", "Open questions stay visible without blocking the whole workbench."],
    ],
  },
  work_breakdown: {
    title: "Work Breakdown",
    intent: "Task Breakdown Board",
    currentAgent: "Module Locator",
    nextAgent: "Solution Planner",
    handoff: "Split the request into frontend, backend, data, test, and risk work lanes.",
    mainTitle: "Task Breakdown Board",
    panels: [
      ["Work Packages", "Frontend surface update, data/API impact check, test task, and delivery guard."],
      ["Dependency Map", "Requirement evidence feeds implementation planning before any write is allowed."],
      ["Risk Register", "Ambiguous scope and unsafe remote action remain gated."],
    ],
  },
  implementation_plan: {
    title: "Implementation Plan",
    intent: "Implementation Board",
    currentAgent: "Solution Planner",
    nextAgent: "Code Writer Agent",
    handoff: "Turn located modules into a small sequence of safe implementation steps.",
    mainTitle: "Plan Overview",
    panels: [
      ["Implementation Board", "Module touch plan, step sequence, test plan, and safety gates share one screen."],
      ["Execution Sequence", "Locate target files, add UI behavior, wire tests, run build, then review evidence."],
    ],
  },
  code_changes: {
    title: "Code Changes",
    intent: "File Change Preview",
    currentAgent: "Code Writer Agent",
    nextAgent: "Test Runner Agent",
    handoff: "Show planned file edits and pseudo diff without enabling remote actions.",
    mainTitle: "File Change Preview",
    panels: [
      ["Changed Files", "frontend/src/routes/Article/Article.jsx"],
      ["Pseudo Diff", "+ reading stats helper\n+ article metadata row\n+ test-visible label"],
      ["Writer Execution State", "preview only; repository write remains gated by user approval."],
    ],
  },
  preview_effect: {
    title: "Preview / Effect",
    intent: "Before / after product preview",
    currentAgent: "Preview Agent",
    nextAgent: "Test Runner Agent",
    handoff: "Translate code changes into user-visible product effect before verification.",
    mainTitle: "Effect Summary",
    panels: [
      ["Before / After Preview", "Before: article body only. After: article body plus word count and reading time."],
      ["Acceptance Signal", "The expected visible behavior is clear enough for QA review."],
      ["Risk / UX Impact", "Layout shift, edge states, and missing copy are tracked before tests."],
    ],
  },
  verification: {
    title: "Verification",
    intent: "Test result and quality gates",
    currentAgent: "Test Runner Agent",
    nextAgent: "Delivery Agent",
    handoff: "Collect command status, evidence, and failure handling before delivery.",
    mainTitle: "Verification Summary",
    panels: [
      ["Quality Gate Matrix", "Tests, build, changed files, safety gate, and remote lock must be clear."],
      ["Test Result Panel", "Tests have not been executed yet unless runTests=true produces evidence."],
      ["Failure Handling", "Capture command, stdout, stderr, failed stage, minimal fix, and targeted rerun."],
    ],
  },
  review: {
    title: "Audit Console",
    intent: "Evidence ledger and risk audit",
    currentAgent: "Delivery Agent",
    nextAgent: "PR Delivery Agent",
    handoff: "Review evidence, risks, gates, and readiness before entering final report.",
    mainTitle: "Audit Summary",
    panels: [
      ["Evidence Ledger", "PM Request, Requirement Brief, Work Breakdown, Plan, Code, Preview, and Verification."],
      ["Risk Register", "Ambiguous requirement, missing files, stale artifact, failing tests, unsafe remote action."],
      ["Remote Safety Audit", "No push by default. No PR by default. No gh pr create."],
    ],
  },
  delivery: {
    title: "PR / Final Report",
    intent: "Final report and PR readiness",
    currentAgent: "PR Delivery Agent",
    nextAgent: "Human Reviewer",
    handoff: "Package the delivery report and make remote readiness explicit without creating a PR.",
    mainTitle: "Final Report Summary",
    panels: [
      ["Final Report Workspace", "Requirement, implementation, changed files, tests, audit status, and delivery readiness."],
      ["PR Readiness Panel", "Remote action status, authorization status, required approvals, and blocked reasons."],
      ["Release Notes Draft", "What changed, why it changed, how it was verified, limitations, and next steps."],
    ],
  },
};

const artifactNames = [
  ["pm_request", "PM Request", "Captured request text, PM intent, and safety mode."],
  ["requirement_brief", "Requirement Brief", "Structured brief, acceptance criteria, and open questions."],
  ["work_breakdown", "Work Breakdown", "Work packages, dependency map, risks, and assigned agents."],
  ["implementation_plan", "Implementation Plan", "Module touch plan, sequence, tests, and gates."],
  ["code_diff", "Code Changes", "Changed files, pseudo diff, and writer execution state."],
  ["effect_preview", "Preview / Effect", "Before/after product effect and acceptance signal."],
  ["test_result", "Verification", "Test command evidence, stdout, stderr, and quality gates."],
  ["review_report", "Audit Console", "Evidence ledger, risk register, and remote safety audit."],
  ["pr_readiness", "PR / Final Report", "Final report package, PR readiness, and release notes."],
];

const stageChecklists = {
  requirement_brief: ["Scope statement reviewed", "Acceptance criteria visible", "Clarification lane triaged"],
  work_breakdown: ["Frontend package assigned", "Test package assigned", "Delivery guard assigned"],
  implementation_plan: ["Module touch plan clear", "Implementation sequence ordered", "Test plan ready"],
  verification: ["npm test -- frontend/src/App.test.jsx", "npm run build", "Quality gates pending review"],
  review: ["Audit checklist", "Evidence ledger reviewed", "Remote safety audit visible"],
  delivery: ["PR readiness checklist", "Final report visible", "User approval pending"],
};

function getScreen(pageConfig) {
  return stepScreens[pageConfig?.id] || stepScreens.pm_request;
}

function findArtifactStatus(artifacts, type) {
  const artifact = artifacts.find((item) => item.type === type);
  if (!artifact) return "pending";
  return artifact.status || "captured";
}

function getTaskTitle(task) {
  return task?.requirement || (task?.id ? `Task ${task.id}` : "Article detail reading metadata delivery");
}

function getArtifactDetail(artifacts, selectedArtifact) {
  const artifact = artifacts.find((item) => item.type === selectedArtifact.type);
  return {
    ...selectedArtifact,
    status: artifact?.status || "pending",
    title: artifact?.title || selectedArtifact.label,
    detail: artifact?.summary || artifact?.content || selectedArtifact.detail,
  };
}

function StageControls({ onAction, pageId, requirementDraft, setRequirementDraft }) {
  const [previewMode, setPreviewMode] = useState("Before");

  if (pageId === "pm_request") {
    return (
      <div className="workbench-stage-controls">
        <label className="workbench-input-label" htmlFor="workbench-requirement-input">
          Workbench requirement input
        </label>
        <textarea
          id="workbench-requirement-input"
          aria-label="Workbench requirement input"
          value={requirementDraft}
          onChange={(event) => setRequirementDraft(event.target.value)}
        />
        <div className="workbench-button-row">
          <button
            type="button"
            onClick={() => setRequirementDraft("Article detail page should show word count and reading time.")}
          >
            Use article reading time example
          </button>
          <button type="button" onClick={() => setRequirementDraft("Article tags should render as compact badges.")}>
            Use tag badge example
          </button>
          <button type="button" onClick={() => onAction("Submit requirement")}>
            Submit requirement
          </button>
        </div>
      </div>
    );
  }

  if (pageId === "requirement_brief") {
    return (
      <div className="workbench-stage-controls">
        <h4>Clarification checklist</h4>
        {stageChecklists.requirement_brief.map((item) => (
          <label className="workbench-check" key={item}>
            <input type="checkbox" defaultChecked={item !== "Clarification lane triaged"} />
            <span>{item}</span>
          </label>
        ))}
        <button type="button" onClick={() => onAction("Brief approved")}>
          Approve brief
        </button>
      </div>
    );
  }

  if (pageId === "work_breakdown") {
    return (
      <div className="workbench-stage-controls">
        <h4>Work package checklist</h4>
        {stageChecklists.work_breakdown.map((item) => (
          <label className="workbench-check" key={item}>
            <input type="checkbox" defaultChecked />
            <span>{item}</span>
          </label>
        ))}
        <button type="button" onClick={() => onAction("Risks acknowledged")}>
          Acknowledge risks
        </button>
      </div>
    );
  }

  if (pageId === "implementation_plan") {
    return (
      <div className="workbench-stage-controls">
        <h4>Implementation step checklist</h4>
        {stageChecklists.implementation_plan.map((item) => (
          <label className="workbench-check" key={item}>
            <input type="checkbox" defaultChecked />
            <span>{item}</span>
          </label>
        ))}
        <button type="button" onClick={() => onAction("Plan approved")}>
          Approve plan
        </button>
      </div>
    );
  }

  if (pageId === "code_changes") {
    return (
      <div className="workbench-stage-controls">
        <h4>File action panel</h4>
        {["frontend/src/routes/Article/Article.jsx", "frontend/src/App.test.jsx"].map((file) => (
          <button className="workbench-file-button" type="button" key={file} onClick={() => onAction(`Opened ${file}`)}>
            {file}
          </button>
        ))}
        <button type="button" onClick={() => onAction("Diff preview opened")}>
          Open diff preview
        </button>
      </div>
    );
  }

  if (pageId === "preview_effect") {
    return (
      <div className="workbench-stage-controls">
        <h4>Preview surface</h4>
        <div className="workbench-toggle-row" role="group" aria-label="Before after toggle">
          {["Before", "After"].map((mode) => (
            <button
              className={previewMode === mode ? "active" : ""}
              type="button"
              key={mode}
              onClick={() => setPreviewMode(mode)}
            >
              {mode}
            </button>
          ))}
        </div>
        <p>{previewMode}: article detail metadata is shown in product preview mode.</p>
      </div>
    );
  }

  if (pageId === "verification") {
    return (
      <div className="workbench-stage-controls">
        <h4>Test command list</h4>
        {stageChecklists.verification.map((item) => (
          <label className="workbench-check" key={item}>
            <input type="checkbox" defaultChecked={item.includes("npm")} />
            <span>{item}</span>
          </label>
        ))}
        <div className="workbench-button-row">
          <button type="button" onClick={() => onAction("stdout opened")}>
            View stdout
          </button>
          <button type="button" onClick={() => onAction("stderr opened")}>
            View stderr
          </button>
        </div>
      </div>
    );
  }

  if (pageId === "review") {
    return (
      <div className="workbench-stage-controls">
        <h4>Audit checklist</h4>
        {stageChecklists.review.map((item) => (
          <label className="workbench-check" key={item}>
            <input type="checkbox" defaultChecked={item !== "Evidence ledger reviewed"} />
            <span>{item}</span>
          </label>
        ))}
        <button type="button" onClick={() => onAction("Risk acknowledged")}>
          Acknowledge risk
        </button>
      </div>
    );
  }

  if (pageId === "delivery") {
    return (
      <div className="workbench-stage-controls">
        <h4>PR readiness checklist</h4>
        {stageChecklists.delivery.map((item) => (
          <label className="workbench-check" key={item}>
            <input type="checkbox" defaultChecked={item !== "User approval pending"} />
            <span>{item}</span>
          </label>
        ))}
        <button type="button" onClick={() => onAction("Report copied")}>
          Copy report
        </button>
      </div>
    );
  }

  return (
    <div className="workbench-stage-controls">
      <h4>Task selection controls</h4>
      <button type="button" onClick={() => onAction("Task selected")}>
        Select request
      </button>
      <button type="button" onClick={() => onAction("Queue refreshed")}>
        Refresh queue
      </button>
    </div>
  );
}

export function SoftwareDeliveryWorkbenchPreview({
  artifacts = [],
  currentArtifact,
  error,
  loading = false,
  pageConfig,
  task,
}) {
  const screen = getScreen(pageConfig);
  const taskTitle = getTaskTitle(task);
  const artifactStatus = currentArtifact?.status || (currentArtifact ? "captured" : "pending");
  const initialArtifact = artifactNames.find(([type]) => type === pageConfig?.artifactType) || artifactNames[0];
  const [selectedAction, setSelectedAction] = useState("Workbench ready");
  const [selectedAgent, setSelectedAgent] = useState(screen.currentAgent);
  const [agentOutputVisible, setAgentOutputVisible] = useState(false);
  const [agentReady, setAgentReady] = useState(false);
  const [requirementDraft, setRequirementDraft] = useState(taskTitle);
  const [selectedArtifactType, setSelectedArtifactType] = useState(initialArtifact[0]);
  const agentOptions = [screen.currentAgent, screen.nextAgent, "Human Reviewer"].filter(
    (agent, index, array) => array.indexOf(agent) === index,
  );
  const selectedArtifact = useMemo(() => {
    const [type, label, detail] = artifactNames.find(([artifactType]) => artifactType === selectedArtifactType) || artifactNames[0];
    return getArtifactDetail(artifacts, { type, label, detail });
  }, [artifacts, selectedArtifactType]);

  const setAction = (message) => setSelectedAction(`Selected action: ${message}`);
  const commandActions = [
    ["Continue to next step", () => setAction("Continue to next step")],
    ["Open artifact drawer", () => setSelectedAction("Artifact drawer opened")],
    ["Copy summary", () => setSelectedAction("Summary copied")],
    ["Review safety gates", () => setSelectedAction("Safety gates reviewed")],
  ];

  return (
    <section className="mission-card workbench-preview" aria-label="Agent Workspace Preview">
      <div className="workbench-topbar">
        <div>
          <p className="eyebrow">Agent Workspace Preview</p>
          <h2>{screen.title}</h2>
          <p>{taskTitle}</p>
        </div>
        <div className="workbench-status-strip" aria-label="remote safety status">
          <span>Software Delivery</span>
          <span>Stage: {screen.title}</span>
          <strong>No automatic push</strong>
          <strong>No automatic gh pr create</strong>
          <strong>explicit user approval required</strong>
        </div>
      </div>

      <div className="workbench-commandbar" aria-label="Command Bar">
        <strong>Command Bar</strong>
        <div className="workbench-button-row">
          {commandActions.map(([label, onClick]) => (
            <button type="button" key={label} onClick={onClick}>
              {label}
            </button>
          ))}
        </div>
        <span className="workbench-feedback">{selectedAction}</span>
      </div>

      <div className="workbench-canvas">
        <aside className="workbench-agent-pane">
          <span className="workbench-pane-label">Agent lane</span>
          <h3>{screen.currentAgent}</h3>
          <p>{screen.handoff}</p>
          <div className="workbench-agent-control">
            <h4>Agent Control Panel</h4>
            <label htmlFor="workbench-agent-select">Select agent</label>
            <select id="workbench-agent-select" value={selectedAgent} onChange={(event) => setSelectedAgent(event.target.value)}>
              {agentOptions.map((agent, index) => (
                <option key={`${agent}-${index}`} value={agent}>
                  {agent}
                </option>
              ))}
            </select>
            <div className="workbench-button-row">
              <button type="button" onClick={() => setAgentOutputVisible(true)}>
                View agent output
              </button>
              <button type="button" onClick={() => setAgentReady(true)}>
                Mark ready for next step
              </button>
            </div>
            {agentOutputVisible ? <p>Agent output: {selectedAgent} has a preview-only workspace update.</p> : null}
            {agentReady ? <p>Agent marked ready for next step</p> : null}
          </div>
          <dl className="compact-list">
            <dt>Next</dt>
            <dd>{screen.nextAgent}</dd>
            <dt>Status</dt>
            <dd>{loading ? "syncing" : error ? "attention" : "ready for review"}</dd>
            <dt>Handoff</dt>
            <dd>{screen.intent}</dd>
          </dl>
        </aside>

        <section className="workbench-main-pane">
          <div className="workbench-main-header">
            <span>{screen.intent}</span>
            <strong>{artifactStatus}</strong>
          </div>
          <h3>{screen.mainTitle}</h3>
          <div className="workbench-panel-grid">
            {screen.panels.map(([title, detail]) => (
              <article className="workbench-panel" key={title}>
                <h4>{title}</h4>
                <p>{detail}</p>
              </article>
            ))}
          </div>
          <StageControls
            onAction={setAction}
            pageId={pageConfig?.id}
            requirementDraft={requirementDraft}
            setRequirementDraft={setRequirementDraft}
          />
        </section>

        <aside className="workbench-evidence-pane" aria-label="Evidence Drawer">
          <span className="workbench-pane-label">Evidence / Artifact</span>
          <h3>Artifact Status</h3>
          <div className="workbench-artifact-list">
            {artifactNames.map(([type, label]) => (
              <button
                aria-label={label}
                className={type === selectedArtifact.type ? "workbench-artifact-row active" : "workbench-artifact-row"}
                key={type}
                type="button"
                onClick={() => setSelectedArtifactType(type)}
              >
                <span>{label}</span>
                <strong>{findArtifactStatus(artifacts, type)}</strong>
              </button>
            ))}
          </div>
          <div className="workbench-artifact-detail">
            <h4>Selected artifact: {selectedArtifact.label}</h4>
            <p>Artifact id: {selectedArtifact.type}</p>
            <p>{selectedArtifact.detail}</p>
            <div className="workbench-button-row">
              <button type="button" onClick={() => setAction(`Artifact id copied: ${selectedArtifact.type}`)}>
                Copy artifact id
              </button>
              <button type="button" onClick={() => setAction(`Related page opened: ${selectedArtifact.label}`)}>
                Open related page
              </button>
            </div>
          </div>
        </aside>
      </div>

      <div className="workbench-actionbar" aria-label="Bottom Action Bar">
        <strong>Bottom Action Bar</strong>
        <div className="workbench-button-row">
          {["Back", "Continue", "Save draft", "Preview only"].map((label) => (
            <button type="button" key={label} onClick={() => setAction(label)}>
              {label}
            </button>
          ))}
        </div>
        <span>Dangerous remote actions disabled</span>
        <span>No PR</span>
        <span>Remote actions disabled until explicit approval</span>
      </div>
    </section>
  );
}

export default SoftwareDeliveryWorkbenchPreview;
