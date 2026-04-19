# 2026-04-11 Action Semantics Test Design

目标：为 `UI-001` 产出一份可执行的专项测试设计文档，并覆盖 `UI-002` 中与 action 语义直接相关的前置部分。

覆盖的 feature：

- `UI-001` Action 语义保留与消费
- `UI-002` 中与 action 行为判定紧密相关的语义前置部分

主要参考：

- `docs/2026-04-11-feature-test-design-matrix.md`
- `test/shared/sse-render-semantics.test.ts`
- `test/elements/model.test.ts`
- `test/server/html-render.test.ts`
- `test/bridge/json-snapshot-adapter.test.ts`
- `src/shared/render-semantics.ts`
- `src/elements/model.ts`
- `src/bridge/json-snapshot-adapter.ts`

---

## 1. 范围定义

本专题只关心“action 语义如何从协议层进入内部模型，并最终被 UI/调度层消费”。

它关注的不是：

- block patch 细节
- history / transition 状态机
- asset 上传
- field kind 与输入控件

它关注的是：

- `verb`
- `stateEffect.responseMode`
- `stateEffect.updatedRegions`
- `guard.riskLevel`
- `security.confirmationPolicy`
- 这些语义如何影响：
  - `behavior`
  - `variant`
  - `dispatch mode`
  - action capability
  - HTML data attrs

---

## 2. 被测模型

### 2.1 语义流转路径

这一专题的主路径分四层：

1. **协议层**

- JSON 合约里保留 `snake_case`
- 例如：
  - `state_effect.response_mode`
  - `state_effect.updated_regions`
  - `guard.risk_level`
  - `security.confirmation_policy`

2. **adapter 层**

- adapter 把协议字段映射成内部 camelCase：
  - `stateEffect.responseMode`
  - `stateEffect.updatedRegions`
  - `guard.riskLevel`
  - `security.confirmationPolicy`

3. **语义层**

- `resolveActionBehavior()`
- `resolveActionVariant()`
- `resolveDispatchMode()`

4. **消费层**

- `resolveActionPresentation()`
- `resolveActionCapabilities()`
- HTML renderer 上的 `data-mdan-action-*`

### 2.2 关键判定规则

当前实现下，几个关键规则如下：

1. `verb === "read"` -> `behavior = "read"`
2. `stateEffect.responseMode === "region"` -> `behavior = "region"`
3. `stateEffect.responseMode === "page"` + `GET/navigate` -> `behavior = "page"`
4. 高风险 action (`riskLevel === "high" | "critical"`) -> `variant = "danger"`
5. `logout` 类签名 -> `variant = "quiet"`
6. `GET + page + empty payload` -> `dispatchMode = "visit"`
7. 其他情况 -> `dispatchMode = "submit"`

---

## 3. 当前已有覆盖

### 3.1 已覆盖主路径

| 能力 | 测试文件 | 当前状态 |
| --- | --- | --- |
| `resolveActionVariant()` 基础判定 | `test/shared/sse-render-semantics.test.ts` | 已覆盖 |
| `resolveActionBehavior()` 基础判定 | `test/shared/sse-render-semantics.test.ts` | 已覆盖 |
| `resolveDispatchMode()` 基础判定 | `test/shared/sse-render-semantics.test.ts` | 已覆盖 |
| adapter 把协议 `snake_case` 映射到内部 camelCase | `test/bridge/json-snapshot-adapter.test.ts` | 已覆盖 |
| `resolveActionPresentation()` | `test/elements/model.test.ts` | 已覆盖 |
| `resolveActionCapabilities()` | `test/elements/model.test.ts` | 已覆盖 |
| HTML renderer 输出 `behavior/variant` metadata | `test/server/html-render.test.ts` | 已覆盖 |

### 3.2 当前覆盖的不足

现有覆盖已经比较稳，但还缺三类高价值边界：

1. **非法/脏语义值容错**

- 非法 `responseMode`
- 非法 `riskLevel`
- 缺失 `verb` + 带 `stateEffect`

2. **更细的高风险级别矩阵**

- 现在主要锁住了 `high`
- `critical` 还没有专项断言

3. **行为与调度的组合态**

- `GET + region`
- `GET + page + payload`
- `POST + page`
- `verb=read` 与 `method/responseMode` 的优先级组合

---

## 4. 建议测试分层

### Layer A: Adapter Semantics Projection

目标：只验证协议字段是否被正确投影到内部 operation 元数据。

关注：

- camelCase 内部字段
- 非法值容错
- 字段缺失时的默认表现

适合的测试名：

- `maps protocol action semantics into camelCase operation metadata`
- `omits invalid response mode values from projected stateEffect`
- `projects critical risk level without preserving snake_case fields`

---

### Layer B: Pure Semantics Resolution

目标：只验证 `resolveActionBehavior/Variant/DispatchMode`。

关注：

- 纯语义函数
- 不引入 HTML/host 干扰

适合的测试名：

- `prioritizes read verb over transport method when resolving behavior`
- `classifies critical risk actions as danger`
- `uses submit dispatch for get page actions with payload`

---

### Layer C: Model-Level Consumption

目标：验证 `resolveActionPresentation()` 和 `resolveActionCapabilities()` 消费语义是否一致。

关注：

- capability 对外暴露
- `responseMode`
- `updatedRegions`
- `presentation`

适合的测试名：

- `exposes region response mode and updated regions through action capabilities`
- `keeps presentation aligned with underlying semantics`
- `treats invalid semantics as unknown capability values`

---

### Layer D: Renderer-Level Consumption

目标：验证 HTML renderer 是否把语义结果稳定写到 DOM metadata。

关注：

- `data-mdan-action-behavior`
- `data-mdan-action-variant`

适合的测试名：

- `renders critical risk actions as danger`
- `renders read actions with read behavior metadata`
- `renders page response mode actions with page behavior metadata`

---

## 5. 建议新增测试矩阵

### P0: 最高优先级

| ID | 场景 | 原因 | 建议位置 |
| --- | --- | --- | --- |
| AS-001 | `riskLevel = "critical"` -> `danger` | 高风险级别应完整锁住，不只 `high` | `test/shared/sse-render-semantics.test.ts` |
| AS-002 | 非法 `responseMode` 值被忽略/回退 | adapter 与 semantics 最容易在这里漂移 | `test/bridge/json-snapshot-adapter.test.ts` + `test/shared/sse-render-semantics.test.ts` |
| AS-003 | `verb = "read"` 的优先级高于普通 POST submit 语义 | `read` 是少见但关键语义 | `test/shared/sse-render-semantics.test.ts` |
| AS-004 | `GET + page + payload` 仍走 `submit` 而不是 `visit` | 这是 dispatch 逻辑最重要的边界之一 | `test/shared/sse-render-semantics.test.ts` / `test/elements/model.test.ts` |

### P1: 第二优先级

| ID | 场景 | 原因 | 建议位置 |
| --- | --- | --- | --- |
| AS-101 | `GET + region` 的组合行为 | 组合态少但值得锁定 | `test/shared/sse-render-semantics.test.ts` |
| AS-102 | `POST + stateEffect.page` -> `submit` | 防止错误被归成 page navigation | `test/shared/sse-render-semantics.test.ts` |
| AS-103 | HTML renderer 输出 `page` / `read` 行为 metadata | 现在主要覆盖了 `region` 与 `danger` | `test/server/html-render.test.ts` |
| AS-104 | `resolveActionCapabilities()` 对非法/缺失语义的退化值 | 对外能力接口值得锁定 | `test/elements/model.test.ts` |

### P2: 第三优先级

| ID | 场景 | 原因 | 建议位置 |
| --- | --- | --- | --- |
| AS-201 | label/target/name 签名对 quiet variant 的误判边界 | 防止 `logout` 关键字匹配过宽 | `test/shared/sse-render-semantics.test.ts` |
| AS-202 | `updatedRegions = []` 与 `undefined` 的能力输出差异 | 偏实现细节，但可防回归 | `test/elements/model.test.ts` |

---

## 6. 建议测试用例草案

### 6.1 AS-001 critical risk -> danger

**Given**

- action `guard.riskLevel = "critical"`

**When**

- 调用 `resolveActionVariant()`

**Then**

- 返回 `danger`
- 不应被其他签名规则覆盖为 `primary/quiet`

---

### 6.2 AS-002 invalid response mode fallback

**Given**

- 协议 action 带 `state_effect.response_mode = "full"` 或其他未支持值

**When**

- adapter 投影为内部 operation
- 再调用 `resolveActionBehavior()`

**Then**

- 内部不应保留非法 `responseMode`
- 最终行为应退回默认逻辑，而不是崩溃或产生未知 `snake_case` 字段

---

### 6.3 AS-003 read verb priority

**Given**

- action `method = "POST"`
- `verb = "read"`

**When**

- 调用 `resolveActionBehavior()`

**Then**

- 应返回 `read`
- 不应回退到普通 `submit`

---

### 6.4 AS-004 GET page with payload -> submit

**Given**

- action `method = "GET"`
- 行为语义是 `page`
- payload 非空

**When**

- 调用 `resolveDispatchMode()` / `resolveDispatchAction()`

**Then**

- 应返回 `submit`
- 不应返回 `visit`

---

## 7. 推荐文件组织

短期内建议沿用现有结构，不新拆目录：

- `test/shared/sse-render-semantics.test.ts`
- `test/elements/model.test.ts`
- `test/server/html-render.test.ts`
- `test/bridge/json-snapshot-adapter.test.ts`

建议按下面规则补：

- 纯语义判定 -> `sse-render-semantics`
- model/capability 消费 -> `elements/model`
- DOM metadata 输出 -> `server/html-render`
- 协议到内部投影 -> `bridge/json-snapshot-adapter`

如果后续继续扩张，可拆成：

- `test/shared/action-behavior.test.ts`
- `test/shared/action-variant.test.ts`
- `test/elements/action-capabilities.test.ts`
- `test/server/action-render-semantics.test.ts`

---

## 8. 执行建议

建议按下面顺序补测：

1. `AS-001`
2. `AS-002`
3. `AS-003`
4. `AS-004`

原因：

- 都是纯语义或轻量 model 层测试
- 成本低、回归收益高
- 可以先把 action 语义边界锁紧，再去补 gating 或更复杂 UI 组合态

---

## 9. 一句话结论

`Action Semantics` 当前已经覆盖了核心 happy path，但还缺“非法语义值容错 + 高风险完整级别 + 行为/调度组合态”这三类边界。后续最值得补的，不是再证明一次普通 submit 是 primary，而是锁住 `critical risk`、`invalid response mode`、`read verb priority`、`GET page with payload` 这些最容易在重构里漂移的语义判定。
