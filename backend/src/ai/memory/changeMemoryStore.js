const fs = require("node:fs");
const path = require("node:path");

function writeChangeMemory({
  runDirectory,
  taskId,
  createdAt,
  requirement,
  dsl,
  writeResult,
  testResult,
  report,
  skillPlan,
}) {
  if (!runDirectory) {
    return {
      agent: "Conduit Change Memory",
      status: "skipped",
      message: "No runDirectory was provided for runtime memory.",
    };
  }

  const memoryRoot = path.join(runDirectory, "skill-memory", "conduit-change-memory");
  const rolloutDirectory = path.join(memoryRoot, "rollout-summaries");
  fs.mkdirSync(rolloutDirectory, { recursive: true });

  const changeRecord = createChangeRecord({
    taskId,
    createdAt,
    requirement,
    dsl,
    writeResult,
    testResult,
    skillPlan,
  });
  const rolloutSummaryPath = path.join("rollout-summaries", `${changeRecord.changeId}.md`);
  const memoryUpdates = {
    journalEntry: createJournalEntry(changeRecord, report, rolloutSummaryPath),
    projectFactsToAdd: [],
    projectFactsToInvalidate: [],
    rolloutSummaryPath: toPosix(path.join("skill-memory", "conduit-change-memory", rolloutSummaryPath)),
  };
  const skillImpactAnalysis = createSkillImpactAnalysis({ dsl, skillPlan, writeResult, testResult });
  const writePlan = createWritePlan(changeRecord.changeId);

  appendSection(path.join(memoryRoot, "change-journal.md"), "# Change Journal\n", memoryUpdates.journalEntry);
  appendSkillImpact(path.join(memoryRoot, "skill-impact-index.md"), skillImpactAnalysis, changeRecord.changeId);
  ensureFile(path.join(memoryRoot, "project-facts.md"), "# Project Facts\n\nRuntime facts are appended only when a delivery run provides durable verified facts.\n");
  fs.writeFileSync(
    path.join(memoryRoot, rolloutSummaryPath),
    createRolloutSummary({ changeRecord, report, skillImpactAnalysis, memoryUpdates }),
  );

  return {
    agent: "Conduit Change Memory",
    status: "completed",
    changeRecord,
    memoryUpdates,
    skillImpactAnalysis,
    writePlan,
  };
}

function createChangeRecord({ taskId, createdAt, requirement, dsl, writeResult, testResult, skillPlan }) {
  const changeId = sanitizeChangeId(`${datePart(createdAt)}-${taskId || "task"}`);
  const testsRun = (testResult?.results || []).map((result) => ({
    command: result.command,
    exitCode: result.exitCode,
    status: result.exitCode === 0 ? "passed" : "failed",
  }));
  const matchedSkills = [
    dsl?.targetSkillId,
    dsl?.projectSkillId,
    ...(dsl?.requiredUnderstandingSkillIds || []),
    ...(dsl?.deliverySkillIds || []),
    skillPlan?.primaryProjectSkill?.id,
  ].filter(Boolean);

  return {
    changeId,
    taskSummary: requirement,
    matchedSkills: [...new Set(matchedSkills)],
    changedFiles: writeResult?.changedFiles || [],
    testsRun,
    outcome: determineOutcome({ dsl, writeResult, testResult }),
  };
}

function determineOutcome({ dsl, writeResult, testResult }) {
  if (dsl?.status === "needs_clarification") return "blocked";
  if (testResult?.status === "failed") return "failed";
  if (testResult?.status === "passed" && ["changed", "unchanged"].includes(writeResult?.status)) return "success";
  return "partial";
}

function createJournalEntry(changeRecord, report, rolloutSummaryPath) {
  return `### ${changeRecord.changeId}

- Date: ${changeRecord.changeId.slice(0, 10)}
- Outcome: ${changeRecord.outcome}
- Task: ${changeRecord.taskSummary}
- Matched Skills: ${changeRecord.matchedSkills.join(", ") || "none"}
- Changed Files: ${changeRecord.changedFiles.join(", ") || "none"}
- Tests: ${changeRecord.testsRun.map((test) => `${test.command} (${test.status})`).join(", ") || "not run"}
- PR Draft: ${report?.summary || "not generated"}
- Memory Notes: Runtime delivery event recorded; promote stable facts only after verification.
- Rollout Summary: references/${rolloutSummaryPath}
`;
}

function createSkillImpactAnalysis({ dsl, skillPlan, writeResult, testResult }) {
  const suggestions = [];
  if (writeResult?.status === "planner_only" && dsl?.projectSkillId) {
    suggestions.push({
      skillId: dsl.projectSkillId,
      impactType: "reference-note",
      reason: "The project Skill matched but no legacy writer is available yet.",
      suggestedUpdate: "Add a writer mapping or document that this Skill is currently planner-only.",
      priority: "medium",
    });
  }

  if (testResult?.status === "failed") {
    suggestions.push({
      skillId: "test-repair-pr",
      impactType: "test-rule",
      reason: "A delivery run produced failing test output that may need repair classification.",
      suggestedUpdate: "Review stdout, stderr, and exitCode to decide whether repair guidance should be promoted.",
      priority: "medium",
    });
  }

  if (skillPlan?.projectMatchedSkill?.id && skillPlan?.mappedProjectSkill?.id && skillPlan.projectMatchedSkill.id !== skillPlan.mappedProjectSkill.id) {
    suggestions.push({
      skillId: skillPlan.projectMatchedSkill.id,
      impactType: "search-hint",
      reason: "Direct project Skill matching differed from the legacy writer bridge.",
      suggestedUpdate: "Review triggers and bridge mapping for this requirement pattern.",
      priority: "low",
    });
  }

  return suggestions;
}

function createWritePlan(changeId) {
  return {
    allowedFiles: [
      ".ai-runs/skill-memory/conduit-change-memory/change-journal.md",
      ".ai-runs/skill-memory/conduit-change-memory/project-facts.md",
      ".ai-runs/skill-memory/conduit-change-memory/skill-impact-index.md",
      `.ai-runs/skill-memory/conduit-change-memory/rollout-summaries/${changeId}.md`,
    ],
    forbiddenFiles: [
      "Conduit business source code",
      "backend/src/ai/skills/project",
      ".env",
      "lockfiles",
      "node_modules",
      "dist",
      "build",
      "coverage",
      ".git",
    ],
  };
}

function appendSkillImpact(filePath, skillImpactAnalysis, changeId) {
  ensureFile(filePath, "# Skill Impact Index\n");
  if (skillImpactAnalysis.length === 0) return;

  const content = skillImpactAnalysis
    .map((impact, index) => `### ${changeId}-impact-${index + 1}

- Status: proposed
- Priority: ${impact.priority}
- Source Change: ${changeId}
- Skill: ${impact.skillId}
- Impact Type: ${impact.impactType}
- Reason: ${impact.reason}
- Suggested Update: ${impact.suggestedUpdate}
- Applied In: none
`)
    .join("\n");
  fs.appendFileSync(filePath, `\n${content}`);
}

function createRolloutSummary({ changeRecord, report, skillImpactAnalysis, memoryUpdates }) {
  return `# ${changeRecord.changeId}

## Change Record

\`\`\`json
${JSON.stringify(changeRecord, null, 2)}
\`\`\`

## Delivery Report

\`\`\`json
${JSON.stringify(report || {}, null, 2)}
\`\`\`

## Memory Updates

\`\`\`json
${JSON.stringify(memoryUpdates, null, 2)}
\`\`\`

## Skill Impact Analysis

\`\`\`json
${JSON.stringify(skillImpactAnalysis, null, 2)}
\`\`\`
`;
}

function appendSection(filePath, initialContent, section) {
  ensureFile(filePath, initialContent);
  fs.appendFileSync(filePath, `\n${section}`);
}

function ensureFile(filePath, initialContent) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, initialContent);
  }
}

function datePart(value) {
  return String(value || new Date().toISOString()).slice(0, 10);
}

function sanitizeChangeId(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

module.exports = {
  writeChangeMemory,
  createChangeRecord,
  determineOutcome,
};
