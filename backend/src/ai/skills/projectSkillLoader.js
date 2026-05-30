const fs = require("node:fs");
const path = require("node:path");

const PROJECT_SKILL_TYPES = new Set(["understanding", "requirement-execution", "delivery"]);
const RISK_LEVELS = new Set(["system", "L1", "L2", "L3"]);
const TEST_PROFILES = new Set(["frontend-only", "backend-only", "fullstack-targeted", "none", "unknown"]);
const REQUIRED_MANIFEST_FIELDS = [
  "id",
  "name",
  "type",
  "version",
  "description",
  "triggers",
  "riskLevel",
  "inputs",
  "outputs",
  "successCriteria",
];

function loadProjectSkills(projectSkillsDirectory = path.join(__dirname, "project")) {
  if (!fs.existsSync(projectSkillsDirectory)) return [];

  const registryPath = path.join(projectSkillsDirectory, "registry.json");
  if (!fs.existsSync(registryPath)) return [];

  const registry = readJsonFile(registryPath);
  validateRegistry(registry, registryPath);

  return registry.skills.map((entry) => loadProjectSkill(projectSkillsDirectory, entry));
}

function loadProjectSkill(projectSkillsDirectory, entry) {
  if (!entry?.id || !entry?.manifestPath) {
    throw new Error("project skill registry entries require id and manifestPath");
  }

  const manifestPath = safeResolve(projectSkillsDirectory, entry.manifestPath);
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`project skill manifest not found: ${entry.manifestPath}`);
  }

  const manifest = readJsonFile(manifestPath);
  validateProjectSkillManifest(manifest, entry);

  const skillDirectory = path.dirname(manifestPath);
  const skillMarkdownPath = filePathIfExists(projectSkillsDirectory, path.join(skillDirectory, "SKILL.md"));

  return {
    ...manifest,
    keywords: manifest.triggers || [],
    manifestPath: toPosix(path.relative(projectSkillsDirectory, manifestPath)),
    sourceFile: toPosix(path.relative(projectSkillsDirectory, manifestPath)),
    skillMarkdownPath,
    referencePaths: listRelativeFiles(projectSkillsDirectory, path.join(skillDirectory, "references")),
    examplePaths: listRelativeFiles(projectSkillsDirectory, path.join(skillDirectory, "examples")),
  };
}

function validateRegistry(registry, registryPath) {
  if (!Array.isArray(registry.skills)) {
    throw new Error(`${registryPath} missing skills array`);
  }
}

function validateProjectSkillManifest(manifest, entry = {}) {
  const missingFields = REQUIRED_MANIFEST_FIELDS.filter((field) => manifest[field] === undefined);
  if (missingFields.length > 0) {
    throw new Error(`${entry.manifestPath || manifest.id || "project skill"} missing required fields: ${missingFields.join(", ")}`);
  }

  if (entry.id && manifest.id !== entry.id) {
    throw new Error(`${entry.manifestPath} id mismatch: expected ${entry.id}, received ${manifest.id}`);
  }

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(manifest.id)) {
    throw new Error(`${manifest.id} is not a valid project skill id`);
  }

  if (!PROJECT_SKILL_TYPES.has(manifest.type)) {
    throw new Error(`${manifest.id} has invalid type: ${manifest.type}`);
  }

  if (!RISK_LEVELS.has(manifest.riskLevel)) {
    throw new Error(`${manifest.id} has invalid riskLevel: ${manifest.riskLevel}`);
  }

  if (manifest.testProfile && !TEST_PROFILES.has(manifest.testProfile)) {
    throw new Error(`${manifest.id} has invalid testProfile: ${manifest.testProfile}`);
  }

  for (const arrayField of ["triggers", "inputs", "outputs", "successCriteria"]) {
    if (!Array.isArray(manifest[arrayField])) {
      throw new Error(`${manifest.id} ${arrayField} must be an array`);
    }
  }
}

function safeResolve(rootDirectory, relativePath) {
  const root = path.resolve(rootDirectory);
  const resolved = path.resolve(root, relativePath);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error(`Refusing to load project skill path outside root: ${relativePath}`);
  }
  return resolved;
}

function filePathIfExists(rootDirectory, absolutePath) {
  if (!fs.existsSync(absolutePath)) return null;
  return toPosix(path.relative(rootDirectory, absolutePath));
}

function listRelativeFiles(rootDirectory, directory) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  walk(directory, files);
  return files.map((file) => toPosix(path.relative(rootDirectory, file))).sort();
}

function walk(directory, files) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
}

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

module.exports = {
  loadProjectSkills,
  validateProjectSkillManifest,
  REQUIRED_MANIFEST_FIELDS,
  readJsonFile,
};
