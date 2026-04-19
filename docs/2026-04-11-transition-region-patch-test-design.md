# 2026-04-11 Transition & Region Patch Test Design

目标：为 `UI-004` 和 `UI-005` 产出一份可直接落地的专项测试设计文档，后续新增/重构测试优先以本设计为准。

覆盖的 feature：

- `UI-004` page / region / stream 过渡语义与 `sync()`
- `UI-005` `updated_regions` 驱动的最小 patch

主要参考：

- `docs/2026-04-11-feature-test-design-matrix.md`
- `test/web/headless-transition.test.ts`
- `test/web/headless-browser-flow.test.ts`
- `src/web/headless.ts`

---

## 1. 范围定义

本专题只关心 headless/browser 侧的“状态过渡与局部更新”。

不在本专题内的内容：

- action 语义本身是否被正确解析
- field kind / 输入控件语义
- asset 上传链路
- contract 合法性校验

本专题关注的是：

- 收到哪种响应后，snapshot 应进入哪种 `transition`
- 是否应该写 history
- 是否应该做 region patch，而不是整页替换
- patch 后哪些 block 保持、哪些 block 更新
- `sync()` 与 `visit()/submit()` 在状态层面的差异
- 错误响应和异常流是否进入正确 error state

---

## 2. 被测模型

### 2.1 输入来源

触发源分三类：

1. `visit(target)`
2. `submit(operation, payload)`
3. `sync(target?)`

### 2.2 响应类型

当前逻辑实际会走三类响应：

1. **Page bootstrap**
   `bootstrap.kind === "page"`

2. **Fragment bootstrap**
   `bootstrap.kind === "fragment"`

3. **SSE stream**
   `operation.accept === "text/event-stream"`

### 2.3 关键决策点

在 `src/web/headless.ts` 里，本专题最核心的判断点有两个：

1. `transition` 决定

- 有成功 patch -> `region`
- 否则如果返回 fragment -> `region`
- 否则 -> `page`

2. history 决定

- 只有 `updateHistory === true`
- 且 `transition === "page"`
- 且 `bootstrap.kind === "page"`
- 且 `bootstrap.route !== previousRoute`
  才允许 `pushHistory()`

这意味着：

- `region patch` 绝不应写 history
- fragment 也不应写 history
- page bootstrap 如果 route 没变，也不应写 history

---

## 3. 当前已有覆盖

### 3.1 已覆盖主路径

当前已有测试已经覆盖这些主路径：

| 能力 | 测试文件 | 当前状态 |
| --- | --- | --- |
| page transition | `test/web/headless-transition.test.ts` | 已覆盖 |
| page transition pushState | `test/web/headless-transition.test.ts` | 已覆盖 |
| fragment -> region transition | `test/web/headless-transition.test.ts` | 已覆盖 |
| `sync()` 默认当前 route | `test/web/headless-transition.test.ts` | 已覆盖 |
| `sync(target)` 显式目标 | `test/web/headless-transition.test.ts` | 已覆盖 |
| page bootstrap + `updatedRegions` 局部 patch | `test/web/headless-transition.test.ts` | 已覆盖 |
| region patch 不写 history | `test/web/headless-transition.test.ts` | 已覆盖 |
| patch miss -> fallback page | `test/web/headless-transition.test.ts` | 已覆盖 |
| stream transition | `test/web/headless-transition.test.ts`, `test/web/headless-browser-flow.test.ts` | 已覆盖 |
| 非 2xx action 错误态 | `test/web/headless-transition.test.ts` | 已覆盖 |
| 非 2xx visit/sync 错误态 | `test/web/headless-transition.test.ts` | 已覆盖 |

### 3.2 当前覆盖的不足

当前测试已经有不错的主路径覆盖，但还存在三个明显缺口：

1. **组合态不够多**
   目前大多是单一命中、单一 block、单轮交互。

2. **幂等性/连续交互不足**
   缺少多次连续 submit/sync/visit 后状态稳定性的验证。

3. **异常/退化路径不够细**
   SSE 空消息、bootstrap 解析异常、部分命中 `updatedRegions` 这类边界还不够系统。

---

## 4. 建议测试分层

建议把本专题拆成四层，而不是继续都堆在一个大测试文件里。

### Layer A: Transition Classification

目标：只验证“这次请求最后是什么 transition”。

关注：

- `page`
- `region`
- `stream`

不关注：

- block 内容细节
- history

适合的测试名：

- `classifies page bootstrap as page transition`
- `classifies fragment bootstrap as region transition`
- `classifies successful region patch as region transition`
- `classifies sse operation as stream transition`

---

### Layer B: History Semantics

目标：只验证“是否应该写 history”。

关注：

- page push
- same-route no push
- region no push
- fragment no push

适合的测试名：

- `pushes history only for page transitions with changed route`
- `does not push history when page route is unchanged`
- `does not push history for fragment responses`
- `does not push history for region patch responses`

---

### Layer C: Region Patch Semantics

目标：只验证 `updatedRegions` patch 规则。

关注：

- 命中 block 替换
- 未命中 block 保持
- 部分命中
- 完全 miss 时 page fallback
- 多 region patch

适合的测试名：

- `patches every region listed in updatedRegions when all blocks exist`
- `preserves untouched blocks during region patch`
- `falls back to page transition when no updated region exists in bootstrap`
- `patches matching regions and ignores missing ones when at least one match exists`
- `keeps block order stable after multi-region patch`

---

### Layer D: Error & Recovery Semantics

目标：验证错误路径和后续恢复。

关注：

- 非 2xx 响应
- fetch throw
- malformed stream / empty stream
- 错误后的下一次成功请求是否恢复

适合的测试名：

- `enters error state on failed submit and recovers on next successful request`
- `enters error state on failed sync and preserves previous snapshot`
- `handles empty sse payload without corrupting snapshot`
- `keeps last good snapshot when bootstrap parsing fails`

---

## 5. 建议新增测试矩阵

### P0: 最高优先级

这些场景最值得先补，因为最容易引发真实 UI 回归。

| ID | 场景 | 原因 | 建议位置 |
| --- | --- | --- | --- |
| TR-001 | page bootstrap route 未变化时不 push history | 当前只有 route 变化 push 的正例，缺最关键反例 | `test/web/headless-transition.test.ts` |
| TR-002 | 多个 `updatedRegions` 同时命中时全部 patch | 当前只稳定覆盖单 region 命中 | `test/web/headless-transition.test.ts` |
| TR-003 | `updatedRegions` 部分命中、部分 miss 时仍走 region patch | 这是最容易实现漂移的灰区 | `test/web/headless-transition.test.ts` |
| TR-004 | 错误态后下一次成功请求恢复为 `idle` 且清空 `error` | 当前有 error 进入，但恢复链路没被明确锁定 | `test/web/headless-transition.test.ts` |

### P1: 第二优先级

| ID | 场景 | 原因 | 建议位置 |
| --- | --- | --- | --- |
| TR-101 | fragment 响应不写 history | 当前逻辑依赖组合判断，值得单独锁定 | `test/web/headless-transition.test.ts` |
| TR-102 | `sync(target)` 与当前 route 相同的幂等行为 | 防止 sync 写出不必要状态变化 | `test/web/headless-transition.test.ts` |
| TR-103 | 连续两次 region patch 时第二次不会污染第一次未命中的 block | 验证多轮 patch 稳定性 | `test/web/headless-transition.test.ts` |
| TR-104 | fetch 抛异常时保留最后一个成功 snapshot | 强化灾难恢复行为 | `test/web/headless-transition.test.ts` |

### P2: 第三优先级

| ID | 场景 | 原因 | 建议位置 |
| --- | --- | --- | --- |
| TR-201 | SSE 空消息 | 更像健壮性测试 | `test/web/headless-transition.test.ts` 或 `test/web/headless-browser-flow.test.ts` |
| TR-202 | SSE 格式异常 | 防止 stream 路径污染状态机 | 同上 |
| TR-203 | page bootstrap block 顺序变化时 patch 后顺序稳定性 | 偏实现细节，但对 UI 稳定性有价值 | `test/web/headless-transition.test.ts` |

---

## 6. 建议测试用例草案

### 6.1 TR-001 route 未变化不 push history

**Given**

- 当前 route 为 `/guestbook`
- 下一次 page bootstrap 的 route 仍为 `/guestbook`

**When**

- 调用 `visit("/guestbook")` 或触发 page 响应的 `submit()`

**Then**

- `transition === "page"`
- `pushState` 不应被调用
- snapshot 允许更新内容，但 route 不应变化

---

### 6.2 TR-002 多 region patch

**Given**

- 当前页面有 `messages`、`summary`、`composer`
- 返回 page bootstrap 含这三个 block 的新版本
- operation 声明 `updatedRegions = ["messages", "summary"]`

**When**

- 执行 region action

**Then**

- `messages`、`summary` 被替换为新内容
- `composer` 保持旧内容
- `transition === "region"`
- 不写 history

---

### 6.3 TR-003 部分命中、部分 miss

**Given**

- operation 声明 `updatedRegions = ["messages", "missing"]`
- bootstrap 只有 `messages`

**When**

- 执行 region action

**Then**

- 只 patch `messages`
- 不因 `missing` 缺失而整体退回 page
- `transition === "region"`

**备注**

这是当前最值得锁定的灰区，因为它决定 patch 策略到底是“有一个命中就 patch”还是“必须全命中才 patch”。

---

### 6.4 TR-004 error -> recovery

**Given**

- 第一次请求返回非 2xx
- 第二次请求返回合法 page bootstrap

**When**

- 先触发失败，再触发成功

**Then**

- 第一次后 `status === "error"`
- 第二次后 `status === "idle"`
- `error` 字段被清理
- snapshot 更新为最新成功内容

---

## 7. 推荐文件组织

短期内可以继续集中在：

- `test/web/headless-transition.test.ts`

但建议按下面方式加小分组，避免继续长成“一个大杂烩文件”：

- `describe("transition classification", ...)`
- `describe("history semantics", ...)`
- `describe("region patch semantics", ...)`
- `describe("error and recovery semantics", ...)`

如果后续本专题继续扩张，可以拆成：

- `test/web/headless-transition-classification.test.ts`
- `test/web/headless-history.test.ts`
- `test/web/headless-region-patch.test.ts`
- `test/web/headless-error-recovery.test.ts`

---

## 8. 执行建议

建议先按下面顺序补测：

1. `TR-001`
2. `TR-002`
3. `TR-003`
4. `TR-004`

原因：

- 都在同一个测试文件和同一条主路径上
- 都是高回归风险、用户可见、实现容易漂移的场景
- 补完之后，这个专题的主风险面基本就锁住了

---

## 9. 一句话结论

`Transition & Region Patch` 现在已经有不错的主路径回归，但还缺少“组合态 + 幂等性 + 恢复路径”的系统设计。这个专题后续最值得补的，不是更多 happy path，而是 `same-route page`、`multi-region patch`、`partial hit patch`、`error -> recovery` 这四类高价值边界。
