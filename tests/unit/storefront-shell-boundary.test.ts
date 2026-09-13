import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = join(process.cwd(), "src/ui/storefront");

describe("storefront shell server/client boundary", () => {
  it("keeps StorefrontShell as a Server Component", () => {
    const source = readFileSync(join(root, "storefront-shell.tsx"), "utf8");
    expect(source).not.toMatch(/^["']use client["']/m);
    expect(source).toContain("StorefrontAsyncBoundary");
    expect(source).toContain("LocaleProvider");
  });

  it("keeps client chrome free of server data-loader imports", () => {
    const source = readFileSync(join(root, "storefront-shell-chrome.tsx"), "utf8");
    expect(source).toMatch(/^["']use client["']/m);
    expect(source).not.toContain("storefront-chrome");
    expect(source).not.toContain("@/modules/storefront");
    expect(source).not.toContain("@/modules/identity");
    expect(source).not.toContain("@/modules/settings");
    expect(source).not.toContain("@/modules/catalog");
    expect(source).not.toContain("@/modules/faq");
    expect(source).not.toContain("next/cache");
    expect(source).not.toContain("@/shared/db");
  });
});