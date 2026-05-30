const express = require("express");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { createAiRouter } = require("./aiRoutes");
const { TaskStore } = require("../runtime/taskStore");

const servers = [];

async function createApiHarness() {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ai-route-workflow-"));
  const conduitRepoPath = path.join(os.tmpdir(), `missing-conduit-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const taskStore = new TaskStore(projectRoot);
  const app = express();
  app.use(express.json());
  app.use("/api/ai", createAiRouter({
    config: {
      conduitRepoPath,
      ark: { baseUrl: "", model: "", apiKey: "" },
      projectRoot,
    },
    taskStore,
  }));

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  servers.push(server);
  const { port } = server.address();

  async function request(method, route, body) {
    const response = await fetch(`http://127.0.0.1:${port}${route}`, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json();
    return { status: response.status, data };
  }

  return { request, taskStore, conduitRepoPath };
}

function writeFixture(root, relativePath, content) {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise((resolve) => server.close(resolve))));
});

describe("project Skill taxonomy API", () => {
  test("exposes Agent Skills compatible taxonomy metadata in config and skills list", async () => {
    const { request } = await createApiHarness();

    const config = await request("GET", "/api/ai/config");
    const skills = await request("GET", "/api/ai/skills");

    expect(config.status).toBe(200);
    expect(config.data).toMatchObject({
      projectSkillCount: 9,
      skillTaxonomyVersion: "v2-agent-matrix",
      agentSkillsCompatibleCount: 9,
    });
    expect(skills.status).toBe(200);
    expect(skills.data.projectSkills.find((skill) => skill.id === "ui-computed-display").classification).toMatchObject({
      standard: "agent-skills-compatible",
      capabilityClass: "task-operation",
      activationMode: "keyword-triggered",
      workflowPhase: "modify",
      controlRole: "executor",
    });
  });

  test("returns taxonomy-aware skillPlan from context search", async () => {
    const { request, conduitRepoPath } = await createApiHarness();
    writeFixture(
      conduitRepoPath,
      "frontend/src/routes/Article/Article.jsx",
      "export default function Article() { return <article>{article.body}</article>; }\n",
    );

    const response = await request("POST", "/api/ai/context/search", {
      query: "article reading time",
      limit: 3,
    });

    expect(response.status).toBe(200);
    expect(response.data.projectMatchedSkill).toMatchObject({
      id: "ui-computed-display",
      classification: {
        capabilityClass: "task-operation",
        activationMode: "keyword-triggered",
        workflowPhase: "modify",
        controlRole: "executor",
      },
    });
    expect(response.data.skillPlan).toMatchObject({
      skillTaxonomyVersion: "v2-agent-matrix",
    });
    expect(response.data.skillPlan.capabilityClasses).toEqual(expect.arrayContaining(["task-operation", "quality-gate", "change-memory"]));
    expect(response.data.skillPlan.workflowPhases).toEqual(expect.arrayContaining(["orient", "modify", "verify", "learn"]));
  });
});

describe("algorithm competition workflow API", () => {
  test("creates and reads a workflow task with stages and artifacts", async () => {
    const { request } = await createApiHarness();

    const created = await request("POST", "/api/ai/tasks", {
      requirement: "算法比赛任务：分析评分规则并设计创新方案",
      taskMode: "algorithm_competition",
      applyChanges: true,
      runTests: true,
    });

    expect(created.status).toBe(201);
    expect(created.data.task).toMatchObject({
      taskMode: "algorithm_competition",
      status: "created",
      currentStage: "pm_input",
      completedStages: [],
      failedStage: null,
    });
    expect(created.data.task.stages).toHaveLength(19);
    expect(created.data.task.artifacts).toHaveLength(16);
    expect(created.data.task.pendingStages).toContain("pm_input");
    expect(created.data.task.nextActions[0]).toContain("pm_input");

    const fetched = await request("GET", `/api/ai/tasks/${created.data.task.id}`);

    expect(fetched.status).toBe(200);
    expect(fetched.data.task.currentStage).toBe("pm_input");
    expect(fetched.data.task.stages).toHaveLength(19);
    expect(fetched.data.task.artifacts).toHaveLength(16);
  });

  test("lists stages and filters artifacts by type", async () => {
    const { request } = await createApiHarness();
    const created = await request("POST", "/api/ai/tasks", {
      requirement: "算法比赛任务：分析评分规则并设计创新方案",
      taskMode: "algorithm_competition",
    });

    const stages = await request("GET", `/api/ai/tasks/${created.data.task.id}/stages`);
    const artifacts = await request("GET", `/api/ai/tasks/${created.data.task.id}/artifacts`);
    const baselineArtifacts = await request("GET", `/api/ai/tasks/${created.data.task.id}/artifacts?type=baseline_result`);

    expect(stages.status).toBe(200);
    expect(stages.data.stages).toHaveLength(19);
    expect(stages.data.stages[0]).toMatchObject({
      id: "pm_input",
      title: "PM Input",
      agent: "Chief Commander",
      status: "pending",
      canWriteRepo: false,
      canRunCommands: false,
      canCommit: false,
      canPush: false,
    });
    expect(stages.data.stages.every((stage) => Array.isArray(stage.inputArtifacts) && Array.isArray(stage.outputArtifacts))).toBe(true);
    expect(artifacts.data.artifacts).toHaveLength(16);
    expect(baselineArtifacts.data.artifacts).toHaveLength(1);
    expect(baselineArtifacts.data.artifacts[0]).toMatchObject({ type: "baseline_result", status: "pending" });
  });

  test("runs next, blocks unmet dependencies, prevents duplicate runs, and supports force replay", async () => {
    const { request } = await createApiHarness();
    const created = await request("POST", "/api/ai/tasks", {
      requirement: "算法比赛任务：分析评分规则并设计创新方案",
      taskMode: "algorithm_competition",
    });
    const taskId = created.data.task.id;

    const firstRun = await request("POST", `/api/ai/tasks/${taskId}/run-next`);
    expect(firstRun.status).toBe(200);
    expect(firstRun.data.result.status).toBe("completed");
    expect(firstRun.data.result.stageId).toBe("pm_input");
    expect(firstRun.data.task.completedStages).toEqual(["pm_input"]);
    expect(firstRun.data.task.currentStage).toBe("task_mode_detection");

    const blocked = await request("POST", `/api/ai/tasks/${taskId}/stages/baseline_reproduction/run`);
    expect(blocked.status).toBe(409);
    expect(blocked.data.result).toMatchObject({ status: "blocked", stageId: "baseline_reproduction" });
    expect(blocked.data.result.missingArtifacts).toContain("data_profile");

    await request("POST", `/api/ai/tasks/${taskId}/stages/competition_brief/run`);
    const duplicate = await request("POST", `/api/ai/tasks/${taskId}/stages/competition_brief/run`);
    expect(duplicate.status).toBe(200);
    expect(duplicate.data.result).toMatchObject({ status: "already_completed", stageId: "competition_brief" });

    const forced = await request("POST", `/api/ai/tasks/${taskId}/stages/competition_brief/run`, { force: true });
    expect(forced.status).toBe(200);
    expect(forced.data.result.status).toBe("completed");
    expect(forced.data.task.replayCount).toBe(1);
    expect(forced.data.task.stages.find((stage) => stage.id === "competition_brief").replayCount).toBe(1);
  });

  test("runs a specific stage artifact and then runs all remaining workflow stages", async () => {
    const { request, conduitRepoPath } = await createApiHarness();
    const created = await request("POST", "/api/ai/tasks", {
      requirement: "算法比赛任务：分析评分规则并设计创新方案",
      taskMode: "algorithm_competition",
      applyChanges: true,
      runTests: true,
    });
    const taskId = created.data.task.id;

    const stageRun = await request("POST", `/api/ai/tasks/${taskId}/stages/competition_brief/run`);
    expect(stageRun.status).toBe(200);
    expect(stageRun.data.result.generatedArtifacts).toEqual(["competition_brief"]);
    expect(stageRun.data.task.artifacts.find((artifact) => artifact.type === "competition_brief")).toMatchObject({
      status: "ready",
      generatedBy: "Competition Reader",
    });

    const allRun = await request("POST", `/api/ai/tasks/${taskId}/run-all`);
    expect(allRun.status).toBe(200);
    expect(allRun.data.task.status).toBe("completed");
    expect(allRun.data.task.completedStages).toHaveLength(19);
    expect(allRun.data.task.pendingStages).toEqual([]);
    expect(allRun.data.task.currentStage).toBe(null);
    expect(allRun.data.task.artifacts.find((artifact) => artifact.type === "final_report").content.scores).toMatchObject({
      baseline: 0.6,
      improved: 1,
      delta: 0.4,
    });
    expect(fs.existsSync(conduitRepoPath)).toBe(false);
  });

  test("replays an algorithm workflow without changing task mode", async () => {
    const { request, conduitRepoPath } = await createApiHarness();
    const created = await request("POST", "/api/ai/tasks", {
      requirement: "算法比赛任务：分析评分规则并设计创新方案",
      taskMode: "algorithm_competition",
    });

    const replayed = await request("POST", `/api/ai/tasks/${created.data.task.id}/replay`, {
      fromStage: "evaluation",
      runAll: true,
    });

    expect(replayed.status).toBe(201);
    expect(replayed.data.task.taskMode).toBe("algorithm_competition");
    expect(replayed.data.task.replayedFrom).toBe(created.data.task.id);
    expect(replayed.data.task.replayOptions.fromStage).toBe("evaluation");
    expect(replayed.data.task.stages).toHaveLength(19);
    expect(fs.existsSync(conduitRepoPath)).toBe(false);
  });
});
