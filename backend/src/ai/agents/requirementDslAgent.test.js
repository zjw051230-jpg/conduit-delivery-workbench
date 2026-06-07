const { createRequirementDslAsync, parseModelJson } = require("./requirementDslAgent");
const { createDslV3Template } = require("../dsl/v3/template");

function configuredMock(content) {
  return async () => ({
    configured: true,
    content,
    usage: { total_tokens: 100 },
    latencyMs: 5,
  });
}

describe("Requirement DSL Agent", () => {
  test("structures PM language into canonical RequirementDSL v3", async () => {
    const modelDsl = createDslV3Template({
      requirement: "文章详情页新增字数统计",
      matchedSkill: {
        id: "article-word-stats",
        name: "Article word stats",
        requirementType: "frontend-display",
        acceptanceCriteria: ["文章详情页正文下方显示字数", "展示预计阅读时间"],
        testCommands: ["npm test -- frontend/src/helpers/readingStats.test.js"],
      },
      missingQuestions: [],
    });

    const result = await createRequirementDslAsync(
      "文章详情页新增字数统计",
      {
        matchedSkill: {
          id: "article-word-stats",
          name: "Article word stats",
          requirementType: "frontend-display",
          acceptanceCriteria: ["文章详情页正文下方显示字数", "展示预计阅读时间"],
          testCommands: ["npm test -- frontend/src/helpers/readingStats.test.js"],
        },
        missingQuestions: [],
        clarifications: {},
      },
      { ark: { apiKey: "test", model: "test", baseUrl: "https://example.test" }, chatCompletionImpl: configuredMock(JSON.stringify(modelDsl)) },
    );

    expect(result.status).toBe("draft_created");
    expect(result.dsl.requirement_dsl_v3.meta.dsl_version).toBe("3.0.0");
    expect(result.dsl.requirement_dsl_v3.meta.stage).toBe("draft");
    expect(result.dsl.requirement_dsl_v3.readiness_gates.ready_for_agent).toBe(false);
    expect(result.dsl.requirement_dsl_v3.intent_atoms.target_skill_id).toBe("article-word-stats");
    expect(result.validation.valid).toBe(true);
  });

  test("parses markdown fenced JSON from model output", () => {
    expect(parseModelJson("```json\n{\"requirement_dsl_v3\":{\"meta\":{}}}\n```")).toEqual({
      ok: true,
      value: { requirement_dsl_v3: { meta: {} } },
    });
  });

  test("fails on malformed model output without fallback", async () => {
    const result = await createRequirementDslAsync(
      "文章详情页新增字数统计",
      {},
      { ark: { apiKey: "test", model: "test", baseUrl: "https://example.test" }, chatCompletionImpl: configuredMock("not-json") },
    );

    expect(result.status).toBe("failed");
    expect(result.dsl).toBe(null);
    expect(result.validation.errors).toContain("invalid_json");
  });

  test("fails clearly when model is not configured", async () => {
    const result = await createRequirementDslAsync(
      "文章详情页新增字数统计",
      {},
      {
        ark: {},
        chatCompletionImpl: async () => ({
          configured: false,
          content: "ARK_API_KEY or ARK_MODEL is not configured.",
          usage: null,
          latencyMs: 0,
        }),
      },
    );

    expect(result.status).toBe("failed");
    expect(result.validation.errors).toContain("model_not_configured");
  });
});
