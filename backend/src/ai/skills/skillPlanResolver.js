const { SkillRegistry } = require("./skillRegistry");
const { findMappedProjectSkill } = require("./skillBridge");

function resolveSkillPlan({ requirement, legacySkill, projectSkills = [] }) {
  const projectRegistry = new SkillRegistry(projectSkills);
  const directProjectSkill = projectRegistry.match(requirement);
  const mappedProjectSkill = findMappedProjectSkill(legacySkill, projectSkills);
  const primaryProjectSkill = mappedProjectSkill || directProjectSkill || null;
  const requiredUnderstandingSkills = resolveSkillsById(
    projectSkills,
    primaryProjectSkill?.requiresUnderstandingSkills || [],
  );
  const deliverySkills = ["test-repair-pr", "conduit-change-memory"]
    .map((skillId) => projectSkills.find((skill) => skill.id === skillId))
    .filter(Boolean);
  const participatingSkills = uniqueSkills([
    primaryProjectSkill,
    ...requiredUnderstandingSkills,
    ...deliverySkills,
  ]);

  return {
    legacyWriterSkill: compactLegacySkill(legacySkill),
    projectMatchedSkill: compactProjectSkill(directProjectSkill),
    mappedProjectSkill: compactProjectSkill(mappedProjectSkill),
    primaryProjectSkill: compactProjectSkill(primaryProjectSkill),
    requiredUnderstandingSkills: requiredUnderstandingSkills.map(compactProjectSkill),
    deliverySkills: deliverySkills.map(compactProjectSkill),
    skillLayer: primaryProjectSkill?.type || null,
    riskLevel: primaryProjectSkill?.riskLevel || null,
    testProfile: primaryProjectSkill?.testProfile || "unknown",
    allowedChanges: uniqueFlatMap(participatingSkills, (skill) => skill.allowedChanges || []),
    forbiddenChanges: uniqueFlatMap(participatingSkills, (skill) => skill.forbiddenChanges || []),
    safeDefaults: uniqueFlatMap(participatingSkills, (skill) => skill.clarificationPolicy?.safeDefaults || []),
    successCriteria: primaryProjectSkill?.successCriteria || [],
    primaryProjectContextHints: mergeContextHints([primaryProjectSkill]),
    projectContextHints: mergeContextHints(participatingSkills),
  };
}

function resolveSkillsById(skills, skillIds) {
  return [...new Set(skillIds)].map((skillId) => skills.find((skill) => skill.id === skillId)).filter(Boolean);
}

function mergeContextHints(skills) {
  const merged = {
    candidatePaths: [],
    searchHints: [],
    verificationSteps: [],
    excludePaths: [],
  };

  for (const skill of skills) {
    const hints = skill?.contextHints || {};
    merged.candidatePaths.push(...(hints.candidatePaths || []));
    merged.searchHints.push(...(hints.searchHints || []));
    merged.verificationSteps.push(...(hints.verificationSteps || []));
    merged.excludePaths.push(...(hints.excludePaths || []));
  }

  return Object.fromEntries(Object.entries(merged).map(([key, values]) => [key, [...new Set(values)]]));
}

function uniqueSkills(skills) {
  const seen = new Set();
  const output = [];
  for (const skill of skills) {
    if (!skill || seen.has(skill.id)) continue;
    seen.add(skill.id);
    output.push(skill);
  }
  return output;
}

function uniqueFlatMap(items, mapper) {
  return [...new Set(items.flatMap((item) => mapper(item) || []))];
}

function compactLegacySkill(skill) {
  if (!skill) return null;
  return {
    id: skill.id,
    name: skill.name,
    requirementType: skill.requirementType,
    sourceFile: skill.sourceFile,
  };
}

function compactProjectSkill(skill) {
  if (!skill) return null;
  return {
    id: skill.id,
    name: skill.name,
    type: skill.type,
    riskLevel: skill.riskLevel,
    testProfile: skill.testProfile,
    description: skill.description,
    manifestPath: skill.manifestPath,
    skillMarkdownPath: skill.skillMarkdownPath,
  };
}

module.exports = {
  resolveSkillPlan,
  compactProjectSkill,
};
