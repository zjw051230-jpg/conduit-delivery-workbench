const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs");
const { runAlgorithmStage, runAllAlgorithmStages } = require("./algorithmStageRunner");
const { getAlgorithmStageDefinitions } = require("./algorithmStageRegistry");
const { runPipeline } = require("./runPipeline");

const algorithmStages = [
  "pm_input",
  "task_mode_detection",
  "competition_brief",
  "metric_analysis",
  "data_inspection",
  "baseline_reproduction",
  "weakness_diagnosis",
  "innovation_candidates",
  "critic_review_1",
  "algorithm_design",
  "experiment_plan",
  "implementation",
  "evaluation",
  "ablation",
  "error_analysis",
  "critic_review_2",
  "final_selection",
  "final_report",
  "delivery_guard",
];

const requiredArtifactTypes = [
  "competition_brief",
  "metric_analysis",
  "data_profile",
  "baseline_result",
  "weakness_diagnosis",
  "innovation_candidates",
  "critic_review",
  "algorithm_design",
  "experiment_matrix",
  "evaluation_result",
  "ablation_table",
  "error_analysis",
  "final_decision",
  "final_report",
  "safety_gate",
  "delivery_preview",
];

function createRepoFixture() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "conduit-default-mode-"));
  write(repoRoot, "frontend/src/components/PopularTags/TagButton.jsx", "function TagButton() { return null; }\n");
  write(repoRoot, "frontend/src/styles.css", ".tag-pill { color: #222; }\n");
  return repoRoot;
}

function write(root, relativePath, content) {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

describe("algorithm competition pipeline", () => {
  test("defaults to the existing software delivery flow when taskMode is omitted", () => {
    const task = runPipeline({
      requirement: "Popular Tags 前 5 个标签增加 TOP 标识",
      applyChanges: false,
      runTests: false,
      config: { conduitRepoPath: createRepoFixture() },
    });

    expect(task.taskMode).toBe("software_delivery");
    expect(task.dsl.version).toBe("delivery-dsl/v0.1");
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
    expect(task.report.changedFiles).toEqual([
      "frontend/src/components/PopularTags/TagButton.jsx",
      "frontend/src/styles.css",
    ]);
  });

  test("creates a safe algorithm workflow without reading or writing a repo", () => {
    const missingRepoRoot = path.join(os.tmpdir(), `missing-conduit-${Date.now()}`);

    const task = runPipeline({
      requirement: "算法比赛任务：分析评分规则并设计创新方案",
      taskMode: "algorithm_competition",
      applyChanges: true,
      runTests: true,
      config: { conduitRepoPath: missingRepoRoot },
    });

    expect(task.taskMode).toBe("algorithm_competition");
    expect(task.applyChanges).toBe(true);
    expect(task.runTests).toBe(true);
    expect(task.status).toBe("created");
    expect(task.currentStage).toBe("pm_input");
    expect(task.completedStages).toEqual([]);
    expect(task.pendingStages).toEqual(algorithmStages);
    expect(task.failedStage).toBe(null);
    expect(task.errorMessage).toBe(null);
    expect(task.stages.map((stage) => stage.id)).toEqual(algorithmStages);
    expect(task.stages).toHaveLength(19);
    expect(task.stages.every((stage) => stage.canWriteRepo === false && stage.canRunCommands === false && stage.canCommit === false && stage.canPush === false)).toBe(true);
    expect(task.artifacts.map((artifact) => artifact.type)).toEqual(requiredArtifactTypes);
    expect(task.artifacts.length).toBeGreaterThanOrEqual(16);
    expect(task.artifacts.every((artifact) => artifact.status === "pending" && artifact.createdAt && artifact.updatedAt)).toBe(true);
    expect(task.report.changedFiles).toEqual([]);
    expect(task.report.testStatus).toBe("not_executed");
    expect(fs.existsSync(missingRepoRoot)).toBe(false);
  });

  test("defines every algorithm stage with registry metadata and safe flags", () => {
    const definitions = getAlgorithmStageDefinitions();

    expect(definitions.map((stage) => stage.id)).toEqual(algorithmStages);
    for (const stage of definitions) {
      expect(stage).toMatchObject({
        canWriteRepo: false,
        canRunCommands: false,
        canCommit: false,
        canPush: false,
      });
      expect(stage.title).toBeTruthy();
      expect(stage.agentId).toBeTruthy();
      expect(stage.agentName).toBeTruthy();
      expect(Array.isArray(stage.requiredArtifacts)).toBe(true);
      expect(Array.isArray(stage.outputArtifacts)).toBe(true);
      expect(typeof stage.runner).toBe("function");
    }
  });

  test("runs stages with dependency blocking, completed guard, force replay, and final artifacts", () => {
    const task = runPipeline({
      requirement: "算法比赛任务：分析评分规则并设计创新方案",
      taskMode: "algorithm_competition",
      applyChanges: true,
      runTests: true,
      config: { conduitRepoPath: path.join(os.tmpdir(), `missing-conduit-${Date.now()}`) },
    });

    const blocked = runAlgorithmStage(task, "baseline_reproduction");
    expect(blocked.result).toMatchObject({ status: "blocked", stageId: "baseline_reproduction" });
    expect(blocked.result.missingArtifacts).toContain("data_profile");

    const firstRun = runAlgorithmStage(task, "competition_brief");
    expect(firstRun.result).toMatchObject({ status: "completed", stageId: "competition_brief" });
    expect(firstRun.task.artifacts.find((artifact) => artifact.type === "competition_brief")).toMatchObject({
      status: "ready",
      generatedBy: "Competition Reader",
    });

    const duplicate = runAlgorithmStage(firstRun.task, "competition_brief");
    expect(duplicate.result).toMatchObject({ status: "already_completed", stageId: "competition_brief" });

    const forced = runAlgorithmStage(duplicate.task, "competition_brief", { force: true });
    expect(forced.result.status).toBe("completed");
    expect(forced.task.replayCount).toBe(1);
    expect(forced.task.stages.find((stage) => stage.id === "competition_brief").replayCount).toBe(1);

    const completed = runAllAlgorithmStages(forced.task);
    expect(completed.task.status).toBe("completed");
    expect(completed.task.completedStages).toHaveLength(19);
    expect(completed.task.pendingStages).toEqual([]);
    expect(completed.task.currentStage).toBe(null);
    expect(completed.task.artifacts.find((artifact) => artifact.type === "baseline_result").content.score.accuracy).toBe(0.6);
    expect(completed.task.artifacts.find((artifact) => artifact.type === "evaluation_result").content.improved.score.accuracy).toBe(1);
    expect(completed.task.artifacts.find((artifact) => artifact.type === "final_report").content.scores).toMatchObject({
      baseline: 0.6,
      improved: 1,
      delta: 0.4,
    });
  });
});
