function createDeliveryReport({ taskId, dsl, moduleMap, solutionPlan, writeResult, testResult }) {
  return {
    agent: "Delivery Reporter Agent",
    taskId,
    summary: dsl.targetSkillId
      ? `需求命中 writer Skill：${dsl.legacySkillName || dsl.targetSkillId}，工程级 Skill：${dsl.projectSkillId || "未命中"}，状态：${writeResult.status}。`
      : dsl.projectSkillId
        ? `需求命中工程级 Skill：${dsl.projectSkillName || dsl.projectSkillId}，当前为规划模式，状态：${writeResult.status}。`
      : "需求未命中 Skill，已停止在澄清阶段。",
    changedFiles: writeResult.changedFiles || [],
    locatedFiles: moduleMap.files.map((file) => file.relativePath),
    acceptanceCriteria: solutionPlan.acceptanceCriteria || [],
    testStatus: testResult.status,
    testCommands: testResult.results?.map((result) => ({
      command: result.command,
      exitCode: result.exitCode,
    })) || [],
    projectSkill: {
      id: dsl.projectSkillId,
      riskLevel: dsl.riskLevel,
      testProfile: dsl.testProfile,
      requiredUnderstandingSkillIds: dsl.requiredUnderstandingSkillIds || [],
      deliverySkillIds: dsl.deliverySkillIds || [],
    },
    nextActions: buildNextActions(writeResult, testResult),
  };
}

function buildNextActions(writeResult, testResult) {
  const actions = [];
  if (writeResult.status === "preview") actions.push("确认后用 applyChanges=true 写入 Conduit 目标仓库。");
  if (testResult.status === "skipped") actions.push("用 runTests=true 执行 Skill 注册的测试命令。");
  if (testResult.status === "failed") actions.push("查看 Test Runner 输出，并由 Fix Agent 根据错误继续修复。");
  if (actions.length === 0) actions.push("检查变更 diff 后进入提测/PR 准备。 ");
  return actions;
}

module.exports = { createDeliveryReport };
