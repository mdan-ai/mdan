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
      { href: "/docs/mdan-vs-mcp", label: { en: "MDAN vs MCP", zh: "MDAN 与 MCP" } }
    ]
  },
  {
    section: {
      en: "Core Concepts",
      zh: "核心概念"
    },
    items: [
      { href: "/docs/understanding-mdan", label: { en: "Understanding MDAN", zh: "理解 MDAN" } },
      { href: "/docs/shared-interaction", label: { en: "HTTP Content Negotiation", zh: "HTTP 内容协商" } },
      { href: "/docs/agent-consumption", label: { en: "Direct Agent Consumption", zh: "Agent 直接消费" } },
      { href: "/docs/agent-app-demo", label: { en: "Agent App Demo", zh: "Agent App Demo 讲解" } }
    ]
  },
  {
    section: {
      en: "Build With MDAN",
      zh: "用 MDAN 构建"
    },
    items: [
      { href: "/docs/developer-paths", label: { en: "Developer Paths", zh: "开发者路线图" } },
      { href: "/docs/application-structure", label: { en: "Application Structure", zh: "应用结构" } },
      { href: "/docs/server-integration", label: { en: "Server Integration", zh: "服务端接入" } },
      { href: "/docs/custom-rendering", label: { en: "Custom Rendering", zh: "自定义渲染" } },
      { href: "/docs/session-provider", label: { en: "Session Provider", zh: "Session Provider" } },
      { href: "/docs/examples", label: { en: "Examples", zh: "示例" } }
    ]
  },
  {
    section: {
      en: "Spec",
      zh: "规范"
    },
    items: [
      { href: "https://mdan.ai/spec/v1", label: { en: "Spec v1", zh: "规范 v1" } }
    ]
  },
  {
    section: {
      en: "SDK Reference",
      zh: "SDK 参考"
    },
    items: [
      { href: "/docs/sdk", label: { en: "SDK Overview", zh: "SDK 概览" } },
      { href: "/docs/server-runtime", label: { en: "Server Runtime", zh: "服务端运行时" } },
      { href: "/docs/web-runtime", label: { en: "Web Runtime", zh: "Web 运行时" } },
      { href: "/docs/elements", label: { en: "Elements", zh: "Elements 组件" } },
      { href: "/docs/api-reference", label: { en: "API Reference", zh: "API 参考" } }
    ]
  }
];
