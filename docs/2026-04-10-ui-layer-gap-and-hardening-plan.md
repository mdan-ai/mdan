# 2026-04-10 UI Layer Gap & Hardening Plan

目标：基于当前 JSON 合约，补齐 UI 层能力与测试覆盖，达到归档 SDK UI 层的稳定性水平（不强依赖恢复 Solid 技术栈）。

## 1) 现状结论

- 当前 SDK 的 UI 主路径是：
  - `server/html-render.ts` 直出 HTML + bootstrap script
  - `web/headless.ts` 解析 bootstrap + 发起 GET/POST
  - `elements/mount.ts` (Lit custom elements) 做交互渲染
- 归档 SDK 的 UI 主路径是：
  - `web/host.ts`（基于 runtime state/surface/execute）
  - `ui/solid/*`（model/semantics/mount/browser 分层）
  - 完整行为测试（browser/model/components/semantics/web）

结论：我们不是“不能跑”，而是“JSON 语义在 UI 层损失较多，且行为测试覆盖明显不足”。

## 2) 关键缺口（按影响排序）

| ID | 缺口 | 当前情况 | 归档参考 | 影响 | 状态 |
| --- | --- | --- | --- | --- |
| UI-001 | Action 语义丢失（`state_effect/guard`） | adapter 已透传 verb/state_effect/guard，render semantics 已消费行为/风险 | `src/ui/solid/semantics.ts` | UI 可按 page/region/risk 做行为和样式决策 | 已完成（P0） |
| UI-002 | `allowed_next_actions` 未在 UI 操作层生效 | adapter 已执行 action gating，runtime 输出链路已有回归测试 | `src/ui/solid/model.ts` | 避免渲染不应可执行动作 | 已完成（P0） |
| UI-003 | field kind 推断能力弱 | 已支持 textarea/select/password/number/checkbox 推断并贯通到 html/elements | `src/ui/solid/semantics.ts` | 表单体验和校验一致性提升 | 已完成（P0） |
| UI-004 | 过渡语义能力薄 | `headless` 已补 `transition(page/region/stream)` 与 `sync()`，并有 browser-flow/transition 回归测试 | `src/web/host.ts` + `src/ui/solid/browser.ts` | URL/回退/区域更新行为可测试、可锁定 | 已完成（P0） |
| UI-005 | 区域更新策略不完整 | 已补 `updated_regions` 驱动最小 patch（region action + page bootstrap），并锁定 history/回退行为 | `src/ui/solid/mount.tsx` | 局部更新稳定性提升 | 已完成（P0） |
| UI-006 | 测试覆盖缺口 | 已补 `semantics/model/browser-flow/transition` 四组基线测试，覆盖核心 UI 行为链路 | `tests/ui-solid-*.test.mjs`, `tests/web.test.mjs` | 回归风险显著降低 | 已完成（P1） |

## 3) 建议路线（不引入新 UI 框架）

推荐：保留现有 `elements`，把归档 SDK 的“语义建模与行为分层”迁移到当前栈。

### Phase A (P0): 先补语义，不改视觉

1. 扩展 `src/bridge/json-snapshot-adapter.ts` 输出结构：保留 action 原始语义字段（至少 `verb`, `state_effect.response_mode`, `state_effect.updated_regions`, `guard.risk_level`）。
2. 在 adapter/mount 中应用 `allowed_next_actions` 过滤。
3. 把归档 `ui/solid/semantics.ts` 的规则迁到 `src/shared/render-semantics.ts`：
   - `resolveFieldKind`（textarea/select/password/number/checkbox）
   - `resolveActionBehavior`（page/region/submit/read）
   - `resolveActionVariant`（含 danger）

### Phase B (P0): 补行为链路

1. 扩展 `src/web/protocol.ts` 与 `src/web/headless.ts`：
   - 增加 `sync()` 能力
   - 增加 transition 元信息（至少 page/region）
2. 在 `elements/mount.ts` 使用 transition/region 语义做最小化 patch（避免不必要整页重绘）。

### Phase C (P1): 统一 UI 数据模型

1. 新增 `src/elements/model.ts`（或 `src/shared/ui-model.ts`），把页面/section/action/field 构建逻辑集中化。
2. `elements/mount.ts` 与 `server/html-render.ts` 都消费同一语义模型，避免双份逻辑漂移。

### Phase D (P1): 补测试基线

新增测试组（优先迁移归档同名测试思想）：

- `test/ui/semantics.test.ts`
- `test/ui/model.test.ts`
- `test/ui/browser-flow.test.ts`
- `test/web/headless-transition.test.ts`

最低覆盖目标：

- field kind 映射
- action behavior/variant 映射
- allowed actions gating
- page transition pushState
- region patch 不破坏未命中 block

## 4) 迁移顺序（建议）

1. `UI-001/UI-002/UI-003`（语义正确性）
2. `UI-004/UI-005`（交互与过渡稳定）
3. `UI-006`（回归保护网）

## 6) UI-006 完成清单（当前状态）

- `semantics`：`test/shared/sse-render-semantics.test.ts`
  - 已覆盖 field kind / action behavior / action variant / dispatch mode
- `model`：`test/elements/model.test.ts`
  - 已覆盖 operation 分组、payload 组装、dispatch 分流/执行（visit/submit）、presentation 语义
  - 已补 `resolveActionCapabilities()`：基于 JSON 语义提取通用 capability 集（method/dispatch/presentation/responseMode/updatedRegions）
  - 已清理字段名特化渲染（不再按 `message` 注入特定 placeholder），组件仅按 schema/capabilities 决策
  - `elements/mount` 已收敛为单一通用 operation renderer（不再按 GET/POST 维护两套重复渲染分支）
  - 已补 `resolveInputCapabilities()/resolveInputDefaultValue()`，控件映射按输入能力抽象（select/checkbox/file/textarea/input）
- `browser-flow`：`test/web/headless-browser-flow.test.ts`
  - 已覆盖 mount/unmount/popstate、GET query 序列化、SSE 请求头
- `transition`：`test/web/headless-transition.test.ts`
  - 已覆盖 page/region/stream 过渡、`updated_regions` patch、history push 策略、`sync()` 行为

## 5) 非目标（当前轮不做）

- 不强行恢复 `ui/solid` 技术栈
- 不先做主题/UI 视觉重设计
- 不引入额外运行时协议字段（先消化已有 JSON 合约语义）
