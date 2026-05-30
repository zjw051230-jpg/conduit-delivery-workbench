const fs = require("node:fs");
const path = require("node:path");

const PROJECT_SKILL_TYPES = new Set(["understanding", "requirement-execution", "delivery"]);
const RISK_LEVELS = new Set(["system", "L1", "L2", "L3"]);
const TEST_PROFILES = new Set(["frontend-only", "backend-only", "fullstack-targeted", "none", "unknown"]);
const SKILL_STANDARDS = new Set(["agent-skills-compatible"]);
const CAPABILITY_CLASSES = new Set([
  "repository-context",
  "domain-knowledge",
  "surface-map",
  "test-intelligence",
  "task-operation",
  "quality-gate",
  "change-memory",
]);
const ACTIVATION_MODES = new Set(["dependency-loaded", "keyword-triggered", "post-task-hook", "bridge-routed"]);
const WORKFLOW_PHASES = new Set(["orient", "plan", "modify", "verify", "learn"]);
const CONTROL_ROLES = new Set(["context", "executor", "verifier", "memory"]);
const SOURCE_INFLUENCES = new Set([
  "agent-skills",
  "github-copilot-skills",
  "openhands-skills",
  "claude-code-skills",
]);
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
  "classification",
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
  const skillMarkdownAbsolutePath = path.join(skillDirectory, "SKILL.md");
  const skillMarkdownPath = filePathIfExists(projectSkillsDirectory, skillMarkdownAbsolutePath);
  if (!skillMarkdownPath) {
    throw new Error(`${manifest.id} missing SKILL.md`);
  }

  const agentSkillFrontmatter = readSkillFrontmatter(skillMarkdownAbsolutePath);
  validateSkillMarkdownFrontmatter({ manifest, frontmatter: agentSkillFrontmatter, skillMarkdownPath });

  return {
    ...manifest,
    keywords: manifest.triggers || [],
    agentSkillFrontmatter,
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

  validateClassification(manifest);

  for (const arrayField of ["triggers", "inputs", "outputs", "successCriteria"]) {
    if (!Array.isArray(manifest[arrayField])) {
      throw new Error(`${manifest.id} ${arrayField} must be an array`);
    }
  }
}

function validateClassification(manifest) {
  const classification = manifest.classification || {};
  const requiredFields = [
    "standard",
    "capabilityClass",
    "activationMode",
    "workflowPhase",
    "controlRole",
    "sourceInfluences",
  ];
  const missingFields = requiredFields.filter((field) => classification[field] === undefined);
  if (missingFields.length > 0) {
    throw new Error(`${manifest.id} classification missing required fields: ${missingFields.join(", ")}`);
  }

  validateEnum(manifest.id, "classification.standard", classification.standard, SKILL_STANDARDS);
  validateEnum(manifest.id, "classification.capabilityClass", classification.capabilityClass, CAPABILITY_CLASSES);
  validateEnum(manifest.id, "classification.activationMode", classification.activationMode, ACTIVATION_MODES);
  validateEnum(manifest.id, "classification.workflowPhase", classification.workflowPhase, WORKFLOW_PHASES);
  validateEnum(manifest.id, "classification.controlRole", classification.controlRole, CONTROL_ROLES);

  if (!Array.isArray(classification.sourceInfluences) || classification.sourceInfluences.length === 0) {
    throw new Error(`${manifest.id} classification.sourceInfluences must be a non-empty array`);
  }

  for (const influence of classification.sourceInfluences) {
    validateEnum(manifest.id, "classification.sourceInfluences", influence, SOURCE_INFLUENCES);
  }
}

function validateEnum(skillId, field, value, allowedValues) {
  if (!allowedValues.has(value)) {
    throw new Error(`${skillId} has invalid ${field}: ${value}`);
  }
}

function readSkillFrontmatter(skillMarkdownPath) {
  const content = fs.readFileSync(skillMarkdownPath, "utf8").replace(/^\uFEFF/, "");
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    throw new Error(`${skillMarkdownPath} missing YAML frontmatter`);
  }

  return parseSimpleFrontmatter(match[1]);
}

function parseSimpleFrontmatter(frontmatterText) {
  return frontmatterText.split(/\r?\n/).reduce((metadata, line) => {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) return metadata;
    const [, key, rawValue] = match;
    metadata[key] = stripYamlString(rawValue);
    return metadata;
  }, {});
}

function stripYamlString(value) {
  const trimmed = String(value || "").trim();
  const quoted = trimmed.match(/^["'](.*)["']$/);
  return quoted ? quoted[1] : trimmed;
}

function validateSkillMarkdownFrontmatter({ manifest, frontmatter, skillMarkdownPath }) {
  for (const field of ["name", "description"]) {
    if (!frontmatter[field]) {
      throw new Error(`${skillMarkdownPath} missing frontmatter ${field}`);
    }
  }

  if (frontmatter.name !== manifest.id) {
    throw new Error(`${skillMarkdownPath} frontmatter name mismatch: expected ${manifest.id}, received ${frontmatter.name}`);
  }

  if (!frontmatter.description.startsWith(manifest.description)) {
    throw new Error(`${skillMarkdownPath} frontmatter description must start with manifest description`);
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
  readSkillFrontmatter,
  REQUIRED_MANIFEST_FIELDS,
  CAPABILITY_CLASSES,
  ACTIVATION_MODES,
  WORKFLOW_PHASES,
  CONTROL_ROLES,
  readJsonFile,
};
