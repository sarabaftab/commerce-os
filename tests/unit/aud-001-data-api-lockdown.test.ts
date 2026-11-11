import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * AUD-001: Migration must revoke PostgREST roles and enable RLS on app tables.
 */
describe("AUD-001 Supabase Data API lockdown", () => {
  const sql = readFileSync(
    path.join(
      process.cwd(),
      "prisma/migrations/20261109030000_lock_down_supabase_data_api/migration.sql",
    ),
    "utf8",
  );

  it("revokes anon and authenticated privileges on public tables", () => {
    expect(sql).toContain(
      "REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated",
    );
    expect(sql).toContain(
      "REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated",
    );
    expect(sql).not.toMatch(/FORCE ROW LEVEL SECURITY/i);
  });

  it("enables RLS on sensitive app tables", () => {
    for (const table of [
      "orders",
      "customers",
      "customer_sessions",
      "users",
      "user_tenant_memberships",
      "carts",
      "tenant_settings",
    ]) {
      expect(sql).toContain(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);
    }
  });
});
