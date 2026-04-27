import { createHeadlessHost } from "../surface/index.js";

import type { FrontendHostFactory } from "./contracts.js";

export const createDefaultFrontendHost: FrontendHostFactory = createHeadlessHost;
