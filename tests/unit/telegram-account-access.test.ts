import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const accessStore = new Map<
  string,
  {
    id: string;
    tenantId: string;
    customerId: string;
    sessionId: string;
    codeHash: string;
    expiresAt: Date;
  }
>();

const sessionStore = new Map<
  string,
  {
    id: string;
    tenantId: string;
    customerId: string;
    expiresAt: Date;
  }
>();

vi.mock("@/shared/db/prisma", () => ({
  prisma: {
    telegramAccountAccess: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = {
          id: `access-${accessStore.size + 1}`,
          tenantId: data.tenantId as string,
          customerId: data.customerId as string,
          sessionId: data.sessionId as string,
          codeHash: data.codeHash as string,
          expiresAt: data.expiresAt as Date,
        };
        accessStore.set(row.codeHash, row);
        return row;
      }),
      findUnique: vi.fn(async ({ where }: { where: { codeHash: string } }) => {
        return accessStore.get(where.codeHash) ?? null;
      }),
    },
    customerSession: {
      findFirst: vi.fn(
        async ({
          where,
        }: {
          where: { id: string; tenantId: string; customerId: string };
        }) => {
          const row = sessionStore.get(where.id);
          if (
            !row ||
            row.tenantId !== where.tenantId ||
            row.customerId !== where.customerId
          ) {
            return null;
          }
          return row;
        },
      ),
    },
  },
}));

import {
  appendTelegramAccountAccessQuery,
  createTelegramAccountAccess,
  TELEGRAM_ACCOUNT_ACCESS_TTL_MS,
  verifyTelegramAccountAccess,
} from "@/channels/telegram/server/account-access";

describe("telegram account access proof", () => {
  beforeEach(() => {
    accessStore.clear();
    sessionStore.clear();
    sessionStore.set("sess-1", {
      id: "sess-1",
      tenantId: "tenant-a",
      customerId: "cust-1",
      expiresAt: new Date(Date.now() + 60_000),
    });
  });

  it("stores only a hash of a random code (never a session token)", async () => {
    const code = await createTelegramAccountAccess({
      tenantId: "tenant-a",
      customerId: "cust-1",
      sessionId: "sess-1",
    });

    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(code.length).toBeGreaterThanOrEqual(32);
    const stored = [...accessStore.values()][0];
    expect(stored?.codeHash).toBe(createHash("sha256").update(code).digest("hex"));
    expect(stored?.codeHash).not.toBe(code);
    expect(JSON.stringify(stored)).not.toContain("session-token");
    expect(stored?.expiresAt.getTime()).toBeGreaterThan(
      Date.now() + TELEGRAM_ACCOUNT_ACCESS_TTL_MS - 5_000,
    );
  });

  it("resolves the same customer for a valid proof and allows reuse within TTL", async () => {
    const code = await createTelegramAccountAccess({
      tenantId: "tenant-a",
      customerId: "cust-1",
      sessionId: "sess-1",
    });

    const first = await verifyTelegramAccountAccess({
      tenantId: "tenant-a",
      code,
    });
    const second = await verifyTelegramAccountAccess({
      tenantId: "tenant-a",
      code,
    });

    expect(first).toEqual({
      tenantId: "tenant-a",
      customerId: "cust-1",
      sessionId: "sess-1",
    });
    expect(second).toEqual(first);
  });

  it("rejects cross-tenant, expired, unknown, and missing-session proofs", async () => {
    const code = await createTelegramAccountAccess({
      tenantId: "tenant-a",
      customerId: "cust-1",
      sessionId: "sess-1",
    });

    await expect(
      verifyTelegramAccountAccess({ tenantId: "tenant-b", code }),
    ).resolves.toBeNull();

    await expect(
      verifyTelegramAccountAccess({ tenantId: "tenant-a", code: "nope" }),
    ).resolves.toBeNull();

    const expiredCode = await createTelegramAccountAccess({
      tenantId: "tenant-a",
      customerId: "cust-1",
      sessionId: "sess-1",
    });
    const expiredRow = [...accessStore.values()].find(
      (row) => row.codeHash === createHash("sha256").update(expiredCode).digest("hex"),
    );
    if (expiredRow) {
      expiredRow.expiresAt = new Date(Date.now() - 1_000);
    }
    await expect(
      verifyTelegramAccountAccess({ tenantId: "tenant-a", code: expiredCode }),
    ).resolves.toBeNull();

    sessionStore.delete("sess-1");
    await expect(
      verifyTelegramAccountAccess({ tenantId: "tenant-a", code }),
    ).resolves.toBeNull();
  });

  it("appends tg_a without embedding credentials in the path", () => {
    expect(appendTelegramAccountAccessQuery("/kin-a2/account", "opaque")).toBe(
      "/kin-a2/account?tg_a=opaque",
    );
    expect(
      appendTelegramAccountAccessQuery("/kin-a2/account?x=1", "opaque"),
    ).toBe("/kin-a2/account?x=1&tg_a=opaque");
  });
});
