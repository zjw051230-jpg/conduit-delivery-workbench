function clarifyRequirement(requirement, matchedSkill) {
  const missingQuestions = [];
  const trimmedRequirement = String(requirement || "").trim();

  if (trimmedRequirement.length < 8) {
    missingQuestions.push("请补充目标页面、期望展示/交互，以及是否需要改后端。 ");
  }

  if (!matchedSkill) {
    missingQuestions.push("当前需求没有命中已注册 Skill，请确认属于新增页面、新增字段、新增筛选还是新增交互。 ");
  }

  return {
    agent: "PM Clarifier Agent",
    status: missingQuestions.length > 0 ? "needs_clarification" : "ready",
    missingQuestions,
    normalizedRequirement: trimmedRequirement,
    matchedSkillId: matchedSkill?.id || null,
  };
}

module.exports = { clarifyRequirement };
