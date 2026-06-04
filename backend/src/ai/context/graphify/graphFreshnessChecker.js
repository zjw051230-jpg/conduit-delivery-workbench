const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const META_FILE = "graphify-context-meta.json";
const MAX_GRAPH_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function getGitHead(repoRoot) {
  const result = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: repoRoot,
    encoding: "utf8",
    timeout: 10000,
  });
  return result.status === 0 ? result.stdout.trim() : "";
}

function hashFile(absPath) {
  if (!fs.existsSync(absPath)) return null;
  return crypto.createHash("sha256").update(fs.readFileSync(absPath)).digest("hex");
}

function loadGraphifyMeta(repoRoot) {
  const metaPath = path.join(repoRoot, "graphify-out", META_FILE);
  if (!fs.existsSync(metaPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(metaPath, "utf8"));
  } catch (error) {
    return { parseError: error.message };
  }
}

function writeGraphifyMeta({ repoRoot, candidateFiles = [] }) {
  const metaPath = path.join(repoRoot, "graphify-out", META_FILE);
  fs.mkdirSync(path.dirname(metaPath), { recursive: true });
  const meta = {
    repoRoot,
    indexedAt: new Date().toISOString(),
    gitHead: getGitHead(repoRoot),
    fileHashes: Object.fromEntries(candidateFiles.map((filePath) => [
      normalizePath(filePath),
      hashFile(path.join(repoRoot, filePath)),
    ])),
  };
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  return meta;
}

function checkGraphFreshness({ repoRoot, graphPath, candidateFiles = [] }) {
  if (!graphPath || !fs.existsSync(graphPath)) return { fresh: false, reason: "graph_missing", warnings: [] };
  const warnings = [];
  const meta = loadGraphifyMeta(repoRoot);
  if (!meta) return { fresh: "unknown", reason: "missing_meta", warnings };
  if (meta.parseError) return { fresh: "unknown", reason: "meta_parse_error", warnings: [{ type: "meta_parse_error", message: meta.parseError }] };

  if (Date.now() - fs.statSync(graphPath).mtimeMs > MAX_GRAPH_AGE_MS) {
    warnings.push({ type: "graph_age_warning", message: "graph.json is older than the recommended freshness window." });
  }

  const currentHead = getGitHead(repoRoot);
  if (meta.gitHead && currentHead && meta.gitHead !== currentHead) {
    return { fresh: false, reason: "git_head_changed", gitHead: currentHead, indexedGitHead: meta.gitHead, warnings };
  }

  for (const filePath of candidateFiles.map(normalizePath).filter(Boolean)) {
    const expectedHash = meta.fileHashes?.[filePath];
    if (!expectedHash) continue;
    const currentHash = hashFile(path.join(repoRoot, filePath));
    if (currentHash !== expectedHash) {
      return { fresh: false, reason: "file_hash_changed", filePath, warnings };
    }
  }

  return { fresh: true, reason: "fresh", warnings };
}

function normalizePath(filePath) {
  return filePath ? String(filePath).replace(/\\/g, "/") : filePath;
}

module.exports = {
  checkGraphFreshness,
  getGitHead,
  hashFile,
  loadGraphifyMeta,
  writeGraphifyMeta,
};
