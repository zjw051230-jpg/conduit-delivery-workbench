const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const projectRoot = path.resolve(__dirname, "../..");

function getConfig() {
  const targetRepoPath = process.env.TARGET_REPO_PATH || process.env.CONDUIT_REPO_PATH || "../conduit-realworld-example-app";
  return {
    port: Number(process.env.PORT || 4000),
    projectRoot,
    conduitRepoPath: path.resolve(projectRoot, targetRepoPath),
    targetRepoPath: path.resolve(projectRoot, targetRepoPath),
    graphifyRoot: process.env.GRAPHIFY_ROOT
      ? path.resolve(projectRoot, process.env.GRAPHIFY_ROOT)
      : path.resolve(projectRoot, "../graphify-8/graphify-8"),
    graphifyAutoBuild: String(process.env.GRAPHIFY_AUTO_BUILD || "false").toLowerCase() === "true",
    codeAgentMode: String(process.env.CODE_AGENT_MODE || "deterministic").toLowerCase(),
    ark: {
      apiKey: process.env.ARK_API_KEY || "",
      model: process.env.ARK_MODEL || "",
      baseUrl: process.env.ARK_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3",
    },
  };
}

module.exports = { getConfig };
