# 2026-04-11 Completed Feature Summary For Test Design

目标：把 2026-04-10 两份“特性列表”里已经完成的能力收敛成一份测试设计输入文档，后续测试方案以这份文档为主索引。

本文档采用的两个来源列表：

1. `docs/2026-04-10-ui-layer-gap-and-hardening-plan.md`
2. `docs/2026-04-10-next-feature-backlog.md`

说明：

- 这里只整理**已完成**的项
- 不把 `gap tracker` / `sync tracker` 混进来，避免把“基线同步项”与“本轮功能项”混在一起
- 每个条目都按“已交付内容 + 测试设计重点”来写，方便直接转成专项测试方案

---

## 1. 来源一：UI Layer Gap & Hardening Plan

来源：`docs/2026-04-10-ui-layer-gap-and-hardening-plan.md`

### UI-001 Action 语义保留与消费

**状态：** 已完成（P0）

**已交付内容：**

- adapter 已把 action 语义透传到内部 operation 元数据
- UI 语义层已消费行为和风险信息
- 关键语义包括：
  - `verb`
  - `stateEffect.responseMode`
  - `stateEffect.updatedRegions`
  - `guard.riskLevel`

**测试设计重点：**

- 不同 `verb` 是否映射到正确行为类型
- `region/page/read/submit` 语义是否稳定
- 高风险 action 是否稳定映射到 `danger`
- adapter 输出的内部字段是否始终是 camelCase，而不是协议 `snake_case`

---

### UI-002 `allowed_next_actions` 操作层 gating

**状态：** 已完成（P0）

**已交付内容：**

- adapter 已根据 `allowed_next_actions` 过滤可执行动作
- runtime 输出链路已有回归覆盖
- UI 不再渲染不应执行的动作

**测试设计重点：**

- action allowlist 命中时是否只保留允许的动作
- block 中混合 allowed/blocked 动作时渲染结果是否正确
- HTML bootstrap 与 headless snapshot 是否一致遵守 gating
- allowlist 缺失时是否保持默认行为

---

### UI-003 Field kind 推断与控件语义贯通

**状态：** 已完成（P0）

**已交付内容：**

- 已支持：
  - `textarea`
  - `select`
  - `password`
  - `number`
  - `checkbox`
  - `file`
- html renderer 与 elements UI 已共用语义判断

**测试设计重点：**

- schema -> field kind -> input control 的映射一致性
- `password` / `textarea` / `enum` / `asset` 的边界条件
- `defaultValue`、`required`、`constraints` 是否稳定传递到渲染层
- html renderer 和 elements mount 是否存在分叉

---

### UI-004 过渡语义（page / region / stream）与 `sync()`

**状态：** 已完成（P0）

**已交付内容：**

- `headless` 已支持：
  - `transition(page/region/stream)`
  - `sync()`
- browser-flow / transition 回归测试已存在

**测试设计重点：**

- GET/POST/SSE 三种流转是否进入正确 transition
- `sync()` 在默认路由和显式路由下的行为
- `pushState` / 浏览器返回 / URL 同步是否一致
- page transition 与 region patch 是否被错误混用

---

### UI-005 `updated_regions` 驱动的最小 patch

**状态：** 已完成（P0）

**已交付内容：**

- 已支持基于 `updated_regions` 的局部 patch
- region action + page bootstrap 组合路径已覆盖
- history/回退行为已锁定

**测试设计重点：**

- 单 block patch 与多 block patch
- `updatedRegions` 命中/未命中 block 的退化行为
- patch 后未更新 block 是否保持原值
- region patch 不应意外触发 page history 变更

---

### UI-006 UI 行为测试基线

**状态：** 已完成（P1）

**已交付内容：**

- 当前已有四组测试基线：
  - `semantics`
  - `model`
  - `browser-flow`
  - `transition`

**测试设计重点：**

- 在现有回归基线上继续做“功能专项化”拆分
- 区分：
  - 语义判定测试
  - 数据模型测试
  - 浏览器交互测试
  - 过渡/局部更新测试

---

## 2. 来源二：Next Feature Backlog

来源：`docs/2026-04-10-next-feature-backlog.md`

### NEXT-004 资源上传能力 v1（真实文件内容通道）

**状态：** 已完成（P0）

**已交付内容：**

- local 上传闭环已打通：
  - `multipart/form-data`
  - 本地落盘
  - 标准化 asset handle
  - handler helper 读取
- SDK 已暴露读取与清理相关 helper

**测试设计重点：**

- multipart 上传是否稳定生成 asset handle
- asset handle 字段完整性：
  - `kind`
  - `id`
  - `name`
  - `mime`
  - `size`
  - `storage`
  - `path`
  - `sha256`
- `readAsset()` / `openAssetStream()` 是否稳定工作
- 过期清理、读取失败、空文件、mime 识别、重复上传等边界

---

## 3. 测试设计建议：按专题拆，不按文件拆

后续专项测试建议按下面 6 个专题组织，而不是按源码文件组织：

1. **Action Semantics**
   覆盖 UI-001，重点锁定 `verb`、`responseMode`、`riskLevel`、按钮变体与 dispatch 行为。

2. **Action Gating**
   覆盖 UI-002，重点锁定 `allowed_next_actions` 在 adapter / html / headless 三层的一致性。

3. **Field Semantics**
   覆盖 UI-003，重点锁定 schema 映射、控件类型、默认值、约束和渲染一致性。

4. **Transition & Region Patch**
   覆盖 UI-004/UI-005，重点锁定 page/region/stream、history、`sync()` 与 `updatedRegions`。

5. **UI Regression Baseline**
   覆盖 UI-006，重点不是新增功能，而是把现有基线测试进一步结构化成长期专项测试集。

6. **Asset Upload Pipeline**
   覆盖 NEXT-004，重点锁定 multipart -> asset handle -> helper 读取的完整闭环。

---

## 4. 推荐的下一步测试产物

建议后续围绕这份汇总文档继续产出两类文件：

1. **测试设计总表**
   以 feature ID 为主键，列：
   - 场景
   - 主路径
   - 边界条件
   - 失败预期
   - 已有测试
   - 待补测试

2. **专项测试清单**
   每个专题单独出一页，例如：
   - `action-semantics-test-design.md`
   - `transition-region-patch-test-design.md`
   - `asset-upload-test-design.md`

---

## 5. 一句话结论

如果我们接下来要做“专门的测试设计”，最值得围绕的已完成能力不是零散源码文件，而是下面 7 个已交付 feature：

- UI-001 Action 语义保留与消费
- UI-002 `allowed_next_actions` gating
- UI-003 Field kind 推断与控件语义贯通
- UI-004 过渡语义与 `sync()`
- UI-005 `updated_regions` 最小 patch
- UI-006 UI 行为测试基线
- NEXT-004 资源上传能力 v1
