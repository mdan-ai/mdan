# 2026-04-11 Agent Eval Test Design

目标：为 `@mdanai/sdk` 设计一套完整的 agent 测试验证体系，用来证明并持续回归验证下面这个产品命题：

> 一个具备通用语义理解能力与标准 Web 访问能力的 agent，在没有站点专用适配、没有隐藏提示、没有私有流程注入的前提下，仅凭“一句话任务 + 一个 URL”，就能够按照 MDAN 页面暴露的内容与交互，完成完整流程。

这份设计文档关注的不是“如何实现一个 agent”，而是“如何验证 SDK 暴露出来的页面、动作、状态与结果反馈，是否天然适合通用 agent 完成任务”。

主要参考：

- `README.md`
- `test/core/*.test.ts`
- `test/server/*.test.ts`
- `test/web/*.test.ts`
- `docs/2026-04-11-feature-test-design-matrix.md`
- `docs/2026-04-11-action-semantics-test-design.md`

---

## 1. 设计目标

这套测试体系需要优先回答三个问题，优先级如下：

1. **可达性**
   `一句话 + URL` 是否足以让大多数通用 agent 走通完整流程。
2. **最小依赖**
   成功是否依赖额外的 SDK 专用提示、站点专用说明或 agent 定制适配。
3. **一致性**
   不同 agent 虽然策略不同，但是否会收敛到同一类规范化流程与结果。

这意味着本体系的第一目标不是“比较 agent 强弱”，而是“衡量 SDK 交互设计对通用 agent 的天然友好程度”。

---

## 2. 非目标

本设计明确不覆盖以下事情：

- 不设计或实现新的 agent
- 不把测试结论表达成“某个 agent 排名第一”
- 不依赖重 prompt、隐藏上下文、人工接管来证明流程成立
- 不把私有 API 调用成功视为主要通过标准
- 不把 parser/runtime 的低层单测替代真实任务验证

已有 `core / server / web` 单测仍然重要，但它们主要用于验证 SDK 正确性，不足以回答“一句话 + URL + 通用 agent 是否能完成流程”这个命题。

---

## 3. 核心命题与被测对象

### 3.1 核心命题

被测命题可以规范化表达为：

> 对于一个 MDAN 应用页面，如果它正确暴露了任务语义、输入语义、动作语义、状态推进和结果反馈，那么一个不需要专门适配的通用 Web agent 应该能够理解它、操作它，并完成任务。

### 3.2 被测对象分层

这套体系有三个对象，但主次不同：

1. **主对象：SDK 暴露的交互协议与页面模式**
   这是核心。要验证的不是 agent 自身，而是 SDK 是否把任务表面做成了 agent-native。
2. **次对象：fixture / 示例应用**
   fixture 是标准考场。它代表 SDK 推荐实践，必须能够稳定复现、重置和判定。
3. **观察对象：agent**
   agent 是探针，不是主产品。我们利用多个通用 agent 观测 SDK 是否足够清晰与自然。

因此，如果多个通用 agent 在同一类 fixture 上集体失败，默认先怀疑 fixture 设计或 SDK 暴露方式，而不是优先归咎于 agent。

---

## 4. 验证原则

### 4.1 成功必须由系统判定

agent 说“我完成了”不能直接当成功。成功必须由以下至少两类证据共同支撑：

- 业务证据：数据状态、服务端结果、持久化记录
- 页面证据：成功态内容、确认信息、可见结果变化
- 协议证据：动作是通过页面显式暴露的能力完成的

### 4.2 失败必须可归因

不能只记录 `failed`。失败需要稳定地落入结构化分类，否则无法指导 SDK 改进。

### 4.3 以最小输入为主评测

主评测应始终优先使用：

- 一句话任务
- 一个 URL
- 一个 agent

只有在排障与归因时，才允许增加轻量辅助提示。

### 4.4 先验证“能否完成”，再验证“是否一致”

当前阶段的核心不是追求所有 agent 完全走同一路径，而是先证明：

- 页面是否天然可读
- 动作是否天然可执行
- 流程是否天然可推进

---

## 5. 评测结论模型

最终输出不应主要是“agent 榜单”，而应是“SDK 流程可达性画像”。

建议统一使用以下结论语言：

- `高可达`：A0 档位下，大多数通用 agent 可直接完成
- `中可达`：A0 失败较多，但 A1 下可以稳定完成
- `低可达`：需要明显额外说明，或多 agent 在同一障碍集体失败
- `依赖专用适配`：需要 MDAN 专用提示或站点专用指导，未达到目标

其中 A0/A1 定义见第 9 节。

---

## 6. 测试分层架构

建议把整套体系拆成四层。前两层偏 SDK 自证，后两层偏真实 agent 验证。

### Layer 1: 协议层测试

目标：验证 SDK 输出给 agent 的交互表面是否稳定、明确、可消费。

关注点：

- Markdown/JSON 中的任务与动作是否完整显式
- action 的 `method/target/inputs/label` 是否清晰
- state/view/blocks 的变化是否可解释
- 错误信息是否 agent 可恢复
- 合约是否避免站点专用暗知识

现有基础：

- `test/core/*.test.ts`
- `test/server/runtime-json-contract-mode.test.ts`
- `test/server/html-render.test.ts`
- `test/bridge/*.test.ts`

需要补强的方向：

- 从“契约正确”上升到“agent 友好”
- 为 discoverability、success feedback、recoverability 建立断言

### Layer 2: 页面任务层测试

目标：验证单个页面或页面流是否足以承载一个完整任务。

关注点：

- 任务目标是否能从页面自然读出
- 输入字段是否语义清晰
- 动作是否具备足够可发现性
- 页面返回是否形成闭环
- 成功结果是否可观察、可断言

这一层不一定要接真实大模型，可用规则化探针先验证任务表面质量。

### Layer 3: Agent 流程层测试

目标：接入真实 agent，验证 `一句话 + URL + 通用 agent` 是否实际能完成任务。

输入：

- 一句话任务
- 一个 URL
- 一个 agent

输出：

- 执行轨迹
- 成功与失败归类
- 对最小依赖级别的判断

### Layer 4: 跨 Agent 对照层测试

目标：区分“SDK 设计问题”和“单个 agent 能力偏差”。

典型结论：

- 多 agent 在同一步集体失败：SDK/fixture 设计存在共性障碍
- 只有单个 agent 失败：更像 agent 兼容性问题
- 所有 agent 都成功但路径不同：可达性高，一致性一般
- 所有 agent 都要额外说明：最小依赖目标未达成

---

## 7. 阶段化范围

测试应按复杂度逐步推进，而不是一开始铺很大。

### Phase 1: 单页单轮任务

目标：证明 agent 能读懂页面并完成一次最基本任务。

典型场景：

- 填一个字段并提交
- 点击一个显式动作完成确认
- 访问页面后查询一个明确结果并回答

### Phase 2: 单页多步任务

目标：证明同一页面内的多步流程不会让 agent 迷失。

典型场景：

- 先读说明再填多个字段
- 提交后根据返回内容继续执行下一步
- 预览后确认

### Phase 3: 跨页/跨状态任务

目标：证明 session、路由、局部刷新与状态推进仍对通用 agent 友好。

典型场景：

- 列表 -> 详情 -> 完成动作
- 登录后继续执行任务
- region patch / sync / SSE 后继续流程

---

## 8. Case 模型

每条 `agent eval case` 应固定成以下结构，避免 case 之间无法比较。

### 8.1 Case Metadata

建议字段：

- `id`
- `tier`: `single-step | multi-step | cross-state`
- `title`
- `goal`
- `url`
- `prompt`
- `tags`
- `owner`

### 8.2 Environment Setup

建议字段：

- `seed`
- `resetStrategy`
- `sessionMode`
- `timeoutMs`
- `maxSteps`

原则：任何 case 都必须能 reset 到稳定初始态。

### 8.3 Success Oracle

每条 case 必须定义三类 oracle：

1. `businessOracle`
   业务结果是否达成，例如记录被创建、状态被更新。
2. `uiOracle`
   页面是否进入成功态，例如出现感谢信息、出现新列表项。
3. `protocolOracle`
   是否通过页面显式能力完成，未脱离页面去猜私有接口。

### 8.4 Execution Trace

每次运行至少要记录：

- agent 接收到的 prompt
- agent 打开的 URL
- agent 每一步观察到的页面摘要
- agent 每一步执行的动作
- agent 提交的输入
- 服务端/页面的响应
- 最终 agent 自己的完成判断

### 8.5 Failure Taxonomy

建议至少统一成以下分类：

- `discoverability_failure`
- `interaction_failure`
- `state_progression_failure`
- `result_interpretation_failure`
- `protocol_violation`
- `environment_failure`
- `agent_capability_limit`

### 8.6 Minimal-Assumption Declaration

必须显式说明这条 case 允许的提示档位，避免把“加了很多提示才成功”也算成天然可达。

---

## 9. 提示与适配等级

为了验证“最小依赖”，建议把输入辅助严格分成四档：

### A0: 无适配

只提供：

- 一句话任务
- 一个 URL

这是主评测档位，最能代表 SDK 目标是否成立。

### A1: 通用 Web 约束

允许增加对所有 Web agent 都通用的轻量说明，例如：

- 优先使用页面显式表单和按钮
- 先观察页面内容再执行动作

这档位只用于诊断和归因，不应作为主要宣传结果。

### A2: MDAN 感知提示

显式告诉 agent 这里有 MDAN 规范、动作块、状态结构等。

如果某条流程只有 A2 才能稳定跑通，说明它还没有达到“一句话 + URL”的目标。

### A3: Agent/站点专用适配

为特定 agent 或特定站点写专门说明。

这应直接视为目标未达成，只能作为兼容兜底，不应算主通过。

---

## 10. 通过标准

建议每条 case 的结果不是简单的 pass/fail，而是四段式：

- `PASS`
  A0 下完成业务目标，且无协议违背。
- `PASS_WITH_ASSIST`
  A0 失败，但 A1 成功。
- `REACHABLE_BUT_WEAK`
  可以完成，但依赖额外说明、重复尝试或明显脆弱路径。
- `FAIL`
  在允许的测试档位下未完成。

最终 KPI 应优先看：

- A0 完成率
- A0 首次成功率
- A0 -> A1 提升幅度
- 失败可归因率

---

## 11. 运行框架设计

建议把运行系统拆成 5 个组件，每个组件只负责一类事情。

### 11.1 Golden Fixtures

职责：提供标准考场。

要求：

- 有稳定初始态
- 可 reset
- 有明确 oracle
- 覆盖 SDK 推荐交互模式

fixture 不是普通 demo，而是可评测单元。

建议按任务模式组织，而不是按 UI 组件组织：

- `fixtures/single-step/submit-message`
- `fixtures/single-step/search-and-answer`
- `fixtures/multi-step/fill-review-submit`
- `fixtures/multi-step/confirm-after-preview`
- `fixtures/cross-state/login-then-submit`
- `fixtures/cross-state/list-detail-complete`

### 11.2 Agent Harness

职责：统一接入不同 agent。

harness 应该做的：

- 传入 prompt 与 URL
- 控制超时、最大步数、运行参数
- 导出标准 trace

harness 不应该做的：

- 悄悄补充站点专用说明
- 把页面转换成更易读的私有格式
- 替 agent 做字段语义映射
- 在 agent 卡住时自动加提示

原则：`harness 是 transporter，不是 tutor`。

### 11.3 Trace Recorder

职责：双侧录制。

需要同时记录：

- `agent-side trace`
  - 访问了哪些 URL
  - 看到了什么
  - 做了什么
  - 为什么这么做
- `system-side trace`
  - 请求了什么 action
  - 服务端返回什么状态
  - 页面如何变化
  - 数据是否变更

### 11.4 Oracle Verifier

职责：自动判题。

建议拆成三类 verifier：

- `BusinessVerifier`
- `UIVerifier`
- `ProtocolVerifier`

这样能够避免“业务成功了，但方式不符合 SDK 期望路径”的假通过。

### 11.5 Report Aggregator

职责：把单次运行沉淀成对 SDK 有价值的画像。

报告优先按以下维度组织：

- fixture 维度
- tier 维度
- failure category 维度
- assumption level 维度

agent 维度应作为辅助视图，而不是主视图。

---

## 12. Trace 数据模型

建议在第一版就把 trace 结构固定下来，避免后续补录困难。

### 12.1 Run Metadata

- `runId`
- `caseId`
- `fixtureId`
- `agentId`
- `promptLevel`
- `assumptionLevel`
- `startAt`
- `endAt`
- `durationMs`

### 12.2 Observation Events

- `url`
- `pageTitle`
- `contentSummary`
- `discoveredInputs`
- `discoveredActions`
- `discoveredErrors`

### 12.3 Action Events

- `type`: `visit | click | fill | submit | wait | answer`
- `target`
- `payload`
- `reason`
- `stepIndex`

### 12.4 System Events

- `requestMethod`
- `requestTarget`
- `requestBodyShape`
- `responseKind`: `page | region | stream | error`
- `updatedRegions`
- `stateChangeSummary`

### 12.5 Outcome

- `status`
- `failureCategory`
- `businessOraclePassed`
- `uiOraclePassed`
- `protocolOraclePassed`
- `assumptionLevelReached`

---

## 13. 失败归因规则

失败需要稳定归因，否则无法指导改进。建议采用以下判定口径。

### 13.1 Discoverability Failure

定义：agent 没找到任务目标、输入或动作。

常见信号：

- 页面正文没有明确任务语义
- 字段命名过于抽象
- action label 不表达结果
- 页面上成功路径不够显式

优先怀疑对象：

- fixture 页面设计
- action 命名
- 文案与布局暴露方式

### 13.2 Interaction Failure

定义：发现了目标，但不会正确执行交互。

常见信号：

- 多次误点错误 action
- 提交 payload 不完整
- 对表单/按钮/链接的映射不清晰

优先怀疑对象：

- 输入语义表达
- action 输入依赖关系
- 结果页的继续动作暴露

### 13.3 State Progression Failure

定义：前一步完成了，但 agent 无法继续推进后续状态。

常见信号：

- region patch 后失去上下文
- redirect / session / sync 后不知道下一步
- 多步任务在中间状态卡住

优先怀疑对象：

- page/region/stream 语义暴露
- 过渡后的页面可解释性
- 状态反馈闭环不足

### 13.4 Result Interpretation Failure

定义：实际可能已经成功，但 agent 没识别成功态，或无法提炼最终答案。

常见信号：

- 页面已经出现成功信息，但 agent 仍重试
- 成功结果存在，但表述不明确

优先怀疑对象：

- success copy
- 可见确认元素
- 结果字段结构

### 13.5 Protocol Violation

定义：agent 通过页面之外的非预期路径完成，或尝试绕过显式交互模型。

常见信号：

- 猜测私有接口
- 脱离页面语义发起未声明调用
- 跳过关键交互步骤

优先结论：

- 即便业务成功，也不应视为主通过

### 13.6 Environment Failure

定义：fixture、数据、网络、reset 或宿主环境不稳定。

这类失败必须从 agent 统计中剔除，单独记为基础设施问题。

### 13.7 Agent Capability Limit

定义：可以明确识别为 agent 自身浏览、推理或执行限制，而非 SDK 设计问题。

这类结论只能在跨 agent 对照后谨慎使用，避免过早甩锅给 agent。

---

## 14. 黄金夹具设计原则

fixture 是整个体系的基础，建议遵循以下原则。

### 14.1 一个 fixture 只表达一个核心障碍

不要把登录、上传、多步确认、SSE、跨页导航全部塞进一个 case。每条 fixture 只突出一个主要难点，才能做清晰归因。

### 14.2 fixture 必须可重置

每次运行前都要能够回到已知初始态，否则成功率会被数据污染。

### 14.3 fixture 必须有系统级 oracle

必须能从数据或服务端状态证明结果，而不是只依赖页面上某段文案。

### 14.4 fixture 应代表 SDK 推荐模式

fixture 不只是考题，也是 SDK 最佳实践样本。它应该体现你们希望开发者最终写出的 agent-friendly 页面。

---

## 15. 第一批 fixture 建议

### Tier 1: Single-Step

建议先做 3-5 个：

1. `submit-message`
   单输入单提交，验证最基本 discoverability 与 success feedback。
2. `search-and-answer`
   agent 从页面中获取结果并回答，验证读页面而不是纯交互。
3. `choose-one-action`
   多个 action 中只有一个是正确下一步，验证 action label 清晰度。
4. `simple-confirm`
   点击确认型动作，验证无需表单时的可发现性。

### Tier 2: Multi-Step

建议先做 2-3 个：

1. `fill-review-submit`
2. `preview-then-confirm`
3. `fix-validation-error-and-resubmit`

### Tier 3: Cross-State

建议先做 1-2 个：

1. `login-then-submit`
2. `list-detail-complete`

后续可补：

- `region-patch-continue`
- `stream-observe-then-act`
- `upload-and-confirm`

---

## 16. 指标设计

建议第一阶段先锁住高价值、低歧义指标。

### 核心指标

- `Task Completion Rate`
- `First-Try Success Rate`
- `A0 Success Rate`
- `A0 -> A1 Lift`
- `Failure Attribution Rate`

### 诊断指标

- 平均步骤数
- 平均重试次数
- 首次失败步骤分布
- 失败类别分布
- 不同 tier 的成功率差异

当前不建议把“一致性分数”放到首要 KPI。可以先观察路径差异，等 A0 可达性稳定后再正式引入。

---

## 17. 报告视图设计

建议最终报告至少有四个主视图。

### 17.1 Fixture View

展示每个 fixture 在 A0/A1 下的通过表现，以及主要障碍。

### 17.2 Failure View

按失败分类聚合：

- 哪些页面最容易 discoverability 失败
- 哪些流程最容易 state progression 失败
- 哪些结果最容易 interpretation 失败

### 17.3 Assumption View

展示每个 fixture 在不同提示档位下的变化，帮助判断是否真的达成“最小依赖”。

### 17.4 Agent Comparison View

只作为辅助视图，用于判定共性问题与个体偏差，不作为主 KPI 页面。

---

## 18. 与现有测试体系的关系

当前仓库已经有较强的低层保障：

- `test/core/*`：语义、契约、序列化、内容模型
- `test/server/*`：runtime、HTML、JSON bridge、session、assets
- `test/web/*`：headless host、transition、browser flow

新增的 agent eval 体系不应替代这些测试，而是建立在它们之上：

- 低层测试回答：SDK 是否实现正确
- agent eval 回答：SDK 是否对通用 agent 足够自然

推荐新增一个与现有 `test/` 并列但语义更清晰的目录，例如：

- `eval/fixtures/*`
- `eval/cases/*`
- `eval/harness/*`
- `eval/reporting/*`

或者继续放在 `test/agent-eval/*` 下，但建议和纯单测区分开。

---

## 19. 实施路径

建议分三步落地，不要一次做满。

### Milestone 1: 建立最小 agent eval 骨架

交付：

- case schema
- fixture schema
- trace schema
- oracle verifier 骨架
- 3 个 single-step fixtures
- A0 档位跑通

目标：

- 首次得到对 SDK 流程可达性的真实信号

### Milestone 2: 建立多步与归因能力

交付：

- 2-3 个 multi-step fixtures
- failure taxonomy 稳定实现
- A0/A1 对照
- 初版聚合报告

目标：

- 能定位主要障碍在 discoverability、interaction 还是 state progression

### Milestone 3: 建立跨状态与跨 agent 对照

交付：

- cross-state fixtures
- session/region/stream 相关 case
- 多 agent 对照跑法
- SDK 可达性画像

目标：

- 区分 SDK 设计问题与单 agent 偏差

---

## 20. 设计结论

这套设计的核心不是“找一个最聪明的 agent”，而是建立一套可以持续回答下面问题的验证体系：

- MDAN 页面是否天然适合通用 agent 理解
- action、state、result 是否足够显式和闭环
- 一句话 + URL 是否真的足够
- 失败时到底是 SDK 设计问题，还是 agent 自身限制

如果这套体系按本文落地，SDK 将拥有一条区别于普通单测和普通 E2E 的能力链路：

- 它不仅能验证“功能实现正确”
- 还能验证“交互对于通用 agent 是否真正可达”

这正是 `@mdanai/sdk` 作为 agent-native SDK 最关键的质量门槛。
