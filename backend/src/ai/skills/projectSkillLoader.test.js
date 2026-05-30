const path = require("node:path");
const {
  ACTIVATION_MODES,
  CAPABILITY_CLASSES,
  CONTROL_ROLES,
  WORKFLOW_PHASES,
  loadProjectSkills,
} = require("./projectSkillLoader");

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
      expect(skill.agentSkillFrontmatter.name).toBe(skill.id);
      expect(skill.agentSkillFrontmatter.description).toContain(skill.description);
      expect(skill.triggers.length).toBeGreaterThan(0);
      expect(skill.keywords).toEqual(skill.triggers);
      expect(skill.referencePaths).toEqual(expect.arrayContaining([expect.stringContaining("references/README.md")]));
      expect(skill.examplePaths).toEqual(expect.arrayContaining([expect.stringContaining("examples/sample-input.json")]));
    }
  });

  test("loads Agent Skills compatible taxonomy classification", () => {
    const skills = loadProjectSkills(path.join(__dirname, "project"));

    for (const skill of skills) {
      expect(skill.classification).toMatchObject({
        standard: "agent-skills-compatible",
      });
      expect(CAPABILITY_CLASSES.has(skill.classification.capabilityClass)).toBe(true);
      expect(ACTIVATION_MODES.has(skill.classification.activationMode)).toBe(true);
      expect(WORKFLOW_PHASES.has(skill.classification.workflowPhase)).toBe(true);
      expect(CONTROL_ROLES.has(skill.classification.controlRole)).toBe(true);
      expect(skill.classification.sourceInfluences).toEqual(
        expect.arrayContaining([
          "agent-skills",
          "github-copilot-skills",
          "openhands-skills",
          "claude-code-skills",
        ]),
      );
    }

    expect(skills.find((skill) => skill.id === "ui-computed-display").classification).toMatchObject({
      capabilityClass: "task-operation",
      activationMode: "keyword-triggered",
      workflowPhase: "modify",
      controlRole: "executor",
    });
    expect(skills.find((skill) => skill.id === "conduit-change-memory").classification).toMatchObject({
      capabilityClass: "change-memory",
      activationMode: "post-task-hook",
      workflowPhase: "learn",
      controlRole: "memory",
    });
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
