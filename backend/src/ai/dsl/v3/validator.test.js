const { createDslV3Template } = require("./template");
const { validateRequirementDslV3 } = require("./validator");
const { computeReadinessGates } = require("./readinessGates");
const { deriveExecutionContract } = require("./executionContract");

describe("RequirementDSL v3 validator", () => {
  test("accepts a valid draft RequirementDSL v3", () => {
    const dsl = createDslV3Template({ requirement: "Add article stats" });
    const result = validateRequirementDslV3(dsl);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test("rejects non-v3 top level and initial ready_for_agent=true", () => {
    const dsl = createDslV3Template({ requirement: "Add article stats" });
    dsl.requirement_dsl_v3.readiness_gates.ready_for_agent = true;

    expect(validateRequirementDslV3({ meta: {} }).errors).toContain("top_level_must_be_requirement_dsl_v3");
    expect(validateRequirementDslV3(dsl).errors).toContain("readiness_gates.ready_for_agent_must_be_false");
  });

  test("rejects unknown command sentinel and requires discovery for unknown status", () => {
    const dsl = createDslV3Template({ requirement: "Add article stats" });
    dsl.requirement_dsl_v3.test_oracle_detail.verification_commands = [{ command: "unknown" }];

    expect(validateRequirementDslV3(dsl).errors).toContain("verification_commands_must_not_contain_unknown_command");

    dsl.requirement_dsl_v3.test_oracle_detail.verification_commands = [];
    dsl.requirement_dsl_v3.test_oracle_detail.verification_command_discovery = null;
    expect(validateRequirementDslV3(dsl).errors).toContain("unknown_verification_command_requires_discovery");
  });

  test("computes readiness and derives legacy execution fields", () => {
    const dsl = createDslV3Template({
      requirement: "Add article stats",
      matchedSkill: {
        id: "article-word-stats",
        requirementType: "frontend-display",
        contextHints: ["frontend/src/routes/Article/Article.jsx"],
        acceptanceCriteria: ["Word count visible"],
        testCommands: ["npm test -- frontend/src/helpers/readingStats.test.js"],
      },
      skillPlan: {
        riskLevel: "L1",
        testProfile: "frontend-only",
        allowedChanges: ["Frontend source files"],
        forbiddenChanges: ["Backend source files"],
      },
    });

    expect(computeReadinessGates(dsl)).toMatchObject({
      schema_valid: true,
      ready_for_agent: false,
    });

    expect(deriveExecutionContract(dsl)).toMatchObject({
      rawRequirement: "Add article stats",
      targetSkillId: "article-word-stats",
      requirementType: "frontend-display",
      testCommands: ["npm test -- frontend/src/helpers/readingStats.test.js"],
      allowedChanges: ["Frontend source files"],
      forbiddenChanges: ["Backend source files"],
    });
  });
});
