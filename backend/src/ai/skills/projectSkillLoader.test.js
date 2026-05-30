const path = require("node:path");
const { loadProjectSkills } = require("./projectSkillLoader");

describe("project Skill loader", () => {
  test("loads registry-backed engineering Skills with manifest metadata", () => {
    const skills = loadProjectSkills(path.join(__dirname, "project"));

    expect(skills).toHaveLength(9);
    expect(skills.map((skill) => skill.id)).toEqual(
      expect.arrayContaining([
        "conduit-repo-map",
        "ui-computed-display",
        "add-entity-field",
        "test-repair-pr",
        "conduit-change-memory",
      ]),
    );

    for (const skill of skills) {
      expect(skill.manifestPath).toMatch(/manifest\.json$/);
      expect(skill.skillMarkdownPath).toMatch(/SKILL\.md$/);
      expect(skill.triggers.length).toBeGreaterThan(0);
      expect(skill.keywords).toEqual(skill.triggers);
      expect(skill.referencePaths).toEqual(expect.arrayContaining([expect.stringContaining("references/README.md")]));
      expect(skill.examplePaths).toEqual(expect.arrayContaining([expect.stringContaining("examples/sample-input.json")]));
    }
  });

  test("loads change memory output contract examples", () => {
    const skills = loadProjectSkills(path.join(__dirname, "project"));
    const memorySkill = skills.find((skill) => skill.id === "conduit-change-memory");

    expect(memorySkill).toMatchObject({
      type: "delivery",
      riskLevel: "system",
      testProfile: "none",
    });
    expect(memorySkill.outputs).toEqual(
      expect.arrayContaining(["changeRecord", "memoryUpdates", "skillImpactAnalysis", "writePlan"]),
    );
    expect(memorySkill.referencePaths).toEqual(
      expect.arrayContaining([
        "delivery/conduit-change-memory/references/memory-model.md",
        "delivery/conduit-change-memory/references/change-journal.md",
        "delivery/conduit-change-memory/references/project-facts.md",
        "delivery/conduit-change-memory/references/skill-impact-index.md",
      ]),
    );
  });
});
