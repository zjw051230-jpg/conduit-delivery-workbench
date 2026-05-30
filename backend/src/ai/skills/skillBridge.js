const LEGACY_TO_PROJECT_SKILL = {
  "article-word-stats": "ui-computed-display",
  "popular-tags-badge": "ui-computed-display",
  "article-cover-image": "add-entity-field",
};

function getProjectSkillIdForLegacy(legacySkillId) {
  return legacySkillId ? LEGACY_TO_PROJECT_SKILL[legacySkillId] || null : null;
}

function findMappedProjectSkill(legacySkill, projectSkills = []) {
  const projectSkillId = getProjectSkillIdForLegacy(legacySkill?.id);
  if (!projectSkillId) return null;
  return projectSkills.find((skill) => skill.id === projectSkillId) || null;
}

module.exports = {
  LEGACY_TO_PROJECT_SKILL,
  getProjectSkillIdForLegacy,
  findMappedProjectSkill,
};
