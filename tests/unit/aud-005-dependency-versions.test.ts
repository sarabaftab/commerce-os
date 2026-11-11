import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function parseSemver(version: string): [number, number, number] {
  const match = version.replace(/^v/, "").match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    throw new Error(`Unparseable version: ${version}`);
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function isAtLeast(version: string, minimum: string): boolean {
  const a = parseSemver(version);
  const b = parseSemver(minimum);
  for (let i = 0; i < 3; i += 1) {
    if (a[i]! > b[i]!) return true;
    if (a[i]! < b[i]!) return false;
  }
  return true;
}

/**
 * AUD-005: Keep direct next/zod outside the npm-audit ranges flagged in the project audit.
 * next < 15.5.21 (and later 15.5.x advisories through 15.5.27) / zod < 4.6.6.
 */
describe("AUD-005 dependency versions", () => {
  it("pins next to a patched 15.5.x release", () => {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    const declared = pkg.dependencies.next.replace(/^[\^~]/, "");
    const installed = require("next/package.json").version as string;

    expect(isAtLeast(declared, "15.5.29")).toBe(true);
    expect(isAtLeast(installed, "15.5.29")).toBe(true);
    expect(installed.startsWith("15.")).toBe(true);
  });

  it("pins direct zod to >= 4.6.6", () => {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
      dependencies: Record<string, string>;
    };
    const declared = pkg.dependencies.zod.replace(/^[\^~]/, "");
    const installed = require("zod/package.json").version as string;

    expect(isAtLeast(declared, "4.6.6")).toBe(true);
    expect(isAtLeast(installed, "4.6.6")).toBe(true);
  });
});
