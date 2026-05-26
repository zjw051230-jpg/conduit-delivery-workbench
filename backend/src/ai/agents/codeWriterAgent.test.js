const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { applyCodeChanges } = require("./codeWriterAgent");

const articleSource = `import Markdown from "markdown-to-jsx";

function Article() {
  const body = "hello world from conduit";

  return (
    <div className="article-page">
      <div className="container page">
        <div className="row article-content">
          <div className="col-md-12">
            {body && <Markdown options={{ forceBlock: true }}>{body}</Markdown>}
            <ArticleTags tagList={[]} />
          </div>
        </div>
      </div>
    </div>
  );
}
`;

const routeArticleSource = `import Markdown from "markdown-to-jsx";
import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate, useParams } from "react-router-dom";

function Article() {
  const { state } = useLocation();
  const [article, setArticle] = useState(state || {});
  const { title, body, tagList, createdAt, author } = article || {};

  return (
    <div className="article-page">
      <BannerContainer>
        <h1>{title}</h1>
      </BannerContainer>

      <div className="container page">
        <div className="row article-content">
          <div className="col-md-12">
            {body && <Markdown options={{ forceBlock: true }}>{body}</Markdown>}
            <ArticleTags tagList={tagList} />
          </div>
        </div>
      </div>
    </div>
  );
}
`;

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

const stylesSource = `.tag-pill {
  padding-right: 0.6em;
  padding-left: 0.6em;
}
`;

const articleModelSource = `"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Article extends Model {}
  Article.init(
    {
      slug: DataTypes.STRING,
      title: DataTypes.STRING,
      description: DataTypes.TEXT,
      body: DataTypes.TEXT,
    },
    {
      sequelize,
      modelName: "Article",
    },
  );
  return Article;
};
`;

const articlesControllerSource = `const { Article, Tag, User } = require("../models");

const createArticle = async (req, res, next) => {
  const { title, description, body, tagList } = req.body.article;
  const article = await Article.create({
    slug: slugify(title),
    title: title,
    description: description,
    body: body,
  });
  res.status(201).json({ article });
};

const updateArticle = async (req, res, next) => {
  const { title, description, body } = req.body.article;
    if (title) article.title = title;
    if (description) article.description = description;
    if (body) article.body = body;
    await article.save();
    res.json({ article });
};
`;

const articleEditorSource = `import { useEffect, useState } from "react";
import setArticle from "../../services/setArticle";
import FormFieldset from "../FormFieldset";

const emptyForm = { title: "", description: "", body: "", tagList: "" };

function ArticleEditorForm() {
  const [{ title, description, body, tagList }, setForm] = useState(emptyForm);

  useEffect(() => {
    getArticle({ headers, slug })
      .then(({ author: { username }, body, description, tagList, title }) => {
        setForm({ body, description, tagList, title });
      })
      .catch(console.error);
  }, []);

  const inputHandler = (e) => {
    const type = e.target.name;
    const value = e.target.value;

    setForm((form) => ({ ...form, [type]: value }));
  };

  const formSubmit = (e) => {
    e.preventDefault();

    setArticle({ headers, slug, body, description, tagList, title });
  };

  return (
    <form onSubmit={formSubmit}>
      <fieldset>
        <FormFieldset
          placeholder="Article Title"
          name="title"
          required
          value={title}
          handler={inputHandler}
        ></FormFieldset>

        <FormFieldset
          normal
          placeholder="What's this article about?"
          name="description"
          required
          value={description}
          handler={inputHandler}
        ></FormFieldset>

        <fieldset className="form-group">
          <textarea
            className="form-control"
            rows="8"
            placeholder="Write your article (in markdown)"
            name="body"
            required
            value={body}
            onChange={inputHandler}
          ></textarea>
        </fieldset>
      </fieldset>
    </form>
  );
}
`;

const setArticleSource = `import axios from "axios";

async function setArticle({ body, description, headers, slug, tagList, title }) {
  const { data } = await axios({
    data: { article: { title, description, body, tagList } },
    headers,
    method: slug ? "PUT" : "POST",
    url: slug ? \`api/articles/\${slug}\` : "api/articles",
  });

  return data.article.slug;
}

export default setArticle;
`;

const articlesPreviewSource = `import { Link } from "react-router-dom";

function ArticlesPreview({ articles }) {
  return articles.map((article) => (
    <div className="article-preview" key={article.slug}>
      <Link to={\`/article/\${article.slug}\`} state={article} className="preview-link">
        <h1>{article.title}</h1>
        <p>{article.description}</p>
        <span>Read more...</span>
      </Link>
    </div>
  ));
}

export default ArticlesPreview;
`;

function createRepoFixture() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "conduit-code-writer-"));
  write(repoRoot, "frontend/src/routes/Article/Article.jsx", articleSource);
  write(repoRoot, "frontend/src/components/PopularTags/TagButton.jsx", tagButtonSource);
  write(repoRoot, "frontend/src/styles.css", stylesSource);
  return repoRoot;
}

function createArticleCoverRepoFixture() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "conduit-cover-writer-"));
  write(repoRoot, "backend/models/Article.js", articleModelSource);
  write(repoRoot, "backend/controllers/articles.js", articlesControllerSource);
  write(repoRoot, "frontend/src/components/ArticleEditorForm/ArticleEditorForm.jsx", articleEditorSource);
  write(repoRoot, "frontend/src/services/setArticle.js", setArticleSource);
  write(repoRoot, "frontend/src/routes/Article/Article.jsx", routeArticleSource);
  write(repoRoot, "frontend/src/components/ArticlesPreview/ArticlesPreview.jsx", articlesPreviewSource);
  write(repoRoot, "frontend/src/styles.css", stylesSource);
  return repoRoot;
}

function write(root, relativePath, content) {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

describe("Code Writer Agent", () => {
  test("applies the article word stats skill as an idempotent Conduit edit", () => {
    const repoRoot = createRepoFixture();

    const firstRun = applyCodeChanges({
      repoRoot,
      dsl: { targetSkillId: "article-word-stats" },
    });
    const secondRun = applyCodeChanges({
      repoRoot,
      dsl: { targetSkillId: "article-word-stats" },
    });

    const article = fs.readFileSync(
      path.join(repoRoot, "frontend/src/routes/Article/Article.jsx"),
      "utf8",
    );
    const helper = fs.readFileSync(
      path.join(repoRoot, "frontend/src/helpers/readingStats.js"),
      "utf8",
    );

    expect(firstRun.changedFiles).toEqual(
      expect.arrayContaining([
        "frontend/src/helpers/readingStats.js",
        "frontend/src/helpers/readingStats.test.js",
        "frontend/src/routes/Article/Article.jsx",
      ]),
    );
    expect(secondRun.changedFiles).toEqual([]);
    expect(article.match(/calculateReadingStats/g)).toHaveLength(2);
    expect(article).toContain("reading-stats");
    expect(helper).toContain("function calculateReadingStats");
  });

  test("applies the popular tags badge skill as an idempotent Conduit edit", () => {
    const repoRoot = createRepoFixture();

    const firstRun = applyCodeChanges({
      repoRoot,
      dsl: { targetSkillId: "popular-tags-badge" },
    });
    const secondRun = applyCodeChanges({
      repoRoot,
      dsl: { targetSkillId: "popular-tags-badge" },
    });

    const tagButton = fs.readFileSync(
      path.join(repoRoot, "frontend/src/components/PopularTags/TagButton.jsx"),
      "utf8",
    );
    const styles = fs.readFileSync(path.join(repoRoot, "frontend/src/styles.css"), "utf8");

    expect(firstRun.changedFiles).toEqual([
      "frontend/src/components/PopularTags/TagButton.jsx",
      "frontend/src/styles.css",
    ]);
    expect(secondRun.changedFiles).toEqual([]);
    expect(tagButton).toContain("TOP {index + 1}");
    expect(tagButton).toContain("tagsList.slice(0, 50).map((name, index)");
    expect(tagButton.match(/top-tag-badge/g)).toHaveLength(1);
    expect(styles).toContain(".top-tag-badge");
    expect(styles.match(/top-tag-badge/g)).toHaveLength(1);
  });

  test("applies the article cover image skill as an idempotent cross-stack edit", () => {
    const repoRoot = createArticleCoverRepoFixture();

    const firstRun = applyCodeChanges({
      repoRoot,
      dsl: { targetSkillId: "article-cover-image" },
    });
    const secondRun = applyCodeChanges({
      repoRoot,
      dsl: { targetSkillId: "article-cover-image" },
    });

    const model = fs.readFileSync(path.join(repoRoot, "backend/models/Article.js"), "utf8");
    const migration = fs.readFileSync(
      path.join(repoRoot, "backend/migrations/20260524000000-add-cover-image-to-articles.js"),
      "utf8",
    );
    const controller = fs.readFileSync(
      path.join(repoRoot, "backend/controllers/articles.js"),
      "utf8",
    );
    const editor = fs.readFileSync(
      path.join(repoRoot, "frontend/src/components/ArticleEditorForm/ArticleEditorForm.jsx"),
      "utf8",
    );
    const service = fs.readFileSync(path.join(repoRoot, "frontend/src/services/setArticle.js"), "utf8");
    const article = fs.readFileSync(
      path.join(repoRoot, "frontend/src/routes/Article/Article.jsx"),
      "utf8",
    );
    const preview = fs.readFileSync(
      path.join(repoRoot, "frontend/src/components/ArticlesPreview/ArticlesPreview.jsx"),
      "utf8",
    );
    const styles = fs.readFileSync(path.join(repoRoot, "frontend/src/styles.css"), "utf8");

    expect(firstRun.changedFiles).toEqual([
      "backend/models/Article.js",
      "backend/migrations/20260524000000-add-cover-image-to-articles.js",
      "backend/controllers/articles.js",
      "frontend/src/components/ArticleEditorForm/ArticleEditorForm.jsx",
      "frontend/src/services/setArticle.js",
      "frontend/src/routes/Article/Article.jsx",
      "frontend/src/components/ArticlesPreview/ArticlesPreview.jsx",
      "frontend/src/styles.css",
    ]);
    expect(secondRun.changedFiles).toEqual([]);
    expect(model).toContain("coverImage: DataTypes.STRING");
    expect(migration).toContain('queryInterface.addColumn("Articles", "coverImage"');
    expect(controller).toContain("const { title, description, body, tagList, coverImage } = req.body.article;");
    expect(controller).toContain("coverImage: coverImage");
    expect(controller).toContain("if (coverImage !== undefined) article.coverImage = coverImage;");
    expect(controller.match(/article.coverImage = coverImage/g)).toHaveLength(1);
    expect(editor).toContain('coverImage: ""');
    expect(editor).toContain('name="coverImage"');
    expect(editor).toContain("setArticle({ headers, slug, body, description, tagList, title, coverImage })");
    expect(service).toContain("coverImage");
    expect(article).toContain("const { title, body, tagList, createdAt, author, coverImage } = article || {};");
    expect(article).toContain('className="article-cover-image"');
    expect(preview).toContain('className="article-cover-image preview-cover-image"');
    expect(styles.match(/article-cover-image/g)).toHaveLength(2);
  });
});
