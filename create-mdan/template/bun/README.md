# __PROJECT_NAME__

This is a minimal MDAN starter for the Bun host.

## 30-Second Tour

- `app/index.md`
  Defines the page source and interaction.
- `app/server.ts`
  Owns state and action handlers.
- `app/client.ts`
  Mounts the browser runtime.
- `index.mjs`
  Starts the Bun host.

## Run It

```bash
bun install
bun start
```

This starter is Bun-native, so you can use it without installing Node.

Then open [http://127.0.0.1:3000/](http://127.0.0.1:3000/).

## First Things To Change

1. Edit `app/index.md`
2. Edit `app/server.ts`
3. Keep `app/client.ts` as-is, or replace it when you want to own the UI
