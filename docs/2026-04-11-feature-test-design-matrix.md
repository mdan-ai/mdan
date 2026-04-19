# 2026-04-11 Feature Test Design Matrix

目标：把“已完成特性”映射到可执行的测试设计矩阵，作为后续专项测试方案的总表。

输入来源：

- `docs/2026-04-11-completed-feature-summary-for-test-design.md`
- 当前仓库 `test/` 目录中的已存在测试

使用方式：

- 先按本表选择一个 feature 或专题
- 再把“待补测试”展开成专项测试清单
- 新增测试时，优先补没有覆盖的边界与失败路径，而不是重复已有 happy path

---

## 1. 总览

| Feature ID | Feature | 专题 | 当前覆盖强度 | 主要已有测试 |
| --- | --- | --- | --- | --- |
| UI-001 | Action 语义保留与消费 | Action Semantics | 高 | `test/shared/sse-render-semantics.test.ts`, `test/elements/model.test.ts`, `test/bridge/json-snapshot-adapter.test.ts`, `test/server/html-render.test.ts` |
| UI-002 | `allowed_next_actions` gating | Action Gating | 中 | `test/bridge/json-snapshot-adapter.test.ts`, `test/server/runtime-json-bridge.test.ts`, `test/core/contracts.test.ts` |
| UI-003 | Field kind 推断与控件语义贯通 | Field Semantics | 高 | `test/shared/sse-render-semantics.test.ts`, `test/elements/model.test.ts`, `test/bridge/json-snapshot-adapter.test.ts`, `test/server/html-render.test.ts` |
| UI-004 | page/region/stream 过渡语义与 `sync()` | Transition & Region Patch | 高 | `test/web/headless-transition.test.ts`, `test/web/headless-browser-flow.test.ts` |
| UI-005 | `updated_regions` 最小 patch | Transition & Region Patch | 中高 | `test/web/headless-transition.test.ts`, `test/elements/model.test.ts`, `test/bridge/json-snapshot-adapter.test.ts` |
| UI-006 | UI 行为测试基线 | UI Regression Baseline | 高 | `test/shared/sse-render-semantics.test.ts`, `test/elements/model.test.ts`, `test/web/headless-browser-flow.test.ts`, `test/web/headless-transition.test.ts` |
| NEXT-004 | 资源上传能力 v1 | Asset Upload Pipeline | 高 | `test/server/adapter-shared.test.ts`, `test/server/runtime-assets.test.ts`, `test/server/assets.test.ts`, `test/elements/model.test.ts`, `test/server/html-render.test.ts`, `test/web/headless-browser-flow.test.ts` |

---

## 2. Feature Matrix

### UI-001 Action 语义保留与消费

**主路径**

- JSON envelope -> adapter -> internal operation metadata
- internal operation metadata -> render semantics / model capabilities
- render semantics -> HTML / elements button behavior and variant

**重点场景**

| 场景 | 当前状态 | 已有测试 | 待补测试 |
| --- | --- | --- | --- |
| `verb=navigate` -> page behavior | 已覆盖 | `test/shared/sse-render-semantics.test.ts` | 增加 GET + label/accept 干扰条件组合 |
| `stateEffect.responseMode=region` -> region behavior | 已覆盖 | `test/shared/sse-render-semantics.test.ts`, `test/elements/model.test.ts` | 增加 GET region action 的组合语义校验 |
| `guard.riskLevel=high` -> danger variant | 已覆盖 | `test/shared/sse-render-semantics.test.ts`, `test/server/html-render.test.ts`, `test/elements/model.test.ts` | 增加 `critical` risk level 路径 |
| adapter 把协议 `snake_case` 转成内部 camelCase | 已覆盖 | `test/bridge/json-snapshot-adapter.test.ts` | 增加缺字段/脏字段/非法字段值容错 |
| HTML 渲染消费行为/风险语义 | 已覆盖 | `test/server/html-render.test.ts` | 增加 form/button data attrs 的完整断言矩阵 |

**失败预期**

- 非法语义字段不应让内部对象回退到 `snake_case`
- 未识别 `responseMode` 时应退回 `unknown/submit` 默认行为
- 风险等级缺失时不应错误标成 `danger`

---

### UI-002 `allowed_next_actions` gating

**主路径**

- contract allowlist -> adapter filter -> runtime bootstrap / snapshot output

**重点场景**

| 场景 | 当前状态 | 已有测试 | 待补测试 |
| --- | --- | --- | --- |
| 只保留 allowlist 命中的 action | 已覆盖 | `test/bridge/json-snapshot-adapter.test.ts`, `test/server/runtime-json-bridge.test.ts` | 增加多个 block 各自含允许/禁止 action 的组合 |
| allowlist 引用未知 action -> contract violation | 已覆盖 | `test/core/contracts.test.ts` | 增加多个未知 action 与重复 action id 场景 |
| allowlist 缺失 -> 默认不过滤 | 部分覆盖 | `test/bridge/json-snapshot-adapter.test.ts` | 显式补“未提供 allowlist 时保留全部动作”专项断言 |
| HTML bootstrap 与 headless snapshot 一致 | 已覆盖 | `test/server/runtime-json-bridge.test.ts` | 增加 page/html/headless 三方快照一致性断言 |

**失败预期**

- 被过滤动作不应在 HTML bootstrap 或 headless blocks 中残留
- contract 层不应默默忽略未知 allowlist 引用

---

### UI-003 Field kind 推断与控件语义贯通

**主路径**

- JSON schema -> FieldSchema -> input capability -> HTML/elements render

**重点场景**

| 场景 | 当前状态 | 已有测试 | 待补测试 |
| --- | --- | --- | --- |
| `string/password/textarea` 映射 | 已覆盖 | `test/shared/sse-render-semantics.test.ts`, `test/elements/model.test.ts`, `test/bridge/json-snapshot-adapter.test.ts` | 增加 `x-secret`、`x-ui-kind`、`maxLength>=120` 的交叉矩阵 |
| `enum` -> select | 已覆盖 | `test/shared/sse-render-semantics.test.ts`, `test/elements/model.test.ts` | 增加 empty enum / malformed enum 回退行为 |
| `boolean` -> checkbox | 已覆盖 | `test/elements/model.test.ts` | 增加 HTML renderer 断言 |
| `asset` -> file + multipart | 已覆盖 | `test/elements/model.test.ts`, `test/server/html-render.test.ts`, `test/web/headless-browser-flow.test.ts` | 增加多字段表单里仅 asset 触发 multipart 的断言 |
| `constraints/defaultValue/description` 透传 | 已覆盖 | `test/bridge/json-snapshot-adapter.test.ts`, `test/server/html-render.test.ts` | 增加 `minimum/maximum/pattern` 的完整 UI 渲染矩阵 |

**失败预期**

- 字段语义不应在 HTML 与 elements 两条渲染链路间漂移
- 非法 schema 元数据应退回默认控件，而不是崩溃

---

### UI-004 page / region / stream 过渡语义与 `sync()`

**主路径**

- submit/visit -> headless request -> bootstrap/fragment/SSE -> transition state + history

**重点场景**

| 场景 | 当前状态 | 已有测试 | 待补测试 |
| --- | --- | --- | --- |
| page transition | 已覆盖 | `test/web/headless-transition.test.ts` | 增加 query string 变化但 route 相同场景 |
| region transition | 已覆盖 | `test/web/headless-transition.test.ts` | 增加 fragment 与 page-bootstrap-region 两种来源比较 |
| stream transition | 已覆盖 | `test/web/headless-transition.test.ts`, `test/web/headless-browser-flow.test.ts` | 增加 SSE 中断/空消息/格式异常场景 |
| `sync()` 默认当前路由 | 已覆盖 | `test/web/headless-transition.test.ts` | 增加错误响应与 bootstrap 解析失败场景 |
| `sync(target)` 显式目标 | 已覆盖 | `test/web/headless-transition.test.ts` | 增加 target 与当前 route 相同的幂等场景 |

**失败预期**

- region/stream 不应误写 history
- `sync()` 不应丢失已有 snapshot 基本状态

---

### UI-005 `updated_regions` 最小 patch

**主路径**

- operation.stateEffect.updatedRegions -> page bootstrap -> patch current snapshot

**重点场景**

| 场景 | 当前状态 | 已有测试 | 待补测试 |
| --- | --- | --- | --- |
| 单 region patch | 已覆盖 | `test/web/headless-transition.test.ts` | 增加 patch block 顺序变化场景 |
| 多 region patch | 部分覆盖 | `test/elements/model.test.ts`, `test/bridge/json-snapshot-adapter.test.ts` | 补 headless 真实 patch 结果的多 region 测试 |
| `updatedRegions` 未命中 incoming blocks -> fallback page | 已覆盖 | `test/web/headless-transition.test.ts` | 增加部分命中/部分未命中的混合场景 |
| 未更新 block 保持原值 | 已覆盖 | `test/web/headless-transition.test.ts` | 增加重复 patch 和空 patch 幂等性 |

**失败预期**

- patch 不应覆盖未命中 block
- 无有效命中时必须明确退回 page transition

---

### UI-006 UI 行为测试基线

**主路径**

- semantics + model + browser-flow + transition 四层基线协同

**重点场景**

| 场景 | 当前状态 | 已有测试 | 待补测试 |
| --- | --- | --- | --- |
| 语义判定层稳定性 | 已覆盖 | `test/shared/sse-render-semantics.test.ts` | 拆出 feature ID 维度的 describe 分组 |
| model capability 与 payload | 已覆盖 | `test/elements/model.test.ts` | 增加更明确的“能力矩阵”表驱动测试 |
| browser lifecycle / query / SSE | 已覆盖 | `test/web/headless-browser-flow.test.ts` | 增加失败态与取消态 |
| transition/history/patch | 已覆盖 | `test/web/headless-transition.test.ts` | 增加多轮连续交互链路测试 |

**失败预期**

- 基线测试应能明确指出失败属于哪一层，而不是单个大而全测试吞掉语义

---

### NEXT-004 资源上传能力 v1

**主路径**

- browser/elements -> multipart body
- adapter/node/bun normalize
- local asset store persist
- runtime handler helper read/open stream

**重点场景**

| 场景 | 当前状态 | 已有测试 | 待补测试 |
| --- | --- | --- | --- |
| multipart 文本 + 文件归一化 | 已覆盖 | `test/server/adapter-shared.test.ts` | 增加多文件字段、空文件、文件名异常字符 |
| runtime 把 asset handle 传给 handler | 已覆盖 | `test/server/runtime-assets.test.ts` | 增加不同 mime / binary body / 大文件边界 |
| `readAsset` / `openAssetStream` helper | 已覆盖 | `test/server/runtime-assets.test.ts`, `test/server/assets.test.ts` | 增加 asset 不存在 / 已清理 / TTL 过期后读取失败 |
| HTML 渲染自动切 multipart enctype | 已覆盖 | `test/server/html-render.test.ts`, `test/elements/model.test.ts` | 增加混合 text+asset+actionProof 场景 |
| headless 提交 File 时自动切 multipart | 已覆盖 | `test/web/headless-browser-flow.test.ts` | 增加 actionProof + File 并存请求体细节断言 |

**失败预期**

- 文件上传不应回退成 JSON string 值
- asset handle 不应缺核心元数据
- TTL cleanup 后读取 helper 应给出明确失败

---

## 3. 专题拆分建议

### 专题 A：Action Semantics

覆盖：

- UI-001
- UI-002 的语义前置部分

建议先补：

- `critical` risk level
- 不合法 response mode 容错
- allowlist 缺失 vs 空数组差异

---

### 专题 B：Field Semantics

覆盖：

- UI-003

建议先补：

- schema 扩展 hint 交叉矩阵
- renderer/elements 一致性对照表

---

### 专题 C：Transition & Region Patch

覆盖：

- UI-004
- UI-005

建议先补：

- 多 region patch
- mixed hit/miss patch
- SSE 异常流

---

### 专题 D：Asset Upload Pipeline

覆盖：

- NEXT-004

建议先补：

- 不存在 asset / 已过期 asset
- actionProof + multipart 组合
- 文件名、mime、size 边界

---

## 4. 优先补测顺序

推荐按下面顺序继续出专项测试设计：

1. `Transition & Region Patch`
   因为状态组合多、回归风险高、用户可见性最强。

2. `Asset Upload Pipeline`
   因为它是完整链路特性，最适合做端到端与失败路径专项设计。

3. `Action Semantics`
   因为已有覆盖不错，补边界成本低、收益高。

4. `Field Semantics`
   因为主路径基本稳，适合最后用矩阵方式补齐。

---

## 5. 一句话结论

当前测试不是“没有”，而是“已经有了一层不错的基线，但还没按 feature 维度结构化”。这份矩阵的作用，就是把现有测试资产直接转换成后续专项测试设计的施工图。
