# 2026-04-10 Input Types Matrix

目标：把 SDK 当前“真正支持的输入能力”一次写清楚，并以 `FieldSchema` 作为统一心智模型。

本文档覆盖：

- `FieldSchema` 的标准字段语义
- UI 层支持的字段属性
- 浏览器提交值与 server handler 取值形态
- 当前已支持与未完全落地的边界

---

## 1. Canonical Model

现在统一输入模型的标准结构就是 `FieldSchema`。

`FieldSchema.kind` 表示标准字段语义。
`FieldSchema.format` 表示对字段语义的补充修饰，例如 password / textarea / binary。

---

## 2. FieldSchema 标准字段语义

当前 `FieldSchema.kind` 目标集合为：

| `kind` | 用途 | 默认 UI | 浏览器提交值 | handler 中的值 |
| --- | --- | --- | --- | --- |
| `string` | 单行/多行文本基础语义 | text / textarea / password | `string` | `string` |
| `number` | 数字 | `<input type="number">` | `string` / JSON number | `number` |
| `integer` | 整数 | 目前仍走 number input | `string` / JSON number | `number` |
| `boolean` | 布尔开关 | `<input type="checkbox">` | `"true"` / `"false"` / JSON boolean | `boolean` |
| `enum` | 枚举选择 | `<select>` | `string` | `string` |
| `asset` | 文件上传 | `<input type="file">` | `File` | `asset handle` 对象 |
| `object` | 结构化对象 | JSON textarea | JSON 字符串 / JSON object | object |
| `array` | 数组 | JSON textarea | JSON 字符串 / JSON array | array |

说明：

- `string` 会再结合 `format` 和 UI hint 决定是 text / password / textarea
- `integer` 当前 schema 校验已支持，但 UI 仍归并到 number input
- `number` / `integer` 在 schema/action 路径会归一为 number
- `boolean` 在 schema/action 路径会归一为 boolean
- `inputsRaw` 保留提交原值，给旧 handler 或调试场景兜底
- `asset` 是目前唯一一个 handler 中不会返回字符串的核心输入类型

---

## 3. FieldSchema 支持的属性

当前应以 `FieldSchema` 来理解字段属性：

| 属性 | 类型 | 作用 | 当前是否生效 | 说明 |
| --- | --- | --- | --- | --- |
| `name` | `string` | 字段名 | 是 | 提交键名 |
| `kind` | `FieldKind` | 标准字段语义 | 是 | 新 canonical 字段 |
| `required` | `boolean` | 是否必填 | 是 | 渲染 `required` 并参与 schema/浏览器校验 |
| `secret` | `boolean` | 是否敏感字段 | 是 | `text + secret` 映射为 password input |
| `format` | `"password" \| "textarea" \| "binary"` | 细化显示/协议语义 | 部分生效 | 新 canonical 修饰字段 |
| `options` | `string[]` | 选择项 | 是 | 仅 `choice` 使用 |
| `description` | `string` | 字段说明 | 是 | UI 会渲染 help text |
| `defaultValue` | `string \| number \| boolean \| null` | 默认值 | 部分生效 | 默认 UI 值主要用于客户端初始值推导 |
| `constraints.minLength` | `number` | 最小长度 | 是 | 作用于 text/textarea |
| `constraints.maxLength` | `number` | 最大长度 | 是 | 作用于 text/textarea |
| `constraints.minimum` | `number` | 最小值 | 是 | 作用于 number input |
| `constraints.maximum` | `number` | 最大值 | 是 | 作用于 number input |
| `constraints.pattern` | `string` | 正则约束 | 是 | 作用于 text/textarea |
| `rawSchema` | `Record<string, unknown>` | 原始 schema 透传 | 部分生效 | 供 runtime / 后续扩展继续使用 |

补充：

- `secret` 和 `format=password` 目前都能驱动 password UI
- `defaultValue` 在默认表单行为里已参与初始值推导，但不是所有渲染/协议路径都做了“强绑定填充”

---

## 4. JSON Schema 到 FieldSchema 的映射

当输入来自 JSON `input_schema` 时，SDK 应把它映射成 `FieldSchema`。

### 4.1 当前已识别的 schema 语义

| JSON Schema 形态 | 映射后的 `FieldSchema` | 当前 UI |
| --- | --- | --- |
| `{ type: "string" }` | `kind=string` | 单行文本 |
| `{ type: "string", format: "password" }` | `kind=string, format=password` | password input |
| `{ type: "string", format: "textarea" }` | `kind=string, format=textarea` | 多行文本 |
| `{ type: "string", "ui:kind": "textarea" }` | `kind=string, format=textarea` | 多行文本 |
| `{ type: "string", "x-ui-kind": "textarea" }` | `kind=string, format=textarea` | 多行文本 |
| `{ type: "string", maxLength >= 120 }` | `kind=string`, UI 上偏 textarea | 多行文本 |
| `{ type: "number" }` | `kind=number` | number input |
| `{ type: "integer" }` | `kind=integer` | number input |
| `{ type: "boolean" }` | `kind=boolean` | checkbox |
| `{ enum: [...] }` | `kind=enum` | select |
| `{ type: "string", format: "binary" }` | `kind=asset, format=binary` | 文件输入 |

### 4.2 当前已识别的 schema 元数据

| Schema 属性 | 映射目标 | 用途 |
| --- | --- | --- |
| `required[]` | `required` | 必填字段集合 |
| `description` | `description` | 字段说明 |
| `default` | `defaultValue` | 默认值 |
| `enum` | `options` | 选择项 |
| `minLength` | `constraints.minLength` | 字符串最小长度 |
| `maxLength` | `constraints.maxLength` | 字符串最大长度 |
| `minimum` | `constraints.minimum` | 数字最小值 |
| `maximum` | `constraints.maximum` | 数字最大值 |
| `pattern` | `constraints.pattern` | 文本正则 |
| `format: "password"` | `secret=true` | 密码输入 |
| `x-secret: true` | `secret=true` | 敏感字段 |
| `secret: true` | `secret=true` | 敏感字段 |

### 4.3 当前 schema 校验支持的值类型

runtime 执行前的 schema 校验目前支持：

| 校验类型 | 状态 | 说明 |
| --- | --- | --- |
| `string` | 支持 | 含长度约束 |
| `number` | 支持 | 从字符串做数值校验 |
| `integer` | 支持 | 从字符串做整数校验 |
| `boolean` | 支持 | 接受常见布尔字符串 |
| `object` | 支持 | 支持 JSON 字符串或对象值 |
| `array` | 支持 | 支持 JSON 字符串或数组值 |
| `enum` | 支持 | 直接值或字符串匹配 |

注意：

- “schema 校验支持 `integer/object/array`” 不等于“UI 已有独立的 `integer/object/array` 输入控件”
- 目前 UI 层仍会把 `integer` 映射为 `number`，`object/array` 不会自动生成专用编辑器

---

## 5. UI 控件支持矩阵

当前默认 HTML renderer 与默认 elements UI 的控件映射如下：

| 输入语义 | HTML renderer | Elements UI | 备注 |
| --- | --- | --- | --- |
| `text` | `<input type="text">` | `<input type="text">` | 支持长度/模式约束 |
| `text + secret` | `<input type="password">` | `<input type="password">` | 由 `secret=true` 触发 |
| `textarea` | `<textarea>` | `<textarea>` | 支持 `minLength/maxLength/pattern` |
| `number` | `<input type="number">` | `<input type="number">` | 支持 `min/max` |
| `boolean` | `<input type="checkbox">` | `<input type="checkbox">` | 值通道是 checked |
| `choice` | `<select>` | `<select>` | 选项来自 `options` |
| `object` | `<textarea>` | `<textarea>` | JSON textarea 基线 |
| `array` | `<textarea>` | `<textarea>` | JSON textarea 基线 |
| `asset` | `<input type="file">` | `<input type="file">` | 会切到 multipart |

当前仍待增强的 schema 语义：

- `integer` 独立控件
- 更友好的 `object` 结构化编辑器
- 更友好的 `array` 列表编辑器
- `string format=binary` 的正式 schema 标准化映射

---

## 6. 浏览器提交值与 handler 值矩阵

### 6.1 默认表单 / headless 提交值

| 输入类型 / 语义 | 浏览器内存值 | HTTP 提交格式 | JSON body 中的值 |
| --- | --- | --- | --- |
| `text` | `string` | JSON 或 URL encoded | `string` |
| `textarea` | `string` | JSON 或 URL encoded | `string` |
| `number` | `string` / number | JSON 或 URL encoded | number |
| `integer` | `string` / number | JSON 或 URL encoded | number |
| `boolean` | `"true"` / `"false"` / boolean | JSON 或 URL encoded | boolean |
| `choice` | `string` | JSON 或 URL encoded | `string` |
| `object` | JSON string / object | JSON | object |
| `array` | JSON string / array | JSON | array |
| `asset` | `File` | `multipart/form-data` | 不走普通 JSON string，server 归一化为 asset handle |

### 6.2 server handler 里的值

| 输入类型 / 语义 | `context.inputs.<field>` | 说明 |
| --- | --- | --- |
| `text` | `string` | 普通字符串 |
| `textarea` | `string` | 普通字符串 |
| `number` | `number` | `inputsRaw` 中保留原始字符串/JSON 值 |
| `integer` | `number` | `inputsRaw` 中保留原始字符串/JSON 值 |
| `boolean` | `boolean` | `inputsRaw` 中保留原始字符串/JSON 值 |
| `choice` | `string` | 选择值 |
| `object` | object | `inputsRaw` 中保留原始 JSON 字符串或对象 |
| `array` | array | `inputsRaw` 中保留原始 JSON 字符串或数组 |
| `asset` | `MdanAssetHandle` | 本地文件句柄对象 |

`asset` 句柄当前形态：

```json
{
  "kind": "asset",
  "id": "ast_01...",
  "name": "hello.txt",
  "mime": "text/plain",
  "size": 1234,
  "storage": "local",
  "path": "/abs/.../.mdan/assets/ast_01.../blob",
  "sha256": "..."
}
```

并可通过 handler context helper 使用：

- `readAsset(assetId)`
- `openAssetStream(assetId)`

---

## 7. JSON Schema 扩展与核心输入类型的关系

下面这张表最容易混淆，单独列出来：

| 能力 | 属于“核心输入类型”吗 | 当前是否支持 | 说明 |
| --- | --- | --- | --- |
| `text` | 是 | 是 | 核心类型 |
| `textarea` | 是 | 是 | 核心类型 |
| `number` | 是 | 是 | 核心类型 |
| `boolean` | 是 | 是 | 核心类型 |
| `choice` | 是 | 是 | 核心类型 |
| `asset` | 是 | 是 | 核心类型 |
| `password` | 否 | 是 | 是 `text + secret` / `format=password` 的语义扩展 |
| `integer` | 否 | 部分支持 | schema 校验支持，UI 仍归到 `number` |
| `object` | 否 | 支持 | schema 校验、JSON textarea、typed handler 值均支持；仍可增强结构化编辑体验 |
| `array` | 否 | 支持 | schema 校验、JSON textarea、typed handler 值均支持；仍可增强列表编辑体验 |
| `enum` | 否 | 是 | 映射为 `choice` |
| `binary` / 文件 URL schema 约定 | 否 | 未定稿 | 还没有最终协议标准化 |

---

## 8. 当前已支持 vs 未完全落地

### 8.1 已支持

- 核心输入类型 6 种：`text / textarea / number / boolean / choice / asset`
- JSON `input_schema` 到 UI 输入定义的基础映射
- `description/default/enum/required/length/range/pattern/secret` 元数据映射
- runtime 的 `string/number/integer/boolean/object/array/enum` 校验
- `asset` 真实文件上传、本地落盘、handler 读取 helper

### 8.2 未完全落地

- `integer` 的独立 UI 语义与显示策略
- `object/array` 目前是 JSON textarea 基线，尚无更友好的结构化编辑器
- 默认 elements UI 仍依赖 HTML 控件采集字符串，但 submit payload 会先按 `FieldSchema` 归一
- `asset` 对应的正式 JSON schema 约定
  - 例如 `type: "string", format: "binary"`
  - 或 `x-mdan-input-kind: "asset"`
- 更多 UI 扩展语义（日期、时间、URL、email 等）目前未标准化

---

## 9. 最终结论

如果问题是“SDK 当前到底支持多少输入能力”，正确答案不是“只有 6 种”，也不是“JSON Schema 全都原生支持”。

更准确的说法是：

- **核心输入类型**目前有 6 种
- **JSON Schema 映射能力**已经把这 6 种扩展成更丰富的输入语义和约束系统
- **runtime 校验能力**又比当前 UI 控件层更宽一层

所以讨论输入支持时，建议始终区分这三层：

1. 核心输入类型枚举
2. JSON Schema 映射后的 UI 语义
3. runtime 最终可校验/可消费的数据类型
