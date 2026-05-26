const fs = require("node:fs");
const path = require("node:path");

function loadSkills(skillsDirectory) {
  if (!fs.existsSync(skillsDirectory)) return [];

  return fs
    .readdirSync(skillsDirectory)
    .filter((fileName) => fileName.endsWith(".json"))
    .sort()
    .map((fileName) => {
      const filePath = path.join(skillsDirectory, fileName);
      const skill = JSON.parse(fs.readFileSync(filePath, "utf8"));
      validateSkill(skill, fileName);
      return { ...skill, sourceFile: fileName };
    });
}

function validateSkill(skill, fileName) {
  const requiredFields = ["id", "name", "requirementType", "keywords", "contextHints"];
  const missingFields = requiredFields.filter((field) => !skill[field]);

  if (missingFields.length > 0) {
    throw new Error(`${fileName} missing required fields: ${missingFields.join(", ")}`);
  }

  if (!Array.isArray(skill.keywords) || !Array.isArray(skill.contextHints)) {
    throw new Error(`${fileName} keywords and contextHints must be arrays`);
  }
}

module.exports = { loadSkills };
