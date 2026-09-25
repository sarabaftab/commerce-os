import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const handoffStore = new Map<
  string,
  {
    id: string;
    tenantId: string;
    sessionId: string;
    codeHash: string;
    expiresAt: Date;
    consumedAt: Date | null;
  }
>();

const sessionStore = new Map<
  string,
  {
    id: string;
    tenantId: string;
    tokenHash: string;
    expiresAt: Date;
    lastSeenAt: Date;
  }
>();

vi.mock("@/shared/db/prisma", () => ({
  prisma: {
    telegramSessionHandoff: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = {
          id: `handoff-${handoffStore.size + 1}`,
          tenantId: data.tenantId as string,
          sessionId: data.sessionId as string,
          codeHash: data.codeHash as string,
          expiresAt: data.expiresAt as Date,
          consumedAt: null,
        };
        handoffStore.set(row.codeHash, row);
        return row;
      }),
      findUnique: vi.fn(async ({ where }: { where: { codeHash: string } }) => {
        return handoffStore.get(where.codeHash) ?? null;
      }),
      updateMany: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string; consumedAt: null };
          data: { consumedAt: Date };
        }) => {
          for (const row of handoffStore.values()) {
            if (row.id === where.id && row.consumedAt === null) {
              row.consumedAt = data.consumedAt;
              return { count: 1 };
            }
          }
          return { count: 0 };
        },
      ),
    },
    customerSession: {
      findFirst: vi.fn(
        async ({ where }: { where: { id: string; tenantId: string } }) => {
          const row = sessionStore.get(where.id);
          if (!row || row.tenantId !== where.tenantId) {
            return null;
          }
          return row;
        },
      ),
      update: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: { tokenHash: string; lastSeenAt: Date };
        }) => {
          const row = sessionStore.get(where.id);
          if (!row) {
            throw new Error("missing session");
          }
          row.tokenHash = data.tokenHash;
          row.lastSeenAt = data.lastSeenAt;
          return row;
        },
      ),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
      const { prisma } = await import("@/shared/db/prisma");
      return fn(prisma);
    }),
  },
}));

import {
  consumeTelegramSessionHandoff,
  createTelegramSessionHandoff,
  TELEGRAM_SESSION_HANDOFF_TTL_MS,
} from "@/channels/telegram/server/session-handoff";

describe("telegram session handoff (one-time opaque code)", () => {
  beforeEach(() => {
    handoffStore.clear();
    sessionStore.clear();
    sessionStore.set("sess-1", {
      id: "sess-1",
      tenantId: "tenant-a",
      tokenHash: createHash("sha256").update("original-token").digest("hex"),
      expiresAt: new Date(Date.now() + 60_000),
      lastSeenAt: new Date(),
    });
  });

  it("stores only a hash of a random code (never the session token)", async () => {
    const code = await createTelegramSessionHandoff({
      tenantId: "tenant-a",
      sessionId: "sess-1",
    });

    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(code).not.toContain("original-token");
    expect(code.length).toBeGreaterThanOrEqual(32);

    const stored = [...handoffStore.values()][0];
    expect(stored?.codeHash).toBe(createHash("sha256").update(code).digest("hex"));
    expect(stored?.codeHash).not.toBe(code);
    expect(JSON.stringify(stored)).not.toContain("original-token");
    expect(stored?.expiresAt.getTime()).toBeGreaterThan(
      Date.now() + TELEGRAM_SESSION_HANDOFF_TTL_MS - 5_000,
    );
  });

  it("consumes once, returns a rotated session token, and rejects reuse", async () => {
    const code = await createTelegramSessionHandoff({
      tenantId: "tenant-a",
      sessionId: "sess-1",
    });

    const first = await consumeTelegramSessionHandoff({
      tenantId: "tenant-a",
      code,
    });
    expect(first).toBeTruthy();
    expect(first).not.toBe("original-token");
    expect(first).not.toBe(code);

    const second = await consumeTelegramSessionHandoff({
      tenantId: "tenant-a",
      code,
    });
    expect(second).toBeNull();
  });

  it("rejects cross-tenant, expired, and unknown codes", async () => {
    const code = await createTelegramSessionHandoff({
      tenantId: "tenant-a",
      sessionId: "sess-1",
    });

    await expect(
      consumeTelegramSessionHandoff({ tenantId: "tenant-b", code }),
    ).resolves.toBeNull();

    await expect(
      consumeTelegramSessionHandoff({ tenantId: "tenant-a", code: "nope" }),
    ).resolves.toBeNull();

    const expiredCode = await createTelegramSessionHandoff({
      tenantId: "tenant-a",
      sessionId: "sess-1",
    });
    const expiredRow = [...handoffStore.values()].find(
      (row) => row.codeHash === createHash("sha256").update(expiredCode).digest("hex"),
    );
    if (expiredRow) {
      expiredRow.expiresAt = new Date(Date.now() - 1_000);
    }
    await expect(
      consumeTelegramSessionHandoff({ tenantId: "tenant-a", code: expiredCode }),
    ).resolves.toBeNull();
  });
});
