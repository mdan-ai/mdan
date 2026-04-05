export interface DocsNavItem {
  href: string;
  label: {
    en: string;
    zh: string;
  };
}

export interface DocsNavSection {
  section: {
    en: string;
    zh: string;
  };
  items: DocsNavItem[];
}

export const docsNav: DocsNavSection[] = [
  {
    section: {
      en: "Start",
      zh: "开始"
    },
    items: [
      { href: "/docs", label: { en: "Overview", zh: "文档首页" } },
      { href: "/docs/getting-started", label: { en: "Getting Started", zh: "快速开始" } },
      { href: "/docs/what-is-mdan", label: { en: "What is MDAN?", zh: "什么是 MDAN？" } },
      { href: "/docs/mdan-vs-mcp", label: { en: "MDAN vs MCP", zh: "MDAN 与 MCP" } },
      { href: "/docs/understanding-mdan", label: { en: "Understanding MDAN", zh: "理解 MDAN" } },
      { href: "/docs/shared-interaction", label: { en: "HTTP Content Negotiation", zh: "HTTP 内容协商" } },
      { href: "/docs/agent-app-demo", label: { en: "Agent App Demo", zh: "Agent App Demo 讲解" } }
    ]
  },
  {
    section: {
      en: "Advanced Development",
      zh: "进阶开发"
    },
    items: [
      { href: "/docs/application-structure", label: { en: "Application Structure", zh: "应用结构" } },
      { href: "/docs/server-integration", label: { en: "Server Integration", zh: "服务端接入" } },
      { href: "/docs/developer-paths", label: { en: "Developer Paths", zh: "开发者路线图" } },
      { href: "/docs/custom-rendering", label: { en: "Custom Rendering", zh: "自定义渲染" } },
      { href: "/docs/session-provider", label: { en: "Session Provider", zh: "Session Provider" } }
    ]
  },
  {
    section: {
      en: "SDK",
      zh: "SDK"
    },
    items: [
      { href: "/docs/sdk", label: { en: "SDK Overview", zh: "SDK 概览" } },
      { href: "https://mdan.ai/protocol/v1", label: { en: "Protocol v1", zh: "协议 v1" } },
      { href: "/docs/server-runtime", label: { en: "Server Runtime", zh: "服务端运行时" } },
      { href: "/docs/web-runtime", label: { en: "Web Runtime", zh: "Web 运行时" } },
      { href: "/docs/elements", label: { en: "Elements", zh: "Elements 组件" } },
      { href: "/docs/api-reference", label: { en: "API Reference", zh: "API 参考" } },
      { href: "/docs/examples", label: { en: "Examples", zh: "示例" } }
    ]
  }
];
