# Docs Site Deployment

`docs-site` is a small Node server that renders the Markdown files in [`docs/`](../docs).

## Start Command

From the repository root:

```bash
npm install
npm run build
npm run docs:start
```

## Supported Environment Variables

- `HOST`
  default: `0.0.0.0`
- `PORT`
  default: `4332`
- `SITE_ORIGIN`
  example: `https://docs.mdan.ai`
- `SITE_TITLE`
  default: `MDAN Docs`
- `DOCS_ASSET_VERSION`
  optional static asset version suffix
- `DOCS_CONTENT_DIR`
  optional alternate docs directory

Example:

```bash
HOST=0.0.0.0 \
PORT=4332 \
SITE_ORIGIN=https://docs.mdan.ai \
npm run docs:start
```

## Reverse Proxy

Put a reverse proxy in front of the Node process and forward the public docs domain to the configured `HOST:PORT`.

Important:

- keep `SITE_ORIGIN` set to the final public HTTPS origin
- terminate TLS at the proxy
- restart the process after deploys

## Deployment Notes

- `npm run docs:start` recompiles the docs site before starting it
- the server reads Markdown directly from `docs/`
- `docs/releases/` and `docs/superpowers/` are intentionally not exposed by the docs site
