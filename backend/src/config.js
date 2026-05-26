const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const projectRoot = path.resolve(__dirname, "../..");

function getConfig() {
  return {
    port: Number(process.env.PORT || 4000),
    projectRoot,
    conduitRepoPath: path.resolve(projectRoot, process.env.CONDUIT_REPO_PATH || "../conduit-realworld-example-app"),
    ark: {
      apiKey: process.env.ARK_API_KEY || "",
      model: process.env.ARK_MODEL || "",
      baseUrl: process.env.ARK_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3",
    },
  };
}

module.exports = { getConfig };
