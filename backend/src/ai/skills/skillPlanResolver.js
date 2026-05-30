const { SkillRegistry } = require("./skillRegistry");
const { findMappedProjectSkill } = require("./skillBridge");

const WORKFLOW_PHASE_ORDER = ["orient", "plan", "modify", "verify", "learn"];

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
  const orderedProjectSkills = orderProjectSkills(participatingSkills);

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
    skillTaxonomyVersion: "v2-agent-matrix",
    projectSkillExecutionOrder: orderedProjectSkills.map(compactProjectSkill),
    capabilityClasses: uniqueClassificationValues(orderedProjectSkills, "capabilityClass"),
    activationModes: uniqueClassificationValues(orderedProjectSkills, "activationMode"),
    workflowPhases: uniqueClassificationValues(orderedProjectSkills, "workflowPhase"),
    controlRoles: uniqueClassificationValues(orderedProjectSkills, "controlRole"),
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

function orderProjectSkills(skills) {
  return skills
    .map((skill, index) => ({ skill, index }))
    .sort((left, right) => {
      const leftPhase = left.skill?.classification?.workflowPhase;
      const rightPhase = right.skill?.classification?.workflowPhase;
      return phaseIndex(leftPhase) - phaseIndex(rightPhase) || left.index - right.index;
    })
    .map(({ skill }) => skill);
}

function phaseIndex(phase) {
  const index = WORKFLOW_PHASE_ORDER.indexOf(phase);
  return index === -1 ? WORKFLOW_PHASE_ORDER.length : index;
}

function uniqueClassificationValues(skills, field) {
  return [
    ...new Set(
      skills
        .map((skill) => skill?.classification?.[field])
        .filter(Boolean),
    ),
  ];
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
    classification: skill.classification,
    manifestPath: skill.manifestPath,
    skillMarkdownPath: skill.skillMarkdownPath,
  };
}

module.exports = {
  resolveSkillPlan,
  compactProjectSkill,
  orderProjectSkills,
  WORKFLOW_PHASE_ORDER,
};
