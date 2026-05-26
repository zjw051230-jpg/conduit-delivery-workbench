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
      .sort((left, right) => right.score - left.score);

    return ranked[0]?.score > 0 ? ranked[0].skill : null;
  }
}

function scoreSkill(skill, normalizedRequirement) {
  return skill.keywords.reduce((score, keyword) => {
    const normalizedKeyword = normalizeText(keyword);
    if (!normalizedKeyword) return score;
    return normalizedRequirement.includes(normalizedKeyword) ? score + keywordWeight(keyword) : score;
  }, 0);
}

function keywordWeight(keyword) {
  return keyword.length >= 4 ? 3 : 1;
}

function normalizeText(text = "") {
  return String(text).toLowerCase().replace(/\s+/g, "");
}

module.exports = { SkillRegistry, normalizeText };
