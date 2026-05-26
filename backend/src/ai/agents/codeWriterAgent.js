const fs = require("node:fs");
const path = require("node:path");

const coverImageMigrationPath = "backend/migrations/20260524000000-add-cover-image-to-articles.js";

function applyCodeChanges({ repoRoot, dsl }) {
  if (dsl.targetSkillId === "article-word-stats") {
    return applyArticleWordStats(repoRoot);
  }

  if (dsl.targetSkillId === "popular-tags-badge") {
    return applyPopularTagsBadge(repoRoot);
  }

  if (dsl.targetSkillId === "article-cover-image") {
    return applyArticleCoverImage(repoRoot);
  }

  return {
    status: "skipped",
    changedFiles: [],
    message: `Writer for ${dsl.targetSkillId || "unknown skill"} is not implemented yet.`,
  };
}

function previewCodeChanges({ dsl }) {
  if (dsl.targetSkillId === "article-word-stats") {
    return {
      status: "preview",
      changedFiles: [
        "frontend/src/helpers/readingStats.js",
        "frontend/src/helpers/readingStats.test.js",
        "frontend/src/routes/Article/Article.jsx",
      ],
      message: "Set applyChanges=true to write these files into the Conduit sandbox repo.",
    };
  }

  if (dsl.targetSkillId === "popular-tags-badge") {
    return {
      status: "preview",
      changedFiles: [
        "frontend/src/components/PopularTags/TagButton.jsx",
        "frontend/src/styles.css",
      ],
      message: "Set applyChanges=true to add Top badges to Popular Tags.",
    };
  }

  if (dsl.targetSkillId === "article-cover-image") {
    return {
      status: "preview",
      changedFiles: [
        "backend/models/Article.js",
        coverImageMigrationPath,
        "backend/controllers/articles.js",
        "frontend/src/components/ArticleEditorForm/ArticleEditorForm.jsx",
        "frontend/src/services/setArticle.js",
        "frontend/src/routes/Article/Article.jsx",
        "frontend/src/components/ArticlesPreview/ArticlesPreview.jsx",
        "frontend/src/styles.css",
      ],
      message: "Set applyChanges=true to add the coverImage field across the Conduit stack.",
    };
  }

  return {
    status: "planner_only",
    changedFiles: [],
    message: "Matched skill can plan and locate modules, but no writer is implemented yet.",
  };
}

function applyArticleWordStats(repoRoot) {
  const changedFiles = [];
  const helperPath = safeRepoPath(repoRoot, "frontend/src/helpers/readingStats.js");
  const helperTestPath = safeRepoPath(repoRoot, "frontend/src/helpers/readingStats.test.js");
  const articlePath = safeRepoPath(repoRoot, "frontend/src/routes/Article/Article.jsx");

  if (writeIfChanged(helperPath, readingStatsHelperSource())) {
    changedFiles.push("frontend/src/helpers/readingStats.js");
  }

  if (writeIfChanged(helperTestPath, readingStatsTestSource())) {
    changedFiles.push("frontend/src/helpers/readingStats.test.js");
  }

  const originalArticle = fs.readFileSync(articlePath, "utf8");
  const updatedArticle = addReadingStatsToArticle(originalArticle);
  if (writeIfChanged(articlePath, updatedArticle)) {
    changedFiles.push("frontend/src/routes/Article/Article.jsx");
  }

  return {
    status: changedFiles.length > 0 ? "changed" : "unchanged",
    changedFiles,
    message: changedFiles.length > 0 ? "Applied article word stats Skill." : "Article word stats Skill was already applied.",
  };
}

function applyPopularTagsBadge(repoRoot) {
  const changedFiles = [];
  const tagButtonPath = safeRepoPath(repoRoot, "frontend/src/components/PopularTags/TagButton.jsx");
  const stylesPath = safeRepoPath(repoRoot, "frontend/src/styles.css");
  const originalTagButton = fs.readFileSync(tagButtonPath, "utf8");
  const originalStyles = fs.readFileSync(stylesPath, "utf8");
  const updatedTagButton = addTopBadgeToTagButton(originalTagButton);
  const updatedStyles = addTopBadgeStyles(originalStyles);

  if (writeIfChanged(tagButtonPath, updatedTagButton)) {
    changedFiles.push("frontend/src/components/PopularTags/TagButton.jsx");
  }

  if (writeIfChanged(stylesPath, updatedStyles)) {
    changedFiles.push("frontend/src/styles.css");
  }

  return {
    status: changedFiles.length > 0 ? "changed" : "unchanged",
    changedFiles,
    message: changedFiles.length > 0 ? "Applied popular tags badge Skill." : "Popular tags badge Skill was already applied.",
  };
}

function applyArticleCoverImage(repoRoot) {
  const changedFiles = [];
  const modelPath = safeRepoPath(repoRoot, "backend/models/Article.js");
  const migrationPath = safeRepoPath(repoRoot, coverImageMigrationPath);
  const controllerPath = safeRepoPath(repoRoot, "backend/controllers/articles.js");
  const editorPath = safeRepoPath(repoRoot, "frontend/src/components/ArticleEditorForm/ArticleEditorForm.jsx");
  const servicePath = safeRepoPath(repoRoot, "frontend/src/services/setArticle.js");
  const articlePath = safeRepoPath(repoRoot, "frontend/src/routes/Article/Article.jsx");
  const previewPath = safeRepoPath(repoRoot, "frontend/src/components/ArticlesPreview/ArticlesPreview.jsx");
  const stylesPath = safeRepoPath(repoRoot, "frontend/src/styles.css");

  if (writeIfChanged(modelPath, addCoverImageToArticleModel(fs.readFileSync(modelPath, "utf8")))) {
    changedFiles.push("backend/models/Article.js");
  }

  if (writeIfChanged(migrationPath, coverImageMigrationSource())) {
    changedFiles.push(coverImageMigrationPath);
  }

  if (writeIfChanged(controllerPath, addCoverImageToArticlesController(fs.readFileSync(controllerPath, "utf8")))) {
    changedFiles.push("backend/controllers/articles.js");
  }

  if (writeIfChanged(editorPath, addCoverImageToArticleEditor(fs.readFileSync(editorPath, "utf8")))) {
    changedFiles.push("frontend/src/components/ArticleEditorForm/ArticleEditorForm.jsx");
  }

  if (writeIfChanged(servicePath, addCoverImageToSetArticleService(fs.readFileSync(servicePath, "utf8")))) {
    changedFiles.push("frontend/src/services/setArticle.js");
  }

  if (writeIfChanged(articlePath, addCoverImageToArticleRoute(fs.readFileSync(articlePath, "utf8")))) {
    changedFiles.push("frontend/src/routes/Article/Article.jsx");
  }

  if (writeIfChanged(previewPath, addCoverImageToArticlesPreview(fs.readFileSync(previewPath, "utf8")))) {
    changedFiles.push("frontend/src/components/ArticlesPreview/ArticlesPreview.jsx");
  }

  if (writeIfChanged(stylesPath, addCoverImageStyles(fs.readFileSync(stylesPath, "utf8")))) {
    changedFiles.push("frontend/src/styles.css");
  }

  return {
    status: changedFiles.length > 0 ? "changed" : "unchanged",
    changedFiles,
    message: changedFiles.length > 0 ? "Applied article cover image Skill." : "Article cover image Skill was already applied.",
  };
}

function addReadingStatsToArticle(source) {
  let output = source.replace(/\r\n/g, "\n");

  if (!output.includes("../../helpers/readingStats")) {
    output = output.replace(
      'import Markdown from "markdown-to-jsx";\n',
      'import Markdown from "markdown-to-jsx";\nimport { calculateReadingStats } from "../../helpers/readingStats";\n',
    );
  }

  if (!output.includes("const readingStats = calculateReadingStats(body);")) {
    const realArticlePattern = /  const \{ title, body, tagList, createdAt, author \} = article \|\| \{\};\n/;
    if (realArticlePattern.test(output)) {
      output = output.replace(
        realArticlePattern,
        '  const { title, body, tagList, createdAt, author } = article || {};\n  const readingStats = calculateReadingStats(body);\n',
      );
    } else {
      output = output.replace(
        /(  const body = .*;\n)/,
        '$1  const readingStats = calculateReadingStats(body);\n',
      );
    }
  }

  if (!output.includes('className="reading-stats"')) {
    output = output.replace(
      '            {body && <Markdown options={{ forceBlock: true }}>{body}</Markdown>}\n',
      '            {body && <Markdown options={{ forceBlock: true }}>{body}</Markdown>}\n            {body && (\n              <p className="reading-stats">\n                本文共 {readingStats.wordCount} 字，预计阅读 {readingStats.minutes} 分钟\n              </p>\n            )}\n',
    );
  }

  return output;
}

function addTopBadgeToTagButton(source) {
  let output = source.replace(/\r\n/g, "\n");

  if (!output.includes("tagsList.slice(0, 50).map((name, index)")) {
    output = output.replace(
      "tagsList.slice(0, 50).map((name) => (",
      "tagsList.slice(0, 50).map((name, index) => (",
    );
  }

  if (!output.includes('className="top-tag-badge"')) {
    output = output.replace(
      "      {name}\n",
      '      {index < 5 && <span className="top-tag-badge">TOP {index + 1}</span>}\n      {name}\n',
    );
  }

  return output;
}

function addTopBadgeStyles(source) {
  let output = source.replace(/\r\n/g, "\n");

  if (!output.includes(".top-tag-badge")) {
    output += `\n.top-tag-badge {\n  display: inline-block;\n  margin-right: 0.35rem;\n  padding: 0.1rem 0.3rem;\n  color: #fff;\n  font-size: 0.62rem;\n  font-weight: 700;\n  line-height: 1;\n  background: #f59f00;\n  border-radius: 999px;\n}\n`;
  }

  return output;
}

function addCoverImageToArticleModel(source) {
  let output = source.replace(/\r\n/g, "\n");

  if (!output.includes("coverImage: DataTypes.STRING")) {
    output = output.replace("      body: DataTypes.TEXT,\n", "      body: DataTypes.TEXT,\n      coverImage: DataTypes.STRING,\n");
  }

  return output;
}

function addCoverImageToArticlesController(source) {
  let output = source.replace(/\r\n/g, "\n");

  output = output.replace(
    "const { title, description, body, tagList } = req.body.article;",
    "const { title, description, body, tagList, coverImage } = req.body.article;",
  );
  output = output.replace(
    "const { title, description, body } = req.body.article;",
    "const { title, description, body, coverImage } = req.body.article;",
  );

  if (!output.includes("coverImage: coverImage")) {
    output = output.replace(/(\s+body: body,\n)(\s+}\);)/, "$1      coverImage: coverImage,\n$2");
  }

  if (!output.includes("if (coverImage !== undefined) article.coverImage = coverImage;")) {
    output = output.replace(
      /^(\s*)if \(body\) article\.body = body;\n/m,
      "$1if (body) article.body = body;\n$1if (coverImage !== undefined) article.coverImage = coverImage;\n",
    );
  }

  output = output.replace(
    /(^[ \t]*if \(coverImage !== undefined\) article\.coverImage = coverImage;\n)(?:[ \t]*if \(coverImage !== undefined\) article\.coverImage = coverImage;\n)+/m,
    "$1",
  );

  return output;
}

function addCoverImageToArticleEditor(source) {
  let output = source.replace(/\r\n/g, "\n");

  output = output.replace(
    'const emptyForm = { title: "", description: "", body: "", tagList: "" };',
    'const emptyForm = { title: "", description: "", body: "", tagList: "", coverImage: "" };',
  );
  output = output.replace(
    "const [{ title, description, body, tagList }, setForm]",
    "const [{ title, description, body, tagList, coverImage }, setForm]",
  );
  output = output.replace(
    "({ author: { username }, body, description, tagList, title })",
    "({ author: { username }, body, description, tagList, title, coverImage })",
  );
  output = output.replace(
    "setForm({ body, description, tagList, title });",
    "setForm({ body, description, tagList, title, coverImage });",
  );
  output = output.replace(
    "setArticle({ headers, slug, body, description, tagList, title })",
    "setArticle({ headers, slug, body, description, tagList, title, coverImage })",
  );
  output = output.replace(
    "setArticle({ headers, slug, body, description, tagList, title });",
    "setArticle({ headers, slug, body, description, tagList, title, coverImage });",
  );

  if (!output.includes('name="coverImage"')) {
    output = output.replace(
      '\n\n        <fieldset className="form-group">\n          <textarea',
      '\n\n        <FormFieldset\n          normal\n          placeholder="Cover image URL"\n          name="coverImage"\n          value={coverImage}\n          handler={inputHandler}\n        ></FormFieldset>\n\n        <fieldset className="form-group">\n          <textarea',
    );
  }

  return output;
}

function addCoverImageToSetArticleService(source) {
  let output = source.replace(/\r\n/g, "\n");

  output = output.replace(
    "async function setArticle({ body, description, headers, slug, tagList, title })",
    "async function setArticle({ body, description, headers, slug, tagList, title, coverImage })",
  );
  output = output.replace(
    "data: { article: { title, description, body, tagList } },",
    "data: { article: { title, description, body, tagList, coverImage } },",
  );

  return output;
}

function addCoverImageToArticleRoute(source) {
  let output = source.replace(/\r\n/g, "\n");

  output = output.replace(
    "const { title, body, tagList, createdAt, author } = article || {};",
    "const { title, body, tagList, createdAt, author, coverImage } = article || {};",
  );

  if (!output.includes('className="article-cover-image"')) {
    output = output.replace(
      '            {body && <Markdown options={{ forceBlock: true }}>{body}</Markdown>}\n',
      '            {coverImage && (\n              <img className="article-cover-image" src={coverImage} alt={title || "Article cover"} />\n            )}\n            {body && <Markdown options={{ forceBlock: true }}>{body}</Markdown>}\n',
    );
  }

  return output;
}

function addCoverImageToArticlesPreview(source) {
  let output = source.replace(/\r\n/g, "\n");

  if (!output.includes('className="article-cover-image preview-cover-image"')) {
    output = output.replace(
      "        <h1>{article.title}</h1>\n",
      '        {article.coverImage && (\n          <img\n            className="article-cover-image preview-cover-image"\n            src={article.coverImage}\n            alt={article.title || "Article cover"}\n          />\n        )}\n        <h1>{article.title}</h1>\n',
    );
  }

  return output;
}

function addCoverImageStyles(source) {
  let output = source.replace(/\r\n/g, "\n");

  if (!output.includes(".article-cover-image")) {
    output += `\n.article-cover-image {\n  display: block;\n  width: 100%;\n  max-height: 360px;\n  margin-bottom: 1.5rem;\n  object-fit: cover;\n  border-radius: 12px;\n}\n\n.preview-cover-image.article-cover-image {\n  max-height: 180px;\n  margin-bottom: 1rem;\n}\n`;
  }

  return output;
}

function safeRepoPath(repoRoot, relativePath) {
  const root = path.resolve(repoRoot);
  const fullPath = path.resolve(root, relativePath);
  if (!fullPath.startsWith(root + path.sep)) {
    throw new Error(`Refusing to write outside repo root: ${relativePath}`);
  }
  return fullPath;
}

function writeIfChanged(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (fs.existsSync(filePath) && fs.readFileSync(filePath, "utf8") === content) {
    return false;
  }
  fs.writeFileSync(filePath, content);
  return true;
}

function readingStatsHelperSource() {
  return `function calculateReadingStats(body = "") {\n  const normalizedBody = String(body || "")\n    .replace(/[#$*_>\\[\\]().-]/g, " ")\n    .replace(/\\s+/g, " ")\n    .trim();\n\n  if (!normalizedBody) {\n    return { wordCount: 0, minutes: 0 };\n  }\n\n  const cjkCharacters = normalizedBody.match(/[\\u4e00-\\u9fff]/g) || [];\n  const latinWords = normalizedBody\n    .replace(/[\\u4e00-\\u9fff]/g, " ")\n    .split(/\\s+/)\n    .filter(Boolean);\n  const wordCount = cjkCharacters.length + latinWords.length;\n\n  return {\n    wordCount,\n    minutes: Math.max(1, Math.ceil(wordCount / 250)),\n  };\n}\n\nexport { calculateReadingStats };\nexport default calculateReadingStats;\n`;
}

function readingStatsTestSource() {
  return `import { calculateReadingStats } from "./readingStats";\n\ndescribe("calculateReadingStats", () => {\n  test("counts mixed Chinese characters and latin words", () => {\n    expect(calculateReadingStats("你好 Conduit world")).toEqual({\n      wordCount: 4,\n      minutes: 1,\n    });\n  });\n\n  test("returns zero stats for empty body", () => {\n    expect(calculateReadingStats("")).toEqual({ wordCount: 0, minutes: 0 });\n  });\n});\n`;
}

function coverImageMigrationSource() {
  return `"use strict";\n\nmodule.exports = {\n  async up(queryInterface, Sequelize) {\n    await queryInterface.addColumn("Articles", "coverImage", {\n      type: Sequelize.STRING,\n    });\n  },\n\n  async down(queryInterface) {\n    await queryInterface.removeColumn("Articles", "coverImage");\n  },\n};\n`;
}

module.exports = {
  applyCodeChanges,
  previewCodeChanges,
  addReadingStatsToArticle,
  addTopBadgeToTagButton,
  addTopBadgeStyles,
  addCoverImageToArticleModel,
  addCoverImageToArticlesController,
  addCoverImageToArticleEditor,
  addCoverImageToSetArticleService,
  addCoverImageToArticleRoute,
  addCoverImageToArticlesPreview,
  addCoverImageStyles,
};
