const { createWorkBreakdownArtifact } = require("./workBreakdownAgent");

function createArticleWordStatsContext() {
  const dsl = {
    rawRequirement: "文章详情页新增字数统计，展示本文共多少字和预计阅读时间",
    targetSkillId: "article-word-stats",
    skillName: "文章详情字数统计",
    requirementType: "frontend-display",
    targetModules: ["frontend-route", "frontend-helper", "frontend-test"],
    acceptanceCriteria: ["文章详情页正文下方显示字数", "展示预计阅读时间", "新增计算逻辑有单元测试"],
    testCommands: ["npm test -- frontend/src/helpers/readingStats.test.js"],
  };
  const moduleMap = {
    files: [
      { relativePath: "frontend/src/routes/Article/Article.jsx", moduleType: "route", source: "skill-hint+rag" },
      { relativePath: "frontend/src/helpers/readingStats.js", moduleType: "helper", source: "skill-hint" },
    ],
  };
  const solutionPlan = {
    implementationSteps: ["Add a reading stats helper.", "Render word count below article body."],
  };

  return { dsl, moduleMap, solutionPlan };
}

describe("Work Breakdown Agent", () => {
  test("builds a frontend-focused work breakdown for article word stats", () => {
    const { dsl, moduleMap, solutionPlan } = createArticleWordStatsContext();

    const artifact = createWorkBreakdownArtifact({
      requirement: dsl.rawRequirement,
      dsl,
      moduleMap,
      solutionPlan,
    });

    expect(artifact).toMatchObject({
      type: "work_breakdown",
      title: "Work Breakdown Document",
      status: "ready",
      generatedBy: "Work Breakdown Agent",
      stage: "work-breakdown",
    });
    expect(artifact.content.frontendTasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ file: "frontend/src/routes/Article/Article.jsx" }),
        expect.objectContaining({ file: "frontend/src/helpers/readingStats.js" }),
      ]),
    );
    expect(artifact.content.backendTasks).toEqual([]);
    expect(artifact.content.dataModelTasks).toEqual([]);
    expect(artifact.content.testTasks).toEqual([
      expect.objectContaining({ command: "npm test -- frontend/src/helpers/readingStats.test.js" }),
    ]);
    expect(artifact.content.skillAssignment).toMatchObject({
      skillId: "article-word-stats",
      skillName: "文章详情字数统计",
    });
    expect(artifact.content.skillAssignment.reason).toContain("frontend-display");
    expect(artifact.content.acceptanceCriteria).toEqual(expect.arrayContaining(["文章详情页正文下方显示字数"]));
    expect(artifact.content.riskNotes.length).toBeGreaterThan(0);
  });
});
