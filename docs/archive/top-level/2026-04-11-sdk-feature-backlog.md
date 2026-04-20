# 2026-04-11 SDK Feature Backlog

目标：从“能跑的 MDAN SDK”推进到“可以正常开发 agent 和 human 共同使用的 web app 的 SDK”，把当前缺口整理成特性列表并标注优先级。

## 现状结论

- 当前执行焦点是 `M1A JSON-first Runtime Slimming`：先把 agent 与浏览器前端 SDK 的主交互路径统一到 `Accept: application/json` surface bundle，保留 `text/markdown` readout，逐步废弃 server-side HTML render。
- 当前 SDK 已经具备清晰的核心分层：
  - `core`: MDAN 核心类型、序列化、schema/field 语义
  - `bridge`: JSON surface -> headless/bootstrap 适配
  - `server`: runtime、router、session、HTML 渲染、Node/Bun host
  - `web`: headless browser runtime
  - `elements`: Lit 默认 UI 渲染层
- 当前能力已经足够支撑基础 demo 与受控场景 app：
  - page/action/session/HTML/default UI/headless 流程已基本跑通
  - auth、guestbook、docs/starter 等示例可运行
  - server/web 层已有成体系测试基线
- 当前最大问题不是“协议方向错误”，而是“web 产品语义和工程化能力仍未完全收敛”：
  - 浏览器 HTML、headless、默认 UI 三条消费路径仍有行为边界差异
  - typed input、复杂结构输入、资源存储、默认 UI 稳定性仍未补齐

## 优先级定义

- `P0`: 不解决会持续阻碍真实 app 开发，属于核心闭环缺口
- `P1`: 不解决仍可做 demo，但做中等复杂 app 会明显难受
- `P2`: 工程化与扩展性缺口，会影响长期平台化
- `P3`: 增强项，对体验和长期产品价值有帮助，但不是当前阻塞

## Backlog

| ID | 特性 | 优先级 | 当前状态 | 说明 |
| --- | --- | --- | --- | --- |
| FEAT-000 | agent 直连 JSON surface 消费稳定性 | P0 | PARTIAL | 已补 `application/json` runtime 表示、state identity 校验、auth-guestbook/auth-session agent 流测试；后续仍需更完整错误模型与 action-proof/flat body 边界。 |
| FEAT-000B | JSON-first browser runtime 瘦身 | P0 | TODO | 新增前端 JSON host，让浏览器 UI 直接消费 surface bundle；server HTML render 降级为 legacy 后移除。 |
| FEAT-001 | 统一页面路由与动作路由语义 | P0 | PARTIAL | HTML、headless、默认 UI 对 `route` / action target / history 的语义必须完全一致。 |
| FEAT-002 | HTML 表单成功提交后的统一导航语义 | P0 | PARTIAL | 当前已补成功 HTML `POST -> 303 -> route` 基线，但还需系统化覆盖所有动作类型与边界。 |
| FEAT-003 | typed input 基线打通 | P0 | PARTIAL | `number` / `integer` / `boolean` 不能再主要以字符串进入 handler。 |
| FEAT-004 | runtime typed coercion pipeline | P0 | TODO | 按 `FieldSchema.kind` 做统一类型化，不依赖每个 handler 自己 parse。 |
| FEAT-005 | `page` / `region` / `stream` 响应语义统一 | P0 | PARTIAL | 浏览器、人类用户、agent 三端对 action 结果的理解和表现要一致。 |
| FEAT-006 | 默认 UI 行为稳定性基线 | P0 | PARTIAL | 表单、错误态、loading、history/back、session 失效都要有稳定一致行为。 |
| FEAT-007 | no-JS 表单协议闭环 | P0 | PARTIAL | 原生 HTML form 提交与 SDK `action/input` 协议要彻底兼容。 |
| FEAT-008 | 错误态统一模型 | P0 | PARTIAL | 401/404/422/validation/session-expired/action-proof 等要有统一 runtime/UX 语义。 |
| FEAT-101 | `object` 默认编辑能力 | P1 | TODO | 复杂 agent 输入与结构化表单绕不过去。 |
| FEAT-102 | `array` 默认编辑能力 | P1 | TODO | 列表输入、批量配置、重复表单项会需要。 |
| FEAT-103 | typed submit values 端到端统一 | P1 | PARTIAL | 不只是 handler typed，客户端发出的 payload 也要 typed。 |
| FEAT-104 | 字段级校验错误模型 | P1 | PARTIAL | 当前更多是 runtime 报错，缺统一字段级反馈模型。 |
| FEAT-105 | 资源上传协议规范定稿 | P1 | PARTIAL | `asset` schema 约定、no-js 上传、action wrapper 需要正式统一。 |
| FEAT-106 | storage abstraction 正式化 | P1 | PARTIAL | 现在以 local asset store 为主，还不像正式 adapter contract。 |
| FEAT-107 | headless 非 2xx 错误收敛 | P1 | TODO | browser/headless error state 还可以进一步统一和结构化。 |
| FEAT-108 | 默认 UI 与自定义前端接入规范 | P1 | TODO | 需要明确什么时候用 `elements`，什么时候自定义前端接入。 |
| FEAT-109 | 真实 app 级样例 | P1 | TODO | 需要一个比 auth/guestbook 更接近产品的样例来倒逼 SDK 边界。 |
| FEAT-201 | 更丰富的 `format` 语义 | P2 | TODO | `date` / `datetime` / `email` / `url` / `tel` / `json` 等还没系统化。 |
| FEAT-202 | 多文件上传 | P2 | TODO | 当前主要是单文件模型。 |
| FEAT-203 | 文件上传 UX | P2 | TODO | 进度、限制、预览、失败提示还不完整。 |
| FEAT-204 | 远端存储 adapter | P2 | TODO | S3/OSS 等正式后端尚未形成稳定抽象。 |
| FEAT-205 | 自动 cleanup / 生命周期策略 | P2 | TODO | asset 生命周期目前偏显式清理。 |
| FEAT-206 | 更强的 region patch 策略 | P2 | PARTIAL | 当前 region patch 可用，但复杂多区块更新仍需硬化。 |
| FEAT-207 | 协议映射文档 | P2 | TODO | JSON schema -> `FieldSchema` -> UI/runtime 的规则需要正式文档。 |
| FEAT-208 | cookbook / best practices | P2 | TODO | 页面路由、动作端点、auth、uploads、agent flow 需要推荐模式。 |
| FEAT-301 | 更完整默认 UI 视觉体系 | P3 | TODO | 当前更像 reference UI，不是产品级默认前端。 |
| FEAT-302 | 拖拽上传 | P3 | TODO | 好用，但不是当前阻塞。 |
| FEAT-303 | 多端主题与组件定制层 | P3 | TODO | 平台化之后再补更合理。 |
| FEAT-304 | 更强的 workflow 调试面板 | P3 | PARTIAL | 已有 debug 基线，但离完整调试工具还远。 |
| FEAT-305 | observability / telemetry hooks | P3 | TODO | 对生产系统重要，但可以晚于核心语义收敛。 |

## P0 特性验收重点

### FEAT-001 统一页面路由与动作路由语义

- 同一 action 在 HTML / headless / 默认 UI 下的成功与失败行为一致
- `route`、action target、history/back 的规则可文档化，不依赖内部实现细节
- 新示例无需通过“把动作端点折叠进页面路由”来规避导航问题

### FEAT-002 HTML 表单成功提交后的统一导航语义

- 成功 `POST` 在 HTML 模式下不会把地址栏停在动作端点
- 失败 `POST` 保持原错误响应，不误重定向
- 覆盖登录、创建、更新、登出等常见 action

### FEAT-003 / FEAT-004 typed input 打通

- `number` handler 直接拿到 number
- `integer` handler 直接拿到 integer-compatible number
- `boolean` handler 直接拿到 boolean
- coercion、validation、错误消息、默认 UI 的行为一致

### FEAT-005 / FEAT-006 交互语义稳定

- `page` / `region` / `stream` 在浏览器中有清晰且可预测的更新语义
- `loading` / `error` / `idle` 状态转换稳定
- session 失效与路由跳转行为一致

### FEAT-007 no-JS 表单协议闭环

- 原生 `<form>` 提交不依赖自定义 JS 也能正常工作
- `application/x-www-form-urlencoded` / `multipart/form-data` / action meta 映射统一
- 上传、登录、写操作都能走通 no-JS 路径

### FEAT-008 错误态统一模型

- server/headless/default UI 共享一套错误分类和最小结构
- 可区分 validation error、permission/session error、not found、unsupported media type 等
- 默认 UI 至少能稳定显示“字段问题 / 页面问题 / session 问题”

## 建议执行顺序

0. **当前先做 Agent 消费稳定性**
   - 计划：`docs/superpowers/plans/2026-04-12-agent-consumption-stability.md`
   - 目标：在开放 SDK 或继续扩大 human-facing web 能力前，先证明 agent 可以直接通过 HTTP/MDAN surface 稳定完成真实任务流
   - 当前基线：`application/json` 直返 JSON surface bundle；`auth-guestbook` 与 `auth-session` agent E2E 流已覆盖登录、注册、写入、登出、错误恢复
   - 暂缓：默认 UI polish、开放准备、复杂控件、平台化文档

1. **先补核心语义闭环**
   - `FEAT-001 ~ FEAT-008`
   - 目标：让团队可以持续开发，而不是边做边撞行为坑

2. **再补真实 app 能力**
   - `FEAT-101 ~ FEAT-109`
   - 目标：从 demo 和 reference SDK 进入“中等复杂 app 可开发”阶段

3. **最后补工程化与扩展性**
   - `FEAT-201 ~ FEAT-208`
   - 目标：从“可开发”进入“可平台化”

4. **增强项放最后**
   - `FEAT-301+`
   - 目标：在核心稳定后提升体验和长期产品价值

## P0 / P1 执行编排

### 字段说明

- `Owner`: 建议负责该特性的主导角色，不是最终指定人名
- `Acceptance`: 该特性进入“可交付”前必须满足的最小验收标准
- `Depends On`: 建议优先完成的前置特性；为空表示可以独立推进
- `Milestone`: 推荐归属阶段
  - `M1`: 核心语义闭环
  - `M2`: 真实 app 开发能力
  - `M3`: 平台化与扩展

### P0 执行表

| ID | Owner | Acceptance | Depends On | Milestone |
| --- | --- | --- | --- | --- |
| FEAT-001 | Runtime / Web | HTML、headless、default UI 对同一 action 的 route/history 行为一致；新增跨模式回归测试 | - | M1 |
| FEAT-002 | Runtime | 成功 HTML `POST` 不停留在动作端点；失败不误跳转；登录/创建/更新/登出有回归测试 | FEAT-001 | M1 |
| FEAT-003 | Core / Runtime | `number` / `integer` / `boolean` 在 handler 中直接以 typed value 提供；现有示例不破坏 | - | M1 |
| FEAT-004 | Core / Runtime | 建立统一 coercion pipeline；schema 校验、错误信息、handler 输入语义对齐 | FEAT-003 | M1 |
| FEAT-005 | Runtime / Web | `page` / `region` / `stream` 语义在浏览器与 headless 中一致；状态迁移有测试锁定 | FEAT-001 | M1 |
| FEAT-006 | Elements / Runtime | 默认 UI 在 loading/error/session-expired/back 行为上稳定；真实用户流回归测试通过 | FEAT-001, FEAT-005, FEAT-008 | M1 |
| FEAT-007 | Runtime / HTML | `application/x-www-form-urlencoded` 与 `multipart/form-data` 的 no-JS 路径打通；上传/登录/写操作都可用 | FEAT-002, FEAT-004 | M1 |
| FEAT-008 | Core / Runtime / Elements | 统一错误分类与最小结构；default UI 可稳定区分字段/页面/session 错误 | FEAT-004 | M1 |

### P1 执行表

| ID | Owner | Acceptance | Depends On | Milestone |
| --- | --- | --- | --- | --- |
| FEAT-101 | Elements / Core | 提供 `object` 的默认输入方案，至少能完成基础编辑、提交、校验反馈 | FEAT-004, FEAT-103 | M2 |
| FEAT-102 | Elements / Core | 提供 `array` 的默认输入方案，至少能完成增删改与稳定提交 | FEAT-004, FEAT-103 | M2 |
| FEAT-103 | Core / Web / Runtime | 提交通道保留 typed payload 语义；浏览器/headless/runtime 一致 | FEAT-004 | M2 |
| FEAT-104 | Core / Elements | 字段级错误可结构化返回并在 default UI 中稳定显示 | FEAT-008 | M2 |
| FEAT-105 | Runtime / Assets | 形成正式 `asset` schema 约定；HTML/headless/no-JS 上传行为一致 | FEAT-007 | M2 |
| FEAT-106 | Runtime / Assets | storage adapter contract 定稿；local store 实现成为标准 adapter | FEAT-105 | M2 |
| FEAT-107 | Web | headless 对非 2xx 统一进入结构化 error state；浏览器调试信息可帮助定位 | FEAT-008 | M2 |
| FEAT-108 | Docs / DX | 文档明确 default UI 和自定义前端接入边界；至少给出 2 条推荐路径 | FEAT-001, FEAT-006 | M2 |
| FEAT-109 | Product / SDK | 增加一个真实 app 级样例，覆盖 auth + complex form/state + partial update/upload 中至少两项 | FEAT-001 ~ FEAT-008 | M2 |

## 推荐里程碑

### M1: 核心语义闭环

目标：让团队能够持续开发 app，而不是反复撞到交互语义问题。

范围：

- `FEAT-001`
- `FEAT-002`
- `FEAT-003`
- `FEAT-004`
- `FEAT-005`
- `FEAT-006`
- `FEAT-007`
- `FEAT-008`

完成标志：

- 示例不再需要通过特例规避 route/action 语义问题
- 默认 UI、HTML、headless 的关键用户流有稳定回归测试
- handler 输入语义不再主要依赖手工字符串解析

### M2: 真实 App 开发能力

目标：从“reference SDK + demo”进入“中等复杂 app 可开发”阶段。

范围：

- `FEAT-101`
- `FEAT-102`
- `FEAT-103`
- `FEAT-104`
- `FEAT-105`
- `FEAT-106`
- `FEAT-107`
- `FEAT-108`
- `FEAT-109`

完成标志：

- 能支撑复杂结构表单与真实上传场景
- default UI 与自定义前端接入路径都足够清晰
- 至少有一个接近真实产品的样例验证 SDK 边界

### M3: 平台化与扩展

目标：从“可持续开发”进入“可平台化和长期扩展”。

范围：

- `FEAT-201+`

完成标志：

- schema / format / storage / docs / cookbook 更完整
- 更适合多团队、多产品线复用

## 最近最值得盯住的最小必做清单

- `FEAT-001` 统一页面路由与动作路由语义
- `FEAT-003` typed input 基线打通
- `FEAT-004` runtime typed coercion pipeline
- `FEAT-006` 默认 UI 行为稳定性基线
- `FEAT-007` no-JS 表单协议闭环
- `FEAT-109` 真实 app 级样例

## 一句话总结

当前 SDK 的核心协议和 runtime 骨架已经成立，最大的剩余工作不是“再证明它能跑”，而是把 web 交互语义、typed input、默认 UI 与 no-JS/browser/headless 三条路径收敛成真正可依赖的统一行为模型。
