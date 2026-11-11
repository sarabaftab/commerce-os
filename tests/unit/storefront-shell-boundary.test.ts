import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = join(process.cwd(), "src/ui/storefront");

function read(relative: string) {
  return readFileSync(join(root, relative), "utf8");
}

describe("storefront shell boundary", () => {
  it("keeps StorefrontShell as a server component with async boundary + LocaleProvider", () => {
    const shell = read("storefront-shell.tsx");
    expect(shell).not.toMatch(/["']use client["']/);
    expect(shell).toContain("StorefrontAsyncBoundary");
    expect(shell).toContain("LocaleProvider");
    expect(shell).toContain("StorefrontShellChrome");
  });

  it("keeps chrome as a client island without forbidden server imports", () => {
    const chrome = read("storefront-shell-chrome.tsx");
    expect(chrome).toMatch(/["']use client["']/);
    expect(chrome).not.toContain("storefront-chrome");
    expect(chrome).not.toContain("@/modules/storefront");
    expect(chrome).not.toContain("@/modules/identity");
    expect(chrome).not.toContain("@/modules/settings");
    expect(chrome).not.toContain("@/modules/catalog");
    expect(chrome).not.toContain("@/modules/faq");
    expect(chrome).not.toContain("next/cache");
    expect(chrome).not.toContain("@/shared/db");
    expect(chrome).not.toContain("unstable_cache");
    expect(chrome).not.toContain("prisma");
  });

  it("does not re-export next/headers helpers from the client i18n barrel", () => {
    const barrel = readFileSync(join(process.cwd(), "src/shared/i18n/index.ts"), "utf8");
    expect(barrel).not.toContain("get-request-locale");
    expect(barrel).not.toContain("getRequestLocale");
    expect(barrel).not.toContain("next/headers");
  });
});
