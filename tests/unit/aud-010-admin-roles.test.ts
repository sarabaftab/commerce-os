import { describe, expect, it } from "vitest";

import type { AdminSession } from "@/modules/identity";
import {
  ADMIN_MANAGER_ROLES,
  isAdminManagerRole,
} from "@/shared/auth/admin-roles";
import { assertAdminRole } from "@/shared/auth/admin-session";
import { AppError } from "@/shared/errors/app-error";

function session(role: AdminSession["role"]): AdminSession {
  return {
    userId: "user-1",
    email: "staff@example.com",
    displayName: "Staff",
    supabaseUserId: "sb-1",
    tenantId: "tenant-1",
    tenantSlug: "kin-a2",
    tenantName: "KIN A2",
    tenantCurrency: "USD",
    role,
  };
}

/**
 * AUD-010: owner/admin may manage settings, broadcasts, and payment verification;
 * staff may not.
 */
describe("AUD-010 admin role gating", () => {
  it("treats only owner and admin as manager roles", () => {
    expect(ADMIN_MANAGER_ROLES).toEqual(["owner", "admin"]);
    expect(isAdminManagerRole("owner")).toBe(true);
    expect(isAdminManagerRole("admin")).toBe(true);
    expect(isAdminManagerRole("staff")).toBe(false);
  });

  it("allows owner and admin through assertAdminRole", () => {
    expect(() => assertAdminRole(session("owner"), ADMIN_MANAGER_ROLES)).not.toThrow();
    expect(() => assertAdminRole(session("admin"), ADMIN_MANAGER_ROLES)).not.toThrow();
  });

  it("rejects staff with FORBIDDEN", () => {
    expect(() => assertAdminRole(session("staff"), ADMIN_MANAGER_ROLES)).toThrow(AppError);
    try {
      assertAdminRole(session("staff"), ADMIN_MANAGER_ROLES);
    } catch (error) {
      expect(error).toMatchObject({
        code: "FORBIDDEN",
        message: "You do not have permission for this action",
      });
    }
  });
});
