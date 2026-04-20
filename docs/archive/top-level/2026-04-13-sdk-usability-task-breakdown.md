# SDK Usability Task Breakdown

目标：先解决会持续阻碍真实 app 开发的 SDK 核心问题；其余 examples、文档、模板、最佳实践等易用性改进单独建线跟踪，按任务推进。

## 总体策略

- 主线 A：先做 SDK 核心闭环
  - 范围只覆盖 runtime、web、elements、core 的行为一致性和可依赖性
  - 目标是让团队可以稳定开发 app，而不是继续在路由、typed input、错误态、no-JS 提交上反复踩坑
- 主线 B：单独跟踪易用性改进
  - 范围包括 README、examples、默认推荐路径、真实 app 样例、cookbook、接入规范
  - 这些工作重要，但不应与核心 SDK 行为修复绑死在同一个节奏里

## 决策

- 立即执行：主线 A
- 并行记录但暂缓执行：主线 B
- 进入主线 B 的前置条件：
  - FEAT-001 到 FEAT-008 达到可依赖基线
  - README 中的错误 API 示例先被修正
  - examples 不再承担规避 runtime 语义缺口的临时职责

## 主线 A：SDK 核心问题

这条线直接对应当前 backlog 里的 P0 特性，按依赖关系推进。

### A1. 路由与动作语义统一

- Backlog:
  - `FEAT-001` 统一页面路由与动作路由语义
  - `FEAT-002` HTML 表单成功提交后的统一导航语义
- 目标：
  - HTML、headless、default UI 对同一 action 的成功/失败行为一致
  - 成功 `POST` 不停留在动作端点
  - `route`、action target、history/back 语义可以稳定文档化
- 主要文件：
  - `src/server/runtime.ts`
  - `src/server/node.ts`
  - `src/server/bun.ts`
  - `src/web/headless.ts`
  - `src/elements/mount.ts`
  - `test/server/runtime-html-mode.test.ts`
  - `test/web/headless-transition.test.ts`
  - `test/server/auth-guestbook-artifact-example.test.ts`
- 交付标准：
  - 现有 auth flow 测试覆盖登录、注册、写入、登出
  - 页面地址、重定向、history 行为在三条消费路径上对齐

### A2. Typed Input 与 Coercion Pipeline

- Backlog:
  - `FEAT-003` typed input 基线打通
  - `FEAT-004` runtime typed coercion pipeline
- 目标：
  - `number`、`integer`、`boolean` 在 handler 中直接得到 typed value
  - schema coercion、runtime validation、默认 UI 提交语义一致
- 主要文件：
  - `src/core/field-schema.ts`
  - `src/server/request-inputs.ts`
  - `src/server/runtime.ts`
  - `src/web/headless.ts`
  - `src/elements/components/mdan-field.ts`
  - 相关 core/server/web 测试
- 交付标准：
  - handler 不再依赖手动 parse
  - 错误消息与 typed coercion 有稳定测试

### A3. 响应语义与默认 UI 稳定性

- Backlog:
  - `FEAT-005` `page` / `region` / `stream` 响应语义统一
  - `FEAT-006` 默认 UI 行为稳定性基线
- 目标：
  - 浏览器、headless、agent 对 action result 的理解一致
  - loading、error、session-expired、back 行为稳定
- 主要文件：
  - `src/server/result-normalization.ts`
  - `src/server/response.ts`
  - `src/web/headless.ts`
  - `src/elements/components/mdan-action.ts`
  - `src/elements/components/mdan-error.ts`
  - `src/elements/mount.ts`
  - 对应 runtime/web/elements 测试
- 交付标准：
  - 同一 action 的 `page` / `region` / `stream` 结果在三端表现可预测
  - 默认 UI 有端到端回归测试

### A4. No-JS 与错误模型收敛

- Backlog:
  - `FEAT-007` no-JS 表单协议闭环
  - `FEAT-008` 错误态统一模型
- 目标：
  - `application/x-www-form-urlencoded` 和 `multipart/form-data` 提交完整闭环
  - validation、session、permission、not-found、unsupported-media-type 等错误有统一最小结构
- 主要文件：
  - `src/server/adapter-shared.ts`
  - `src/server/body-normalization.ts`
  - `src/server/runtime.ts`
  - `src/server/response.ts`
  - `src/elements/components/mdan-error.ts`
  - `test/server/adapter-shared.test.ts`
  - `test/server/runtime-html-mode.test.ts`
- 交付标准：
  - 原生 form 提交不依赖自定义 JS 也可稳定工作
  - default UI 能区分字段问题、页面问题、session 问题

## 主线 B：易用性改进跟踪

这条线先记录，不与主线 A 混跑。等核心 SDK 闭环后，再按优先级切入。

### B1. 文档与 API 一致性

- 范围：
  - 修正 README 中与真实导出不一致的 API 示例
  - 增加文档 smoke check，避免 copy-paste 示例失效
- 当前已发现问题：
  - README 使用 `createHostedApp`
  - 实际导出只有 `createMdanServer`

### B2. 推荐路径与接入规范

- 对应 backlog：
  - `FEAT-108` 默认 UI 与自定义前端接入规范
- 目标：
  - 明确三条推荐路径：
    - `server + elements`
    - `server + web`
    - `server only`
  - README 首页只保留一条默认上手路线

### B3. Examples 重构

- 目标：
  - 把 examples 从“协议 fixture”重构为“学习梯度”
  - 消除 `starter`、`guestbook`、`marked-starter` 的功能重叠
- 建议收敛为：
  - `starter`
  - `forms`
  - `auth-app`
  - `docs`

### B4. 真实 app 级样例

- 对应 backlog：
  - `FEAT-109` 真实 app 级样例
- 目标：
  - 用一个更接近产品的例子倒逼 SDK 边界
  - 至少覆盖 auth + complex form/state + partial update/upload 中两项

### B5. Cookbook 与最佳实践

- 对应 backlog：
  - `FEAT-207`
  - `FEAT-208`
- 目标：
  - 把“推荐页面路由模式”“动作端点设计”“auth flow”“uploads”“agent flow”沉淀成可复制模式

## 推荐执行顺序

1. A1 路由与动作语义统一
2. A2 Typed Input 与 Coercion Pipeline
3. A3 响应语义与默认 UI 稳定性
4. A4 No-JS 与错误模型收敛
5. B1 文档与 API 一致性
6. B2 推荐路径与接入规范
7. B3 Examples 重构
8. B4 真实 app 级样例
9. B5 Cookbook 与最佳实践

## 任务分配建议

如果按并行任务拆分，建议这样分：

- Worker 1: Runtime / Routing
  - 负责 A1
- Worker 2: Core / Typed Inputs
  - 负责 A2
- Worker 3: Web / Elements Stability
  - 负责 A3
- Worker 4: HTML / Error Model
  - 负责 A4
- Worker 5: Docs / DX Track
  - 先只维护 B1-B5 的跟踪，不提前改 examples 主线

## 每条任务线的完成定义

- 主线 A 完成：
  - `FEAT-001` 到 `FEAT-008` 进入稳定可依赖状态
  - examples 不再承担规避 runtime 问题的职责
  - README 首页不再误导用户使用错误 API
- 主线 B 完成：
  - 新用户可以沿单一推荐路径在 5 到 10 分钟内跑起一个 app
  - examples 的学习增量清晰
  - 文档与真实导出/API 保持同步

## 下一步

- 先从 A1 开始
- 同时保留本文件作为总任务看板
- 主线 A 每完成一个阶段，再回填本文件中的状态与阻塞
