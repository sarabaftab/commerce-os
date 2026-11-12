import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  create,
  findUnique,
  updateMany,
  findFirst,
  sessionUpdate,
  transaction,
} = vi.hoisted(() => {
  const create = vi.fn();
  const findUnique = vi.fn();
  const updateMany = vi.fn();
  const findFirst = vi.fn();
  const sessionUpdate = vi.fn();
  const transaction = vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      telegramSessionHandoff: { findUnique, updateMany },
      customerSession: { findFirst, update: sessionUpdate },
    }),
  );
  return {
    create,
    findUnique,
    updateMany,
    findFirst,
    sessionUpdate,
    transaction,
  };
});

vi.mock("@/shared/db/prisma", () => ({
  prisma: {
    telegramSessionHandoff: { create, findUnique, updateMany },
    customerSession: { findFirst, update: sessionUpdate },
    $transaction: transaction,
  },
}));

import {
  consumeTelegramSessionHandoff,
  createTelegramSessionHandoff,
} from "@/channels/telegram/server/session-handoff";

/**
 * AUD-003: URL must carry a one-time code, not the long-lived session token.
 * Our implementation stores tenantId + sessionId (never plaintext sessionToken)
 * and rotates the cookie token on consume.
 */
describe("AUD-003 telegram session handoff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stores a hashed one-time code bound to tenant + session, not a session token", async () => {
    create.mockResolvedValue({});

    const code = await createTelegramSessionHandoff({
      tenantId: "tenant-1",
      sessionId: "session-1",
    });

    expect(code.length).toBeGreaterThan(20);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: "tenant-1",
          sessionId: "session-1",
          codeHash: expect.any(String),
          expiresAt: expect.any(Date),
        }),
      }),
    );
    const stored = create.mock.calls[0]![0].data as Record<string, unknown>;
    expect(stored).not.toHaveProperty("sessionToken");
    expect(stored.codeHash).not.toBe(code);
    expect(String(stored.codeHash)).toHaveLength(64);
  });

  it("returns a rotated session token once and rejects a second consume", async () => {
    create.mockResolvedValue({});
    const code = await createTelegramSessionHandoff({
      tenantId: "tenant-1",
      sessionId: "session-1",
    });

    findUnique.mockResolvedValue({
      id: "handoff-1",
      tenantId: "tenant-1",
      sessionId: "session-1",
      consumedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    updateMany.mockResolvedValue({ count: 1 });
    findFirst.mockResolvedValue({
      id: "session-1",
      tenantId: "tenant-1",
      expiresAt: new Date(Date.now() + 60_000),
    });
    sessionUpdate.mockResolvedValue({});

    const first = await consumeTelegramSessionHandoff({
      tenantId: "tenant-1",
      code,
    });
    expect(first).toEqual(expect.any(String));
    expect(first!.length).toBeGreaterThan(20);
    expect(sessionUpdate).toHaveBeenCalled();

    findUnique.mockResolvedValue({
      id: "handoff-1",
      tenantId: "tenant-1",
      sessionId: "session-1",
      consumedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    });

    await expect(
      consumeTelegramSessionHandoff({ tenantId: "tenant-1", code }),
    ).resolves.toBeNull();
  });

  it("rejects expired, unknown, or cross-tenant codes", async () => {
    findUnique.mockResolvedValue(null);
    await expect(
      consumeTelegramSessionHandoff({ tenantId: "tenant-1", code: "unknown" }),
    ).resolves.toBeNull();

    findUnique.mockResolvedValue({
      id: "handoff-2",
      tenantId: "tenant-1",
      sessionId: "session-1",
      consumedAt: null,
      expiresAt: new Date(Date.now() - 1_000),
    });
    await expect(
      consumeTelegramSessionHandoff({ tenantId: "tenant-1", code: "expired" }),
    ).resolves.toBeNull();
    expect(updateMany).not.toHaveBeenCalled();

    findUnique.mockResolvedValue({
      id: "handoff-3",
      tenantId: "other-tenant",
      sessionId: "session-1",
      consumedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    await expect(
      consumeTelegramSessionHandoff({ tenantId: "tenant-1", code: "cross" }),
    ).resolves.toBeNull();
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("does not use HMAC secret fallbacks from env or hardcoded strings", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile(
        new URL(
          "../../src/channels/telegram/server/session-handoff.ts",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    expect(source).not.toContain("TELEGRAM_BOT_TOKEN");
    expect(source).not.toContain("DATABASE_URL");
    expect(source).not.toContain("hmacSha256");
    expect(source).not.toContain("sessionToken");
  });
});
