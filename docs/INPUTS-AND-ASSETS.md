# Inputs And Assets

MDAN action inputs are declared with JSON Schema in each action's
`input_schema`. The SDK maps those schemas into a shared field model used by the
server runtime, headless browser runtime, and default elements UI.

## Field Model

The normalized `FieldSchema` model carries:

- `name`
- `kind`: `string`, `number`, `integer`, `boolean`, `enum`, `asset`, `object`,
  or `array`
- `format`: display/protocol hints such as `password`, `textarea`, or `binary`
- `required`
- `secret`
- options, descriptions, defaults, constraints, and the original raw schema

The same model drives:

- default UI input rendering
- form enctype selection
- JSON body serialization
- server-side input coercion and validation

## Server Inputs

Action handlers receive both normalized and raw values:

```ts
import { createArtifactPage } from "@mdanai/sdk/server";
```

```ts
server.post("/submit", async ({ inputs, inputsRaw }) => {
  return createArtifactPage({
    frontmatter: {
      route: "/submit",
      app_id: "demo",
      state_id: "demo:saved",
      state_version: 1
    },
    markdown: `# Saved\n\nCount: ${inputs.count}`,
    executableJson: {
      app_id: "demo",
      state_id: "demo:saved",
      state_version: 1,
      blocks: [],
      actions: []
    }
  });
});
```

For JSON requests, schema-normalized `inputs` may contain native numbers,
integers, booleans, objects, and arrays. `inputsRaw` preserves the submitted
shape for compatibility or auditing.

## Form Bodies

Host adapters normalize browser form bodies before they reach the runtime:

- `application/x-www-form-urlencoded` becomes a JSON input body
- `multipart/form-data` becomes a JSON input body with file values converted to
  asset handles

The default maximum raw form body size is `1 MiB`.

## Asset Inputs

Asset fields are detected from either:

- `x-mdan-input-kind: "asset"`
- JSON Schema `format: "binary"`

Submitted files become `MdanAssetHandle` values:

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

The handle is safe to serialize in action inputs or compatibility JSON
surfaces. The file bytes stay in the configured asset store.

## Local Asset Store

By default, local assets are stored under:

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

Handlers can read assets through context helpers:

```ts
server.post("/upload", async ({ inputs, readAsset, openAssetStream }) => {
  const attachment = inputs.attachment;
  if (!attachment || typeof attachment !== "object" || attachment.kind !== "asset") {
    throw new Error("missing attachment");
  }

  const bytes = await readAsset(attachment.id);
  const stream = openAssetStream(attachment.id);

  return createArtifactPage({
    frontmatter: {
      route: "/upload",
      app_id: "upload-demo",
      state_id: "upload-demo:done",
      state_version: 1
    },
    markdown: `# Uploaded\n\n${attachment.name} (${bytes.byteLength} bytes)`,
    executableJson: {
      app_id: "upload-demo",
      state_id: "upload-demo:done",
      state_version: 1,
      blocks: [],
      actions: []
    }
  });
});
```

Expired assets can be removed with:

```ts
await cleanupExpiredAssets({ rootDir: process.cwd() });
```

## Security Notes

Treat uploaded assets as untrusted input:

- authorize the action before reading asset bytes
- validate MIME type and size for your use case
- do not expose local `path` values to untrusted clients as download URLs
- clean up expired assets if your app accepts user uploads
