# RequirementDSL v3 Enum Dictionary

| tag | 中文含义 | 类型 | 备注 |
|---|---|---|---|
| `repo_read` | 读取代码库 | tool | 允许读取仓库文件和代码结构 |
| `repo_write` | 修改代码库 | tool | 允许写入或修改仓库文件 |
| `browser` | 浏览器验证工具 | tool | 用于 UI 页面、交互或可视结果验证 |
| `api_client` | API 调试工具 | tool | 用于请求接口、验证响应和状态码 |
| `log_viewer` | 日志查看工具 | tool | 用于查看运行日志或错误日志 |
| `test_runner` | 测试运行器 | tool | 用于执行测试命令、lint、typecheck 等 |
| `patch` | 代码补丁 | evidence | Agent 实际产生的代码变更 |
| `test_report` | 测试报告 | evidence | 测试命令运行结果和摘要 |
| `diff_summary` | 变更摘要 | evidence | 说明改了哪些文件和逻辑 |
| `screenshot` | 截图证据 | evidence | 用于 UI 结果的视觉证据 |
| `api_response` | API 响应证据 | evidence | 接口返回内容、状态码或字段结果 |
| `log_excerpt` | 日志片段 | evidence | 截断后的关键日志片段 |
| `final_report` | 最终执行报告 | evidence | Agent 最终交付说明和证据汇总 |
| `manual_review` | 人工评审 | evidence | 需要人类确认的审查结果 |
| `state_check` | 状态检查 | evidence | 数据库、缓存、对象或页面状态验证 |
| `command_exit_code` | 命令退出码 | evidence | 命令是否成功执行的退出码 |
| `inspect_package_scripts` | 检查 package scripts | discovery_method | 检查 package.json 或类似脚本配置 |
| `inspect_ci_config` | 检查 CI 配置 | discovery_method | 检查 GitHub Actions、CI pipeline 等配置 |
| `search_existing_tests` | 搜索已有测试 | discovery_method | 查找仓库中已有相关测试 |
| `verification_command_discovery` | 测试命令发现 | test_oracle | 在执行前发现合适的测试命令 |
| `needs_human_clarification` | 需要人工澄清 | action | 存在不确定项，需要人类补充信息 |
| `must_stop` | 必须停止 | decision_policy | 遇到该条件时不得继续自动执行 |
| `baseline_not_checked` | 基线未检查 | risk | 要求检查现有行为但尚未完成 |
| `unverified_output` | 未验证输出 | auto_fail_condition | 缺少证据或未完成验证即宣称完成 |
| `missing_oracle_evidence` | 缺少验收证据 | risk | 验收项没有对应测试或证据 |
| `schema_invalid` | Schema 无效 | auto_fail_condition | DSL 结构、类型或枚举不合法 |
| `customer_service_agent` | 客服人员 | actor | 处理客户问题的一线客服角色 |
| `customer_service_supervisor` | 客服主管 | actor | 负责客服团队和升级处理的主管角色 |
| `student_user` | 学员用户 | actor | 观看课程或参与学习的用户 |
| `sales_user` | 销售人员 | actor | 创建报价、跟进客户或提交审批的销售角色 |
| `ops_user` | 运维人员 | actor | 负责设备、系统、监控或运维操作的用户 |
| `teacher_or_admin` | 教师或管理员 | actor | 课程或后台管理相关角色 |
| `agent_or_qa` | Agent 或 QA | owner_role | 由 Agent 探查或 QA 补充验证信息 |
| `pm` | 产品经理 | owner_role | 负责业务意图和产品规则确认 |
| `qa` | 测试 / QA | owner_role | 负责测试验证和质量确认 |
| `security` | 安全负责人 | owner_role | 负责安全、隐私和权限风险判断 |
| `tech_lead` | 技术负责人 | owner_role | 负责技术可行性和架构判断 |
| `pm_review` | 产品评审 | review_type | 需要产品经理确认 |
| `qa_review` | QA 评审 | review_type | 需要 QA 或测试负责人确认 |
| `security_review` | 安全评审 | review_type | 需要安全负责人确认 |
| `oracle_quality` | 测试 oracle 质量 | quality_score | 验收 oracle 是否明确、可执行、可映射证据 |
| `security_safety` | 安全性 | quality_score | 是否满足安全约束并避免安全回退 |
| `performance_safety` | 性能安全 | quality_score | 是否避免明显性能回退 |
| `explainability_quality` | 可解释性质量 | quality_score | 输出、报告或提示是否可理解 |
| `ui_visibility` | UI 可见性 | quality_score | UI 结果是否可见、明确、可验证 |
| `scope_control` | 范围控制 | quality_score | 是否遵守 scope / out_of_scope |
| `permission_safety` | 权限安全 | quality_score | 是否遵守权限边界和角色限制 |
| `baseline_handling` | 基线处理 | quality_score | 是否正确识别并保持现有行为 |
| `add` | 新增 | operation | 新增功能、字段、提示、规则或测试 |
| `modify` | 修改 | operation | 修改已有功能、字段、提示、规则或测试 |
| `reopen` | 重新打开 | state_or_action | 重新进入或打开某个流程、页面、工单等 |
| `recorded` | 已记录 | state | 数据、状态或事件已被记录 |
| `available` | 可用 | state | 功能、数据或状态可用 |
| `missing` | 缺失 | state | 信息、配置、能力或证据缺失 |
| `unknown` | 未知 | state | 当前尚未确认 |
| `unclear` | 不清楚 | state | 语义、规则、边界或来源不明确 |
| `preserve` | 保持 | action | 保持现有行为或能力不变 |
| `reuse` | 复用 | action | 优先复用现有配置、规则或组件 |
| `hide` | 隐藏 | ui_action | 在 UI 或输出中隐藏某些信息 |
| `show` | 展示 | ui_action | 在 UI 或输出中展示某些信息 |
| `draft` | 草稿阶段 | stage | 刚从 PM 口语需求生成，不可直接执行 |
| `clarification_ready` | 澄清就绪阶段 | stage | 已形成澄清问题，等待补全 |
| `baseline_ready` | 基线探查就绪阶段 | stage | 可以进行代码库或现有行为探查 |
| `grounded` | 已落地阶段 | stage | 已完成代码库探查和路径确认 |
| `executable` | 可执行阶段 | stage | 可以交给 Agent 执行 |
| `verified` | 已验证阶段 | stage | 已执行并完成验证 |
| `blocking` | 阻塞级 | blocking_level | 不解决则不能进入执行 |
| `non_blocking` | 非阻塞级 | blocking_level | 不解决仍可继续，但会影响质量或评分 |
| `ready_for_agent` | 可交给 Agent 执行 | readiness_gate | 所有必要就绪条件通过后才能为 true |
| `schema_valid` | Schema 合法 | readiness_gate | DSL 格式、类型和枚举校验通过 |
| `blocking_clarification_resolved` | 阻塞澄清已解决 | readiness_gate | 所有 blocking clarification 已解决 |
| `baseline_completed` | 基线检查已完成 | readiness_gate | 已完成必需的现有行为检查 |
| `path_confirmed` | 路径已确认 | readiness_gate | 执行阶段已有 confirmed_allowed_paths |
| `oracle_ready` | 测试 oracle 已就绪 | readiness_gate | 已有测试命令或明确手工验证路径 |
| `security_privacy_checked` | 安全隐私已检查 | readiness_gate | 安全隐私风险已完成必要检查 |
| `frontend_logic` | 前端逻辑 | change_type | 页面、状态、交互等前端侧逻辑 |
| `backend_logic` | 后端逻辑 | change_type | 服务端业务逻辑、权限校验、数据处理 |
| `ui_behavior` | UI 行为 | change_type | 页面交互、显示隐藏、状态切换等行为 |
| `api_contract` | API 契约 | change_type | 接口请求、响应、状态码、字段约定 |
| `validation_rule` | 校验规则 | change_type | 输入、状态、业务约束等校验逻辑 |
| `config` | 配置 | change_type | 配置项、开关、阈值、环境配置 |
| `test` | 测试 | change_type | 单元、集成、端到端或手工测试 |
| `add_feature` | 新增功能 | task_type | 新增一个能力或产品行为 |
| `modify_feature` | 修改功能 | task_type | 调整已有能力或已有产品行为 |
| `config_change` | 配置变更 | task_type | 主要通过配置完成的变更 |
| `code_change` | 代码变更 | delivery_mode | 需要修改代码交付 |
| `manual_browser` | 手工浏览器检查 | verification_method | 通过手工或半自动浏览器检查 UI |
| `static_check` | 静态检查 | verification_method | lint、typecheck、schema check 等静态验证 |
| `e2e_test` | 端到端测试 | verification_method | 覆盖完整用户路径的测试 |
| `integration_test` | 集成测试 | verification_method | 多个模块或服务协同测试 |
| `api_check` | API 检查 | verification_method | 请求响应、状态码、字段契约验证 |
| `manual_test` | 手工测试 | verification_method | 人工执行的验证步骤 |
| `semi_autonomous` | 半自主执行 | agent_mode | Agent 可执行，但关键节点需要审批或人工介入 |
| `investigate_first` | 先探查再实现 | implementation_strategy | 先读取代码库和现有行为，再做实现 |
| `minimal_patch` | 最小补丁 | implementation_strategy | 优先用最小改动满足需求 |
| `gate_then_weighted_checklist` | 先硬门槛后加权清单评分 | scoring_method | 先过 hard gate，再计算 checklist 分数 |
| `all_must_pass` | 必须全部通过 | hard_gate_policy | 所有硬门槛都必须通过 |
| `default_web_safety` | 默认 Web 安全护栏 | guardrail_ref | Web 场景默认安全规则集合 |
| `default_backend_safety` | 默认后端安全护栏 | guardrail_ref | 后端场景默认安全规则集合 |
| `no_pii_output` | 禁止输出个人敏感信息 | privacy_constraint | 不得在结果、日志或界面中输出 PII |
| `large_refactor` | 大规模重构 | forbidden_operation | 跨模块、大面积、非必要重构 |
| `change_database_schema` | 修改数据库结构 | forbidden_operation | 新增、删除或修改数据库 schema |
| `delete_data` | 删除数据 | forbidden_operation | 删除业务数据或用户数据 |
| `change_public_api` | 修改公共 API | forbidden_operation | 改变外部可见 API 契约 |
| `change_permission_model` | 修改权限模型 | forbidden_operation | 改变角色、权限或鉴权体系 |
| `change_auth_logic` | 修改认证逻辑 | forbidden_operation | 改变登录、鉴权、token、会话等核心逻辑 |

---

## Pattern Translation Rules

> 目的：避免 enum dictionary 无限膨胀。遇到未显式登记的 tag 时，优先使用以下模式规则解释。

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
| `*_blocked` | 被阻止 / 不可通过 | `cross_tenant_visibility_blocked` = 阻止跨租户可见 |
| `*_bypass` | 绕过 | `permission_bypass` = 权限绕过 |
| `*_leak` | 泄露 | `data_leak` = 数据泄露 |
| `*_overpromise` | 过度承诺 | `refund_overpromise` = 退款过度承诺 |
| `*_hint` | 提示 | `conflict_hint` = 冲突提示 |
| `*_notice` | 提示 / 说明 | `refund_safe_notice` = 退款安全说明 |
| `*_entry` | 入口 | `metric_definition_entry` = 指标定义入口 |
| `*_display` | 展示 | `quota_display` = 配额展示 |
| `*_mapping` | 映射 | `status_mapping` = 状态映射 |
| `*_config` | 配置 | `threshold_config` = 阈值配置 |
| `*_threshold` | 阈值 | `expiry_threshold` = 过期阈值 |
| `*_fixture` | 测试夹具 / 测试数据 | `permission_fixture` = 权限测试数据 |
| `*_cases` | 测试用例集合 | `scan_status_cases` = 扫描状态测试用例 |
| `*_review` | 评审 | `security_review` = 安全评审 |

---

## Tag Generation Rules

Codex-A / PM→DSL 生成时必须遵守：

```text
1. 优先使用纯英文 snake_case。
2. 允许完整中文短语，但不推荐。
3. 禁止中英混杂 tag。
4. 禁止生成 “clear中文before英文”“编号xxx”“xxx过期explained” 这类混合 tag。
5. no_*、do_not_*、*_unknown、*_missing、*_preserved、*_visible 等必须按 pattern 使用。
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
