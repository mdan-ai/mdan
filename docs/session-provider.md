---
title: Session Provider
description: Connect your existing login, cookie, or session system to the MDAN server runtime through read, commit, and clear hooks.
---

# Session Provider

This page is about where to connect an existing login or cookie setup into MDAN.

Session is a runtime concern. `@mdanai/sdk/server` integrates it through a thin provider interface:

```ts
type Session = Record<string, unknown>;

type MdanSessionProvider = {
  read(request): Promise<Session | null>;
  commit(mutation, response): Promise<void>;
  clear(response): Promise<void>;
};
```

This lets the SDK work with your existing session approach without hard-coding one cookie implementation into handlers.

## What Each Method Does

- `read(request)`
- `commit(mutation, response)`
- `clear(response)`

- `read`: load the current session from the incoming request
- `commit`: persist a login or refresh mutation onto the outgoing response
- `clear`: remove the current session from the outgoing response

Those three methods are enough. MDAN does not ask you to rebuild your auth system. It only asks you to plug in read, write, and clear.

## Typical Cookie-Backed Shape

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

This interface is intentionally thin so you can wrap your existing cookie or session system instead of replacing it.
