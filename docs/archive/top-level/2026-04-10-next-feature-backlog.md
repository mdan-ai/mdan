# 2026-04-10 Next Feature Backlog

目标：在当前 JSON 基线稳定后，按优先级逐步补齐输入类型能力与资源上传能力。

## 现状结论

- 当前输入模型已经统一到 `FieldSchema`，主字段语义由 `kind`/`format` 表达。
- 当前 UI 已支持基础控件映射：
  - `string / number / integer / boolean / enum / asset`
  - 其中 `string` 可通过 `format=password|textarea` 细化显示语义。
- 当前 runtime 请求解析已不再固定为 `Record<string, string>`：
  - 普通输入仍以字符串为主；
  - `asset` 会进入结构化句柄对象；
  - schema 校验已经支持 `string/number/integer/boolean/object/array/enum`。

## Backlog

| ID | 特性 | 优先级 | 当前状态 | 说明 |
| --- | --- | --- | --- | --- |
| NEXT-001 | `input_schema` 全类型执行校验（string/number/integer/boolean/object/array/enum） | P0 | TODO | 对齐归档版 `validateSchemaValue/validateActionPayload` 的能力，执行前做 schema 级校验并返回结构化错误。 |
| NEXT-002 | runtime 输入通道保留 JSON 原生类型 | P0 | PARTIAL | 已支持结构化 asset handle，但 number/boolean/object/array 仍未统一返回 typed value。 |
| NEXT-003 | UI 输入语义扩展（在不破坏通用性的前提下） | P1 | PARTIAL | `FieldSchema` 已统一；`integer/password/textarea/enum` 已映射，`object/array` 等仍缺专用控件。 |
| NEXT-004 | 资源上传能力 v1（真实文件内容通道） | P0 | DONE | 已补齐 local 上传闭环：multipart -> 本地落盘 -> 标准化 asset handle -> handler helper 读取。 |
| NEXT-005 | 资源上传声明规范（JSON schema 约定） | P0 | TODO | 明确 `input_schema` 中文件字段约定（建议：`type: "string", format: "binary"` + `x-mdan-input-kind: "asset"`）。 |
| NEXT-006 | 上传后的资源句柄/存储抽象 | P1 | PARTIAL | 已有 local asset store + TTL cleanup API；后续可继续抽象 storage adapter 到 S3/OSS。 |
| NEXT-007 | no-js 表单上传兼容（multipart + action wrapper） | P1 | TODO | 在保持 `action/input` 协议的同时，支持原生表单上传路径自动映射。 |
| NEXT-008 | headless 非 2xx 错误处理收敛 | P1 | TODO | `request/visit` 对 `response.ok` 做显式分支，错误进入 `error` 状态并给出可读信息。 |

## 文件上传特性说明（先记录）

- 当前已有能力：
  - UI 可渲染 `<input type="file">`；
  - Node/Bun adapter 可把 multipart 归一化为本地落盘后的 asset handle；
  - handler 可通过 `inputs.<field>` 直接拿到 asset handle；
  - SDK 暴露 `readAsset(assetId)` / `openAssetStream(assetId)` / `cleanupExpiredAssets(...)`；
  - local store 默认落在 `<project>/.mdan/assets/<asset-id>/...`，并写入 TTL 元数据。
- 当前缺口：
  - Headless 默认 JSON 提交不带文件内容；
  - `input_schema` 对 asset 的声明规范还没最终定稿；
  - 远端存储 adapter（S3/OSS）还未抽象出来。

## 建议执行顺序

1. 先做 `NEXT-001/002`（类型语义正确性）
2. 再做 `NEXT-004/005`（文件上传协议与通道）
3. 最后做 `NEXT-006/007/008`（工程化与体验收敛）
