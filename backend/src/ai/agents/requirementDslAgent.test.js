const { createRequirementDsl } = require("./requirementDslAgent");

describe("Requirement DSL Agent", () => {
  test("structures PM language into an executable delivery DSL", () => {
    const dsl = createRequirementDsl("文章详情页新增字数统计", {
      matchedSkill: {
        id: "article-word-stats",
        name: "Article word stats",
        requirementType: "frontend-display",
        acceptanceCriteria: ["文章详情页正文下方显示字数", "展示预计阅读时间"],
      },
      missingQuestions: [],
      clarifications: {},
    });

    expect(dsl.rawRequirement).toBe("文章详情页新增字数统计");
    expect(dsl.targetSkillId).toBe("article-word-stats");
    expect(dsl.requirementType).toBe("frontend-display");
    expect(dsl.acceptanceCriteria).toEqual(
      expect.arrayContaining(["文章详情页正文下方显示字数", "展示预计阅读时间"]),
    );
    expect(dsl.pipeline).toEqual([
      "pm-clarifier",
      "requirement-dsl",
      "context-rag",
      "module-locator",
      "solution-planner",
      "code-writer",
      "test-runner",
      "delivery-reporter",
    ]);
  });
});
