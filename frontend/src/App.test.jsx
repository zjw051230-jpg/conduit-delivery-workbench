// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { App } from "./App";

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const configResponse = {
  repoPath: "F:/sandbox/conduit-realworld-example-app",
  skillCount: 3,
  ark: {
    modelConfigured: false,
    apiKeyConfigured: false,
  },
};

const deliveryPreview = {
  status: "delivery_ready",
  hasChanges: true,
  changedFiles: ["frontend/src/components/PopularTags/TagButton.jsx"],
  diffSummary: "frontend/src/components/PopularTags/TagButton.jsx | 2 ++",
  branchName: "ai-delivery/popular-tags-badge-task-1",
  commitMessage: "feat: deliver popular-tags-badge task task-1\n\nSkill: popular-tags-badge\nTask: task-1",
  testStatus: "passed",
  safety: {
    allowed: true,
    message: "All changed files are inside allowed delivery paths.",
    disallowedFiles: [],
  },
  remoteActions: { push: false, pr: false },
};

const remotePreview = {
  status: "remote_preview",
  requiresExplicitApproval: true,
  readiness: {
    remote: "origin",
    remotes: [{ name: "origin", url: "git@example.com:demo/repo.git", type: "fetch" }],
    currentBranch: "ai-delivery/popular-tags-badge-task-1",
    currentCommit: "a".repeat(40),
    workingTreeClean: true,
    statusShort: "",
    baseBranch: "main",
    commitsAheadOfBase: 1,
    branchHasLocalCommit: true,
    ghInstalled: true,
    ghAuth: { ok: true, stdout: "Logged in", stderr: "" },
    remoteBranch: { exists: false, checked: true, output: "" },
    relatedPr: { exists: false, checked: true, output: "[]" },
    ready: true,
    blockingIssues: [],
  },
  proposal: {
    targetRemote: "origin",
    sourceBranch: "ai-delivery/popular-tags-badge-task-1",
    baseBranch: "main",
    prTitle: "feat: deliver popular-tags-badge task task-1",
    prBody: "## Summary\n- Skill: popular-tags-badge",
    changedFiles: ["frontend/src/components/PopularTags/TagButton.jsx"],
    diffSummary: "frontend/src/components/PopularTags/TagButton.jsx | 2 ++",
    testSummary: "passed",
    safety: {
      allowed: true,
      message: "All changed files are inside allowed delivery paths.",
      disallowedFiles: [],
    },
  },
  commandPreview: [
    "git push -u origin ai-delivery/popular-tags-badge-task-1",
    "gh pr create --base main --head ai-delivery/popular-tags-badge-task-1 --title \"feat: deliver popular-tags-badge task task-1\" --body \"## Summary\\n- Skill: popular-tags-badge\"",
  ],
  blockingIssues: [],
  remoteActions: { push: false, pr: false },
};

function createTask(overrides = {}) {
  return {
    id: "task-1",
    taskMode: "software_delivery",
    stages: [{ name: "delivery-reporter", status: "completed" }],
    artifacts: [],
    dsl: { targetSkillId: "popular-tags-badge" },
    report: {
      summary: "预览完成",
      changedFiles: [],
      locatedFiles: ["frontend/src/components/PopularTags/TagButton.jsx"],
      nextActions: ["确认后可重放写入"],
    },
    ...overrides,
  };
}

function createWorkBreakdownArtifact() {
  return {
    type: "work_breakdown",
    title: "Work Breakdown Document",
    status: "ready",
    generatedBy: "Work Breakdown Agent",
    stage: "work-breakdown",
    content: {
      frontendTasks: [{ file: "frontend/src/routes/Article/Article.jsx", uiBehavior: "Show article word count and reading time." }],
      backendTasks: [],
      dataModelTasks: [],
      testTasks: [{ command: "npm test -- frontend/src/helpers/readingStats.test.js", requiresNewTestFile: true }],
      skillAssignment: { skillId: "article-word-stats", skillName: "文章详情字数统计", reason: "Matched frontend-display skill." },
      riskNotes: ["Avoid changing article API shape."],
      acceptanceCriteria: ["文章详情页正文下方显示字数", "展示预计阅读时间"],
    },
  };
}

const productStepNames = [
  "PM Request",
  "Requirement Brief",
  "Work Breakdown",
  "Implementation Plan",
  "Code Changes",
  "Preview / Effect",
  "Verification",
  "Review & Delivery",
];

const artifactTabNames = ["Requirement", "Breakdown", "Plan", "Code", "Preview", "Tests", "Review", "PR"];

const algorithmStageNames = [
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

function createAlgorithmTask() {
  return createTask({
    id: "task-algorithm-1",
    taskMode: "algorithm_competition",
    requirement: "算法比赛任务：分析评分规则并设计创新方案",
    status: "skeleton_ready",
    dsl: undefined,
    stages: algorithmStageNames.map((name) => ({
      name,
      status: ["implementation", "evaluation", "ablation", "error_analysis"].includes(name) ? "not_executed" : "skeleton",
      completedAt: "2026-05-26T00:00:00.000Z",
      output: {
        agent: name === "competition_brief" ? "Competition Reader" : "Algorithm Competition Agent",
        summary: name === "implementation" ? "Code implementation not executed in skeleton mode." : `${name} skeleton output generated without side effects.`,
      },
    })),
    artifacts: [
      {
        type: "competition_brief",
        title: "Competition Brief",
        status: "skeleton",
        summary: "Skeleton brief extracted from PM input.",
        generatedBy: "Competition Reader",
        stage: "competition_brief",
        content: { message: "Read task statement later", skeleton: true },
      },
      {
        type: "safety_gate",
        title: "Safety Gate",
        status: "skeleton",
        summary: "No commit, push, or PR is allowed in algorithm competition skeleton mode.",
        generatedBy: "Delivery Guard",
        stage: "delivery_guard",
        content: { noRepositoryWrite: true, noPush: true, noPr: true },
      },
    ],
    report: {
      summary: "Skeleton only: algorithm_competition pipeline produced deterministic stages and artifacts.",
      changedFiles: [],
      locatedFiles: [],
      nextActions: ["Review skeleton stage and artifact contract."],
      testStatus: "not_executed",
    },
  });
}

function createWorkflowStage(id, overrides = {}) {
  return {
    id,
    name: id,
    title: id.replace(/_/g, " "),
    agent: id === "competition_brief" ? "Competition Reader" : "Algorithm Workflow Agent",
    status: id === "pm_input" ? "completed" : "pending",
    inputArtifacts: id === "baseline_reproduction" ? ["data_profile"] : [],
    outputArtifacts: id === "competition_brief" ? ["competition_brief"] : [],
    canWriteRepo: false,
    canRunCommands: false,
    canCommit: false,
    canPush: false,
    summary: `${id} workflow summary`,
    replayCount: 0,
    ...overrides,
  };
}

function createWorkflowArtifact(type, overrides = {}) {
  return {
    type,
    title: type.replace(/_/g, " "),
    status: type === "baseline_result" ? "ready" : "pending",
    summary: `${type} summary`,
    content: type === "baseline_result" ? { score: { accuracy: 0.6 } } : {},
    generatedBy: "Algorithm Workflow Agent",
    stage: type === "baseline_result" ? "baseline_reproduction" : type,
    createdAt: "2026-05-26T00:00:00.000Z",
    updatedAt: "2026-05-26T00:00:00.000Z",
    ...overrides,
  };
}

function createAlgorithmWorkflowTask(overrides = {}) {
  return createTask({
    id: "task-workflow-1",
    taskMode: "algorithm_competition",
    requirement: "算法比赛任务：分析评分规则并设计创新方案",
    status: "running",
    currentStage: "competition_brief",
    completedStages: ["pm_input"],
    pendingStages: algorithmStageNames.filter((name) => name !== "pm_input"),
    failedStage: null,
    errorMessage: null,
    replayCount: 0,
    dsl: undefined,
    stages: algorithmStageNames.map((name) => createWorkflowStage(name, name === "pm_input" ? { status: "completed" } : {})),
    artifacts: [
      createWorkflowArtifact("competition_brief"),
      createWorkflowArtifact("baseline_result"),
      createWorkflowArtifact("evaluation_result", { content: { improved: { score: { accuracy: 1 } } } }),
      createWorkflowArtifact("ablation_table", { content: { rows: [{ methodId: "baseline-keyword-rule" }, { methodId: "improved-keyword-rule" }] } }),
      createWorkflowArtifact("error_analysis", { content: { baseline: { failedCount: 2 } } }),
      createWorkflowArtifact("final_report", { content: { scores: { baseline: 0.6, improved: 1, delta: 0.4 } } }),
    ],
    report: {
      summary: "Algorithm workflow is ready.",
      changedFiles: [],
      locatedFiles: [],
      nextActions: ["Run next stage: competition_brief"],
      testStatus: "not_executed",
    },
    ...overrides,
  });
}

describe("App replay controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    axios.get.mockResolvedValue({ data: configResponse });
  });

  test("defaults to Conduit Delivery product flow and artifact tabs", async () => {
    const { container } = render(<App />);

    expect(await screen.findByRole("button", { name: "Software delivery" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Labs / Debug Workflow" })).toBeTruthy();
    expect(container.querySelectorAll(".timeline-step")).toHaveLength(8);
    for (const stepName of productStepNames) {
      expect(screen.getByText(stepName)).toBeTruthy();
    }
    expect(screen.getAllByText("Produced artifact")).toHaveLength(8);
    expect(screen.getAllByText("View location")).toHaveLength(8);
    expect(screen.getAllByText("Next action")).toHaveLength(8);
    for (const tabName of artifactTabNames) {
      expect(screen.getByRole("button", { name: tabName })).toBeTruthy();
    }
  });

  test("submits and renders an algorithm competition skeleton run", async () => {
    const task = createAlgorithmTask();
    axios.post.mockResolvedValueOnce({ data: { task } });

    const { container } = render(<App />);

    expect(await screen.findByRole("button", { name: "Software delivery" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Labs / Debug Workflow" }));
    fireEvent.click(screen.getByRole("button", { name: "启动 AI 编排链路" }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenLastCalledWith("/api/ai/tasks", {
        requirement: "文章详情页新增字数统计，展示本文共多少字和预计阅读时间",
        taskMode: "algorithm_competition",
        applyChanges: false,
        runTests: false,
      });
    });
    expect(await screen.findByText("task-algorithm-1")).toBeTruthy();
    expect(container.querySelectorAll(".timeline-step")).toHaveLength(8);
    expect(screen.getAllByText("competition_brief").length).toBeGreaterThan(0);
    expect(screen.getAllByText("delivery_guard").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Chief Commander").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Competition Reader").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Delivery Guard").length).toBeGreaterThan(0);
    expect(screen.getByText("Competition Brief")).toBeTruthy();
    expect(screen.getByText("competition_brief / skeleton")).toBeTruthy();
    expect(screen.getByText("Competition Reader · competition_brief")).toBeTruthy();
    expect(screen.getByText(/Read task statement later/)).toBeTruthy();
    expect(screen.getByText("Skeleton mode")).toBeTruthy();
    expect(screen.getByText("No repository write")).toBeTruthy();
    expect(screen.getByText("No test command execution")).toBeTruthy();
    expect(screen.getByText("No commit")).toBeTruthy();
    expect(screen.getByText("No push")).toBeTruthy();
    expect(screen.getByText("No PR")).toBeTruthy();
    expect(screen.getByText("Algorithm competition skeleton mode does not run repository writes, tests, commits, push, or PR actions.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "创建本地提交" })).toBeNull();
  });

  test("drives algorithm workflow controls and stage actions", async () => {
    const initialTask = createAlgorithmWorkflowTask();
    const nextTask = createAlgorithmWorkflowTask({
      currentStage: "metric_analysis",
      completedStages: ["pm_input", "competition_brief"],
      pendingStages: algorithmStageNames.filter((name) => !["pm_input", "competition_brief"].includes(name)),
      stages: algorithmStageNames.map((name) => createWorkflowStage(name, ["pm_input", "competition_brief"].includes(name) ? { status: "completed" } : {})),
    });
    const allTask = createAlgorithmWorkflowTask({
      status: "completed",
      currentStage: null,
      completedStages: algorithmStageNames,
      pendingStages: [],
      stages: algorithmStageNames.map((name) => createWorkflowStage(name, { status: "completed" })),
    });
    const stageTask = createAlgorithmWorkflowTask({
      stages: algorithmStageNames.map((name) => createWorkflowStage(name, name === "metric_analysis" ? { status: "completed" } : {})),
    });

    axios.post
      .mockResolvedValueOnce({ data: { task: initialTask } })
      .mockResolvedValueOnce({ data: { task: nextTask, result: { status: "completed", stageId: "competition_brief" } } })
      .mockResolvedValueOnce({ data: { task: allTask, results: [] } })
      .mockResolvedValueOnce({ data: { task: stageTask, result: { status: "completed", stageId: "metric_analysis" } } });

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "Labs / Debug Workflow" }));
    fireEvent.click(screen.getByRole("button", { name: "启动 AI 编排链路" }));

    expect(await screen.findByText("Workflow Control")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Run next stage" })).toBeTruthy();
    expect(screen.getByText("currentStage: competition_brief")).toBeTruthy();
    expect(screen.getByText("completedStages: 1")).toBeTruthy();
    expect(screen.getByText("pendingStages: 18")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Run next stage" }));
    await waitFor(() => {
      expect(axios.post).toHaveBeenLastCalledWith("/api/ai/tasks/task-workflow-1/run-next");
    });
    expect(await screen.findByText("Stage completed: competition_brief")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Run all stages" }));
    await waitFor(() => {
      expect(axios.post).toHaveBeenLastCalledWith("/api/ai/tasks/task-workflow-1/run-all");
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Run stage" })[3]);
    await waitFor(() => {
      expect(axios.post).toHaveBeenLastCalledWith("/api/ai/tasks/task-workflow-1/stages/metric_analysis/run", undefined);
    });
  });

  test("shows blocked workflow responses and filters artifacts", async () => {
    const initialTask = createAlgorithmWorkflowTask();
    const blockedTask = createAlgorithmWorkflowTask({
      status: "blocked",
      errorMessage: "Stage baseline_reproduction is blocked by missing artifacts: data_profile",
    });

    axios.post
      .mockResolvedValueOnce({ data: { task: initialTask } })
      .mockRejectedValueOnce({
        response: {
          status: 409,
          data: {
            task: blockedTask,
            result: {
              status: "blocked",
              stageId: "baseline_reproduction",
              missingArtifacts: ["data_profile"],
              summary: "Stage baseline_reproduction is blocked by missing artifacts: data_profile",
            },
          },
        },
      });

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "Labs / Debug Workflow" }));
    fireEvent.click(screen.getByRole("button", { name: "启动 AI 编排链路" }));

    await screen.findByText("Artifact Filter");
    fireEvent.click(screen.getByRole("button", { name: "baseline_result" }));
    expect(screen.getByText("baseline result")).toBeTruthy();
    expect(screen.queryByText("evaluation result")).toBeNull();

    fireEvent.click(screen.getAllByRole("button", { name: "Run stage" })[5]);
    const blockedMessage = await screen.findByText(/blocked by missing artifacts/);
    expect(blockedMessage.textContent).toContain("data_profile");
  });

  test("shows backend work breakdown artifact in the Breakdown tab", async () => {
    const task = createTask({
      dsl: { targetSkillId: "article-word-stats" },
      artifacts: [createWorkBreakdownArtifact()],
    });
    axios.post.mockResolvedValueOnce({ data: { task } });

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "启动 AI 编排链路" }));
    await screen.findByText("task-1");
    fireEvent.click(screen.getByRole("button", { name: "Breakdown" }));

    expect(screen.getByRole("heading", { name: "Work Breakdown Document" })).toBeTruthy();
    expect(screen.getByText("Frontend Tasks")).toBeTruthy();
    expect(screen.getByText("Backend Tasks")).toBeTruthy();
    expect(screen.getByText("Data Model Tasks")).toBeTruthy();
    expect(screen.getByText("Test Tasks")).toBeTruthy();
    expect(screen.getByText("Skill Assignment")).toBeTruthy();
    expect(screen.getByText("Acceptance Criteria")).toBeTruthy();
    expect(screen.getByText(/frontend\/src\/routes\/Article\/Article.jsx/)).toBeTruthy();
    expect(screen.getByText(/npm test -- frontend\/src\/helpers\/readingStats.test.js/)).toBeTruthy();
    expect(screen.getByText(/文章详情字数统计/)).toBeTruthy();
  });

  test("keeps software delivery free of algorithm workflow controls", async () => {
    const task = createTask();
    axios.post.mockResolvedValueOnce({ data: { task } });

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "启动 AI 编排链路" }));
    await screen.findByText("task-1");

    expect(screen.queryByText("Workflow Control")).toBeNull();
    expect(screen.queryByRole("button", { name: "Run next stage" })).toBeNull();
    expect(screen.getByRole("button", { name: "创建本地提交" })).toBeTruthy();
  });

  test("presents the run as an Agent Mission Control workspace", async () => {
    const task = createTask({
      stages: [
        { name: "pm-clarifier", status: "ready", output: { normalizedRequirement: "热门标签前 5 个标签增加 TOP 标识" } },
        { name: "context-rag", status: "completed", output: { retrievedContext: [{ relativePath: "frontend/src/components/PopularTags/TagButton.jsx", score: 88, snippet: "PopularTags renders tag buttons" }] } },
        { name: "code-writer", status: "preview", output: { changedFiles: ["frontend/src/components/PopularTags/TagButton.jsx"] } },
      ],
      report: {
        summary: "预览完成",
        changedFiles: ["frontend/src/components/PopularTags/TagButton.jsx"],
        locatedFiles: ["frontend/src/components/PopularTags/TagButton.jsx"],
        nextActions: ["生成 PR 准备报告"],
      },
    });

    axios.post.mockResolvedValueOnce({ data: { task } });

    render(<App />);

    expect(await screen.findByText("Agent Mission Control")).toBeTruthy();
    expect(screen.getByText("Agent Team View")).toBeTruthy();
    expect(screen.getByText("Live Run Feed")).toBeTruthy();
    expect(screen.getByText("Artifact / Evidence")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "启动 AI 编排链路" }));

    expect(await screen.findByText("task-1")).toBeTruthy();
    expect(screen.getByText("Context Evidence")).toBeTruthy();
    expect(screen.getAllByText("frontend/src/components/PopularTags/TagButton.jsx").length).toBeGreaterThan(0);
    expect(screen.getByText("push: false")).toBeTruthy();
    expect(screen.getByText("pr: false")).toBeTruthy();
  });

  test("replays the current task as an apply run", async () => {
    const previewTask = createTask();
    const replayedTask = createTask({
      id: "task-2",
      replayedFrom: "task-1",
      applyChanges: true,
      report: {
        summary: "写入完成",
        changedFiles: ["frontend/src/components/PopularTags/TagButton.jsx"],
        locatedFiles: ["frontend/src/components/PopularTags/TagButton.jsx"],
        nextActions: ["查看 Conduit diff"],
      },
    });

    axios.post
      .mockResolvedValueOnce({ data: { task: previewTask } })
      .mockResolvedValueOnce({ data: { task: replayedTask } });

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "启动 AI 编排链路" }));
    await screen.findByText("预览完成");

    fireEvent.click(screen.getByRole("button", { name: "重放并写入 Conduit" }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenLastCalledWith("/api/ai/tasks/task-1/replay", {
        applyChanges: true,
        runTests: false,
      });
    });
    expect(await screen.findByText("写入完成")).toBeTruthy();
    expect(screen.getByText("查看 Conduit diff")).toBeTruthy();
  });

  test("loads delivery preview and creates a local commit without remote PR", async () => {
    const task = createTask({ report: { ...createTask().report, summary: "写入完成" } });
    const committedTask = createTask({
      status: "local_commit_created",
      delivery: { ...deliveryPreview, status: "local_commit_created", commitHash: "a".repeat(40) },
    });

    axios.get
      .mockResolvedValueOnce({ data: configResponse })
      .mockResolvedValueOnce({ data: { delivery: deliveryPreview } });
    axios.post
      .mockResolvedValueOnce({ data: { task } })
      .mockResolvedValueOnce({
        data: {
          task: committedTask,
          delivery: { ...deliveryPreview, status: "local_commit_created", commitHash: "a".repeat(40) },
        },
      });

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "启动 AI 编排链路" }));
    await screen.findByText("写入完成");

    fireEvent.click(screen.getByRole("button", { name: "生成 PR 准备报告" }));

    await waitFor(() => {
      expect(axios.get).toHaveBeenLastCalledWith("/api/ai/tasks/task-1/delivery/preview");
    });
    expect(await screen.findByText("ai-delivery/popular-tags-badge-task-1")).toBeTruthy();
    expect(screen.getByText("Safety Gate: PASS")).toBeTruthy();
    expect(screen.getByRole("button", { name: "创建远端 PR（需要授权）" }).disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "创建本地提交" }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenLastCalledWith("/api/ai/tasks/task-1/delivery/commit");
    });
    await waitFor(() => {
      expect(screen.getAllByText("local_commit_created").length).toBeGreaterThan(0);
    });
    expect(screen.getByText("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")).toBeTruthy();
  });

  test("loads remote readiness and submits explicit remote PR authorization", async () => {
    const task = createTask({ report: { ...createTask().report, summary: "写入完成" } });
    const confirmedDelivery = {
      ...remotePreview,
      status: "pr_created",
      approved: true,
      pushed: true,
      prCreated: true,
      pushOutput: "pushed",
      prOutput: "https://example.invalid/pr/1",
      remoteActions: { push: true, pr: true },
    };
    const confirmedTask = createTask({ status: "pr_created", delivery: confirmedDelivery });

    axios.get
      .mockResolvedValueOnce({ data: configResponse })
      .mockResolvedValueOnce({ data: { delivery: remotePreview } });
    axios.post
      .mockResolvedValueOnce({ data: { task } })
      .mockResolvedValueOnce({ data: { task: confirmedTask, delivery: confirmedDelivery } });

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "启动 AI 编排链路" }));
    await screen.findByText("写入完成");

    fireEvent.click(screen.getByRole("button", { name: "检查远端 PR 条件" }));

    await waitFor(() => {
      expect(axios.get).toHaveBeenLastCalledWith("/api/ai/tasks/task-1/delivery/remote-preview");
    });
    expect(await screen.findByText("Remote Readiness: READY")).toBeTruthy();
    expect(screen.getByText("gh auth: OK")).toBeTruthy();
    expect(screen.getByText("git push -u origin ai-delivery/popular-tags-badge-task-1")).toBeTruthy();

    fireEvent.click(screen.getByLabelText("我已确认这是要交付的远端 PR"));
    fireEvent.click(screen.getByLabelText("授权执行 git push"));
    fireEvent.click(screen.getByLabelText("授权执行 gh pr create"));
    fireEvent.click(screen.getByRole("button", { name: "提交远端 PR 二次确认" }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenLastCalledWith("/api/ai/tasks/task-1/delivery/pr", {
        explicitApproval: true,
        allowPush: true,
        allowPrCreate: true,
        confirmedBranchName: "ai-delivery/popular-tags-badge-task-1",
        confirmedCommitHash: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      });
    });
    await waitFor(() => {
      expect(screen.getAllByText("pr_created").length).toBeGreaterThan(0);
    });
    expect(screen.getByText("push: true / pr: true")).toBeTruthy();
  });
});
