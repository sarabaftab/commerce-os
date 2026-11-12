import { readFileSync } from "node:fs";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { postgresConnectionUrl } from "@/shared/config/env";

const queryRaw = vi.fn();

vi.mock("@/shared/db/prisma", () => ({
  prisma: {
    $queryRaw: (...args: unknown[]) => queryRaw(...args),
  },
}));

/**
 * AUD-013: stronger DATABASE_URL validation, DB-aware health, and setup docs.
 */
describe("AUD-013 health, env, and docs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("accepts parseable postgres URLs and rejects placeholders", () => {
    const schema = postgresConnectionUrl("DATABASE_URL");

    expect(
      schema.safeParse(
        "postgresql://postgres:secret@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres",
      ).success,
    ).toBe(true);
    expect(schema.safeParse("postgres://localhost:5432/commerce").success).toBe(true);

    expect(schema.safeParse("").success).toBe(false);
    expect(
      schema.safeParse("https://aws-0-[region].pooler.supabase.com").success,
    ).toBe(false);
    expect(schema.safeParse("not-a-url").success).toBe(false);
  });

  it("health returns 200 when SELECT 1 succeeds", async () => {
    queryRaw.mockResolvedValue([{ "?column?": 1 }]);
    const { GET } = await import("@/app/api/v1/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      status: "ok",
      database: "ok",
      service: "commerce-os",
    });
    expect(queryRaw).toHaveBeenCalledOnce();
  });

  it("health returns 503 without a stack when the database is down", async () => {
    queryRaw.mockRejectedValue(new Error("connect ECONNREFUSED 127.0.0.1:5432"));
    const { GET } = await import("@/app/api/v1/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.data).toMatchObject({
      status: "degraded",
      database: "unavailable",
      service: "commerce-os",
    });
    expect(JSON.stringify(body)).not.toContain("ECONNREFUSED");
    expect(JSON.stringify(body)).not.toContain("stack");
  });

  it("setup docs no longer claim checkout and telegram are unbuilt", () => {
    const docs = readFileSync(
      path.join(process.cwd(), "docs/setup.md"),
      "utf8",
    );
    expect(docs).not.toContain("checkout UI is not built yet");
    expect(docs).not.toContain("intentionally empty for now");
    expect(docs).toContain("Guest and authenticated checkout are live");
    expect(docs).toContain("Telegram Mini App auth");
    expect(docs).toContain("GET /api/v1/health");
  });
});
