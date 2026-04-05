export const DEFAULT_MDAN_MARKDOWN_PROFILE = "https://mdan.ai/protocol/v1";

export function toMarkdownContentType(profile = DEFAULT_MDAN_MARKDOWN_PROFILE): string {
  return `text/markdown; profile="${profile}"`;
}
