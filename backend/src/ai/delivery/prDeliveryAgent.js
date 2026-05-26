const { spawnSync } = require("node:child_process");

const allowedPathPrefixes = ["backend/", "frontend/"];
const coAuthorTrailer = "Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>";
const requiredRemoteApprovalFields = [
  "explicitApproval",
  "allowPush",
  "allowPrCreate",
  "confirmedBranchName",
  "confirmedCommitHash",
];

function createDeliveryPreview({ repoRoot, task }) {
  const statusShort = git(repoRoot, ["status", "--porcelain"], { trim: false }).replace(/\r?\n$/, "");
  const changedFiles = parseChangedFiles(statusShort);
  const diffSummary = createDiffSummary(repoRoot, changedFiles);
  const safety = createSafetyReport(changedFiles);
  const hasChanges = changedFiles.length > 0;

  return {
    agent: "PR Delivery Agent",
    status: hasChanges && safety.allowed ? "delivery_ready" : "delivery_preview",
    hasChanges,
    statusShort,
    changedFiles,
    diffSummary,
    branchName: createBranchName(task),
    commitMessage: createCommitMessage(task),
    safety,
    testStatus: task.report?.testStatus || "unknown",
    remoteActions: disabledRemoteActions(),
  };
}

function createLocalCommit({ repoRoot, task }) {
  const preview = createDeliveryPreview({ repoRoot, task });

  if (!preview.hasChanges) {
    const error = new Error("No changes to commit");
    error.statusCode = 409;
    throw error;
  }

  if (!preview.safety.allowed) {
    const error = new Error("Delivery safety gate failed");
    error.statusCode = 409;
    error.details = preview.safety;
    throw error;
  }

  createOrSwitchBranch(repoRoot, preview.branchName);
  git(repoRoot, ["add", "--", ...preview.changedFiles]);
  git(repoRoot, [
    "-c",
    "user.name=AI Super Individual",
    "-c",
    "user.email=ai-super-individual@example.invalid",
    "commit",
    "--file",
    "-",
  ], { input: preview.commitMessage });
  const commitHash = git(repoRoot, ["rev-parse", "HEAD"]);

  return {
    ...preview,
    status: "local_commit_created",
    commitHash,
    statusAfterCommit: git(repoRoot, ["status", "--porcelain"]),
    remoteActions: disabledRemoteActions(),
  };
}

function createPrPlaceholder({ task, explicitApproval = false } = {}) {
  return {
    agent: "PR Delivery Agent",
    status: "pr_creation_disabled",
    disabled: true,
    requiresExplicitApproval: true,
    explicitApprovalReceived: Boolean(explicitApproval),
    branchName: task ? createBranchName(task) : null,
    message: "Remote push and gh pr create are disabled in the safe MVP path.",
    remoteActions: disabledRemoteActions(),
  };
}

function createRemotePreview({ repoRoot, task }) {
  const readiness = createRemoteReadinessCheck({ repoRoot });
  const proposal = createPrProposal({ repoRoot, task, readiness });
  const commandPreview = createCommandPreview(proposal);

  return {
    agent: "PR Delivery Agent",
    status: "remote_preview",
    requiresExplicitApproval: true,
    readiness,
    proposal,
    commandPreview,
    blockingIssues: readiness.blockingIssues,
    remoteActions: disabledRemoteActions(),
  };
}

function createRemotePr({
  repoRoot,
  task,
  approval = {},
  preview = createRemotePreview({ repoRoot, task }),
  executeRemoteCommands = executeRemotePrCommands,
}) {
  const missingFields = requiredRemoteApprovalFields.filter((field) => !approval[field]);

  if (missingFields.length > 0) {
    return {
      ...preview,
      status: "requires_explicit_approval",
      pushed: false,
      prCreated: false,
      requiredFields: requiredRemoteApprovalFields,
      missingFields,
      remoteActions: disabledRemoteActions(),
    };
  }

  const blockingIssues = [...preview.blockingIssues];
  if (approval.confirmedBranchName !== preview.readiness.currentBranch) {
    blockingIssues.push("Confirmed branch name does not match current branch.");
  }
  if (approval.confirmedCommitHash !== preview.readiness.currentCommit) {
    blockingIssues.push("Confirmed commit hash does not match current HEAD.");
  }

  if (blockingIssues.length > 0) {
    return {
      ...preview,
      status: "remote_readiness_blocked",
      pushed: false,
      prCreated: false,
      blockingIssues,
      remoteActions: disabledRemoteActions(),
    };
  }

  if (preview.proposal?.safety && !preview.proposal.safety.allowed) {
    return {
      ...preview,
      status: "remote_readiness_blocked",
      pushed: false,
      prCreated: false,
      blockingIssues: ["Delivery safety gate failed for remote PR creation."],
      remoteActions: disabledRemoteActions(),
    };
  }

  const execution = executeRemoteCommands({ repoRoot, proposal: preview.proposal });

  return {
    ...preview,
    status: "pr_created",
    pushed: true,
    prCreated: true,
    approved: true,
    pushOutput: execution.pushOutput,
    prOutput: execution.prOutput,
    remoteActions: { push: true, pr: true },
  };
}

function createRemoteReadinessCheck({ repoRoot }) {
  const remotes = parseRemotes(git(repoRoot, ["remote", "-v"], { allowFailure: true }));
  const currentBranch = git(repoRoot, ["branch", "--show-current"], { allowFailure: true });
  const currentCommit = git(repoRoot, ["rev-parse", "HEAD"], { allowFailure: true });
  const statusShort = git(repoRoot, ["status", "--porcelain"], { allowFailure: true, trim: false }).replace(/\r?\n$/, "");
  const baseBranch = resolveBaseBranch(repoRoot);
  const commitsAheadOfBase = baseBranch ? countCommitsAhead(repoRoot, baseBranch) : 0;
  const ghInstalled = runGh(["--version"]).status === 0;
  const ghAuthStatus = ghInstalled ? runGh(["auth", "status"]) : { status: 1, stdout: "", stderr: "gh is not installed" };
  const remoteBranch = hasOrigin(remotes) && currentBranch
    ? checkRemoteBranch(repoRoot, "origin", currentBranch)
    : { exists: false, checked: false, output: "" };
  const relatedPr = ghInstalled && ghAuthStatus.status === 0 && currentBranch
    ? checkRelatedPr(repoRoot, currentBranch)
    : { exists: false, checked: false, output: "" };

  const blockingIssues = [];
  if (!hasOrigin(remotes)) blockingIssues.push("Missing origin remote.");
  if (!currentBranch.startsWith("ai-delivery/")) blockingIssues.push("Current branch must start with ai-delivery/.");
  if (statusShort.trim()) blockingIssues.push("Working tree must be clean before remote PR creation.");
  if (!currentCommit) blockingIssues.push("Current branch must have a commit.");
  if (!baseBranch) blockingIssues.push("Could not resolve base branch (main or master).");
  if (baseBranch && commitsAheadOfBase < 1) {
    blockingIssues.push("Current branch must contain a local commit ahead of base branch.");
  }
  if (!ghInstalled) blockingIssues.push("GitHub CLI (gh) is not installed.");
  if (ghInstalled && ghAuthStatus.status !== 0) blockingIssues.push("GitHub CLI is not authenticated.");
  if (remoteBranch.checked === false && hasOrigin(remotes) && currentBranch) {
    blockingIssues.push("Could not check whether the remote branch already exists.");
  }
  if (remoteBranch.exists) blockingIssues.push("Remote branch already exists.");
  if (relatedPr.checked === false && ghInstalled && ghAuthStatus.status === 0 && currentBranch) {
    blockingIssues.push("Could not check whether a related PR already exists.");
  }
  if (relatedPr.exists) blockingIssues.push("A related PR already exists.");

  return {
    remote: hasOrigin(remotes) ? "origin" : null,
    remotes,
    currentBranch,
    currentCommit,
    workingTreeClean: !statusShort.trim(),
    statusShort,
    baseBranch,
    commitsAheadOfBase,
    branchHasLocalCommit: commitsAheadOfBase > 0,
    ghInstalled,
    ghAuth: {
      ok: ghInstalled && ghAuthStatus.status === 0,
      stdout: ghAuthStatus.stdout?.trim() || "",
      stderr: ghAuthStatus.stderr?.trim() || "",
    },
    remoteBranch,
    relatedPr,
    ready: blockingIssues.length === 0,
    blockingIssues,
  };
}

function createPrProposal({ repoRoot, task, readiness }) {
  const sourceBranch = readiness.currentBranch || createBranchName(task);
  const baseBranch = readiness.baseBranch || "main";
  const changedFiles = listChangedFilesForProposal(repoRoot, baseBranch, task);
  const diffSummary = createCommittedDiffSummary(repoRoot, baseBranch);
  const safety = createSafetyReport(changedFiles);
  const prTitle = createCommitMessage(task).split("\n")[0].replace(/^feat:/, "feat:");
  const testSummary = task.report?.testStatus || "unknown";
  const prBody = [
    "## Summary",
    `- Skill: ${task.dsl?.targetSkillId || "unknown-skill"}`,
    `- Task: ${task.id || "unknown-task"}`,
    `- Requirement: ${task.requirement || task.dsl?.rawRequirement || "No requirement recorded."}`,
    "",
    "## Changed files",
    ...(changedFiles.length > 0 ? changedFiles.map((file) => `- ${file}`) : ["- No changed files detected"]),
    "",
    "## Test summary",
    `- ${testSummary}`,
    "",
    "## Safety",
    `- ${safety.message}`,
    "",
    "Generated by AI Super Individual PR Delivery Agent.",
  ].join("\n");

  return {
    targetRemote: readiness.remote || "origin",
    sourceBranch,
    baseBranch,
    prTitle,
    prBody,
    changedFiles,
    diffSummary,
    testSummary,
    safety,
  };
}

function createCommandPreview(proposal) {
  return [
    `git push -u ${proposal.targetRemote} ${proposal.sourceBranch}`,
    `gh pr create --base ${proposal.baseBranch} --head ${proposal.sourceBranch} --title ${quoteForPreview(proposal.prTitle)} --body ${quoteForPreview(proposal.prBody)}`,
  ];
}

function executeRemotePrCommands({ repoRoot, proposal }) {
  const pushOutput = git(repoRoot, ["push", "-u", proposal.targetRemote, proposal.sourceBranch]);
  const prResult = runGh([
    "pr",
    "create",
    "--base",
    proposal.baseBranch,
    "--head",
    proposal.sourceBranch,
    "--title",
    proposal.prTitle,
    "--body",
    proposal.prBody,
  ], { cwd: repoRoot });

  if (prResult.status !== 0) {
    const error = new Error(prResult.stderr || prResult.stdout || "gh pr create failed");
    error.statusCode = 500;
    throw error;
  }

  return {
    pushOutput,
    prOutput: prResult.stdout.trim(),
  };
}

function createBranchName(task) {
  const skill = sanitizeRefSegment(task?.dsl?.targetSkillId || "unknown-skill");
  const taskId = sanitizeRefSegment(task?.id || "task");
  return `ai-delivery/${skill}-${taskId}`.slice(0, 120);
}

function createCommitMessage(task) {
  const skillId = task?.dsl?.targetSkillId || "unknown-skill";
  const skillName = task?.dsl?.skillName || skillId;
  const taskId = task?.id || "unknown-task";
  const requirement = task?.requirement || task?.dsl?.rawRequirement || "No requirement recorded.";

  return [
    `feat: deliver ${skillId} task ${taskId}`,
    "",
    `Skill: ${skillId}`,
    `Skill name: ${skillName}`,
    `Task: ${taskId}`,
    `Requirement: ${requirement}`,
    "",
    coAuthorTrailer,
    "",
  ].join("\n");
}

function createOrSwitchBranch(repoRoot, branchName) {
  const existingBranch = spawnGit(repoRoot, ["rev-parse", "--verify", branchName]);
  if (existingBranch.status === 0) {
    git(repoRoot, ["switch", branchName]);
    return;
  }

  git(repoRoot, ["switch", "-c", branchName]);
}

function createDiffSummary(repoRoot, changedFiles) {
  const trackedStat = git(repoRoot, ["diff", "--stat", "HEAD", "--"]);
  const untrackedFiles = changedFiles.filter((file) => !gitPathTracked(repoRoot, file));

  if (untrackedFiles.length === 0) return trackedStat;

  const untrackedSummary = ["Untracked files:", ...untrackedFiles.map((file) => `  ${file}`)].join("\n");
  return [trackedStat, untrackedSummary].filter(Boolean).join("\n");
}

function createCommittedDiffSummary(repoRoot, baseBranch) {
  return git(repoRoot, ["diff", "--stat", `${baseBranch}...HEAD`], { allowFailure: true })
    || git(repoRoot, ["show", "--stat", "--oneline", "HEAD"], { allowFailure: true });
}

function listChangedFilesForProposal(repoRoot, baseBranch, task) {
  const output = git(repoRoot, ["diff", "--name-only", `${baseBranch}...HEAD`], { allowFailure: true });
  const files = output ? output.split(/\r?\n/).filter(Boolean).sort() : [];
  return files.length > 0 ? files : [...(task.report?.changedFiles || [])].sort();
}

function createSafetyReport(changedFiles) {
  const disallowedFiles = changedFiles.filter((file) => !isAllowedPath(file));
  return {
    allowed: disallowedFiles.length === 0,
    allowedPathPrefixes,
    disallowedFiles,
    message: disallowedFiles.length === 0
      ? "All changed files are inside allowed delivery paths."
      : "Some changed files are outside allowed delivery paths.",
  };
}

function parseChangedFiles(statusShort) {
  if (!statusShort.trim()) return [];

  return statusShort
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const pathPart = line.slice(3).trim();
      return pathPart.includes(" -> ") ? pathPart.split(" -> ").pop() : pathPart;
    })
    .sort();
}

function parseRemotes(output) {
  if (!output.trim()) return [];
  return output
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [name, url, type] = line.split(/\s+/);
      return { name, url, type: type?.replace(/[()]/g, "") || "" };
    });
}

function hasOrigin(remotes) {
  return remotes.some((remote) => remote.name === "origin");
}

function resolveBaseBranch(repoRoot) {
  for (const ref of ["refs/heads/main", "refs/remotes/origin/main", "refs/heads/master", "refs/remotes/origin/master"]) {
    if (spawnGit(repoRoot, ["show-ref", "--verify", "--quiet", ref]).status === 0) {
      return ref.replace("refs/heads/", "").replace("refs/remotes/", "");
    }
  }
  return null;
}

function countCommitsAhead(repoRoot, baseBranch) {
  const result = git(repoRoot, ["rev-list", "--count", `${baseBranch}..HEAD`], { allowFailure: true });
  return Number(result || 0);
}

function checkRemoteBranch(repoRoot, remote, branchName) {
  const result = spawnGit(repoRoot, ["ls-remote", "--heads", remote, branchName]);
  return {
    exists: result.status === 0 && Boolean(result.stdout.trim()),
    checked: result.status === 0,
    output: result.stdout.trim() || result.stderr.trim(),
  };
}

function checkRelatedPr(repoRoot, branchName) {
  const result = runGh(["pr", "list", "--head", branchName, "--json", "number,url,state,title"], { cwd: repoRoot });
  return {
    exists: result.status === 0 && result.stdout.trim() !== "[]" && result.stdout.trim() !== "",
    checked: result.status === 0,
    output: result.stdout.trim() || result.stderr.trim(),
  };
}

function gitPathTracked(repoRoot, filePath) {
  return spawnGit(repoRoot, ["ls-files", "--error-unmatch", filePath]).status === 0;
}

function isAllowedPath(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  return allowedPathPrefixes.some((prefix) => normalized.startsWith(prefix));
}

function sanitizeRefSegment(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "task";
}

function quoteForPreview(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, "\\\"").replace(/\n/g, "\\n")}"`;
}

function disabledRemoteActions() {
  return { push: false, pr: false };
}

function git(repoRoot, args, options = {}) {
  const result = spawnGit(repoRoot, args, options);
  if (result.status !== 0) {
    if (options.allowFailure) return "";
    const error = new Error(result.stderr || result.stdout || `git ${args.join(" ")} failed`);
    error.statusCode = 500;
    throw error;
  }
  return options.trim === false ? result.stdout : result.stdout.trim();
}

function spawnGit(repoRoot, args, options = {}) {
  return spawnSync("git", ["-c", `safe.directory=${repoRoot}`, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    input: options.input,
    timeout: 15000,
  });
}

function runGh(args, options = {}) {
  return spawnSync("gh", args, {
    cwd: options.cwd,
    encoding: "utf8",
    env: options.cwd ? ghEnvWithSafeDirectory(options.cwd) : process.env,
    timeout: 15000,
  });
}

function ghEnvWithSafeDirectory(repoRoot) {
  return {
    ...process.env,
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: "safe.directory",
    GIT_CONFIG_VALUE_0: repoRoot,
  };
}

module.exports = {
  createDeliveryPreview,
  createLocalCommit,
  createPrPlaceholder,
  createRemotePreview,
  createRemotePr,
  createRemoteReadinessCheck,
  createPrProposal,
  createCommandPreview,
  executeRemotePrCommands,
  createBranchName,
  createCommitMessage,
  parseChangedFiles,
  createSafetyReport,
};
