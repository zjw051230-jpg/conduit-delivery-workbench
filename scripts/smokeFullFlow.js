const { spawnSync } = require("node:child_process");
const { getConfig } = require("../backend/src/config");
const { runPipeline } = require("../backend/src/ai/orchestration/runPipeline");
const { applyCodeChanges } = require("../backend/src/ai/agents/codeWriterAgent");
const {
  createDeliveryPreview,
  createLocalCommit,
  createRemotePreview,
} = require("../backend/src/ai/delivery/prDeliveryAgent");

const skillRequirements = {
  "article-word-stats": "文章详情页新增字数统计，展示本文共多少字和预计阅读时间",
  "popular-tags-badge": "热门标签前 5 个标签增加 TOP 标识",
  "article-cover-image": "文章新增封面图字段，编辑表单可填写封面图 URL，列表和详情页展示封面图",
};

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const skillIds = options.all ? Object.keys(skillRequirements) : [options.skill || "article-word-stats"];
  const config = getConfig();
  const reports = [];

  for (const skillId of skillIds) {
    if (!skillRequirements[skillId]) {
      throw new Error(`Unknown smoke skill: ${skillId}. Known skills: ${Object.keys(skillRequirements).join(", ")}`);
    }

    reports.push(runSkillSmoke({
      config,
      skillId,
      requirement: options.requirement || skillRequirements[skillId],
      baseBranch: options.base,
    }));
  }

  const summary = {
    runner: "smokeFullFlow",
    repoRoot: config.conduitRepoPath,
    remoteExecution: "not_attempted",
    reports,
    failed: reports.filter((report) => report.status !== "passed").length,
  };

  console.log(JSON.stringify(summary, null, 2));
  if (summary.failed > 0) process.exitCode = 1;
}

function runSkillSmoke({ config, skillId, requirement, baseBranch }) {
  const report = {
    skillId,
    requirement,
    status: "running",
    repoRoot: config.conduitRepoPath,
    preflight: {},
    stages: [],
    rag: {},
    moduleLocator: {},
    writer: {},
    idempotence: {},
    tests: {},
    deliveryPreview: {},
    localCommit: {},
    remotePreview: {},
    failures: [],
  };

  try {
    const initialStatus = git(config.conduitRepoPath, ["status", "--porcelain"], { trim: false });
    const initialBranch = git(config.conduitRepoPath, ["branch", "--show-current"]);
    const initialHead = git(config.conduitRepoPath, ["rev-parse", "HEAD"], { allowFailure: true });

    if (initialStatus.trim()) {
      report.preflight = {
        branch: initialBranch,
        head: initialHead,
        clean: false,
        statusShort: initialStatus.replace(/\r?\n$/, ""),
      };
      report.status = "failed";
      report.failures.push({
        stage: "preflight",
        message: "Conduit working tree is not clean before smoke run.",
        statusShort: report.preflight.statusShort,
      });
      return report;
    }

    if (baseBranch) {
      git(config.conduitRepoPath, ["switch", baseBranch]);
    }

    const preStatus = git(config.conduitRepoPath, ["status", "--porcelain"], { trim: false });
    const preBranch = git(config.conduitRepoPath, ["branch", "--show-current"]);
    const preHead = git(config.conduitRepoPath, ["rev-parse", "HEAD"], { allowFailure: true });
    report.preflight = {
      initialBranch,
      initialHead,
      baseBranch: baseBranch || null,
      branch: preBranch,
      head: preHead,
      clean: !preStatus.trim(),
      statusShort: preStatus.replace(/\r?\n$/, ""),
    };

    if (!report.preflight.clean) {
      report.status = "failed";
      report.failures.push({
        stage: "preflight",
        message: "Conduit working tree is not clean before smoke run.",
        statusShort: report.preflight.statusShort,
      });
      return report;
    }

    const task = runPipeline({
      requirement,
      applyChanges: true,
      runTests: true,
      config,
    });

    report.taskId = task.id;
    report.taskStatus = task.status;
    report.matchedSkillId = task.dsl.targetSkillId;
    report.stages = task.stages.map((stage) => ({
      name: stage.name,
      status: stage.status,
      completedAt: stage.completedAt,
    }));

    const ragStage = task.stages.find((stage) => stage.name === "context-rag");
    const locatorStage = task.stages.find((stage) => stage.name === "module-locator");
    const writerStage = task.stages.find((stage) => stage.name === "code-writer");
    const testStage = task.stages.find((stage) => stage.name === "test-runner");

    report.rag = summarizeRag(task.dsl, ragStage?.output);
    report.moduleLocator = {
      files: locatorStage?.output?.files || [],
      targetModules: locatorStage?.output?.targetModules || [],
    };
    report.writer = writerStage?.output || {};
    report.tests = summarizeTests(testStage?.output);

    if (task.dsl.targetSkillId !== skillId) {
      report.failures.push({
        stage: "skill-match",
        message: `Expected ${skillId}, matched ${task.dsl.targetSkillId || "none"}.`,
      });
    }

    const repeatWrite = applyCodeChanges({ repoRoot: config.conduitRepoPath, dsl: task.dsl });
    report.idempotence = {
      status: repeatWrite.status,
      changedFiles: repeatWrite.changedFiles || [],
      passed: (repeatWrite.changedFiles || []).length === 0,
      message: repeatWrite.message,
    };
    if (!report.idempotence.passed) {
      report.failures.push({
        stage: "idempotence",
        message: "Second writer run changed files again.",
        changedFiles: report.idempotence.changedFiles,
      });
    }

    if (report.tests.status !== "passed") {
      report.failures.push({
        stage: "test-runner",
        message: report.tests.message || "Test runner did not pass.",
        commands: report.tests.results,
      });
    }

    const deliveryPreview = createDeliveryPreview({ repoRoot: config.conduitRepoPath, task });
    report.deliveryPreview = summarizeDeliveryPreview(deliveryPreview);
    if (!deliveryPreview.hasChanges) {
      report.failures.push({
        stage: "delivery-preview",
        message: "No Git changes available for local commit; Skill may already be applied.",
      });
    } else if (!deliveryPreview.safety.allowed) {
      report.failures.push({
        stage: "delivery-preview",
        message: "Delivery safety gate blocked changed files.",
        disallowedFiles: deliveryPreview.safety.disallowedFiles,
      });
    }

    if (report.failures.length === 0) {
      const localCommit = createLocalCommit({ repoRoot: config.conduitRepoPath, task });
      report.localCommit = {
        status: localCommit.status,
        branchName: localCommit.branchName,
        commitHash: localCommit.commitHash,
        statusAfterCommit: localCommit.statusAfterCommit,
        remoteActions: localCommit.remoteActions,
      };
    } else {
      report.localCommit = { status: "skipped_due_to_failures" };
    }

    const remotePreview = createRemotePreview({ repoRoot: config.conduitRepoPath, task });
    report.remotePreview = {
      status: remotePreview.status,
      ready: remotePreview.readiness.ready,
      remote: remotePreview.readiness.remote,
      currentBranch: remotePreview.readiness.currentBranch,
      currentCommit: remotePreview.readiness.currentCommit,
      baseBranch: remotePreview.readiness.baseBranch,
      workingTreeClean: remotePreview.readiness.workingTreeClean,
      commitsAheadOfBase: remotePreview.readiness.commitsAheadOfBase,
      ghInstalled: remotePreview.readiness.ghInstalled,
      ghAuthOk: remotePreview.readiness.ghAuth.ok,
      remoteBranch: remotePreview.readiness.remoteBranch,
      relatedPr: remotePreview.readiness.relatedPr,
      blockingIssues: remotePreview.blockingIssues,
      commandPreview: remotePreview.commandPreview,
      proposal: {
        title: remotePreview.proposal.prTitle,
        changedFiles: remotePreview.proposal.changedFiles,
        safety: remotePreview.proposal.safety,
      },
      remoteActions: remotePreview.remoteActions,
    };

    report.status = report.failures.length === 0 ? "passed" : "failed";
    return report;
  } catch (error) {
    report.status = "failed";
    report.failures.push({
      stage: "exception",
      message: error.message,
      stack: error.stack,
    });
    return report;
  }
}

function summarizeRag(dsl, output = {}) {
  const retrieved = output.retrievedContext || [];
  const hintFiles = (dsl.contextHints || []).filter((hint) => hint.includes("/") && hint.includes("."));
  const retrievedFiles = retrieved.map((entry) => entry.relativePath);
  const matchedHintFiles = hintFiles.filter((hint) => retrievedFiles.includes(hint));

  return {
    filesIndexed: output.filesIndexed || 0,
    retrievedFiles: retrieved.map((entry) => ({
      relativePath: entry.relativePath,
      layer: entry.layer,
      moduleType: entry.moduleType,
      score: entry.score,
      snippet: entry.snippet,
    })),
    hintFiles,
    matchedHintFiles,
    hitExpectedModule: matchedHintFiles.length > 0,
  };
}

function summarizeTests(output = {}) {
  return {
    status: output.status || "unknown",
    message: output.message || "",
    results: (output.results || []).map((result) => ({
      command: result.command,
      exitCode: result.exitCode,
      stdoutSummary: summarizeText(result.stdout),
      stderrSummary: summarizeText(result.stderr),
    })),
  };
}

function summarizeDeliveryPreview(delivery) {
  return {
    status: delivery.status,
    hasChanges: delivery.hasChanges,
    changedFiles: delivery.changedFiles,
    diffSummary: delivery.diffSummary,
    branchName: delivery.branchName,
    safety: delivery.safety,
    testStatus: delivery.testStatus,
    remoteActions: delivery.remoteActions,
  };
}

function summarizeText(text = "") {
  return String(text).replace(/\r/g, "").split("\n").slice(-40).join("\n").trim();
}

function parseArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--all") options.all = true;
    if (arg === "--skill") options.skill = args[index += 1];
    if (arg === "--base") options.base = args[index += 1];
    if (arg === "--requirement") options.requirement = args[index += 1];
  }
  return options;
}

function git(repoRoot, args, options = {}) {
  const result = spawnSync("git", ["-c", `safe.directory=${repoRoot}`, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    timeout: 15000,
  });
  if (result.status !== 0) {
    if (options.allowFailure) return "";
    throw new Error(result.stderr || result.stdout || `git ${args.join(" ")} failed`);
  }
  return options.trim === false ? result.stdout : result.stdout.trim();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
