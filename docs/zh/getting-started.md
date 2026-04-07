---
title: 快速开始
description: 用 create-mdan 创建你的第一个 MDAN 应用，并在几分钟内把它跑起来。
---

# 快速开始

这页只做一件事：帮你创建第一个 MDAN 应用，并在几分钟内把它跑起来。

MDAN 现在官方支持 Node 和 Bun。

- 如果你想走更成熟、更常见的 host 基线，选 Node
- 如果你想直接用 Bun starter 和 Bun 工具链入口，选 Bun
- 两边变化的是 runtime 外壳，不是应用模型

当前 npm 版本：

- `create-mdan@0.6.0`
- `@mdanai/sdk@0.6.0`

## 1. 创建并启动项目

Node starter：

```bash
npm create mdan@latest agent-app
cd agent-app
npm install
npm start
```

Bun starter：

```bash
bunx create-mdan agent-app
cd agent-app
bun install
bun start
```

如果你想显式指定运行时，也可以：

```bash
npm create mdan@latest agent-app -- --runtime bun
bunx create-mdan agent-app --runtime node
```

启动后默认打开 `http://127.0.0.1:3000/`。

如果你自己设置了 `PORT` 环境变量，再按你设置的端口打开。

如果你更习惯这个命令，也可以用：

```bash
npx create-mdan agent-app
```

## 2. 关键文件

- `app/index.md`
  页面内容和交互定义都在这里
- `app/server.ts`
  页面组合、状态和 action handler 在这里
- `app/client.ts`
  浏览器侧运行时和默认 UI 挂载在这里
- `index.mjs`
  本地运行时 host 入口在这里

## 3. 常见修改入口

通常先改这两处就够了：

- `app/index.md`
- `app/server.ts`

`app/client.ts` 一般可以先不动，等你想接自己的 UI 再改。

## 4. 查看更多示例

如果你正在查看 [MDAN 仓库](https://github.com/mdan-ai/mdan)，也可以直接运行仓库里的 `examples/starter/`。

不过仓库里的这个示例目前仍然保留 Node host 外壳；发布出去的 starter 才会按 Node/Bun 两条线生成。

先在仓库根目录执行一次：

```bash
npm install
```

或者：

```bash
bun install
```

然后进入示例目录启动：

```bash
cd examples/starter
npm start
```

如果你只是想用 Bun 做依赖安装和构建，也可以：

```bash
bun install
bun run build
```

## 5. 下一步

- 想先快速理解它是什么、适合什么场景：看 [什么是 MDAN？](/zh/docs/what-is-mdan)
- 想理解它到底怎么工作：看 [理解 MDAN](/zh/docs/understanding-mdan)
- 想开始搭真实应用：看 [应用结构](/zh/docs/application-structure)
- 想直接看更多示例：看 [示例](/zh/docs/examples)
