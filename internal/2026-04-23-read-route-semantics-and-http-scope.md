# 2026-04-23 `read/route` 语义收敛与 HTTP 方法范围决议

## 本轮目标

先把 `read` 与 `route` 的边界收紧，避免 `route` 被当成“泛 GET”。
其他 HTTP 方法（`PUT/PATCH/DELETE`）本轮不扩展，只做范围冻结。

## 决议

1. 语义主轴统一为：`route / read / write`。
2. App API 对外主入口：`actions.route() / actions.read() / actions.write()` 与 `app.route() / app.read() / app.write()`。
3. 协议语义策略：
   - SDK 统一使用并产出 `verb: "route"`。
   - `navigate` 兼容层已移除，不再作为受支持 verb。
4. 边界约束：
   - `app.route(path)` 与 `app.read(path)` 不允许共享同一个 GET 路径（防止页面入口与数据读取混用）。
5. HTTP 方法范围（当前）：
   - 运行时与 app action 注册仍只支持 `GET/POST`。
   - `PUT/PATCH/DELETE` 暂不进入本轮，后续在独立提案推进。

## 暂缓项（后续再做）

1. 运行时路由器扩展到 `PUT/PATCH/DELETE`。
2. `action.transport.method` 全链路支持更多原生方法。
3. `PUT/PATCH/DELETE` 引入后的 action 校验规则与错误码规范。

## 验收标准（本轮）

1. 新示例与新页面声明默认使用 `route/read/write`。
2. `route` 与 `read` 的路径冲突可被 SDK 直接拦截。
3. 代码与测试中不再存在 `navigate` 分支或兼容处理。
