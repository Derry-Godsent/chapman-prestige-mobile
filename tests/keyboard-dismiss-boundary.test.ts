import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("shared screen gesture boundary", () => {
  it("does not wrap mobile screens in a touch responder that can block nested scrolling", () => {
    const source = readFileSync(resolve(process.cwd(), "components/keyboard-dismiss-boundary.tsx"), "utf8");

    expect(source).not.toContain("TouchableWithoutFeedback");
    expect(source).toContain("return <>{children}</>;");
  });
});
