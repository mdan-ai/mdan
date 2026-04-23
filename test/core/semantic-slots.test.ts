import { describe, expect, it } from "vitest";
import { extractSemanticSlots, validateSemanticSlots } from "../../src/content/semantic-slots.js";

describe("semantic slots", () => {
  it("requires Purpose, Context, Rules, Result", () => {
    const content = `# Demo

## Purpose
Ship stable baseline.

## Context
Runtime is Markdown-first.
`;

    expect(validateSemanticSlots(content)).toEqual([
      'content must include a "## Rules" section',
      'content must include a "## Result" section'
    ]);
  });

  it("treats Views and Handoff as optional", () => {
    const content = `# Demo

## Purpose
P

## Context
C

## Rules
R

## Result
Done.
`;

    expect(validateSemanticSlots(content)).toEqual([]);
  });

  it("accepts and extracts Views and Handoff when present", () => {
    const content = `# Demo

## Purpose
P

## Context
C

## Rules
R

## Result
Done.

## Views
Browser and agent clients may read the same entry.

## Handoff
Continue into adjacent planning tools when appropriate.
`;

    expect(validateSemanticSlots(content)).toEqual([]);
    expect(extractSemanticSlots(content).map((slot) => slot.name)).toEqual([
      "Purpose",
      "Context",
      "Rules",
      "Result",
      "Views",
      "Handoff"
    ]);
  });

  it("enforces H2, uniqueness, and non-empty slot body", () => {
    const content = `# Demo

### Purpose
Wrong heading level.

## Purpose

## Context
Primary context.

## Context
Duplicate context.

## Rules
Rule body.

## Result
Result body.
`;

    expect(validateSemanticSlots(content)).toEqual([
      'semantic slot "Purpose" must use H2 heading ("## Purpose")',
      'semantic slot "Purpose" must not be empty',
      'semantic slot "Context" must appear at most once'
    ]);
  });

  it("ignores slot-like headings inside untrusted blocks", () => {
    const content = `# Demo

## Purpose
Trusted purpose.

## Context
Trusted context.

## Rules
Trusted rules.

## Result
Trusted result.

::: block{id="ugc" trust="untrusted"}
## Rules
Should be ignored.
:::
`;

    expect(extractSemanticSlots(content).map((slot) => slot.name)).toEqual([
      "Purpose",
      "Context",
      "Rules",
      "Result"
    ]);
  });
});
