import { describe, expect, it } from "vitest";

import { MdanValidationError, parsePage, validatePage } from "../../src/core/index.js";

describe("validatePage", () => {
  it("rejects duplicate block names", () => {
    expect(() =>
      parsePage(`\`\`\`mdan
BLOCK guestbook {
  GET refresh "/list"
}

BLOCK guestbook {
  GET refresh2 "/list-2"
}
\`\`\`
`)
    ).toThrow(MdanValidationError);
  });

  it("rejects missing anchor mappings when anchors exist", () => {
    expect(() =>
      parsePage(`# Demo

<!-- mdan:block guestbook -->

\`\`\`mdan
BLOCK other {
  GET refresh "/list"
}
\`\`\`
`)
    ).toThrow(/Anchor "guestbook" does not match/);
  });

  it("rejects invalid stream naming", () => {
    expect(() =>
      parsePage(`\`\`\`mdan
BLOCK updates {
  GET refresh "/stream" ACCEPT "text/event-stream"
}
\`\`\`
`)
    ).toThrow(/must not define an operation name/);
  });

  it("rejects empty choice option lists", () => {
    expect(() =>
      parsePage(`\`\`\`mdan
BLOCK compose {
  INPUT status:choice []
  GET refresh "/list"
}
\`\`\`
`)
    ).toThrow(/must declare at least one option/);
  });

  it("rejects options on non-choice inputs", () => {
    expect(() =>
      parsePage(`\`\`\`mdan
BLOCK compose {
  INPUT status:text ["draft"]
  GET refresh "/list"
}
\`\`\`
`)
    ).toThrow(/Only choice inputs may declare options/);
  });

  it("accepts POST operations with no inputs and no WITH clause", () => {
    const page = parsePage(`\`\`\`mdan
BLOCK auth {
  POST logout "/logout" LABEL "Log Out"
}
\`\`\`
`);

    expect(() => validatePage(page)).not.toThrow();
  });

  it("accepts a zero-input AUTO GET operation", () => {
    const page = parsePage(`\`\`\`mdan
BLOCK guestbook {
  GET load_messages "/list" AUTO
}
\`\`\`
`);

    expect(() => validatePage(page)).not.toThrow();
  });

  it("rejects AUTO GET operations with inputs", () => {
    expect(() =>
      parsePage(`\`\`\`mdan
BLOCK guestbook {
  INPUT cursor:text
  GET load_messages "/list" WITH cursor AUTO
}
\`\`\`
`)
    ).toThrow(/must not declare inputs/);
  });

  it("rejects POST operations marked AUTO", () => {
    expect(() =>
      parsePage(`\`\`\`mdan
BLOCK guestbook {
  POST submit "/post" AUTO
}
\`\`\`
`)
    ).toThrow(/must not declare AUTO/);
  });

  it("rejects AUTO GET operations with an ACCEPT override", () => {
    expect(() =>
      parsePage(`\`\`\`mdan
BLOCK guestbook {
  GET watch "/stream" AUTO ACCEPT "text/plain"
}
\`\`\`
`)
    ).toThrow(/must not declare an ACCEPT override/);
  });

  it("rejects multiple AUTO GET operations in the same block", () => {
    expect(() =>
      parsePage(`\`\`\`mdan
BLOCK guestbook {
  GET load_messages "/list" AUTO
  GET load_summary "/summary" AUTO
}
\`\`\`
`)
    ).toThrow(/at most one AUTO GET operation/);
  });
});
