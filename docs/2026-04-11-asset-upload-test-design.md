# 2026-04-11 Asset Upload Pipeline Test Design

目标：为 `NEXT-004` 资源上传能力 v1 产出一份可直接执行的专项测试设计文档，后续上传链路相关测试优先按本设计补齐。

覆盖的 feature：

- `NEXT-004` 资源上传能力 v1（真实文件内容通道）

主要参考：

- `docs/2026-04-11-feature-test-design-matrix.md`
- `test/server/adapter-shared.test.ts`
- `test/server/runtime-assets.test.ts`
- `test/server/assets.test.ts`
- `test/web/headless-browser-flow.test.ts`
- `test/server/html-render.test.ts`
- `src/server/assets.ts`
- `src/server/adapter-shared.ts`

---

## 1. 范围定义

本专题只关心“资源上传闭环是否稳定”，也就是：

- 前端/host 何时切 multipart
- server adapter 如何把 multipart 归一化
- 文件如何持久化成本地 asset handle
- runtime/handler 如何读取 asset 内容
- TTL cleanup 与读取失败如何表现

不在本专题内的内容：

- action 语义与 transition
- field kind 通用映射
- contract 校验语义
- 远端存储 adapter（S3/OSS）
- 多文件产品能力设计

---

## 2. 被测闭环模型

上传链路当前可以拆成五段：

1. **Render / submit capability**

- field kind 为 `asset`
- HTML renderer 输出 `<input type="file">`
- 表单自动切 `multipart/form-data`
- headless 如果 payload 中包含 `File`，自动构造 `FormData`

2. **Adapter normalization**

- `multipart/form-data` 被 adapter 接收
- 文本字段保留为普通值
- 文件字段转为结构化 asset handle

3. **Local persistence**

- 文件内容落盘到 `.mdan/assets/<asset-id>/blob`
- 元数据写入 `meta.json`
- handle 返回给上层逻辑

4. **Runtime handler consumption**

- handler 中 `context.inputs.<field>` 收到 `MdanAssetHandle`
- `readAsset()` / `openAssetStream()` helper 可读取实际内容

5. **Lifecycle / cleanup**

- TTL 元数据写入
- 过期后 `cleanupExpiredAssets()` 删除 asset
- 删除后读取应失败

---

## 3. 当前已有覆盖

### 3.1 已覆盖主路径

| 能力 | 测试文件 | 当前状态 |
| --- | --- | --- |
| multipart 文本 + 文件归一化 | `test/server/adapter-shared.test.ts` | 已覆盖 |
| multipart -> persisted asset handle | `test/server/runtime-assets.test.ts` | 已覆盖 |
| handler 收到 asset handle | `test/server/runtime-assets.test.ts` | 已覆盖 |
| `readAsset()` helper | `test/server/runtime-assets.test.ts` | 已覆盖 |
| `openAssetStream()` helper | `test/server/runtime-assets.test.ts` | 已覆盖 |
| TTL metadata 写入 | `test/server/assets.test.ts` | 已覆盖 |
| 过期 cleanup | `test/server/assets.test.ts` | 已覆盖 |
| HTML renderer 遇到 asset 切 multipart | `test/server/html-render.test.ts` | 已覆盖 |
| elements/model 遇到 asset 切 multipart | `test/elements/model.test.ts` | 已覆盖 |
| headless 遇到 `File` 切 `FormData` | `test/web/headless-browser-flow.test.ts` | 已覆盖 |
| headless + `actionProof` + `File` 共存 | `test/web/headless-browser-flow.test.ts` | 已覆盖 |

### 3.2 当前覆盖的不足

当前测试基础已经不错，但主要还缺三类高价值边界：

1. **失败路径**

- asset 不存在
- asset 已清理
- 读取时磁盘文件损坏/缺失

2. **输入边界**

- 空文件
- 特殊文件名
- mime 缺失或异常
- 多个文件字段或同一个表单中多个 asset 字段

3. **组合路径**

- multipart + actionProof + 普通字段更多组合
- no-js 表单与 runtime helper 的组合边界

---

## 4. 建议测试分层

### Layer A: Submit Construction

目标：验证前端/host 何时切 multipart，何时保留 JSON。

关注：

- HTML renderer form `enctype`
- elements/model 的 `resolveFormEnctype`
- headless `File` 检测与 `FormData` 构造

适合的测试名：

- `switches to multipart when any declared input is asset`
- `keeps json body when payload contains no File`
- `includes action proof and text fields in multipart body`

---

### Layer B: Multipart Normalization

目标：验证 adapter 如何把 multipart 解析为“文本字段 + asset handle”。

关注：

- 文本字段保留
- 文件字段结构化
- 多字段混合

适合的测试名：

- `normalizes multipart file fields into asset handles`
- `preserves plain text fields alongside asset handles`
- `normalizes multiple file fields independently`

---

### Layer C: Persistence & Handle Integrity

目标：验证本地持久化和 handle 元数据。

关注：

- `id`
- `name`
- `mime`
- `size`
- `storage`
- `path`
- `sha256`
- TTL metadata

适合的测试名：

- `writes complete metadata for persisted assets`
- `stores uploaded file bytes at the handle path`
- `uses octet-stream fallback when file type is empty`

---

### Layer D: Runtime Consumption & Cleanup

目标：验证 handler helper 和清理生命周期。

关注：

- `context.inputs`
- `context.inputsRaw`
- `readAsset`
- `openAssetStream`
- cleanup 后读取失败

适合的测试名：

- `passes asset handles to handlers without lossy conversion`
- `reads asset content after upload using runtime helpers`
- `fails to read expired asset after cleanup`
- `preserves active assets during mixed cleanup`

---

## 5. 建议新增测试矩阵

### P0: 最高优先级

| ID | 场景 | 原因 | 建议位置 |
| --- | --- | --- | --- |
| AU-001 | cleanup 后 `readAsset()` / `getAssetHandle()` 失败 | 这是最真实的生命周期失败路径 | `test/server/assets.test.ts` 或 `test/server/runtime-assets.test.ts` |
| AU-002 | headless `actionProof + File + 普通字段` 的 multipart 细节断言更完整 | 当前已有基础覆盖，但组合链路价值高 | `test/web/headless-browser-flow.test.ts` |
| AU-003 | 空文件上传（size = 0） | 很常见，容易出现 size/hash/path 边界问题 | `test/server/adapter-shared.test.ts` 或 `test/server/runtime-assets.test.ts` |
| AU-004 | mime 为空时回退 `application/octet-stream` | 当前实现有回退逻辑，应明确锁定 | `test/server/assets.test.ts` |

### P1: 第二优先级

| ID | 场景 | 原因 | 建议位置 |
| --- | --- | --- | --- |
| AU-101 | 多个 asset 字段同时上传 | 当前只稳定覆盖单 asset 字段 | `test/server/adapter-shared.test.ts` |
| AU-102 | 文件名包含空格/Unicode/多点扩展名 | 容易影响 name/path 处理心智 | `test/server/runtime-assets.test.ts` |
| AU-103 | cleanup 混合删除：过期资产删除，活跃资产保留，活跃资产仍可读取 | 补强生命周期完整性 | `test/server/assets.test.ts` |
| AU-104 | handler 同时读取 `inputs` 与 helper 内容时保持一致 | 防止 handle 与 helper 读取漂移 | `test/server/runtime-assets.test.ts` |

### P2: 第三优先级

| ID | 场景 | 原因 | 建议位置 |
| --- | --- | --- | --- |
| AU-201 | 读取不存在 asset id | 偏健壮性测试 | `test/server/assets.test.ts` |
| AU-202 | `openAssetStream()` 在文件缺失时失败形态 | 偏异常路径 | `test/server/assets.test.ts` |
| AU-203 | 同内容不同文件名上传时 `sha256` 相同但 `id` 不同 | 偏实现细节，但有价值 | `test/server/runtime-assets.test.ts` |

---

## 6. 建议测试用例草案

### 6.1 AU-001 cleanup 后读取失败

**Given**

- 创建一个短 TTL asset
- 调用 cleanup 删除它

**When**

- 再调用 `getAssetHandle()` 或 `readAsset()`

**Then**

- 应抛错
- 不应返回空内容伪装成功

---

### 6.2 AU-002 actionProof + File + 普通字段

**Given**

- `POST` operation 带 `actionProof`
- payload 同时包含：
  - `File`
  - 一个文本字段
  - 一个未声明但被允许透传的普通字段

**When**

- `headless.submit()` 发送请求

**Then**

- body 为 `FormData`
- `action.proof` 存在
- 文本字段存在
- 文件字段是 `File`
- headers 不手写 `content-type`

---

### 6.3 AU-003 空文件上传

**Given**

- 上传一个 `size=0` 的 `File`

**When**

- adapter 做 multipart normalization

**Then**

- 仍生成 asset handle
- `size === 0`
- `sha256` 存在
- `readAsset()` 返回空 buffer，而不是报错

---

### 6.4 AU-004 mime fallback

**Given**

- 上传一个 `file.type === ""` 的文件

**When**

- 创建本地 asset handle

**Then**

- `mime === "application/octet-stream"`

---

## 7. 推荐文件组织

短期内可以沿用现有文件，不急着拆新目录：

- `test/server/adapter-shared.test.ts`
- `test/server/runtime-assets.test.ts`
- `test/server/assets.test.ts`
- `test/web/headless-browser-flow.test.ts`

建议按下面规则补：

- 提交构造相关 -> `headless-browser-flow`
- multipart 解析相关 -> `adapter-shared`
- runtime helper 与 handler 相关 -> `runtime-assets`
- TTL / cleanup / 生命周期相关 -> `assets`

如果后续继续扩张，可拆成：

- `test/server/asset-upload-normalization.test.ts`
- `test/server/asset-upload-runtime.test.ts`
- `test/server/asset-lifecycle.test.ts`

---

## 8. 执行建议

建议按下面顺序补测：

1. `AU-001`
2. `AU-002`
3. `AU-003`
4. `AU-004`

原因：

- 都是失败路径或高价值边界
- 对现有 happy path 补强最明显
- 不需要改大量夹具或新建复杂宿主环境

---

## 9. 一句话结论

`Asset Upload Pipeline` 现在已经打通了 happy path，但还缺“生命周期失败路径 + 输入边界 + 组合请求体”这三类系统测试。后续最值得补的不是再证明一次能上传，而是锁定 cleanup 后读取失败、空文件、mime fallback、`actionProof + multipart` 这些最容易在演进中回归的场景。
