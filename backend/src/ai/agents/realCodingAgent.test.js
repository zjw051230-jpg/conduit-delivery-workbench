const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  applyModelOperations,
  buildSafetyPolicy,
  parseModelResponse,
  runRealCodingAgent,
} = require("./realCodingAgent");

function createRepoFixture() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "real-coding-agent-"));
  write(repoRoot, "frontend/src/App.jsx", "export default function App() {\n  return <h1>Old</h1>;\n}\n");
  write(repoRoot, "backend/server.js", "console.log('server');\n");
  return repoRoot;
}

function write(root, relativePath, content) {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

describe("Real Coding Agent", () => {
  test("applies model-generated file operations inside allowed paths", async () => {
    const repoRoot = createRepoFixture();

    const result = await runRealCodingAgent({
      repoRoot,
      finalDsl: {
        rawRequirement: "Change heading",
        allowedChanges: ["frontend/"],
        forbiddenChanges: ["backend/"],
        contextHints: ["frontend/src/App.jsx"],
      },
      ark: { apiKey: "test", model: "test", baseUrl: "https://example.test" },
      chatCompletionImpl: async () => ({
        configured: true,
        content: JSON.stringify({
          summary: "Updated heading.",
          operations: [
            {
              type: "replace",
              path: "frontend/src/App.jsx",
              find: "<h1>Old</h1>",
              replace: "<h1>New</h1>",
            },
            {
              type: "write_file",
              path: "frontend/src/newHelper.js",
              content: "export const label = 'New';\n",
            },
          ],
        }),
        usage: { total_tokens: 42 },
        latencyMs: 7,
      }),
    });

    expect(result.status).toBe("changed");
    expect(result.changedFiles).toEqual(["frontend/src/App.jsx", "frontend/src/newHelper.js"]);
    expect(fs.readFileSync(path.join(repoRoot, "frontend/src/App.jsx"), "utf8")).toContain("<h1>New</h1>");
    expect(fs.readFileSync(path.join(repoRoot, "frontend/src/newHelper.js"), "utf8")).toContain("label");
    expect(result.modelUsage).toEqual({ total_tokens: 42 });
  });

  test("rejects forbidden paths and rolls back earlier writes", () => {
    const repoRoot = createRepoFixture();
    const safety = buildSafetyPolicy({
      allowedChanges: ["frontend/"],
      forbiddenChanges: ["backend/"],
    });

    const result = applyModelOperations({
      repoRoot,
      safety,
      operations: [
        {
          type: "replace",
          path: "frontend/src/App.jsx",
          find: "Old",
          replace: "New",
        },
        {
          type: "write_file",
          path: "backend/server.js",
          content: "console.log('changed');\n",
        },
      ],
    });

    expect(result.status).toBe("failed");
    expect(result.errorType).toBe("forbidden_path");
    expect(fs.readFileSync(path.join(repoRoot, "frontend/src/App.jsx"), "utf8")).toContain("Old");
    expect(fs.readFileSync(path.join(repoRoot, "backend/server.js"), "utf8")).toContain("server");
  });

  test("does not edit files when the model is not configured", async () => {
    const repoRoot = createRepoFixture();

    const result = await runRealCodingAgent({
      repoRoot,
      finalDsl: { allowedChanges: ["frontend/"] },
      ark: {},
      chatCompletionImpl: async () => ({
        configured: false,
        content: "ARK_API_KEY or ARK_MODEL is not configured.",
        usage: null,
        latencyMs: 0,
      }),
    });

    expect(result.status).toBe("failed");
    expect(result.errorType).toBe("model_not_configured");
    expect(fs.readFileSync(path.join(repoRoot, "frontend/src/App.jsx"), "utf8")).toContain("Old");
  });

  test("parses fenced JSON but rejects malformed output", () => {
    expect(parseModelResponse("```json\n{\"operations\":[]}\n```")).toEqual({
      ok: true,
      value: { operations: [] },
    });
    expect(parseModelResponse("not-json")).toMatchObject({ ok: false });
  });
});
