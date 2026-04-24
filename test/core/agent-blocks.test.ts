import { describe, expect, it } from "vitest";
import { extractAgentBlocks, validateAgentBlocks } from "../../src/content/agent-blocks.js";

describe("agent blocks", () => {
  it("enforces balance, unique id, non-empty body, and no nesting", () => {
    const content = `# Demo

<!-- agent:begin id="a" -->
outer
<!-- agent:begin id="b" -->
inner
<!-- agent:end -->
<!-- agent:end -->

<!-- agent:begin id="a" -->

<!-- agent:end -->
`;

    const errors = validateAgentBlocks(content);

    expect(errors).toContain('agent block id "a" must be unique');
    expect(errors).toContain('agent block "a" must not nest another agent block');
    expect(errors).toContain('agent block "a" must not be empty');
  });

  it("parses agent blocks independently of block anchors", () => {
    const content = `# Demo

<!-- agent:begin id="trusted" -->
Do action:open
<!-- agent:end -->

<!-- mdan:block id="ugc" -->
`;

    const blocks = extractAgentBlocks(content);
    expect(blocks.length).toBe(1);
    expect(blocks[0]?.id).toBe("trusted");
  });
});
