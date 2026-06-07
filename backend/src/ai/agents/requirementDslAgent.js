const { chatCompletion } = require("../model/openaiCompatibleClient");
const { createDslV3Template } = require("../dsl/v3/template");
const { validateRequirementDslV3 } = require("../dsl/v3/validator");
const { computeReadinessGates } = require("../dsl/v3/readinessGates");
const { loadDslV3PromptAssets } = require("../dsl/v3/promptAssets");
const { PIPELINE } = require("../dsl/v3/executionContract");

async function createRequirementDslAsync(
  requirement,
  { matchedSkill, skillPlan, missingQuestions = [], clarifications = {} } = {},
  { ark, chatCompletionImpl = chatCompletion, promptAssets = loadDslV3PromptAssets() } = {},
) {
  const template = createDslV3Template({
    requirement,
    matchedSkill,
    skillPlan,
    missingQuestions,
    clarifications,
  });

  const completion = await requestDslFromModel({
    requirement,
    matchedSkill,
    skillPlan,
    missingQuestions,
    clarifications,
    template,
    promptAssets,
    ark,
    chatCompletionImpl,
  });

  if (!completion.configured) {
    return {
      status: "failed",
      dsl: null,
      validation: { valid: false, errors: ["model_not_configured"], warnings: [] },
      modelUsage: completion.usage || null,
      latencyMs: completion.latencyMs || 0,
      message: completion.content || "ARK_API_KEY or ARK_MODEL is not configured.",
    };
  }

  if (completion.requestError) {
    return {
      status: "failed",
      dsl: null,
      validation: { valid: false, errors: ["model_request_failed"], warnings: [] },
      modelUsage: completion.usage || null,
      latencyMs: completion.latencyMs || 0,
      message: completion.requestError.message,
    };
  }

  const parsed = parseModelJson(completion.content);
  if (!parsed.ok) {
    return {
      status: "failed",
      dsl: null,
      validation: { valid: false, errors: ["invalid_json"], warnings: [] },
      modelUsage: completion.usage || null,
      latencyMs: completion.latencyMs || 0,
      message: parsed.error,
    };
  }

  const validation = validateRequirementDslV3(parsed.value);
  if (!validation.valid) {
    return {
      status: "failed",
      dsl: parsed.value,
      validation,
      modelUsage: completion.usage || null,
      latencyMs: completion.latencyMs || 0,
      message: "RequirementDSL v3 validation failed.",
    };
  }

  const dsl = attachComputedReadiness(parsed.value);
  return {
    status: missingQuestions.length > 0 ? "needs_clarification" : "draft_created",
    dsl,
    validation,
    modelUsage: completion.usage || null,
    latencyMs: completion.latencyMs || 0,
  };
}

async function requestDslFromModel({
  requirement,
  matchedSkill,
  skillPlan,
  missingQuestions,
  clarifications,
  template,
  promptAssets,
  ark,
  chatCompletionImpl,
}) {
  try {
    return await chatCompletionImpl({
      ark,
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: [
            promptAssets.converterPrompt,
            "\n\nRequirementDSL v3 design:\n",
            promptAssets.design,
            "\n\nEnum dictionary:\n",
            promptAssets.enumDictionary,
          ].join(""),
        },
        {
          role: "user",
          content: JSON.stringify({
            requirement,
            matchedSkill,
            skillPlan,
            missingQuestions,
            clarifications,
            emptyTemplate: template,
            outputContract: {
              onlyJson: true,
              topLevelKey: "requirement_dsl_v3",
              initialStage: "draft",
              readyForAgentMustRemainFalse: true,
              pipeline: PIPELINE,
            },
          }, null, 2),
        },
      ],
    });
  } catch (error) {
    return {
      configured: true,
      content: "",
      usage: null,
      latencyMs: 0,
      requestError: error,
    };
  }
}

function parseModelJson(content) {
  const stripped = String(content || "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return { ok: true, value: JSON.parse(stripped) };
  } catch (error) {
    return { ok: false, error: `Model did not return valid JSON: ${error.message}` };
  }
}

function attachComputedReadiness(dsl) {
  const next = clonePlain(dsl);
  const gates = computeReadinessGates(next);
  gates.ready_for_agent = false;
  next.requirement_dsl_v3.readiness_gates = gates;
  return next;
}

function clonePlain(value) {
  return JSON.parse(JSON.stringify(value));
}

module.exports = {
  createRequirementDslAsync,
  parseModelJson,
  PIPELINE,
};
