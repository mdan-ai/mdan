import type { MdsnRepresentation } from "./types.js";

interface AcceptEntry {
  mediaType: string;
  q: number;
}

function parseAcceptHeader(acceptHeader: string): AcceptEntry[] {
  return acceptHeader
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [mediaType = "", ...params] = part.split(";").map((value) => value.trim());
      const qParam = params.find((value) => value.startsWith("q="));
      const q = qParam ? Number(qParam.slice(2)) : 1;
      return {
        mediaType: mediaType.toLowerCase(),
        q: Number.isFinite(q) ? q : 1
      };
    });
}

export function negotiateRepresentation(acceptHeader?: string): MdsnRepresentation {
  if (!acceptHeader) {
    return "html";
  }

  const accepted = parseAcceptHeader(acceptHeader);
  if (accepted.some((entry) => entry.mediaType === "text/event-stream" && entry.q > 0)) {
    return "event-stream";
  }

  if (accepted.some((entry) => entry.mediaType === "text/markdown" && entry.q > 0)) {
    return "markdown";
  }

  if (accepted.some((entry) => ["text/html", "text/*", "*/*"].includes(entry.mediaType) && entry.q > 0)) {
    return "html";
  }

  return "not-acceptable";
}
