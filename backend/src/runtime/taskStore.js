const fs = require("node:fs");
const path = require("node:path");

class TaskStore {
  constructor(projectRoot) {
    this.tasks = new Map();
    this.runDirectory = path.join(projectRoot, ".ai-runs");
    fs.mkdirSync(this.runDirectory, { recursive: true });
  }

  save(task) {
    this.tasks.set(task.id, task);
    fs.writeFileSync(
      path.join(this.runDirectory, `${task.id}.json`),
      JSON.stringify(task, null, 2),
    );
    return task;
  }

  get(taskId) {
    if (this.tasks.has(taskId)) return this.tasks.get(taskId);
    const filePath = path.join(this.runDirectory, `${taskId}.json`);
    if (!fs.existsSync(filePath)) return null;
    const task = JSON.parse(fs.readFileSync(filePath, "utf8"));
    this.tasks.set(taskId, task);
    return task;
  }

  list() {
    return [...this.tasks.values()].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }
}

module.exports = { TaskStore };
