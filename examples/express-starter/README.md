# MDSN Express Starter

这是一个最小可运行的 Express 接入示例。

## 目录

- `pages/guestbook.md`
  - canonical 页面源
- `src/index.ts`
  - 业务逻辑，和普通 starter 一致
- `src/express-adapter.ts`
  - 把 Express `req/res` 映射到 `server.handle()` 的薄适配层
- `dev.mjs`
  - 本地开发壳，基于 Express

## 启动

先在仓库根目录执行：

```bash
npm install
npm run build
node examples/express-starter/dev.mjs
```

然后打开：

- `http://127.0.0.1:4330/guestbook`
