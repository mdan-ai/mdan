---
title: Form Customization Example
description: End-to-end example showing how one custom form renderer can drive both browser-shell snapshot HTML and browser-side runtime takeover.
---

# form-customization

This example shows the default browser-shell form injection path.

Source layout:

- `app/index.md`
- `app/index.action.json`
- `app.ts`
- `form-renderer.js`
- `dev.ts`

What it demonstrates:

- define one shared `weatherFormRenderer`
- use it once in `createApp({ rendering: { form } })`
- let the default browser shell reuse the same renderer for both server-side
  projection and browser-side runtime takeover
- keep the MDAN action contract unchanged while replacing the default panel markup

Run:

```bash
cd sdk
bun run examples/form-customization/dev.ts
```

Open `http://127.0.0.1:4326/`.

If port `4326` is already in use, run:

```bash
PORT=4327 bun run examples/form-customization/dev.ts
```

What to look for:

- the weather query panel is not the default `mdan-form` layout
- the same custom panel appears before and after browser-side takeover
- changing the query still submits through the declared MDAN `GET` action

Key files:

- [app.ts](/Users/hencoo/projects/mdan/sdk/examples/form-customization/app.ts)
- [form-renderer.js](/Users/hencoo/projects/mdan/sdk/examples/form-customization/form-renderer.js)
