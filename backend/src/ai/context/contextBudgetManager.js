const DEFAULT_BUDGETS = {
  planAgent: {
    graphEvidenceMaxChars: 4000,
    snippetsMaxChars: 12000,
    traceMaxChars: 2000,
  },
  codegenAgent: {
    snippetsMaxChars: 18000,
    traceMaxChars: 1000,
  },
  repairAgent: {
    errorMaxChars: 5000,
    snippetsMaxChars: 12000,
    patchSummaryMaxChars: 4000,
  },
};

function applyContextBudget(agentName, context = {}) {
  const agentType = resolveAgentType(agentName);
  const budget = DEFAULT_BUDGETS[agentType];
  const beforeContext = clonePlain(context);
  const afterContext = clonePlain(context);
  const truncations = [];

  if (agentType === "planAgent") {
    truncateAtPath(afterContext, ["contextPackage", "graph_evidence"], budget.graphEvidenceMaxChars, truncations);
    truncateAtPath(afterContext, ["targetSnippets"], budget.snippetsMaxChars, truncations);
    truncateAtPath(afterContext, ["relevantSnippets"], budget.snippetsMaxChars, truncations);
    truncateAtPath(afterContext, ["traceSummary"], budget.traceMaxChars, truncations);
  }

  if (agentType === "codegenAgent") {
    truncateAtPath(afterContext, ["targetSnippets"], budget.snippetsMaxChars, truncations);
    truncateAtPath(afterContext, ["relevantSnippets"], budget.snippetsMaxChars, truncations);
    truncateAtPath(afterContext, ["traceSummary"], budget.traceMaxChars, truncations);
  }

  if (agentType === "repairAgent") {
    truncateAtPath(afterContext, ["errorSummary"], budget.errorMaxChars, truncations);
    truncateAtPath(afterContext, ["relevantSnippets"], budget.snippetsMaxChars, truncations);
    truncateAtPath(afterContext, ["targetSnippets"], budget.snippetsMaxChars, truncations);
    truncateAtPath(afterContext, ["failedPatchSummary"], budget.patchSummaryMaxChars, truncations);
    stripSandboxLogFields(afterContext, truncations);
  }

  afterContext.budget_report = summarizeBudgetUsage(beforeContext, afterContext);
  afterContext.budget_report.agent_type = agentType;
  afterContext.budget_report.truncated_fields = mergeTruncatedFields(afterContext.budget_report.truncated_fields, truncations);
  return afterContext;
}

function truncateString(value, maxChars) {
  const text = String(value || "");
  if (text.length <= maxChars) return text;
  return text.slice(0, Math.max(0, maxChars));
}

function truncateArrayByTextSize(items = [], maxChars, itemToText = defaultItemToText) {
  const output = [];
  let used = 0;

  for (const item of rankContextItemsByImportance(Array.isArray(items) ? items : [])) {
    const itemText = String(itemToText(item) || "");
    if (used >= maxChars) break;

    if (used + itemText.length <= maxChars) {
      output.push(clonePlain(item));
      used += itemText.length;
      continue;
    }

    const remaining = Math.max(0, maxChars - used);
    if (remaining > 0) output.push(truncateItem(item, remaining));
    break;
  }

  return output;
}

function rankContextItemsByImportance(items = []) {
  return [...items].sort((left, right) => importanceScore(right) - importanceScore(left));
}

function summarizeBudgetUsage(beforeContext = {}, afterContext = {}) {
  const beforeChars = textSize(beforeContext);
  const afterWithoutReport = clonePlain(afterContext);
  delete afterWithoutReport.budget_report;
  const afterChars = textSize(afterWithoutReport);

  return {
    before_chars: beforeChars,
    after_chars: afterChars,
    saved_chars: Math.max(0, beforeChars - afterChars),
    truncated_fields: findTruncatedFields(beforeContext, afterWithoutReport),
  };
}

function resolveAgentType(agentName) {
  const normalizedName = String(agentName || "").toLowerCase();
  if (/(repair|fix|test|runner)/.test(normalizedName)) return "repairAgent";
  if (/(code|writer|implement)/.test(normalizedName)) return "codegenAgent";
  return "planAgent";
}

function truncateAtPath(context, pathParts, maxChars, truncations) {
  const current = getPath(context, pathParts);
  if (current === undefined || current === null) return;

  if (Array.isArray(current)) setPath(context, pathParts, rankContextItemsByImportance(current));
  const rankedCurrent = getPath(context, pathParts);
  const beforeSize = textSize(current);
  if (beforeSize <= maxChars) return;

  const nextValue = Array.isArray(rankedCurrent)
    ? truncateArrayByTextSize(rankedCurrent, maxChars)
    : truncateValue(rankedCurrent, maxChars);
  setPath(context, pathParts, nextValue);
  truncations.push({
    field: pathParts.join("."),
    before_chars: beforeSize,
    after_chars: textSize(nextValue),
    max_chars: maxChars,
  });
}

function truncateValue(value, maxChars) {
  if (typeof value === "string") return truncateString(value, maxChars);
  if (Array.isArray(value)) return truncateArrayByTextSize(value, maxChars);
  if (!value || typeof value !== "object") return value;

  const output = {};
  let used = 0;
  for (const [key, nestedValue] of Object.entries(value)) {
    if (used >= maxChars) break;
    const nestedSize = textSize(nestedValue);
    if (used + nestedSize <= maxChars) {
      output[key] = clonePlain(nestedValue);
      used += nestedSize;
      continue;
    }
    output[key] = truncateValue(nestedValue, Math.max(0, maxChars - used));
    break;
  }
  return output;
}

function truncateItem(item, maxChars) {
  if (typeof item === "string") return truncateString(item, maxChars);
  if (!item || typeof item !== "object") return item;

  const output = {};
  let used = 0;
  for (const [key, value] of Object.entries(item)) {
    if (used >= maxChars) break;
    const size = textSize(value);
    if (used + size <= maxChars) {
      output[key] = clonePlain(value);
      used += size;
      continue;
    }
    output[key] = truncateValue(value, Math.max(0, maxChars - used));
    break;
  }
  return output;
}

function stripSandboxLogFields(value, truncations, pathParts = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => stripSandboxLogFields(item, truncations, [...pathParts, String(index)]));
    return;
  }
  if (!value || typeof value !== "object") return;

  for (const key of Object.keys(value)) {
    const currentPath = [...pathParts, key];
    if (["sandboxLog", "stdout", "stderr", "log"].includes(key)) {
      truncations.push({
        field: currentPath.join("."),
        before_chars: textSize(value[key]),
        after_chars: 0,
        max_chars: 0,
      });
      delete value[key];
      continue;
    }
    stripSandboxLogFields(value[key], truncations, currentPath);
  }
}

function findTruncatedFields(beforeValue, afterValue, pathParts = []) {
  if (pathParts.join(".") === "finalDsl" || pathParts.join(".") === "executionPolicy") return [];
  if (textSize(afterValue) < textSize(beforeValue)) {
    if (!beforeValue || typeof beforeValue !== "object" || Array.isArray(beforeValue)) {
      return [{ field: pathParts.join(".") || "context", before_chars: textSize(beforeValue), after_chars: textSize(afterValue) }];
    }
  }

  if (!beforeValue || typeof beforeValue !== "object") return [];
  const fields = [];
  for (const key of Object.keys(beforeValue)) {
    if (key === "budget_report") continue;
    const childPath = [...pathParts, key];
    if (!(afterValue && Object.prototype.hasOwnProperty.call(afterValue, key))) {
      fields.push({ field: childPath.join("."), before_chars: textSize(beforeValue[key]), after_chars: 0 });
      continue;
    }
    fields.push(...findTruncatedFields(beforeValue[key], afterValue[key], childPath));
  }
  return fields;
}

function mergeTruncatedFields(left = [], right = []) {
  const fields = new Map();
  for (const item of [...left, ...right]) {
    if (!item?.field) continue;
    fields.set(item.field, item);
  }
  return [...fields.values()];
}

function defaultItemToText(item) {
  return typeof item === "string" ? item : JSON.stringify(item || {});
}

function importanceScore(item = {}) {
  if (typeof item === "string") return 0;
  let score = 0;
  const confidence = String(item.confidenceKind || item.confidence || item.source || "").toUpperCase();
  if (confidence.includes("EXTRACTED")) score += 100;
  if (confidence.includes("INFERRED")) score += 30;
  if (String(item.source || "").includes("graphify")) score += 50;
  if (item.symbol || item.symbolName || item.exportName) score += 45;
  if (item.relativePath || item.path) score += 35;
  if (item.kind === "symbol_definition" || item.type === "symbol_definition") score += 30;
  if (item.kind === "callsite" || item.type === "callsite") score += 25;
  if (item.error_type || item.errorType || item.failed_command) score += 20;
  if (item.kind === "patch_hunk" || item.type === "patch_hunk") score += 10;
  if (item.lowConfidence || confidence.includes("AMBIGUOUS")) score -= 40;
  score += Number(item.score || 0);
  return score;
}

function getPath(value, pathParts) {
  return pathParts.reduce((current, part) => (current && current[part] !== undefined ? current[part] : undefined), value);
}

function setPath(value, pathParts, nextValue) {
  let current = value;
  for (let index = 0; index < pathParts.length - 1; index += 1) {
    const part = pathParts[index];
    if (!current[part] || typeof current[part] !== "object") current[part] = {};
    current = current[part];
  }
  current[pathParts[pathParts.length - 1]] = nextValue;
}

function clonePlain(value) {
  if (Array.isArray(value)) return value.map(clonePlain);
  if (!value || typeof value !== "object") return value;

  const output = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    output[key] = clonePlain(nestedValue);
  }
  return output;
}

function textSize(value) {
  return JSON.stringify(value || "").length;
}

module.exports = {
  applyContextBudget,
  rankContextItemsByImportance,
  truncateString,
  truncateArrayByTextSize,
  summarizeBudgetUsage,
};
