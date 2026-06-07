const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { runPipelineAsync } = require("./runPipeline");
const { replayTask } = require("./replayTask");

const tagButtonSource = `import { useFeedContext } from "../../context/FeedContext";

function TagButton({ tagsList }) {
  const { changeTab } = useFeedContext();

  const handleClick = (e) => {
    changeTab(e, "tag");
  };

  return tagsList.slice(0, 50).map((name) => (
    <button className="tag-pill tag-default" key={name} onClick={handleClick}>
      {name}
    </button>
  ));
}

export default TagButton;
`;

function createRepoFixture() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "conduit-replay-"));
  write(repoRoot, "frontend/src/components/PopularTags/TagButton.jsx", tagButtonSource);
  write(repoRoot, "frontend/src/styles.css", ".tag-pill { color: #222; }\n");
  return repoRoot;
}

function write(root, relativePath, content) {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

describe("task replay", () => {
  test("reruns a saved dry-run task as an apply run", async () => {
    const config = { conduitRepoPath: createRepoFixture(), chatCompletionImpl: echoDslTemplate };
    const savedTask = await runPipelineAsync({
      requirement: "Popular Tags 前 5 个标签增加 TOP 标识",
      applyChanges: false,
      runTests: false,
      config,
    });
    const taskStore = {
      get: (taskId) => (taskId === savedTask.id ? savedTask : null),
      save: (task) => task,
    };

    const replayed = await replayTask({
      taskStore,
      taskId: savedTask.id,
      config,
      applyChanges: true,
      runTests: false,
    });

    const tagButton = fs.readFileSync(
      path.join(config.conduitRepoPath, "frontend/src/components/PopularTags/TagButton.jsx"),
      "utf8",
    );

    expect(replayed.replayedFrom).toBe(savedTask.id);
    expect(replayed.applyChanges).toBe(true);
    expect(replayed.report.changedFiles).toEqual([
      "frontend/src/components/PopularTags/TagButton.jsx",
      "frontend/src/styles.css",
    ]);
    expect(tagButton).toContain("top-tag-badge");
  });
});

async function echoDslTemplate({ messages }) {
  const body = JSON.parse(messages[messages.length - 1].content);
  return {
    configured: true,
    content: JSON.stringify(body.emptyTemplate),
    usage: { total_tokens: 1 },
    latencyMs: 1,
  };
}
