# 2026-04-10 TypeScript Naming Conventions

目标：统一仓库里的 TypeScript 命名风格，优先解决：

- `camelCase` / `PascalCase` / `snake_case` 混用
- 内部模型命名和外部协议命名混在一起
- 类型名、函数名、常量名、文件名风格不一致

这份规范适用于：

- `src/`
- `test/`
- `examples/`
- 后续新增的 TS/JS 文件

---

## 1. 总原则

**一句话规则：内部代码统一用 JavaScript/TypeScript 社区默认风格，只有外部协议字段保留原样。**

也就是：

- 内部标识符优先 `camelCase`
- 类型、接口、类、组件优先 `PascalCase`
- 常量只在“真正常量”场景下用 `UPPER_SNAKE_CASE`
- `snake_case` 只保留给外部协议、JSON 字段、规范字段、环境变量这类不能随便改名的内容

---

## 2. 命名规则

### 2.1 变量、函数、方法、参数

统一使用 `camelCase`

示例：

```ts
const assetRoot = "...";
const defaultConfirmationPolicy = "never";

function resolveFieldKind(field: FieldSchema): FieldKind {
  return field.kind;
}
```

不要这样：

```ts
const asset_root = "...";
function resolve_field_kind() {}
```

---

### 2.2 类型、接口、类、枚举、组件

统一使用 `PascalCase`

示例：

```ts
type FieldKind = "string" | "number";
interface FieldSchema {}
class MdanPageElement extends LitElement {}
```

不要这样：

```ts
type field_kind = ...;
interface field_schema {}
class mdanPageElement {}
```

---

### 2.3 常量

默认用 `camelCase`。

只有满足下面条件时才使用 `UPPER_SNAKE_CASE`：

- 真正不会变的模块级常量
- 广泛复用的固定字面量
- 类似“协议标识符 / DOM id / 默认阈值 / 正则常量”

示例：

```ts
const textareaMaxLengthHint = 120;
const defaultMaxBodyBytes = 1024 * 1024;
```

适合 `UPPER_SNAKE_CASE` 的例子：

```ts
const MDAN_BOOTSTRAP_SCRIPT_ID = "mdan-bootstrap";
const TEXTAREA_MAX_LENGTH_HINT = 120;
```

建议：

- 新代码不要把普通局部变量写成全大写
- 如果一个常量只在单个函数附近使用，优先 `camelCase`

---

### 2.4 布尔值命名

布尔值优先使用可读的判断式前缀：

- `is...`
- `has...`
- `can...`
- `should...`
- `needs...`

示例：

```ts
const isSecretField = true;
const hasAssetInput = false;
const shouldRenderDebugDrawer = true;
```

避免：

```ts
const secretFlag = true;
const asset = false;
```

---

### 2.5 数组 / Map / 集合

集合名要体现“复数”或“索引关系”。

示例：

```ts
const blockNames = [];
const inputNames = [];
const actionById = new Map();
const inputsByName = new Map();
const visibleBlockNames = new Set();
```

推荐：

- 数组用复数名：`fields`, `operations`, `errors`
- `Map` / 对象索引用 `By...`：`actionById`, `inputsByName`
- `Set` 用复数或 `...Set`：`allowedActionIds`, `visibleBlockNames`

---

### 2.6 缩写词与首字母缩写

不要在内部标识符里混用奇怪的全大写缩写风格。

统一规则：

- 类型名里：按正常单词处理，必要时保留常见缩写
- 变量/函数里：用普通 `camelCase`

推荐：

```ts
type HtmlRenderOptions = {};
type JsonSurfaceEnvelope = {};

const htmlRenderer = ...;
const jsonBody = ...;
const assetId = ...;
```

尽量避免：

```ts
type HTMLRenderOptions = {};
const JSONBody = ...;
const assetID = ...;
```

说明：

- `JSON`, `HTML`, `URL`, `HTTP`, `SDK`, `TTL` 这些缩写在文档里可大写
- 在代码标识符里优先写成 `Json`, `Html`, `Url`, `Http`, `Sdk`, `Ttl`
- 已经形成稳定公共 API 的名字可暂不强行改，新增代码按新规则走

---

## 3. 外部协议字段例外

下面这些场景允许并且应该保留 `snake_case`：

- JSON surface envelope 字段
- 协议契约字段
- Markdown/HTTP/外部规范字段
- 环境变量

示例：

```ts
{
  route_path: "/demo",
  state_effect: { response_mode: "region" },
  allowed_next_actions: ["submit"],
  default_confirmation_policy: "never"
}
```

规则是：

- **外部输入/输出保留原协议字段**
- **内部代码访问时，局部变量和 helper 名字改成 camelCase**

推荐：

```ts
const routePath = envelope.view?.route_path;
const defaultConfirmationPolicy = envelope.actions.security?.default_confirmation_policy;
```

不要把协议字段直接扩散成内部命名风格：

```ts
const route_path = ...;
const default_confirmation_policy = ...;
```

---

## 4. 文件名规范

### 4.1 TypeScript 源码文件

统一使用 `kebab-case`

示例：

- `field-schema.ts`
- `json-snapshot-adapter.ts`
- `headless-bootstrap.ts`

不要混用：

- `fieldSchema.ts`
- `FieldSchema.ts`

### 4.2 自定义元素组件文件

继续沿用已有的 `kebab-case` + 前缀风格：

- `mdan-page.ts`
- `mdan-form.ts`
- `mdan-field.ts`

---

## 5. 类型设计命名建议

### 5.1 类型名要表达“是什么”，不要表达“来自哪层”

推荐：

- `FieldSchema`
- `FieldKind`
- `FieldFormat`
- `ActionProofClaims`

避免：

- `MdanInputType2`
- `JsonInputFieldLike`
- `UiNormalizedFieldThing`

### 5.2 函数名优先用动词短语

推荐：

- `resolveFieldKind`
- `collectConstraints`
- `adaptJsonEnvelopeToMdanPage`
- `validateInputValuesBySchema`

避免：

- `fieldKindResolver`
- `constraintsCollector`

---

## 6. 新旧命名冲突时怎么处理

当内部规范和外部协议冲突时，遵循这个顺序：

1. 外部协议字段原样保留
2. 进入内部逻辑后立刻转成内部命名
3. 不要让 `snake_case` 在内部层层传递

推荐写法：

```ts
const routePath = input.view?.route_path;
const allowedNextActions = input.actions.allowed_next_actions ?? [];
```

---

## 7. 当前仓库的统一建议

从现在开始，建议统一成下面这套：

- 内部字段模型：`FieldSchema`, `kind`, `format`
- 局部变量 / 函数 / 参数：`camelCase`
- 类型 / 接口 / 类：`PascalCase`
- 协议字段：保留 `snake_case`
- 文件名：`kebab-case`

简化成一句话：

**内部 camelCase/PascalCase，外部协议 snake_case。**

---

## 8. 后续落地建议

建议分两步：

1. 先按这份规范做人工清理
   先解决高频混乱处：字段模型、adapter、runtime、文档

2. 再接自动化约束
   推荐后续加：
   - ESLint
   - `@typescript-eslint/naming-convention`

目前仓库已经接入了最小命名检查：

- 配置文件：`eslint.config.mjs`
- 主命令：`npm run lint`
- 兼容别名：`npm run lint:names`

这套规则当前只约束内部 TypeScript 标识符命名：

- `variableLike`：`camelCase` / `UPPER_CASE` / `PascalCase`
- `typeLike`：`PascalCase`

不会把外部协议字段、JSON 属性名、frontmatter 字段这类 `snake_case` 边界数据误判为内部命名违规。

建议的自动化目标不是“一次修全仓”，而是：

- 先保证新增代码不再继续引入命名混乱
- 再逐步清理旧代码

---

## 9. 不该统一的地方

有些地方不要为了“看起来统一”而硬改：

- JSON 协议字段
- 外部 API 返回字段
- 规范名和标准字段
- 已经公开稳定的包导出名（除非明确做 breaking change）

统一代码风格，不等于抹掉协议边界。
