# 2026-04-10 Field Schema Feature Gaps

目标：列出 `FieldSchema` 统一完成之后，SDK 在输入能力、UI、runtime、schema 协议和存储抽象上还没有补齐的特性。

说明：

- 本文档关注的是“还没补齐的能力”
- 不再重复已经完成的 `FieldSchema` 模型统一工作
- 状态分为：`DONE` / `PARTIAL` / `TODO`

---

## 1. 输入值语义

| ID | 特性 | 状态 | 优先级 | 说明 |
| --- | --- | --- | --- | --- |
| FS-001 | `number` handler typed value | DONE | P0 | JSON/action schema 路径已把 handler `inputs` 归一为 number；`inputsRaw` 保留提交原值。 |
| FS-002 | `integer` handler typed value | DONE | P0 | schema 校验通过后返回整数 number；非法小数仍返回字段错误。 |
| FS-003 | `boolean` handler typed value | DONE | P0 | checkbox/string/JSON boolean 统一归一为 boolean；`inputsRaw` 保留兼容形态。 |
| FS-004 | `object` typed value pipeline | DONE | P1 | runtime/headless/elements 已支持 JSON textarea -> typed object 基线。 |
| FS-005 | `array` typed value pipeline | DONE | P1 | runtime/headless/elements 已支持 JSON textarea -> typed array 基线。 |
| FS-006 | 统一按 `FieldSchema.kind` 类型化输入 | DONE | P0 | runtime schema normalization 与 elements submit normalization 都集中在 core。 |

---

## 2. UI 控件与交互

| ID | 特性 | 状态 | 优先级 | 说明 |
| --- | --- | --- | --- | --- |
| FS-101 | `integer` 独立 UI 语义 | PARTIAL | P1 | 当前仍和 `number` 共用 number input。 |
| FS-102 | `object` 默认编辑器 | PARTIAL | P1 | 已有 JSON textarea 基线；后续可补结构化 object editor。 |
| FS-103 | `array` 默认编辑器 | PARTIAL | P1 | 已有 JSON textarea 基线；后续可补列表编辑器。 |
| FS-104 | `date` / `datetime` / `time` UI 语义 | TODO | P2 | 还没有标准 format 到控件的正式映射。 |
| FS-105 | `email` / `url` / `tel` UI 语义 | TODO | P2 | 尚未建立 format 到 UI/inputType 的统一约定。 |
| FS-106 | `asset` 文件预览 | TODO | P2 | 还没有选中文件后的预览/摘要显示。 |
| FS-107 | `asset` 多文件上传 | TODO | P2 | 当前是单文件模型。 |
| FS-108 | `asset` 拖拽上传 | TODO | P3 | 默认 UI 还没有 drag-and-drop。 |
| FS-109 | `asset` 上传进度反馈 | TODO | P3 | 默认 UI 未暴露进度态。 |
| FS-110 | 大文件限制与提示 | TODO | P2 | 缺统一的 size policy 和 UX。 |

---

## 3. JSON Schema 映射与协议

| ID | 特性 | 状态 | 优先级 | 说明 |
| --- | --- | --- | --- | --- |
| FS-201 | `asset` 的正式 schema 约定 | TODO | P0 | 还没最终确定是 `format: "binary"` 还是额外扩展键。 |
| FS-202 | `FieldSchema` 映射规范文档 | TODO | P1 | 需要把 JSON schema -> `FieldSchema` 的规则单独写成协议文档。 |
| FS-203 | Markdown `INPUT` 到 `FieldSchema` 的正式映射规范 | TODO | P1 | 当前实现有心智模型，但缺正式文档。 |
| FS-204 | 更多 schema format 标准化 | TODO | P2 | 如 `date`、`email`、`uri`、`json` 等。 |
| FS-205 | `FieldSchema.rawSchema` 的使用边界定义 | TODO | P2 | 需要明确 runtime/UI 应如何消费 raw schema。 |

---

## 4. Runtime 与校验

| ID | 特性 | 状态 | 优先级 | 说明 |
| --- | --- | --- | --- | --- |
| FS-301 | runtime typed coercion pipeline | DONE | P0 | handler `inputs` 现在走 core normalization，`inputsRaw` 是兼容逃生口。 |
| FS-302 | structured validation error shape | PARTIAL | P1 | 已有结构化错误，但输入字段级错误模型还可更统一。 |
| FS-303 | `FieldSchema` 驱动的统一 submit payload normalization | DONE | P1 | 默认 elements payload 会先按 `FieldSchema` 归一，再交给 headless host serializes。 |
| FS-304 | `object/array` 的更强校验 UX | TODO | P2 | 目前更多是 runtime 报错，缺 UI 层辅助。 |

---

## 5. Asset 存储与读取

| ID | 特性 | 状态 | 优先级 | 说明 |
| --- | --- | --- | --- | --- |
| FS-401 | local asset store | DONE | P0 | 已支持本地落盘、句柄对象、helper 读取。 |
| FS-402 | TTL cleanup API | DONE | P0 | 已支持显式 cleanup API。 |
| FS-403 | 自动 cleanup 调度 | TODO | P1 | 还没有宿主级定时清理策略。 |
| FS-404 | 远端 storage adapter（S3/OSS） | TODO | P1 | 还没有抽象成多后端 adapter。 |
| FS-405 | storage abstraction interface | PARTIAL | P1 | 目前是 local 实现为主，还没形成正式 adapter contract。 |
| FS-406 | 文件元数据扩展 | TODO | P2 | 如原始扩展名、上传时间、用户自定义标签等。 |
| FS-407 | 多后端统一读取 helper | TODO | P1 | `readAsset/openAssetStream` 还主要围绕本地实现。 |

---

## 6. Headless 与客户端行为

| ID | 特性 | 状态 | 优先级 | 说明 |
| --- | --- | --- | --- | --- |
| FS-501 | 非 2xx 错误处理收敛 | TODO | P1 | headless 对 error state 仍可进一步统一。 |
| FS-502 | typed submit values | DONE | P1 | headless submit value 类型已支持 number/boolean/object/array/File。 |
| FS-503 | 无 JS 上传协议收敛 | TODO | P1 | no-js 表单和 `action/input` wrapper 的整合还没完全做完。 |
| FS-504 | 更丰富的 client-side field validation | TODO | P2 | 当前主要是浏览器原生约束 + runtime 校验。 |

---

## 7. 文档与开发体验

| ID | 特性 | 状态 | 优先级 | 说明 |
| --- | --- | --- | --- | --- |
| FS-601 | README `FieldSchema` 参考段落 | PARTIAL | P2 | 已提到 `FieldSchema`，但还没有完整 API 参考表。 |
| FS-602 | `FieldSchema` API reference | TODO | P1 | 需要单独面向外部使用者的规范说明。 |
| FS-603 | 输入类型/格式 cookbook | TODO | P2 | 需要给常见 schema 例子。 |
| FS-604 | 迁移文档 | TODO | P2 | 需要说明旧输入模型如何迁移到 `FieldSchema`。 |

---

## 8. 建议优先级

推荐下一阶段优先顺序：

1. `FS-102/103/304`
   object/array JSON textarea 基线已完成，下一步补更友好的结构化编辑器和字段级错误 UX。

2. `FS-201/202/203`
   把 `FieldSchema` 与 JSON schema / Markdown INPUT 的协议映射正式定稿。

3. `FS-204/304/504`
   再补更多 format 语义、复杂输入校验 UX 和 client-side field validation。

4. `FS-403/404/405/407`
   最后把 asset store 从 local-only 推到正式 adapter 抽象。

---

## 9. 一句话总结

`FieldSchema` 统一已经完成，但“模型统一”不等于“能力完备”。

当前最大的剩余缺口不是命名，而是：

- **typed value 基线已打通，但复杂输入的默认 UI 还没补齐**
- **复杂结构输入已有 JSON textarea 基线，但还没有更友好的结构化编辑器**
- **asset 的协议和多后端存储还没有完全工程化**
