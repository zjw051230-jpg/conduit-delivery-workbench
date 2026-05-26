const path = require("node:path");
const { loadSkills } = require("./skillLoader");
const { SkillRegistry } = require("./skillRegistry");

describe("AI skill registry", () => {
  test("loads skill definitions from files and matches PM intent", () => {
    const skills = loadSkills(path.join(__dirname, "definitions"));
    const registry = new SkillRegistry(skills);

    const matched = registry.match("文章详情页新增字数统计，顺便估算阅读时间");

    expect(skills.some((skill) => skill.id === "article-word-stats")).toBe(true);
    expect(matched.id).toBe("article-word-stats");
    expect(matched.contextHints).toEqual(
      expect.arrayContaining(["frontend/src/routes/Article/Article.jsx"]),
    );
  });
});
