import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const workflowPath = join(root, ".github/workflows/ci.yml");

/**
 * AUD-012: CI must exist and run the repo's quality gates on PRs.
 */
describe("AUD-012 CI workflow", () => {
  it("defines a GitHub Actions workflow with the audited commands", () => {
    const yaml = readFileSync(workflowPath, "utf8");

    expect(yaml).toContain("pull_request");
    expect(yaml).toContain("npm ci");
    expect(yaml).toContain("npm test");
    expect(yaml).toContain("npm run typecheck");
    expect(yaml).toContain("npx prisma validate");
    expect(yaml).toContain("npx eslint .");
    expect(yaml).not.toContain("prisma migrate deploy");
  });
});
