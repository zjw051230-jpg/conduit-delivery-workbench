class SkillRegistry {
  constructor(skills = []) {
    this.skills = skills;
  }

  list() {
    return this.skills;
  }

  match(requirement) {
    const normalizedRequirement = normalizeText(requirement);
    const ranked = this.skills
      .map((skill) => ({ skill, score: scoreSkill(skill, normalizedRequirement) }))
      .sort((left, right) => right.score - left.score || skillPriority(right.skill) - skillPriority(left.skill));

    return ranked[0]?.score > 0 ? ranked[0].skill : null;
  }
}

function scoreSkill(skill, normalizedRequirement) {
  return getSkillKeywords(skill).reduce((score, keyword) => {
    const normalizedKeyword = normalizeText(keyword);
    if (!normalizedKeyword) return score;
    return normalizedRequirement.includes(normalizedKeyword) ? score + keywordWeight(keyword) : score;
  }, 0);
}

function getSkillKeywords(skill = {}) {
  if (Array.isArray(skill.keywords)) return skill.keywords;
  if (Array.isArray(skill.triggers)) return skill.triggers;
  return [];
}

function skillPriority(skill = {}) {
  if (skill.type === "requirement-execution") return 3;
  if (skill.type === "delivery") return 2;
  if (skill.type === "understanding") return 1;
  return 0;
}

function keywordWeight(keyword) {
  return keyword.length >= 4 ? 3 : 1;
}

function normalizeText(text = "") {
  return String(text).toLowerCase().replace(/\s+/g, "");
}

module.exports = { SkillRegistry, normalizeText, scoreSkill, getSkillKeywords, skillPriority };
