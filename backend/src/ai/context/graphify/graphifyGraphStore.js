const fs = require("node:fs");
const path = require("node:path");

function loadGraphifyGraph(repoRoot) {
  const graphPath = path.join(repoRoot, "graphify-out", "graph.json");
  if (!fs.existsSync(graphPath)) {
    return { ready: false, graphPath, nodes: [], edges: [], reason: "graph_missing" };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(graphPath, "utf8"));
    return {
      ready: true,
      graphPath,
      nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
      edges: Array.isArray(parsed.edges) ? parsed.edges : Array.isArray(parsed.links) ? parsed.links : [],
    };
  } catch (error) {
    return {
      ready: false,
      graphPath,
      nodes: [],
      edges: [],
      reason: "graph_parse_error",
      error: error.message,
    };
  }
}

module.exports = { loadGraphifyGraph };
