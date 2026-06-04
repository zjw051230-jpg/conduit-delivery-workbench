const REQUEST_TYPES = new Set(["api_contract", "route_mapping", "test_failure", "symbol_definition", "related_callsite", "config_lookup"]);
const REQUIRED_STAGES = new Set(["plan", "codegen", "repair"]);

function isMissingContextRequest(output) {
  return output?.status === "needs_more_context";
}

function normalizeMissingContextRequest(output = {}) {
  return {
    status: "needs_more_context",
    request_type: REQUEST_TYPES.has(output.request_type) ? output.request_type : "symbol_definition",
    query: String(output.query || ""),
    preferred_relations: Array.isArray(output.preferred_relations) ? output.preferred_relations : [],
    reason: String(output.reason || "Agent requested more context."),
    required_before_stage: REQUIRED_STAGES.has(output.required_before_stage) ? output.required_before_stage : "plan",
  };
}

function resolveMissingContextRequest({ output, contextPackage = {}, retrievalFn, attemptCount = 0, maxAttempts = 2 }) {
  if (!isMissingContextRequest(output)) return { status: "continue", contextPackage };
  const request = normalizeMissingContextRequest(output);
  if (attemptCount >= maxAttempts) {
    return {
      status: "human_review_required",
      reason: "context_retrieval_failed",
      missing_context_request: request,
      contextPackage,
    };
  }

  const supplemental = typeof retrievalFn === "function" ? retrievalFn(request) : null;
  return {
    status: "needs_more_context",
    missing_context_request: request,
    contextPackage: {
      ...contextPackage,
      supplemental_context: [
        ...(contextPackage.supplemental_context || []),
        ...(Array.isArray(supplemental) ? supplemental : supplemental ? [supplemental] : []),
      ],
    },
    attemptCount: attemptCount + 1,
  };
}

module.exports = {
  isMissingContextRequest,
  normalizeMissingContextRequest,
  resolveMissingContextRequest,
};
