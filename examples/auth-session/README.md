# MDSN Auth Session Example

This is a starter-style session example.

## Files

- `app/login.md`
  - default login page with login and register navigation
- `app/register.md`
  - register page with register and back-to-login actions
- `app/vault.md`
  - post-login page source with session data and private notes
- `app/server.ts`
  - user, note, and session logic
- `app/client.ts`
  - default UI mount using `createHeadlessHost() + mountMdsnElements()`
- `index.mjs`
  - local Node host using `createHost()` from `@mdsnai/sdk/server/node`

## Start

Run once from the repository root:

```bash
npm install
cd examples/auth-session
npm start
```

Or with Bun for install/build work:

```bash
bun install
cd examples/auth-session
npm start
```

Open:

- `http://127.0.0.1:4323/login`

## What this example shows

1. page sources still live in `.md` files
2. explicit `createHostedApp()` action bindings work for session flows
3. login, register, protected actions, and logout all use the same MDSN protocol
4. the app starts on `login.md`, moves between login and register, and switches to `vault.md` after success
