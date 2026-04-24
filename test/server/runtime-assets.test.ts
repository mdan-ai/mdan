import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { normalizeMultipartBody } from "../../src/server/adapter-shared.js";
import {
  createMdanServer,
  type MdanAssetHandle
} from "../../src/server/index.js";
import { openAssetStream, readAsset } from "../../src/server/assets.js";

const tempDirs: string[] = [];

async function createAssetRoot(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "mdan-assets-test-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("asset handle runtime", () => {
  it("normalizes multipart uploads into persisted asset handles", async () => {
    const assetRoot = await createAssetRoot();
    const form = new FormData();
    form.set("message", "hello multipart");
    form.set("attachment", new File(["hello asset"], "hello.txt", { type: "text/plain" }));

    const request = new Request("https://example.test", {
      method: "POST",
      body: form
    });

    const contentType = request.headers.get("content-type");
    const rawBody = await request.text();
    const normalized = await normalizeMultipartBody(rawBody, String(contentType), { rootDir: assetRoot });
    const parsed = JSON.parse(normalized) as {
      message: string;
      attachment: MdanAssetHandle;
    };

    expect(parsed.message).toBe("hello multipart");
    expect(parsed.attachment.kind).toBe("asset");
    expect(parsed.attachment.id).toMatch(/^ast_/);
    expect(parsed.attachment.name).toBe("hello.txt");
    expect(parsed.attachment.mime).toBe("text/plain");
    expect(parsed.attachment.size).toBe(11);
    expect(parsed.attachment.storage).toBe("local");
    expect(parsed.attachment.path).toContain(parsed.attachment.id);

    expect((await readAsset(parsed.attachment.id, { rootDir: assetRoot })).toString("utf8")).toBe("hello asset");
  });

  it("passes asset handles to handlers and supports asset helpers", async () => {
    const assetRoot = await createAssetRoot();
    const server = createMdanServer({
      actionProof: {
        disabled: true
      },
      assets: {
        rootDir: assetRoot
      }
    });

    const form = new FormData();
    form.set("attachment", new File(["handler read"], "note.txt", { type: "text/plain" }));
    const request = new Request("https://example.test/upload", {
      method: "POST",
      body: form
    });
    const normalizedBody = await normalizeMultipartBody(await request.text(), String(request.headers.get("content-type")), {
      rootDir: assetRoot
    });

    let seenContext:
      | {
          inputs: Record<string, unknown>;
          inputsRaw: Record<string, unknown>;
          fileText: string;
          streamText: string;
        }
      | undefined;

    server.post("/upload-capture", async (context) => {
      seenContext = {
        inputs: context.inputs,
        inputsRaw: context.inputsRaw,
        fileText: (await context.readAsset((context.inputs.attachment as MdanAssetHandle).id)).toString("utf8"),
        streamText: ""
      };
      return {
        markdown: "# ok",
        actions: { app_id: "x", state_id: "x", state_version: 1, blocks: {}, actions: {} },
        route: "/upload-capture",
        regions: {}
      };
    });

    const response = await server.handle({
      method: "POST",
      url: "https://example.test/upload-capture",
      headers: {
        accept: "text/markdown",
        "content-type": "application/json"
      },
      body: normalizedBody,
      cookies: {}
    });

    expect(response.status).toBe(200);

    const attachment = seenContext?.inputs.attachment as MdanAssetHandle | undefined;
    expect(attachment).toBeTruthy();
    expect(attachment?.kind).toBe("asset");
    expect(seenContext?.inputsRaw.attachment).toEqual(attachment);
    expect(seenContext?.fileText).toBe("handler read");

    const stream = openAssetStream(String(attachment?.id), { rootDir: assetRoot });
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : Buffer.from(chunk));
    }
    expect(Buffer.concat(chunks).toString("utf8")).toBe("handler read");
  });
});
