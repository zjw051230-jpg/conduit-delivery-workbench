const { spawnSync } = require("node:child_process");

function runTestCommands({ repoRoot, commands = [], enabled = false }) {
  if (!enabled) {
    return {
      agent: "Test Runner / Fix Agent",
      status: "skipped",
      results: [],
      message: "Tests were not run. Set runTests=true to execute Skill-defined commands.",
    };
  }

  const results = commands.map((command) => runCommand(repoRoot, command));
  const failed = results.filter((result) => result.exitCode !== 0);

  return {
    agent: "Test Runner / Fix Agent",
    status: failed.length > 0 ? "failed" : "passed",
    results,
    message: failed.length > 0 ? "One or more test commands failed." : "All test commands passed.",
  };
}

function runCommand(cwd, command) {
  const result = spawnSync(command, {
    cwd,
    shell: true,
    encoding: "utf8",
    timeout: 120000,
  });

  return {
    command,
    exitCode: result.status ?? 1,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

module.exports = { runTestCommands };
