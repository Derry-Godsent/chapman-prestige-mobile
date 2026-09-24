import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse } from "@babel/parser";

/**
 * A guard for a crash that reached a real phone.
 *
 * React Native refuses any text that is not inside a <Text> component. That
 * includes something invisible: spaces sitting between two elements on the same
 * line. "  " between two Views is a text node, and on a phone it brings the
 * screen down with "Text strings must be rendered within a <Text> component".
 *
 * Browsers do not care, so this can only be caught by looking, which is what
 * this test does: it reads every screen and reports either raw text outside a
 * Text, or spaces between elements on one line.
 */

const ROOT = join(__dirname, "..");
const TEXT_COMPONENTS = new Set(["Text", "DisplayText", "BodyText", "TextInput", "Animated.Text"]);

function screenFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (["node_modules", ".git", ".expo", "dist", "docs", "tests", "assets"].includes(entry)) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) screenFiles(path, found);
    else if (path.endsWith(".tsx") && !path.includes("components/ui/")) found.push(path);
  }
  return found;
}

function problemsIn(file: string): string[] {
  const code = readFileSync(file, "utf8");
  const ast = parse(code, { sourceType: "module", plugins: ["typescript", "jsx"] });
  const problems: string[] = [];
  const short = file.replace(`${ROOT}/`, "");

  const visit = (node: any, elementName?: string) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) { node.forEach((child) => visit(child, elementName)); return; }

    if (node.type === "JSXText" && node.value !== "" && !TEXT_COMPONENTS.has(elementName ?? "")) {
      // JSX throws away whitespace that contains a newline, so that is harmless.
      // Whitespace on one line, and real words, both survive and both crash a phone.
      const survives = node.value.trim() !== "" || !node.value.includes("\n");
      if (survives) {
        problems.push(`${short}:${node.loc.start.line} raw text ${JSON.stringify(node.value.slice(0, 30))} inside <${elementName}>`);
      }
    }

    let name = elementName;
    if (node.type === "JSXElement") {
      const id = node.openingElement.name;
      // Animated.Text and friends are still Text.
      name = id.type === "JSXIdentifier"
        ? id.name
        : id.type === "JSXMemberExpression"
          ? `${id.object.name}.${id.property.name}`
          : "custom";
    }
    for (const key of Object.keys(node)) {
      if (["loc", "start", "end"].includes(key)) continue;
      const value = node[key];
      if (value && typeof value === "object") visit(value, name);
    }
  };
  visit(ast.program);
  return problems;
}

describe("every screen renders text inside Text components", () => {
  it("has no text, including stray spaces, outside a Text", () => {
    const problems = screenFiles(join(ROOT, "app")).concat(screenFiles(join(ROOT, "components"))).flatMap(problemsIn);
    expect(problems).toEqual([]);
  });
});
