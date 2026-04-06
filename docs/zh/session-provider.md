---
title: Session Provider
description: 通过 read、commit、clear 这组接口，把你现有的登录、cookie 或 session 体系接进 MDAN 服务端运行时。
---

# Session Provider

这页讲的是：如果你想把现有的登录态或 cookie 方案接进 MDAN，应该从哪里接。

Session 是运行时层能力，`@mdanai/sdk/server` 通过一个很薄的 provider 接口来接入它：

```ts
type Session = Record<string, unknown>;

type MdanSessionProvider = {
  read(request): Promise<Session | null>;
  commit(mutation, response): Promise<void>;
  clear(response): Promise<void>;
};
```

这样 SDK 就能接入现有的 session 方案，又不会把某一种 cookie 实现硬编码进 handler。

## 每个方法的职责

- `read(request)`
- `commit(mutation, response)`
- `clear(response)`

- `read`：从入站请求里读取当前 session
- `commit`：把登录或续期 mutation 持久化到出站响应上
- `clear`：从出站响应上移除当前 session

这三个方法就够了。MDAN 不要求你重写鉴权系统，只要求你把“读取、写入、清理”这三个动作接进来。

## 典型的 Cookie 方案

```ts
const session = {
  async read(request) {
    return request.cookies.mdan_session ? { userId: request.cookies.mdan_session } : null;
  },
  async commit(mutation, response) {
    if (mutation?.type === "sign-in" || mutation?.type === "refresh") {
      response.headers["set-cookie"] = `mdan_session=${mutation.session.userId}; Path=/; HttpOnly`;
    }
  },
  async clear(response) {
    response.headers["set-cookie"] = "mdan_session=; Path=/; Max-Age=0";
  }
};
```

这个接口故意保持很薄，这样你可以直接包装现有的 cookie 或 session 系统，而不是重写一整套鉴权模型。
