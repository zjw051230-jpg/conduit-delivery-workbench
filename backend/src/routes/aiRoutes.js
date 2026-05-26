const express = require("express");
const { loadSkills } = require("../ai/skills/skillLoader");
const { SkillRegistry } = require("../ai/skills/skillRegistry");
const { buildRepositoryIndex } = require("../ai/context/repositoryIndexer");
const { retrieveContext } = require("../ai/context/retriever");
const { runPipeline } = require("../ai/orchestration/runPipeline");
const { replayTask } = require("../ai/orchestration/replayTask");
const {
  runAlgorithmStage,
  runAllAlgorithmStages,
  runNextAlgorithmStage,
} = require("../ai/orchestration/algorithmStageRunner");
const { TASK_MODES } = require("../ai/orchestration/taskModes");
const {
  createDeliveryPreview,
  createLocalCommit,
  createRemotePreview,
  createRemotePr,
} = require("../ai/delivery/prDeliveryAgent");
const { chatCompletion } = require("../ai/model/openaiCompatibleClient");

function createAiRouter({ config, taskStore }) {
  const router = express.Router();
  const skillsDirectory = require("node:path").join(__dirname, "../ai/skills/definitions");

  router.get("/config", (req, res) => {
    const skills = loadSkills(skillsDirectory);
    res.json({
      repoPath: config.conduitRepoPath,
      ark: {
        baseUrl: config.ark.baseUrl,
        modelConfigured: Boolean(config.ark.model),
        apiKeyConfigured: Boolean(config.ark.apiKey),
      },
      skillCount: skills.length,
      skills: skills.map(({ id, name, requirementType }) => ({ id, name, requirementType })),
    });
  });

  router.get("/skills", (req, res) => {
    res.json({ skills: loadSkills(skillsDirectory) });
  });

  router.post("/context/search", (req, res) => {
    const { query = "", limit = 8 } = req.body || {};
    const skills = loadSkills(skillsDirectory);
    const matchedSkill = new SkillRegistry(skills).match(query);
    const index = buildRepositoryIndex(config.conduitRepoPath);
    const results = retrieveContext({
      query,
      index,
      contextHints: matchedSkill?.contextHints || [],
      limit,
    });
    res.json({ matchedSkill, filesIndexed: index.length, results });
  });

  router.post("/tasks", (req, res, next) => {
    try {
      const { requirement, taskMode, applyChanges = false, runTests = false } = req.body || {};
      if (!requirement || !String(requirement).trim()) {
        return res.status(400).json({ error: "requirement is required" });
      }

      const task = runPipeline({ requirement, taskMode, applyChanges, runTests, config });
      taskStore.save(task);
      return res.status(201).json({ task });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/tasks", (req, res) => {
    res.json({ tasks: taskStore.list() });
  });

  router.get("/tasks/:taskId", (req, res) => {
    const task = taskStore.get(req.params.taskId);
    if (!task) return res.status(404).json({ error: "task not found" });
    return res.json({ task });
  });

  router.get("/tasks/:taskId/stages", (req, res) => {
    const task = taskStore.get(req.params.taskId);
    if (!task) return res.status(404).json({ error: "task not found" });
    if (!isAlgorithmTask(task)) return res.status(400).json({ error: "task is not an algorithm_competition workflow" });
    return res.json({ stages: task.stages });
  });

  router.get("/tasks/:taskId/artifacts", (req, res) => {
    const task = taskStore.get(req.params.taskId);
    if (!task) return res.status(404).json({ error: "task not found" });
    if (!isAlgorithmTask(task)) return res.status(400).json({ error: "task is not an algorithm_competition workflow" });
    const artifacts = req.query.type
      ? task.artifacts.filter((artifact) => artifact.type === req.query.type)
      : task.artifacts;
    return res.json({ artifacts });
  });

  router.post("/tasks/:taskId/stages/:stageId/run", (req, res, next) => {
    try {
      const task = taskStore.get(req.params.taskId);
      if (!task) return res.status(404).json({ error: "task not found" });
      if (!isAlgorithmTask(task)) return res.status(400).json({ error: "task is not an algorithm_competition workflow" });
      const force = req.body?.force === true || req.query.force === "true";
      const { task: updatedTask, result } = runAlgorithmStage(task, req.params.stageId, { force });
      taskStore.save(updatedTask);
      return res.status(result.status === "blocked" ? 409 : 200).json({ task: updatedTask, result });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/tasks/:taskId/run-next", (req, res, next) => {
    try {
      const task = taskStore.get(req.params.taskId);
      if (!task) return res.status(404).json({ error: "task not found" });
      if (!isAlgorithmTask(task)) return res.status(400).json({ error: "task is not an algorithm_competition workflow" });
      const { task: updatedTask, result } = runNextAlgorithmStage(task);
      taskStore.save(updatedTask);
      return res.status(result.status === "blocked" ? 409 : 200).json({ task: updatedTask, result });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/tasks/:taskId/run-all", (req, res, next) => {
    try {
      const task = taskStore.get(req.params.taskId);
      if (!task) return res.status(404).json({ error: "task not found" });
      if (!isAlgorithmTask(task)) return res.status(400).json({ error: "task is not an algorithm_competition workflow" });
      const { task: updatedTask, results } = runAllAlgorithmStages(task, { fromStage: req.body?.fromStage });
      taskStore.save(updatedTask);
      const blocked = results.find((result) => result.status === "blocked");
      return res.status(blocked ? 409 : 200).json({ task: updatedTask, results });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/tasks/:taskId/replay", (req, res, next) => {
    try {
      const { taskMode, fromStage, runAll = false, applyChanges = false, runTests = false } = req.body || {};
      const task = replayTask({
        taskStore,
        taskId: req.params.taskId,
        config,
        taskMode,
        fromStage,
        runAll,
        applyChanges,
        runTests,
      });
      return res.status(201).json({ task });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/tasks/:taskId/delivery/preview", (req, res, next) => {
    try {
      const task = taskStore.get(req.params.taskId);
      if (!task) return res.status(404).json({ error: "task not found" });

      const delivery = createDeliveryPreview({ repoRoot: config.conduitRepoPath, task });
      return res.json({ delivery });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/tasks/:taskId/delivery/commit", (req, res, next) => {
    try {
      const task = taskStore.get(req.params.taskId);
      if (!task) return res.status(404).json({ error: "task not found" });

      const delivery = createLocalCommit({ repoRoot: config.conduitRepoPath, task });
      const updatedTask = attachDeliveryStage(task, delivery.status, delivery);
      taskStore.save(updatedTask);
      return res.status(201).json({ task: updatedTask, delivery });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/tasks/:taskId/delivery/remote-preview", (req, res, next) => {
    try {
      const task = taskStore.get(req.params.taskId);
      if (!task) return res.status(404).json({ error: "task not found" });

      const delivery = createRemotePreview({ repoRoot: config.conduitRepoPath, task });
      return res.json({ delivery });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/tasks/:taskId/delivery/pr", (req, res, next) => {
    try {
      const task = taskStore.get(req.params.taskId);
      if (!task) return res.status(404).json({ error: "task not found" });

      const delivery = createRemotePr({ repoRoot: config.conduitRepoPath, task, approval: req.body || {} });
      const updatedTask = attachDeliveryStage(task, delivery.status, delivery);
      taskStore.save(updatedTask);
      return res.status(202).json({ task: updatedTask, delivery });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/model/debug", async (req, res, next) => {
    try {
      const content = req.body?.message || "ping";
      const result = await chatCompletion({
        ark: config.ark,
        messages: [
          { role: "system", content: "You are an AI orchestration debug endpoint." },
          { role: "user", content },
        ],
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function isAlgorithmTask(task) {
  return task?.taskMode === TASK_MODES.ALGORITHM_COMPETITION;
}

function attachDeliveryStage(task, status, delivery) {
  const updatedTask = {
    ...task,
    status,
    delivery,
    stages: [
      ...task.stages,
      {
        name: "pr-delivery",
        status,
        completedAt: new Date().toISOString(),
        output: delivery,
      },
    ],
  };
  return updatedTask;
}

module.exports = { createAiRouter };
