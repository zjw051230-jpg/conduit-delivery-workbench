const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const {
  createDeliveryPreview,
  createLocalCommit,
  createPrPlaceholder,
  createBranchName,
  createCommitMessage,
  createRemotePreview,
  createRemotePr,
} = require("./prDeliveryAgent");

function createGitRepoFixture() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "delivery-git-"));
  fs.mkdirSync(path.join(repoRoot, "frontend/src"), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, "frontend/src/App.jsx"), "export default function App() { return null; }\n");
  git(repoRoot, ["init"]);
  git(repoRoot, ["add", "frontend/src/App.jsx"]);
  git(repoRoot, ["commit", "-m", "initial"]);
  return repoRoot;
}

function createCommittedDeliveryBranchFixture() {
  const repoRoot = createGitRepoFixture();
  fs.writeFileSync(path.join(repoRoot, "frontend/src/App.jsx"), "export default function App() { return 'changed'; }\n");
  const commit = createLocalCommit({ repoRoot, task: createTask() });
  return { repoRoot, commit };
}

function git(repoRoot, args) {
  const result = spawnSync("git", ["-c", `safe.directory=${repoRoot}`, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`${args.join(" ")} failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout.trim();
}

function createTask(overrides = {}) {
  return {
    id: "task-123456-cover",
    requirement: "文章新增封面图字段",
    dsl: {
      targetSkillId: "article-cover-image",
      skillName: "文章封面图字段",
    },
    report: {
      testStatus: "passed",
      changedFiles: ["frontend/src/App.jsx"],
    },
    ...overrides,
  };
}

describe("PR Delivery Agent", () => {
  test("generates stable branch name and commit message with task and skill information", () => {
    const task = createTask();

    expect(createBranchName(task)).toBe("ai-delivery/article-cover-image-task-123456-cover");

    const message = createCommitMessage(task);
    expect(message).toContain("article-cover-image");
    expect(message).toContain("task-123456-cover");
    expect(message).toContain("文章封面图字段");
  });

  test("preview reports diff summary without changing git state", () => {
    const repoRoot = createGitRepoFixture();
    const beforeStatus = git(repoRoot, ["status", "--porcelain"]);
    const beforeBranch = git(repoRoot, ["branch", "--show-current"]);

    fs.writeFileSync(path.join(repoRoot, "frontend/src/App.jsx"), "export default function App() { return 'changed'; }\n");
    const dirtyStatus = git(repoRoot, ["status", "--porcelain"]);

    const preview = createDeliveryPreview({ repoRoot, task: createTask() });

    expect(preview.status).toBe("delivery_ready");
    expect(preview.hasChanges).toBe(true);
    expect(preview.changedFiles).toEqual(["frontend/src/App.jsx"]);
    expect(preview.diffSummary).toContain("frontend/src/App.jsx");
    expect(preview.safety.allowed).toBe(true);
    expect(preview.branchName).toBe("ai-delivery/article-cover-image-task-123456-cover");
    expect(preview.commitMessage).toContain("task-123456-cover");
    expect(git(repoRoot, ["status", "--porcelain"])).toBe(dirtyStatus);
    expect(git(repoRoot, ["branch", "--show-current"])).toBe(beforeBranch);
    expect(beforeStatus).toBe("");
  });

  test("commit is rejected when there are no changes", () => {
    const repoRoot = createGitRepoFixture();

    expect(() => createLocalCommit({ repoRoot, task: createTask() })).toThrow("No changes to commit");
  });

  test("local commit creates a branch and never pushes by default", () => {
    const repoRoot = createGitRepoFixture();
    fs.writeFileSync(path.join(repoRoot, "frontend/src/App.jsx"), "export default function App() { return 'changed'; }\n");

    const result = createLocalCommit({ repoRoot, task: createTask() });

    expect(result.status).toBe("local_commit_created");
    expect(result.branchName).toBe("ai-delivery/article-cover-image-task-123456-cover");
    expect(result.commitHash).toMatch(/^[0-9a-f]{40}$/);
    expect(result.remoteActions.push).toBe(false);
    expect(result.remoteActions.pr).toBe(false);
    expect(git(repoRoot, ["branch", "--show-current"])).toBe(result.branchName);
    expect(git(repoRoot, ["status", "--porcelain"])).toBe("");
  });

  test("safety gate blocks delivery when changed files are outside allowed paths", () => {
    const repoRoot = createGitRepoFixture();
    fs.writeFileSync(path.join(repoRoot, "README.md"), "unsafe root change\n");

    const preview = createDeliveryPreview({ repoRoot, task: createTask() });

    expect(preview.status).toBe("delivery_preview");
    expect(preview.safety.allowed).toBe(false);
    expect(preview.safety.disallowedFiles).toEqual(["README.md"]);
    expect(() => createLocalCommit({ repoRoot, task: createTask() })).toThrow("Delivery safety gate failed");
  });

  test("default PR creation is disabled and does not run gh pr create", () => {
    const result = createPrPlaceholder({ task: createTask() });

    expect(result.status).toBe("pr_creation_disabled");
    expect(result.disabled).toBe(true);
    expect(result.requiresExplicitApproval).toBe(true);
    expect(result.remoteActions.push).toBe(false);
    expect(result.remoteActions.pr).toBe(false);
  });

  test("remote preview is read-only and generates command preview", () => {
    const { repoRoot, commit } = createCommittedDeliveryBranchFixture();
    const beforeStatus = git(repoRoot, ["status", "--porcelain"]);
    const beforeBranch = git(repoRoot, ["branch", "--show-current"]);
    const beforeHead = git(repoRoot, ["rev-parse", "HEAD"]);

    const preview = createRemotePreview({ repoRoot, task: createTask() });

    expect(preview.status).toBe("remote_preview");
    expect(preview.requiresExplicitApproval).toBe(true);
    expect(preview.proposal.sourceBranch).toBe(commit.branchName);
    expect(preview.proposal.prTitle).toContain("article-cover-image");
    expect(preview.commandPreview[0]).toBe(`git push -u origin ${commit.branchName}`);
    expect(preview.commandPreview[1]).toContain("gh pr create --base");
    expect(preview.commandPreview[1]).toContain(`--head ${commit.branchName}`);
    expect(git(repoRoot, ["status", "--porcelain"])).toBe(beforeStatus);
    expect(git(repoRoot, ["branch", "--show-current"])).toBe(beforeBranch);
    expect(git(repoRoot, ["rev-parse", "HEAD"])).toBe(beforeHead);
  });

  test("default remote PR request requires explicit approval and never pushes", () => {
    const { repoRoot } = createCommittedDeliveryBranchFixture();
    const result = createRemotePr({ repoRoot, task: createTask(), approval: {} });

    expect(result.status).toBe("requires_explicit_approval");
    expect(result.pushed).toBe(false);
    expect(result.prCreated).toBe(false);
    expect(result.requiredFields).toEqual([
      "explicitApproval",
      "allowPush",
      "allowPrCreate",
      "confirmedBranchName",
      "confirmedCommitHash",
    ]);
  });

  test("remote PR request rejects missing allowPush and allowPrCreate", () => {
    const { repoRoot, commit } = createCommittedDeliveryBranchFixture();

    expect(createRemotePr({
      repoRoot,
      task: createTask(),
      approval: {
        explicitApproval: true,
        allowPrCreate: true,
        confirmedBranchName: commit.branchName,
        confirmedCommitHash: commit.commitHash,
      },
    }).status).toBe("requires_explicit_approval");

    expect(createRemotePr({
      repoRoot,
      task: createTask(),
      approval: {
        explicitApproval: true,
        allowPush: true,
        confirmedBranchName: commit.branchName,
        confirmedCommitHash: commit.commitHash,
      },
    }).status).toBe("requires_explicit_approval");
  });

  test("remote PR request rejects non ai-delivery branch and dirty working tree", () => {
    const repoRoot = createGitRepoFixture();
    const head = git(repoRoot, ["rev-parse", "HEAD"]);
    const wrongBranch = createRemotePr({
      repoRoot,
      task: createTask(),
      approval: {
        explicitApproval: true,
        allowPush: true,
        allowPrCreate: true,
        confirmedBranchName: "master",
        confirmedCommitHash: head,
      },
    });
    expect(wrongBranch.status).toBe("remote_readiness_blocked");
    expect(wrongBranch.blockingIssues).toContain("Current branch must start with ai-delivery/.");

    const { repoRoot: dirtyRepo, commit } = createCommittedDeliveryBranchFixture();
    fs.writeFileSync(path.join(dirtyRepo, "frontend/src/App.jsx"), "dirty\n");
    const dirty = createRemotePr({
      repoRoot: dirtyRepo,
      task: createTask(),
      approval: {
        explicitApproval: true,
        allowPush: true,
        allowPrCreate: true,
        confirmedBranchName: commit.branchName,
        confirmedCommitHash: commit.commitHash,
      },
    });
    expect(dirty.status).toBe("remote_readiness_blocked");
    expect(dirty.blockingIssues).toContain("Working tree must be clean before remote PR creation.");
  });

  test("remote PR request rejects mismatched commit hash before remote commands", () => {
    const { repoRoot, commit } = createCommittedDeliveryBranchFixture();

    const result = createRemotePr({
      repoRoot,
      task: createTask(),
      approval: {
        explicitApproval: true,
        allowPush: true,
        allowPrCreate: true,
        confirmedBranchName: commit.branchName,
        confirmedCommitHash: "b".repeat(40),
      },
    });

    expect(result.status).toBe("remote_readiness_blocked");
    expect(result.blockingIssues).toContain("Confirmed commit hash does not match current HEAD.");
    expect(git(repoRoot, ["rev-parse", "HEAD"])).toBe(commit.commitHash);
  });

  test("remote PR request executes push and gh create only after full approval and readiness", () => {
    const approval = {
      explicitApproval: true,
      allowPush: true,
      allowPrCreate: true,
      confirmedBranchName: "ai-delivery/article-cover-image-task-123456-cover",
      confirmedCommitHash: "a".repeat(40),
    };
    const preview = {
      agent: "PR Delivery Agent",
      status: "remote_preview",
      requiresExplicitApproval: true,
      readiness: {
        currentBranch: approval.confirmedBranchName,
        currentCommit: approval.confirmedCommitHash,
        blockingIssues: [],
      },
      proposal: {
        targetRemote: "origin",
        sourceBranch: approval.confirmedBranchName,
        baseBranch: "main",
        prTitle: "feat: deliver article-cover-image task task-123456-cover",
        prBody: "## Summary",
        safety: { allowed: true, message: "All changed files are inside allowed delivery paths." },
      },
      commandPreview: ["git push -u origin ai-delivery/article-cover-image-task-123456-cover"],
      blockingIssues: [],
      remoteActions: { push: false, pr: false },
    };
    const calls = [];

    const result = createRemotePr({
      repoRoot: "repo-root",
      task: createTask(),
      approval,
      preview,
      executeRemoteCommands: ({ repoRoot, proposal }) => {
        calls.push({ repoRoot, proposal });
        return { pushOutput: "pushed", prOutput: "https://example.invalid/pr/1" };
      },
    });

    expect(calls).toHaveLength(1);
    expect(result.status).toBe("pr_created");
    expect(result.pushed).toBe(true);
    expect(result.prCreated).toBe(true);
    expect(result.remoteActions).toEqual({ push: true, pr: true });
    expect(result.pushOutput).toBe("pushed");
    expect(result.prOutput).toBe("https://example.invalid/pr/1");
  });
});
