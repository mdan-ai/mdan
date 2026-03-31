import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";

import { createExpressStarterServer } from "./dist/server.js";
import { createExpressMdsnHandler } from "./dist/express-adapter.js";

const port = Number(process.env.PORT || 4330);
const exampleRoot = fileURLToPath(new URL("./", import.meta.url));
const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
const sourcePath = join(exampleRoot, "app", "index.md");
const assetVersion = Date.now().toString(36);

function withVersion(path) {
  return `${path}?v=${assetVersion}`;
}

const importMap = {
  imports: {
    "@mdsnai/sdk/core": withVersion("/sdk/dist/core/index.js"),
    "@mdsnai/sdk/web": withVersion("/sdk/dist/web/index.js"),
    "@mdsnai/sdk/elements": withVersion("/sdk/dist/elements/index.js"),
    "lit": withVersion("/node_modules/lit/index.js"),
    "lit-html": withVersion("/node_modules/lit-html/lit-html.js"),
    "lit-html/is-server.js": withVersion("/node_modules/lit-html/is-server.js"),
    "lit-element/lit-element.js": withVersion("/node_modules/lit-element/lit-element.js"),
    "@lit/reactive-element": withVersion("/node_modules/@lit/reactive-element/reactive-element.js")
  }
};

function injectEnhancement(html) {
  const enhancement = `
<script type="importmap">${JSON.stringify(importMap)}</script>
<script type="module">
  import { mountExpressStarter } from "${withVersion("/app/client.js")}";
  mountExpressStarter(document, window.fetch.bind(window));
</script>`;

  return html.replace("</body>", `${enhancement}\n  </body>`);
}

const source = await readFile(sourcePath, "utf8");
const mdsn = createExpressStarterServer({ source });
const app = express();
const expressMdsnHandler = createExpressMdsnHandler(mdsn, { transformHtml: injectEnhancement });

app.use(express.urlencoded({ extended: false }));

app.get("/favicon.ico", (_request, response) => {
  response.status(204).end();
});

app.get("/app/client.js", (_request, response) => {
  response.sendFile(join(exampleRoot, "dist", "client.js"));
});

app.use("/sdk", express.static(join(repoRoot, "sdk")));
app.use("/node_modules", express.static(join(repoRoot, "node_modules")));

app.use(async (request, response) => {
  await expressMdsnHandler(request, response);
});

app.listen(port, "127.0.0.1", () => {
  console.log(`Express starter demo running at http://127.0.0.1:${port}/`);
});
