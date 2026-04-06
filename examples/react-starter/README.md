# React Starter

This example keeps the MDAN behavior model and server runtime intact, but lets React take over the page and block UI from the browser bootstrap data.

- The server stays as small as the base starter
- React reads the `@mdanai/sdk/web` headless snapshot and renders the full page itself
- React uses `marked` to render `snapshot.markdown` and `block.markdown`
- `@mdanai/sdk/elements` is not required
- block refreshes still go through the same MDAN interaction loop

Run the local demo with:

```bash
cd examples/react-starter
npm start
```

Or with Bun for install/build work:

```bash
bun install
bun run build
cd examples/react-starter
npm start
```

Then open [http://127.0.0.1:4325/](http://127.0.0.1:4325/).
