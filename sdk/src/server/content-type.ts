export const DEFAULT_MDSN_MARKDOWN_PROFILE = "https://mdsn.ai/protocol/v1";

export function toMarkdownContentType(profile = DEFAULT_MDSN_MARKDOWN_PROFILE): string {
  return `text/markdown; profile="${profile}"`;
}
