# Skill Integration Update

本次更新将工程级 Skill 体系嵌入到 `bytdance-tianxiwei` 项目中，并保留原有 writer 能力不变。

## 更新概览

新增工程级 Skill 资产：

```txt
backend/src/ai/skills/project/
```

其中包含 9 个 Skill，分为三层：

```txt
understanding  项目理解层
requirements   需求执行层
delivery       交付与记忆层
```

系统现在会同时生成工程级 `skillPlan`，包含：

```txt
projectSkillId
riskLevel
testProfile
allowedChanges
forbiddenChanges
safeDefaults
requiredUnderstandingSkillIds
deliverySkillIds
projectContextHints
```

例如 “Popular Tags 前 5 个标签增加 TOP 标识” 会同时命中：

```txt
旧 writer Skill: popular-tags-badge
工程级 Skill: ui-computed-display
风险等级: L1
测试类型: frontend-only
```

旧 Skill 继续负责实际写代码，新 Skill 负责提供风险边界、上下文选择、禁止修改范围和测试策略。

## 新增模块

```txt
backend/src/ai/skills/projectSkillLoader.js
backend/src/ai/skills/skillBridge.js
backend/src/ai/skills/skillPlanResolver.js
backend/src/ai/memory/changeMemoryStore.js
```

作用：

```txt
projectSkillLoader   加载工程级 Skill
skillBridge          连接旧 writer Skill 和新工程级 Skill
skillPlanResolver    生成本次任务的 Skill 使用计划
changeMemoryStore    在任务完成后写入运行时记忆
```

## API 更新

扩展接口：

```txt
GET /api/ai/config
GET /api/ai/skills
POST /api/ai/context/search
```

现在接口可以返回：

```txt
legacySkills
projectSkills
legacyMatchedSkill
projectMatchedSkill
skillPlan
```

## 记忆机制

新增 `change-memory` stage。每次任务完成后，系统会把交付记录写入：

```txt
.ai-runs/skill-memory/conduit-change-memory/
```

用于记录：

```txt
本次需求
命中的 Skill
修改文件
测试结果
交付状态
后续 Skill 维护建议
```

运行时记忆不会直接写入源码 Skill 目录，避免污染稳定 Skill 资产。

## 兼容性

本次更新没有删除旧 Skill，也没有破坏现有 writer：

```txt
article-word-stats
popular-tags-badge
article-cover-image
```

当前采用双轨机制：

```txt
旧 definitions Skill -> 继续驱动现有 code writer
工程级 project Skill -> 提供治理、上下文、风险、测试、记忆
```

## 验证结果

已运行完整测试：

```txt
npm test
```

结果：

```txt
14 个测试文件通过
66 个测试通过
```

另外做了一次真实 Conduit 演示：

```txt
需求：Popular Tags 前 5 个标签增加 TOP 标识
真实修改：TagButton.jsx 和 styles.css
测试命令：npm run build -w frontend
测试结果：passed
演示后已回退所有本次改动
```

## 核心价值

更新前：

```txt
系统只知道用哪个 writer 改代码。
```

更新后：

```txt
系统知道为什么改、怎么改、能改什么、不能改什么、怎么测试、怎么交付、怎么沉淀经验。
```
