---
title: Form Customization Example
description: Frontend-focused example showing a custom form renderer built on top of `@mdanai/sdk/frontend`.
---

# form-customization

This example shows the frontend form-renderer primitives, separate from the
server markdown transport.

Source layout:

- `app/index.md`
- `app/index.action.json`
- `app.ts`
- `form-renderer.js`
- `dev.ts`

What it demonstrates:

- define one shared `weatherFrontend`
- keep frontend-specific code on the `@mdanai/sdk/frontend` entrypoint
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
- changing the query still submits through the declared MDAN `GET` action

Key files:

- [app.ts](/Users/hencoo/projects/mdan/sdk/examples/form-customization/app.ts)
- [form-renderer.js](/Users/hencoo/projects/mdan/sdk/examples/form-customization/form-renderer.js)
