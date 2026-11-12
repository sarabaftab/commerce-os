import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const findFirst = vi.fn();
const findUnique = vi.fn();
const update = vi.fn();

vi.mock("@/shared/db/prisma", () => ({
  prisma: {
    userTenantMembership: { findFirst },
    user: { findUnique, update },
  },
}));

vi.mock("@/shared/observability/timing", () => ({
  createTimer: () => ({
    mark: vi.fn(),
    log: vi.fn(),
  }),
}));

/**
 * AUD-004: Admin email linking must require ALLOW_ADMIN_EMAIL_LINK=1.
 * NODE_ENV=development alone must not auto-link.
 */
describe("AUD-004 admin email linking", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.ALLOW_ADMIN_EMAIL_LINK;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    process.env = { ...originalEnv };
  });

  it("does not link by email in development when the flag is unset", async () => {
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.ALLOW_ADMIN_EMAIL_LINK;

    findFirst.mockResolvedValue(null);

    const { resolveAdminSession } = await import(
      "@/modules/identity/services/admin-auth-service"
    );

    await expect(
      resolveAdminSession({
        supabaseUserId: "sb-new",
        email: "admin@kina2.com",
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "No admin account found for this user",
    });

    expect(findUnique).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("links by email when ALLOW_ADMIN_EMAIL_LINK=1 and user is unlinked", async () => {
    vi.stubEnv("NODE_ENV", "development");
    process.env.ALLOW_ADMIN_EMAIL_LINK = "1";

    const membership = {
      userId: "user-1",
      tenantId: "tenant-1",
      role: "owner",
      user: {
        id: "user-1",
        email: "admin@kina2.com",
        displayName: "KIN Admin",
      },
      tenant: {
        id: "tenant-1",
        slug: "kin-a2",
        name: "KIN A2 Milk",
        currency: "USD",
        isActive: true,
      },
    };

    findFirst
      .mockResolvedValueOnce(null) // no membership by supabase id
      .mockResolvedValueOnce(membership); // membership after link
    findUnique.mockResolvedValue({
      id: "user-1",
      email: "admin@kina2.com",
      supabaseUserId: null,
    });
    update.mockResolvedValue({
      id: "user-1",
      supabaseUserId: "sb-new",
    });

    const { resolveAdminSession } = await import(
      "@/modules/identity/services/admin-auth-service"
    );

    const session = await resolveAdminSession({
      supabaseUserId: "sb-new",
      email: "admin@kina2.com",
    });

    expect(session.userId).toBe("user-1");
    expect(session.tenantSlug).toBe("kin-a2");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: { supabaseUserId: "sb-new" },
      }),
    );
  });

  it("refuses to resolve admin when the flag is set in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.ALLOW_ADMIN_EMAIL_LINK = "1";

    findFirst.mockResolvedValue(null);

    const { resolveAdminSession } = await import(
      "@/modules/identity/services/admin-auth-service"
    );

    await expect(
      resolveAdminSession({
        supabaseUserId: "sb-new",
        email: "admin@kina2.com",
      }),
    ).rejects.toThrow("ALLOW_ADMIN_EMAIL_LINK must not be enabled in production");

    expect(update).not.toHaveBeenCalled();
  });

  it("still returns an existing membership without needing the flag", async () => {
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.ALLOW_ADMIN_EMAIL_LINK;

    findFirst.mockResolvedValue({
      userId: "user-1",
      tenantId: "tenant-1",
      role: "owner",
      user: {
        id: "user-1",
        email: "admin@kina2.com",
        displayName: "KIN Admin",
      },
      tenant: {
        id: "tenant-1",
        slug: "kin-a2",
        name: "KIN A2 Milk",
        currency: "USD",
        isActive: true,
      },
    });

    const { resolveAdminSession } = await import(
      "@/modules/identity/services/admin-auth-service"
    );

    const session = await resolveAdminSession({
      supabaseUserId: "sb-linked",
      email: "admin@kina2.com",
    });

    expect(session.supabaseUserId).toBe("sb-linked");
    expect(update).not.toHaveBeenCalled();
  });
});
