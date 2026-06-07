# RequirementDSL v3 设计说明

> 版本：v3.0.0 final  
> 定位：PM Intent → Agent Execution Contract 的冻结版  
> 来源：基于 v0.2.2 最后一轮测试结论整理。  
> 关系：v3 不是继续扩张 Schema 的大改版，而是把 v0.2.2 的有效结构正式命名、冻结，并补上最后的生成规范与翻译规范。

---

## 1. v3 的定位

RequirementDSL v3 是当前阶段的稳定版。

它的目标不是把 DSL 变成完整 PRD，而是把 PM 口语需求压缩成后续 Agent 可执行、可约束、可评分、可澄清、可验证的结构化契约。

v3 解决的问题是：

```text
1. 尽量还原 PM 的真实业务意图。
2. 明确 Agent 可以做什么、不能做什么、必须问什么、必须停止什么。
3. 让执行前的澄清、基线探查、路径确认、测试发现都变成显式状态。
4. 防止需求还没就绪就被误交给 Agent 执行。
5. 为 DSL Scoring Engine、Readiness Gate 和 Agent Handoff Contract 提供稳定输入。
```

一句话：

```text
RequirementDSL v3 = PM Intent 压缩 + Agent 边界控制 + Readiness 判断 + 验收评分契约。
```

---

## 2. v3 继承的核心模块

v3 保留 v0.2.2 已验证有效的主体结构：

```text
meta
readiness_gates
task_profile
intent_atoms
business_semantics
baseline_behavior
scope_atoms
change_atoms
boundary_atoms
decision_policy
risk_atoms
execution_atoms
evaluation_atoms
test_oracle_detail
clarification_queue
scoring_atoms
```

这些模块冻结，不再继续大改。

---

## 3. v3 不做什么

v3 明确不做：

```text
不继续升级 v0.3 式的大改
不重构顶层模块
不新增大规模业务模块
不把 DSL 改成完整 PRD
不新增上线策略字段
不新增灰度策略字段
不新增长期数据飞轮字段
不引入复杂组织审批流
不引入复杂 policy-as-code
不实现真实 Runtime
```

---

## 4. v3 相比 v0.2.2 的最终补丁

v3 在 v0.2.2 基础上只补四类规则：

```text
1. Codex-A / PM→DSL 的 tag 生成规范。
2. Codex-A / PM→DSL 的 target_user_action 和 success_signal 抽取规则。
3. GPT-B / DSL→PRD 的 pattern 翻译规则。
4. enum dictionary 的 pattern translation rules。
```

Schema 主体不继续膨胀。

---

## 5. Codex-A 生成规范

### 5.1 tag 格式规范

DSL 中的 tag 必须满足以下规则：

```text
1. 优先使用纯英文 snake_case。
2. 允许完整中文短语，但不推荐。
3. 禁止同一个 tag 中中英混写。
4. 禁止生成 clear中文before英文、编号xxx、xxx过期explained 这类混合 tag。
5. no_*、do_not_*、*_unknown、*_missing、*_preserved、*_visible 等应使用稳定模式。
```

错误示例：

```text
clear取消影响before确认
benefit过期explained
编号pii输出
business看板
testcommand未知
wrong容量指标
```

正确示例：

```text
cancel_impact_clear_before_confirm
benefit_expiry_explained
no_pii_output
business_dashboard
test_command_unknown
wrong_capacity_metric
```

### 5.2 target_user_action 抽取规则

如果 PM 原文没有显式写 `target_user_action`，但验收标准、用户路径或核心目标中可以直接抽取，则应填充短语。

允许抽取：

```text
review_cancel_impact
confirm_cancel_subscription
view_tenant_storage_usage
select_audience_package
open_attachment_detail
check_interviewer_conflict
```

不允许脑补未出现的业务动作。

### 5.3 success_signal 抽取规则

如果 PM 原文没有显式写 `success_signal`，但验收标准中已有可观察成功结果，应填充短语。

允许抽取：

```text
cancel_impact_visible
refund_not_overpromised
quota_warning_visible
cross_tenant_visibility_blocked
scan_status_visible
sensitive_info_hidden
```

不允许脑补业务结果。

---

## 6. Stage 与 Readiness 规则

v3 初始 DSL 继续保持：

```text
lifecycle_state = draft
stage = draft
readiness_gates.ready_for_agent = false
```

PRD→DSL 初始生成时，不允许直接 ready_for_agent。

`ready_for_agent=true` 只能由 Readiness Gate 计算产生，必须同时满足：

```text
schema_valid = true
blocking_clarification_resolved = true
baseline_completed = true
path_confirmed = true
oracle_ready = true
security_privacy_checked = true
```

如果任意一项为 false，Agent 不得进入实现阶段。

---

## 7. test_oracle_detail 规则

PM→DSL 阶段不知道测试命令是正常状态。

如果测试命令未知，应使用：

```json
"verification_command_status": "unknown",
"verification_command_discovery": {
  "required": true,
  "owner_role": "agent_or_qa",
  "methods": [
    "inspect_package_scripts",
    "inspect_ci_config",
    "search_existing_tests"
  ]
},
"verification_commands": []
```

禁止生成：

```json
{
  "command": "unknown"
}
```

---

## 8. Pattern Translation Rules

v3 词典必须包含 pattern 规则，避免无限枚举 tag。

| pattern | 中文解释规则 | 示例 |
|---|---|---|
| `no_*` | 不得 / 禁止 / 不允许 | `no_pii_output` = 不得输出 PII |
| `do_not_*` | 不要 / 不得 / 不允许 | `do_not_auto_refresh` = 不自动刷新 |
| `*_page` | 页面 | `tenant_list_page` = 租户列表页 |
| `*_modal` | 弹窗 | `cancel_confirm_modal` = 取消确认弹窗 |
| `*_warning` | 提醒 | `quota_warning` = 配额提醒 |
| `*_visible` | 可见 | `scan_status_visible` = 扫描状态可见 |
| `*_hidden` | 隐藏 | `internal_sql_hidden` = 隐藏内部 SQL |
| `*_unknown` | 未知 / 待澄清 | `refund_rule_unknown` = 退款规则待澄清 |
| `*_missing` | 缺失 | `metric_definition_missing` = 指标定义缺失 |
| `*_preserved` | 保持不变 | `billing_system_preserved` = 计费系统保持不变 |
| `*_not_hardcoded` | 不硬编码 | `threshold_not_hardcoded` = 阈值不硬编码 |
| `*_clarified` | 需要澄清 / 已澄清 | `capacity_basis_clarified` = 容量口径需澄清 |
| `*_source` | 来源 | `scan_status_source` = 扫描状态来源 |
| `*_scope` | 范围 | `permission_scope` = 权限范围 |
| `*_rule` | 规则 | `refund_rule` = 退款规则 |
| `*_logic` | 逻辑 | `billing_logic` = 计费逻辑 |
| `*_flow` | 流程 | `approval_flow` = 审批流程 |
| `*_status` | 状态 | `retry_status` = 重试状态 |
| `*_state` | 状态 | `generation_state` = 生成状态 |
| `*_fallback` | 兜底策略 | `status_unknown_fallback` = 状态未知兜底 |
| `*_bypass` | 绕过 | `permission_bypass` = 权限绕过 |
| `*_leak` | 泄露 | `data_leak` = 数据泄露 |

---

## 9. v3 的冻结原则

v3 冻结以下内容：

```text
1. 顶层结构冻结。
2. readiness_gates 规则冻结。
3. business_semantics / baseline_behavior / decision_policy / clarification_queue 保留。
4. test_oracle_detail discovery 模式保留。
5. enum dictionary + pattern rules 作为 tag 解释层保留。
6. PRD 还原降噪规则保留。
```

后续不再继续围绕 DSL Schema 做大改。下一步进入：

```text
Readiness Gate
DSL Scoring Engine
Agent Handoff Contract
Post-Execution Evaluator
PRD-DSL Cycle Consistency
Demo Runner
```

---

## 10. 最终结论

RequirementDSL v3 是当前项目阶段的最终稳定版。

它不是为了让 PM 文档更漂亮，而是为了让后续 Agent：

```text
知道 PM 真正想要什么
知道哪些边界不能碰
知道哪些规则不能猜
知道哪些问题必须问人
知道什么时候不能执行
知道怎么被验收和打分
```
