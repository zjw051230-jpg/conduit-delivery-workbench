const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { runPipelineAsync } = require("./runPipeline");

function createArticleRepoFixture() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "conduit-work-breakdown-"));
  write(repoRoot, "frontend/src/routes/Article/Article.jsx", "export default function Article() { return null; }\n");
  write(repoRoot, "frontend/src/helpers/readingStats.js", "export function countWords() { return 0; }\n");
  write(repoRoot, "frontend/src/helpers/readingStats.test.js", "test('count words', () => {});\n");
  return repoRoot;
}

function write(root, relativePath, content) {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

describe("software delivery work breakdown", () => {
  test("returns a work_breakdown artifact without changing the stage timeline", async () => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "super-individual-project-"));
    const task = await runPipelineAsync({
      requirement: "文章详情页新增字数统计，展示本文共多少字和预计阅读时间",
      applyChanges: false,
      runTests: false,
      config: { conduitRepoPath: createArticleRepoFixture(), projectRoot, chatCompletionImpl: echoDslTemplate },
    });

    expect(task.taskMode).toBe("software_delivery");
    expect(task.stages.map((stage) => stage.name)).toEqual([
      "pm-clarifier",
      "requirement-dsl",
      "context-rag",
      "module-locator",
      "solution-planner",
      "code-writer",
      "test-runner",
      "delivery-reporter",
      "change-memory",
    ]);
    expect(task.applyChanges).toBe(false);
    expect(task.runTests).toBe(false);
    expect(task.dsl.requirement_dsl_v3.meta.dsl_version).toBe("3.0.0");
    expect(task.dsl.requirement_dsl_v3.meta.stage).toBe("draft");
    expect(task.executionContract.targetSkillId).toBe("article-word-stats");
    expect(task.executionContract.projectSkillId).toBe("ui-computed-display");
    expect(task.executionContract.riskLevel).toBe("L1");
    expect(task.executionContract.testProfile).toBe("frontend-only");
    expect(task.executionContract.forbiddenChanges).toEqual(expect.arrayContaining(["Backend source files"]));
    expect(task.skillPlan.primaryProjectSkill.id).toBe("ui-computed-display");
    expect(task.skillPlan.primaryProjectSkill.classification).toMatchObject({
      capabilityClass: "task-operation",
      activationMode: "keyword-triggered",
      workflowPhase: "modify",
      controlRole: "executor",
    });
    expect(task.skillPlan.capabilityClasses).toEqual(
      expect.arrayContaining(["repository-context", "surface-map", "test-intelligence", "task-operation", "quality-gate", "change-memory"]),
    );
    expect(task.skillPlan.activationModes).toEqual(
      expect.arrayContaining(["dependency-loaded", "keyword-triggered", "post-task-hook"]),
    );
    expect(task.skillPlan.workflowPhases).toEqual(expect.arrayContaining(["orient", "modify", "verify", "learn"]));
    expect(task.skillPlan.controlRoles).toEqual(expect.arrayContaining(["context", "executor", "verifier", "memory"]));
    expect(task.skillPlan.deliverySkills.find((skill) => skill.id === "test-repair-pr").classification).toMatchObject({
      capabilityClass: "quality-gate",
      activationMode: "post-task-hook",
      workflowPhase: "verify",
    });
    expect(task.skillPlan.deliverySkills.find((skill) => skill.id === "conduit-change-memory").classification).toMatchObject({
      capabilityClass: "change-memory",
      activationMode: "post-task-hook",
      workflowPhase: "learn",
    });
    expect(task.stages.find((stage) => stage.name === "code-writer").status).toBe("preview");
    expect(task.stages.find((stage) => stage.name === "test-runner").status).toBe("skipped");
    expect(task.stages.find((stage) => stage.name === "change-memory").status).toBe("completed");

    const artifact = task.artifacts.find((item) => item.type === "work_breakdown");
    expect(artifact).toMatchObject({
      title: "Work Breakdown Document",
      status: "ready",
      generatedBy: "Work Breakdown Agent",
      stage: "work-breakdown",
    });
    expect(artifact.content.frontendTasks.length).toBeGreaterThan(0);
    expect(artifact.content.backendTasks).toEqual([]);
    expect(artifact.content.dataModelTasks).toEqual([]);
    expect(artifact.content.testTasks).toEqual([
      expect.objectContaining({ command: "npm test -- frontend/src/helpers/readingStats.test.js" }),
    ]);
    expect(artifact.content.skillAssignment.skillId).toBe("article-word-stats");
    expect(artifact.content.skillAssignment.projectSkillId).toBe("ui-computed-display");
    expect(artifact.content.acceptanceCriteria).toContain("文章详情页正文下方显示字数");
    expect(fs.existsSync(path.join(projectRoot, ".ai-runs", "skill-memory", "conduit-change-memory", "change-journal.md"))).toBe(true);
  });

  test("stops before code writer when RequirementDSL v3 generation fails", async () => {
    const task = await runPipelineAsync({
      requirement: "文章详情页新增字数统计",
      applyChanges: false,
      runTests: false,
      config: {
        conduitRepoPath: createArticleRepoFixture(),
        chatCompletionImpl: async () => ({
          configured: true,
          content: "not-json",
          usage: null,
          latencyMs: 1,
        }),
      },
    });

    expect(task.status).toBe("failed");
    expect(task.dsl).toBe(null);
    expect(task.executionContract).toBe(null);
    expect(task.stages.map((stage) => stage.name)).toEqual(["pm-clarifier", "requirement-dsl"]);
  });
});

async function echoDslTemplate({ messages }) {
  const body = JSON.parse(messages[messages.length - 1].content);
  return {
    configured: true,
    content: JSON.stringify(body.emptyTemplate),
    usage: { total_tokens: 1 },
    latencyMs: 1,
  };
}
