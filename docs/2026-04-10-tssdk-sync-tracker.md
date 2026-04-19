# 2026-04-10 tssdk Sync Tracker

目标：在不引入新特性的前提下，把当前 `sdk` 的稳定能力逐步对齐到归档 SDK（DSL 相关除外）。

## 已同步

| ID | 特性 | 状态 | 说明 |
| --- | --- | --- | --- |
| SYNC-001 | 语义槽位规则（必填 `Purpose/Context/Rules/Result`，可选 `Views/Handoff`） | DONE | 已在 `src/core/semantic-slots.ts` 实现并加测试锁定。 |
| SYNC-002 | Agent 语义块分割（`agent:begin`/`agent:end`）与校验 | DONE | 已在 `src/core/agent-blocks.ts` 实现并加测试锁定。 |
| SYNC-003 | 双格式输出（md/html）统一由 server 直接提供 | DONE | `createMdanServer` 直接支持 markdown/html/event-stream；Node/Bun host 不再提供 `document` 回调渲染通道。 |
| SYNC-010 | `content-actions` 全套（`parseFrontmatter`/`extractSections`/`extractRegionTrust`/`validateContentPair`） | DONE | 已新增 `src/core/content-actions.ts` 并补 `test/core/content-actions.test.ts`。 |
| SYNC-011 | `validateContentPair` 中 action 引用校验（slot + agent block） | DONE | 已覆盖 block/slot/agent 三类引用对账，并接入 `contracts` 统一校验链路。 |
| SYNC-012 | Actions 契约校验（`assertActionsDocument`） | DONE | 已新增 `src/core/contracts.ts`，并在 runtime 的 page/action JSON 出站路径执行契约校验。 |
| SYNC-013 | Execute 请求语义校验（最小版） | DONE | 已新增 `src/core/action-proof.ts` + runtime 默认开启 action proof 验签，并补 `inputNames` 字段范围校验；按当前策略不引入 `state_version` gate，专题说明见 `docs/ACTION-PROOF-SECURITY.md`。 |
| SYNC-017 | 协议对外导出面（`index.ts`/`public-api` 对齐） | DONE | 已补 `core/server/root` 公共导出锁定测试，并在 `server/index.ts` 补齐 `validatePostInputs` 与相关类型导出。 |

## 待同步

| ID | 特性 | 归档参考 | 当前状态 | 优先级 | 下一步 |
| --- | --- | --- | --- | --- | --- |
| SYNC-014 | `If-Match` 与 `state_version` 并发守卫（428/400/412） | `archive-legacy-sdk/src/server/core/request-handler.ts` | SKIP | P0 | 按当前策略明确不做（不引入并发隔离/阻塞并发机制）。 |
| SYNC-015 | `/runtime/state` / `/runtime/execute` / `/states/*` 状态路由语义 | `archive-legacy-sdk/src/server/core/request-handler.ts` | SKIP | P1 | 按当前策略明确不做（SDK 不占用 runtime 固定路由）。 |
| SYNC-016 | 安全/确认策略语义（`security.default_confirmation_policy`） | `archive-legacy-sdk/src/core/protocol/contracts.ts` | DONE | P1 | 已补 `contracts` schema 校验（含 action 级覆盖），并在 runtime `actionProof` 路径执行确认拦截（`actionConfirmed=true`）。 |
| SYNC-018 | `agent:start` 注释兼容别名（可选） | 归档仅 `agent:begin` | SKIP | P2 | 已确认当前阶段不做；保持唯一规范 `agent:begin`/`agent:end`，降低语法分叉与维护成本。 |

## 执行节奏（建议）

1. 先做 `SYNC-010/011`（内容语义稳定基础）。
2. 再做 `SYNC-012/013/014`（执行语义与并发安全核心）。
3. 最后做 `SYNC-015/016/017`（兼容层与导出面）。
