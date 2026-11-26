import { afterEach, describe, expect, it, vi } from "vitest";

import { authorizeCronRequest } from "@/shared/jobs/cron-auth";

describe("authorizeCronRequest", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts a matching bearer secret", () => {
    vi.stubEnv("CRON_SECRET", "test-cron-secret-value");
    const request = new Request("http://localhost/api/cron/daily", {
      headers: { authorization: "Bearer test-cron-secret-value" },
    });
    expect(authorizeCronRequest(request)).toEqual({ ok: true });
  });

  it("rejects a wrong bearer secret", () => {
    vi.stubEnv("CRON_SECRET", "test-cron-secret-value");
    const request = new Request("http://localhost/api/cron/daily", {
      headers: { authorization: "Bearer other" },
    });
    expect(authorizeCronRequest(request)).toMatchObject({
      ok: false,
      status: 401,
    });
  });

  it("requires CRON_SECRET in production", () => {
    vi.stubEnv("CRON_SECRET", "");
    vi.stubEnv("NODE_ENV", "production");
    const request = new Request("http://localhost/api/cron/daily", {
      headers: { "x-vercel-cron": "1" },
    });
    expect(authorizeCronRequest(request)).toMatchObject({
      ok: false,
      status: 503,
    });
  });
});
