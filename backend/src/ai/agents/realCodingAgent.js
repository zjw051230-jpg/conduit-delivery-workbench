const fs = require("node:fs");
const path = require("node:path");
const { chatCompletion } = require("../model/openaiCompatibleClient");

const DEFAULT_MAX_CONTEXT_FILES = 10;
const DEFAULT_MAX_FILE_CHARS = 12000;
const SUPPORTED_OPERATIONS = new Set(["write_file", "replace"]);

async function runRealCodingAgent({
  repoRoot,
  finalDsl,
  dsl,
  solutionPlan,
  plan,
  moduleMap,
  retrievedContext,
  graphifyContextPackage,
  ark,
  chatCompletionImpl = chatCompletion,
  maxContextFiles = DEFAULT_MAX_CONTEXT_FILES,
  maxFileChars = DEFAULT_MAX_FILE_CHARS,
} = {}) {
  const resolvedDsl = finalDsl || dsl || {};
  const root = resolveRepoRoot(repoRoot);
  if (!root) {
    return failedResult("repo_root_missing", "repoRoot is required.");
  }

  const safety = buildSafetyPolicy(resolvedDsl);
  const fileContext = collectFileContext({
    repoRoot: root,
    dsl: resolvedDsl,
    solutionPlan: solutionPlan || plan,
    moduleMap,
    retrievedContext,
    graphifyContextPackage,
    maxContextFiles,
    maxFileChars,
  });

  let completion;
  try {
    completion = await chatCompletionImpl({
      ark,
      temperature: 0.1,
      messages: buildMessages({
        dsl: resolvedDsl,
        solutionPlan: solutionPlan || plan,
        moduleMap,
        fileContext,
        safety,
      }),
    });
  } catch (error) {
    return failedResult("model_request_failed", error.message);
  }

  if (!completion?.configured) {
    return {
      status: "failed",
      changedFiles: [],
      errorType: "model_not_configured",
      message: completion?.content || "Model is not configured.",
      modelUsage: completion?.usage || null,
      latencyMs: completion?.latencyMs || 0,
    };
  }

  const parsed = parseModelResponse(completion.content);
  if (!parsed.ok) {
    return {
      status: "failed",
      changedFiles: [],
      errorType: "invalid_model_output",
      message: parsed.error,
      modelUsage: completion.usage || null,
      latencyMs: completion.latencyMs || 0,
      rawModelOutputDigest: digestText(completion.content),
    };
  }

  const applyResult = applyModelOperations({
    repoRoot: root,
    operations: parsed.value.operations || [],
    safety,
  });

  return {
    status: applyResult.status,
    changedFiles: applyResult.changedFiles,
    summary: String(parsed.value.summary || ""),
    message: applyResult.message,
    errorType: applyResult.errorType,
    patchSummary: {
      changed_files: applyResult.changedFiles,
      summary: String(parsed.value.summary || applyResult.message || ""),
      important_hunks: [],
    },
    modelUsage: completion.usage || null,
    latencyMs: completion.latencyMs || 0,
    operationCount: parsed.value.operations?.length || 0,
    rawModelOutputDigest: digestText(completion.content),
  };
}

function buildMessages({ dsl, solutionPlan, moduleMap, fileContext, safety }) {
  return [
    {
      role: "system",
      content: [
        "You are a coding agent that edits a Conduit RealWorld repository.",
        "Return only valid JSON. Do not use markdown fences.",
        "You cannot run shell commands. You can only request file operations.",
        "Use the smallest correct change that satisfies the requirement.",
      ].join("\n"),
    },
    {
      role: "user",
      content: JSON.stringify({
        task: {
          finalDsl: dsl,
          solutionPlan,
          moduleMap,
        },
        safety: {
          allowedPathPrefixes: safety.allowedPathPrefixes,
          allowedExactFiles: safety.allowedExactFiles,
          forbiddenPathPrefixes: safety.forbiddenPathPrefixes,
          forbiddenExactFiles: safety.forbiddenExactFiles,
          supportedOperations: [...SUPPORTED_OPERATIONS],
        },
        fileContext,
        responseSchema: {
          summary: "short human readable summary",
          operations: [
            {
              type: "write_file",
              path: "relative/path/from/repo/root",
              content: "complete file content",
            },
            {
              type: "replace",
              path: "relative/path/from/repo/root",
              find: "exact existing text",
              replace: "replacement text",
            },
          ],
        },
      }, null, 2),
    },
  ];
}

function applyModelOperations({ repoRoot, operations, safety }) {
  if (!Array.isArray(operations)) {
    return failedApply("invalid_operations", "Model output must include an operations array.");
  }

  const backups = new Map();
  const changedFiles = [];

  try {
    for (const operation of operations) {
      validateOperation(operation, safety);
      const relativePath = normalizeRelativePath(operation.path);
      const filePath = safeRepoPath(repoRoot, relativePath);
      if (!backups.has(relativePath)) {
        backups.set(relativePath, fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null);
      }

      if (operation.type === "write_file") {
        const content = String(operation.content ?? "");
        const previous = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
        if (previous !== content) {
          fs.mkdirSync(path.dirname(filePath), { recursive: true });
          fs.writeFileSync(filePath, content);
          changedFiles.push(relativePath);
        }
      }

      if (operation.type === "replace") {
        if (!fs.existsSync(filePath)) {
          throw operationError("file_not_found", `Cannot replace text in missing file: ${relativePath}`);
        }
        const source = fs.readFileSync(filePath, "utf8");
        const find = String(operation.find ?? "");
        if (!find) {
          throw operationError("empty_find", `Replace operation for ${relativePath} has an empty find value.`);
        }
        if (!source.includes(find)) {
          throw operationError("find_text_not_found", `Replace text was not found in ${relativePath}.`);
        }
        const next = source.replace(find, String(operation.replace ?? ""));
        if (next !== source) {
          fs.writeFileSync(filePath, next);
          changedFiles.push(relativePath);
        }
      }
    }
  } catch (error) {
    rollback(repoRoot, backups);
    return failedApply(error.code || "operation_failed", error.message);
  }

  const uniqueChangedFiles = [...new Set(changedFiles)];
  return {
    status: uniqueChangedFiles.length > 0 ? "changed" : "unchanged",
    changedFiles: uniqueChangedFiles,
    message: uniqueChangedFiles.length > 0
      ? "Real coding agent applied model-generated file operations."
      : "Real coding agent produced no effective changes.",
  };
}

function validateOperation(operation, safety) {
  if (!operation || typeof operation !== "object") {
    throw operationError("invalid_operation", "Each operation must be an object.");
  }
  if (!SUPPORTED_OPERATIONS.has(operation.type)) {
    throw operationError("unsupported_operation", `Unsupported operation type: ${operation.type}`);
  }

  const relativePath = normalizeRelativePath(operation.path);
  if (!relativePath) {
    throw operationError("missing_path", "Operation path is required.");
  }
  if (isForbiddenPath(relativePath, safety)) {
    throw operationError("forbidden_path", `Operation touches a forbidden path: ${relativePath}`);
  }
  if (!isAllowedPath(relativePath, safety)) {
    throw operationError("path_not_allowed", `Operation path is outside allowed changes: ${relativePath}`);
  }
}

function parseModelResponse(content) {
  const raw = String(content || "").trim();
  const stripped = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    const value = JSON.parse(stripped);
    return { ok: true, value };
  } catch (error) {
    return { ok: false, error: `Model did not return valid JSON: ${error.message}` };
  }
}

function collectFileContext({
  repoRoot,
  dsl,
  solutionPlan,
  moduleMap,
  retrievedContext,
  graphifyContextPackage,
  maxContextFiles,
  maxFileChars,
}) {
  const candidates = [
    ...toPathList(dsl?.contextHints),
    ...toPathList(dsl?.targetFiles || dsl?.target_files),
    ...toPathList(solutionPlan?.target_files || solutionPlan?.targetFiles || solutionPlan?.files),
    ...toPathList(moduleMap?.files),
    ...toPathList(graphifyContextPackage?.target_files || graphifyContextPackage?.targetFiles),
    ...toPathList(retrievedContext),
  ];

  return [...new Set(candidates)]
    .slice(0, maxContextFiles)
    .map((relativePath) => readContextFile(repoRoot, relativePath, maxFileChars))
    .filter(Boolean);
}

function readContextFile(repoRoot, relativePath, maxFileChars) {
  try {
    const normalized = normalizeRelativePath(relativePath);
    if (!normalized) return null;
    const filePath = safeRepoPath(repoRoot, normalized);
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return null;
    const content = fs.readFileSync(filePath, "utf8");
    return {
      relativePath: normalized,
      content: content.length > maxFileChars ? content.slice(0, maxFileChars) : content,
      truncated: content.length > maxFileChars,
    };
  } catch {
    return null;
  }
}

function buildSafetyPolicy(dsl = {}) {
  const allowed = normalizePolicyEntries(dsl.allowedChanges || dsl.allowed_changes);
  const forbidden = normalizePolicyEntries(dsl.forbiddenChanges || dsl.forbidden_changes);
  return {
    allowedPathPrefixes: allowed.prefixes.length > 0 ? allowed.prefixes : ["frontend/", "backend/"],
    allowedExactFiles: allowed.exactFiles.length > 0 ? allowed.exactFiles : ["package.json", "package-lock.json"],
    forbiddenPathPrefixes: forbidden.prefixes,
    forbiddenExactFiles: forbidden.exactFiles,
  };
}

function normalizePolicyEntries(entries) {
  const prefixes = [];
  const exactFiles = [];
  for (const entry of toArray(entries)) {
    const normalized = normalizePolicyText(entry);
    if (!normalized) continue;
    if (normalized === "frontend" || normalized.includes("frontend")) prefixes.push("frontend/");
    else if (normalized === "backend" || normalized.includes("backend")) prefixes.push("backend/");
    else if (normalized.endsWith("/")) prefixes.push(normalized);
    else if (/\.[a-z0-9]+$/i.test(normalized)) exactFiles.push(normalized);
  }
  return {
    prefixes: [...new Set(prefixes)],
    exactFiles: [...new Set(exactFiles)],
  };
}

function isAllowedPath(relativePath, safety) {
  return safety.allowedExactFiles.includes(relativePath)
    || safety.allowedPathPrefixes.some((prefix) => relativePath === prefix.slice(0, -1) || relativePath.startsWith(prefix));
}

function isForbiddenPath(relativePath, safety) {
  return safety.forbiddenExactFiles.includes(relativePath)
    || safety.forbiddenPathPrefixes.some((prefix) => relativePath === prefix.slice(0, -1) || relativePath.startsWith(prefix));
}

function safeRepoPath(repoRoot, relativePath) {
  const root = path.resolve(repoRoot);
  const fullPath = path.resolve(root, relativePath);
  if (fullPath !== root && !fullPath.startsWith(root + path.sep)) {
    throw operationError("path_escape", `Refusing to access outside repo root: ${relativePath}`);
  }
  return fullPath;
}

function resolveRepoRoot(repoRoot) {
  if (!repoRoot) return null;
  const root = path.resolve(repoRoot);
  return fs.existsSync(root) ? root : null;
}

function rollback(repoRoot, backups) {
  for (const [relativePath, originalContent] of [...backups.entries()].reverse()) {
    const filePath = safeRepoPath(repoRoot, relativePath);
    if (originalContent === null) {
      if (fs.existsSync(filePath)) fs.rmSync(filePath, { force: true });
    } else {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, originalContent);
    }
  }
}

function normalizeRelativePath(value) {
  const normalized = String(value || "").replace(/\\/g, "/").replace(/^\.\/+/, "").trim();
  if (!normalized || path.isAbsolute(normalized) || normalized.includes("\0")) return "";
  const parts = normalized.split("/").filter(Boolean);
  if (parts.some((part) => part === "..")) return "";
  return parts.join("/");
}

function normalizePolicyText(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .trim();
}

function toPathList(value) {
  return toArray(value)
    .map((item) => normalizeRelativePath(typeof item === "string" ? item : item?.relativePath || item?.path || item?.file))
    .filter(Boolean);
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

function digestText(value) {
  const text = String(value || "");
  return {
    length: text.length,
    preview: text.slice(0, 160),
  };
}

function operationError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function failedApply(errorType, message) {
  return {
    status: "failed",
    changedFiles: [],
    errorType,
    message,
  };
}

function failedResult(errorType, message) {
  return {
    status: "failed",
    changedFiles: [],
    errorType,
    message,
    modelUsage: null,
    latencyMs: 0,
  };
}

module.exports = {
  runRealCodingAgent,
  applyModelOperations,
  buildSafetyPolicy,
  parseModelResponse,
};
