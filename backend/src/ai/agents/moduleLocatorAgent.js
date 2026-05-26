function locateModules({ dsl, retrievedContext }) {
  const files = new Map();

  for (const filePath of dsl.contextHints || []) {
    if (filePath.includes("/") && filePath.includes(".")) {
      files.set(filePath, { relativePath: filePath, source: "skill-hint" });
    }
  }

  for (const entry of retrievedContext || []) {
    files.set(entry.relativePath, {
      relativePath: entry.relativePath,
      layer: entry.layer,
      moduleType: entry.moduleType,
      source: files.has(entry.relativePath) ? "skill-hint+rag" : "rag",
      score: entry.score,
    });
  }

  return {
    agent: "Module Locator Agent",
    targetModules: dsl.targetModules,
    files: [...files.values()],
  };
}

module.exports = { locateModules };
