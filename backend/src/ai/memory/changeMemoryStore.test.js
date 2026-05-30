const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { writeChangeMemory } = require("./changeMemoryStore");

describe("change memory store", () => {
  test("writes runtime memory under .ai-runs without touching source Skill assets", () => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "change-memory-store-"));
    const runDirectory = path.join(projectRoot, ".ai-runs");

    const result = writeChangeMemory({
      runDirectory,
      taskId: "task-123",
      createdAt: "2026-05-30T00:00:00.000Z",
      requirement: "Add Article.coverImage",
      dsl: {
        targetSkillId: "article-cover-image",
        projectSkillId: "add-entity-field",
        requiredUnderstandingSkillIds: ["conduit-repo-map", "conduit-domain-model"],
        deliverySkillIds: ["test-repair-pr", "conduit-change-memory"],
        status: "ready_for_planning",
      },
      writeResult: {
        status: "changed",
        changedFiles: ["VERIFIED_ARTICLE_MODEL_FILE"],
      },
      testResult: {
        status: "passed",
        results: [{ command: "npm test", exitCode: 0 }],
      },
      report: {
        summary: "Delivery report summary",
      },
      skillPlan: {
        primaryProjectSkill: { id: "add-entity-field" },
      },
    });

    const memoryRoot = path.join(runDirectory, "skill-memory", "conduit-change-memory");
    expect(result.status).toBe("completed");
    expect(result.changeRecord).toMatchObject({
      outcome: "success",
      matchedSkills: expect.arrayContaining(["article-cover-image", "add-entity-field", "conduit-change-memory"]),
    });
    expect(fs.existsSync(path.join(memoryRoot, "change-journal.md"))).toBe(true);
    expect(fs.existsSync(path.join(memoryRoot, "project-facts.md"))).toBe(true);
    expect(fs.existsSync(path.join(memoryRoot, "skill-impact-index.md"))).toBe(true);
    expect(fs.existsSync(path.join(memoryRoot, "rollout-summaries", `${result.changeRecord.changeId}.md`))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, "backend", "src", "ai", "skills", "project"))).toBe(false);
  });
});
