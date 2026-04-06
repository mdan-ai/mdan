export const DEFAULT_MDAN_MARKDOWN_PROFILE = "https://mdan.ai/spec/v1";

export function toMarkdownContentType(profile = DEFAULT_MDAN_MARKDOWN_PROFILE): string {
  return `text/markdown; profile="${profile}"`;
}
