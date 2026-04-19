function parseSseEvent(rawEvent: string): string | null {
  const message = rawEvent
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n");

  return message || null;
}

export function serializeSseMessage(markdown: string): string {
  const normalized = markdown.replaceAll("\r\n", "\n");
  const lines = normalized.split("\n");
  return `${lines.map((line) => `data: ${line}`).join("\n")}\n\n`;
}

export function parseSseMessages(content: string): string[] {
  return content
    .split(/\n\n+/)
    .map((chunk) => parseSseEvent(chunk))
    .filter((message): message is string => Boolean(message));
}

export function drainSseBuffer(
  buffer: string,
  onMessage: (message: string) => void
): string {
  const normalized = buffer.replaceAll("\r\n", "\n");
  let cursor = normalized;

  while (true) {
    const separatorIndex = cursor.indexOf("\n\n");
    if (separatorIndex === -1) {
      break;
    }

    const rawEvent = cursor.slice(0, separatorIndex);
    cursor = cursor.slice(separatorIndex + 2);
    const message = parseSseEvent(rawEvent);
    if (message) {
      onMessage(message);
    }
  }

  return cursor;
}
