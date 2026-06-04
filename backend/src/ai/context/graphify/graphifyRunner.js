const { spawn } = require("node:child_process");

function runGraphifyBuild({ repoRoot, graphifyRoot, mode = "build", spawnImpl = spawn }) {
  return runPythonModule({ repoRoot, graphifyRoot, mode, spawnImpl }).then((result) => {
    if (result.exitCode === 0) return result;
    return runSystemGraphify({ repoRoot, mode, previousAttempt: result, spawnImpl });
  });
}

function runPythonModule({ repoRoot, graphifyRoot, mode, spawnImpl }) {
  const args = ["-m", "graphify", quote(repoRoot), "--no-viz", "--directed"];
  if (mode === "update") args.push("--update");
  return runCommand(`py ${args.join(" ")}`, { cwd: graphifyRoot, mode, strategy: "python_module", spawnImpl });
}

function runSystemGraphify({ repoRoot, mode, previousAttempt, spawnImpl }) {
  const args = [quote(repoRoot), "--no-viz", "--directed"];
  if (mode === "update") args.push("--update");
  return runCommand(`graphify ${args.join(" ")}`, {
    cwd: process.cwd(),
    mode,
    strategy: "system_command",
    previousAttempt,
    spawnImpl,
  });
}

function runCommand(command, metadata) {
  return new Promise((resolve) => {
    const child = metadata.spawnImpl(command, {
      cwd: metadata.cwd,
      shell: true,
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      resolve({
        status: "graphify_build_failed",
        mode: metadata.mode,
        strategy: metadata.strategy,
        command,
        stdout,
        stderr: stderr || error.message,
        exitCode: 1,
        previousAttempt: metadata.previousAttempt,
      });
    });
    child.on("close", (exitCode) => {
      resolve({
        status: exitCode === 0 ? "completed" : "graphify_build_failed",
        mode: metadata.mode,
        strategy: metadata.strategy,
        command,
        stdout,
        stderr,
        exitCode,
        previousAttempt: metadata.previousAttempt,
      });
    });
  });
}

function quote(value) {
  return `"${String(value).replace(/"/g, '\\"')}"`;
}

module.exports = { runGraphifyBuild };
