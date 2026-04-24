---
title: Uploads And Assets
description: Internal guide to the current MDAN upload and asset pipeline, including multipart normalization, asset handles, runtime helpers, and local cleanup behavior.
---

# Uploads And Assets

Use this document when you need to understand the current upload and asset
pipeline in detail.

This is intentionally narrower than [Input Schemas](/input-schemas).

That page explains ordinary action input contracts. This one focuses on what is
special about file uploads and asset handles in the current SDK.

## What This Flow Does

In the current SDK, uploaded files do not stay as raw multipart parts once they
reach handler code.

Instead, the flow is:

1. a browser or client submits `multipart/form-data`
2. the host adapter normalizes the body before the runtime handles it
3. uploaded files are persisted into the local asset store
4. handler code receives serializable `MdanAssetHandle` values inside `inputs`
5. handlers can read file bytes later with `readAsset()` or `openAssetStream()`

That means handlers work with stable handles, not raw multipart parsing.

## When This Pipeline Is Used

This path is used when an action submission includes one or more `File` values.

That can happen through:

- native browser form submission
- the default browser path when a file input exists
- a custom frontend built on `createHeadlessHost()`
- any client that submits `multipart/form-data` to a host adapter

Ordinary JSON action submissions do not go through this asset pipeline.

## How An Upload Becomes An Asset Handle

Host adapters normalize browser form bodies before they reach the runtime:

- `application/x-www-form-urlencoded` becomes a JSON input body
- `multipart/form-data` becomes a JSON input body
- file parts are persisted and replaced with serializable asset handles

In the current implementation, asset-like fields are detected from either:

- `x-mdan-input-kind: "asset"`
- JSON Schema `format: "binary"`

The normalized handler input is an `MdanAssetHandle`:

```ts
type MdanAssetHandle = {
  kind: "asset";
  id: string;
  name: string;
  mime: string;
  size: number;
  storage: "local";
  path: string;
  sha256: string;
};
```

The handle is safe to keep in `inputs` or `inputsRaw`. The file bytes stay in
the configured asset store.

## Local Asset Store

Today the SDK ships with a local on-disk asset store.

By default, assets are stored under:

```text
<rootDir>/.mdan/assets/<asset-id>/
```

Each asset directory contains:

- `blob`: the uploaded bytes
- `meta.json`: name, MIME type, size, SHA-256 hash, creation time, and optional
  expiry time

Configure storage with:

```ts
const server = createMdanServer({
  assets: {
    rootDir: process.cwd(),
    ttlSeconds: 3600
  }
});
```

The current store writes one directory per asset id. TTL metadata is written
when `ttlSeconds` is configured.

## What Handlers Receive

Action handlers receive both normalized and raw values. For uploaded files,
both views carry the asset handle:

```ts
server.post("/upload", async ({ inputs, inputsRaw }) => {
  const attachment = inputs.attachment;
  const rawAttachment = inputsRaw.attachment;

  return {
    // ...
  };
});
```

In the tested runtime path:

- `inputs.attachment` is an `MdanAssetHandle`
- `inputsRaw.attachment` is the same handle object shape

Handlers can then read asset bytes through context helpers:

```ts
const server = createMdanServer({ appId: "upload-demo" });

server.post("/upload", async ({ inputs, readAsset, openAssetStream }) => {
  const attachment = inputs.attachment;
  if (!attachment || typeof attachment !== "object" || attachment.kind !== "asset") {
    throw new Error("missing attachment");
  }

  const bytes = await readAsset(attachment.id);
  const stream = openAssetStream(attachment.id);

  return {
    markdown: `# Uploaded

<!-- mdan:block id="result" -->`,
    actions: {
      blocks: {
        result: { actions: [] }
      },
      actions: {}
    },
    route: "/upload",
    regions: {
      result: `${attachment.name} (${bytes.byteLength} bytes)`
    }
  };
});
```

`readAsset(assetId)` reads the whole file into memory.

`openAssetStream(assetId)` returns a readable stream for incremental access.

Choose based on file size and your own processing needs.

## Cleanup And Lifetime

Expired assets are not deleted automatically by the runtime on every request.

Cleanup is explicit:

```ts
await cleanupExpiredAssets({ rootDir: process.cwd() });
```

When `ttlSeconds` was configured during asset creation, expired assets can be
removed later by calling `cleanupExpiredAssets(...)`.

The cleanup result reports which asset ids were deleted.

After cleanup:

- `getAssetHandle(...)` for an expired asset fails
- `readAsset(...)` for an expired asset fails

## What Is Actually Covered Today

The current repository does have automated coverage for the core server-side
asset flow, including:

- multipart normalization into persisted asset handles
- handler access to `readAsset()` and `openAssetStream()`
- TTL metadata writing
- cleanup removing expired assets

What this document does not claim is a broader productized storage contract
beyond the current local asset store.

## Practical Boundaries

Treat this feature as the current upload pipeline, not as a fully abstract
storage framework.

Practical expectations today:

- the stable handler-facing abstraction is `MdanAssetHandle`
- the shipped storage backend is local disk
- local `path` values are implementation details, not client download URLs
- upload authorization and file validation are still application concerns

## Security Notes

Treat uploaded assets as untrusted input:

- authorize the action before reading asset bytes
- validate MIME type and size for your use case
- do not expose local `path` values to untrusted clients
- clean up expired assets if your app accepts uploads

## Related Docs

- [Input Schemas](/input-schemas)
- [Custom Server](/custom-server)
- [Server Behavior](/server-behavior)
- [API Reference](/api-reference)
