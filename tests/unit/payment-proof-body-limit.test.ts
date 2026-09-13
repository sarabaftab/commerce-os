import { describe, expect, it } from "vitest";

import nextConfig from "../../next.config";

describe("payment proof upload body size config", () => {
  it("raises Server Action and middleware body limits above the old 1 MB default", () => {
    const experimental = nextConfig.experimental;
    expect(experimental?.serverActions?.bodySizeLimit).toBe("8mb");
    expect(experimental?.middlewareClientMaxBodySize).toBe("8mb");
  });
});
