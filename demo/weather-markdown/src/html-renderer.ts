import { marked } from "marked";

import { stripAgentBlocks } from "../../../src/content/agent-blocks.js";
import type { MdanMarkdownRenderer } from "../../../src/content/markdown-renderer.js";

function stripFrontmatter(markdown: string): string {
  const lines = markdown.split("\n");
  if (lines[0]?.trim() !== "---") {
    return markdown;
  }

  let endIndex = -1;
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index]?.trim() === "---") {
      endIndex = index;
      break;
    }
  }

  return endIndex >= 0 ? lines.slice(endIndex + 1).join("\n") : markdown;
}

function stripExecutableCodeBlocks(markdown: string): string {
  return markdown.replace(/\n?```mdan[\s\S]*?```/g, "");
}

function unwrapContentBlocks(markdown: string): string {
  return markdown
    .replace(/^:::\s*block\{[^}]*\}\s*$/gm, "")
    .replace(/^:::\s*$/gm, "");
}

const WEATHER_STYLE = `<style>
.weather-surface {
  color: #172033;
  max-width: 58rem;
  margin: 0 auto;
  padding: clamp(1.25rem, 4vw, 3rem);
  font-family: ui-rounded, "Avenir Next", "Segoe UI", sans-serif;
}
.weather-surface > p:first-of-type {
  margin: 0 0 1.25rem;
  padding: clamp(1rem, 3vw, 1.4rem) clamp(1rem, 4vw, 1.7rem);
  border: 1px solid rgba(45, 80, 126, 0.14);
  border-radius: 1.4rem;
  background:
    radial-gradient(circle at 8% 0%, rgba(255, 196, 87, 0.32), transparent 28%),
    linear-gradient(135deg, #f8fbff 0%, #eef6ff 58%, #fff7e7 100%);
  box-shadow: 0 24px 70px rgba(33, 62, 108, 0.13);
  font-size: clamp(1.05rem, 1.2vw + 0.85rem, 1.55rem);
  font-weight: 700;
  letter-spacing: -0.025em;
}
.weather-table-frame {
  margin: 1.1rem 0;
  overflow-x: auto;
  border: 1px solid rgba(45, 80, 126, 0.14);
  border-radius: 1.25rem;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 18px 55px rgba(33, 62, 108, 0.11);
}
.weather-surface table {
  width: 100%;
  min-width: 44rem;
  border-collapse: separate;
  border-spacing: 0;
  font-variant-numeric: tabular-nums;
}
.weather-surface thead {
  background: linear-gradient(180deg, #f7fbff 0%, #eef5fc 100%);
}
.weather-surface th,
.weather-surface td {
  padding: 0.9rem 1rem;
  border-bottom: 1px solid rgba(45, 80, 126, 0.1);
  text-align: left;
  white-space: nowrap;
}
.weather-surface th {
  color: #50617a;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.055em;
  text-transform: uppercase;
}
.weather-surface td {
  color: #1d2a3f;
  font-size: 0.96rem;
}
.weather-surface td:nth-child(n + 3),
.weather-surface th:nth-child(n + 3) {
  text-align: right;
}
.weather-surface tbody tr:nth-child(odd) {
  background: rgba(247, 250, 255, 0.62);
}
.weather-surface tbody tr:last-child td {
  border-bottom: 0;
}
.weather-surface tbody tr {
  transition: background 160ms ease, transform 160ms ease;
}
.weather-surface tbody tr:hover {
  background: rgba(226, 241, 255, 0.82);
}
.weather-surface p:last-child {
  margin-top: 0.9rem;
  color: #6d7b90;
  font-size: 0.88rem;
}
.weather-surface a {
  color: #2467a6;
  text-underline-offset: 0.18em;
}
@media (max-width: 640px) {
  .weather-surface {
    padding: 1rem;
  }
  .weather-surface > p:first-of-type {
    border-radius: 1.1rem;
    line-height: 1.55;
  }
  .weather-table-frame {
    border-radius: 1rem;
  }
  .weather-surface table {
    min-width: 0;
  }
  .weather-surface thead {
    display: none;
  }
  .weather-surface tbody {
    display: grid;
  }
  .weather-surface tr {
    display: grid;
    grid-template-columns: 1fr;
    padding: 0.9rem 1rem;
  }
  .weather-surface tbody tr + tr {
    border-top: 1px solid rgba(45, 80, 126, 0.1);
  }
  .weather-surface th,
  .weather-surface td {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.34rem 0;
    border-bottom: 0;
    white-space: normal;
    text-align: right;
  }
  .weather-surface td::before {
    color: #6d7b90;
    font-size: 0.74rem;
    font-weight: 800;
    letter-spacing: 0.045em;
    text-transform: uppercase;
  }
  .weather-surface td:nth-child(1)::before { content: "日期"; }
  .weather-surface td:nth-child(2)::before { content: "天气"; }
  .weather-surface td:nth-child(3)::before { content: "最低温"; }
  .weather-surface td:nth-child(4)::before { content: "最高温"; }
  .weather-surface td:nth-child(5)::before { content: "降水"; }
  .weather-surface td:nth-child(6)::before { content: "风速"; }
  .weather-surface td:nth-child(1),
  .weather-surface td:nth-child(2) {
    font-weight: 700;
  }
}
</style>`;

function decorateWeatherHtml(html: string): string {
  return `${WEATHER_STYLE}<div class="weather-surface">${html
    .replace(/<table>/g, '<div class="weather-table-frame"><table>')
    .replace(/<\/table>/g, "</table></div>")}</div>`;
}

export const weatherMarkdownRenderer: MdanMarkdownRenderer = {
  render(markdown: string): string {
    const cleaned = unwrapContentBlocks(
      stripAgentBlocks(stripExecutableCodeBlocks(stripFrontmatter(markdown)))
    );
    const html = marked.parse(cleaned, {
      async: false
    });
    return typeof html === "string" ? decorateWeatherHtml(html) : "";
  }
};
