const fs = require("node:fs");
const path = require("node:path");

const PROMPT_DIRECTORY = path.join(__dirname, "prompts");

function loadDslV3PromptAssets() {
  return {
    design: readPrompt("RequirementDSL_v3_design.md"),
    converterPrompt: readPrompt("converter_prompt.md"),
    restorerPrompt: readPrompt("restorer_prompt.md"),
    enumDictionary: readPrompt("enum_dictionary.md"),
  };
}

function readPrompt(fileName) {
  return fs.readFileSync(path.join(PROMPT_DIRECTORY, fileName), "utf8");
}

module.exports = { loadDslV3PromptAssets };
