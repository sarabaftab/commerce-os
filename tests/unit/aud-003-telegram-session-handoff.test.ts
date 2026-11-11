import { beforeEach, describe, expect, it, vi } from "vitest";

const { create, findUnique, updateMany } = vi.hoisted(() => ({
  create: vi.fn(),
  findUnique: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock("@/shared/db/prisma", () => ({
  prisma: {
    telegramSessionHandoff: { create, findUnique, updateMany },
  },
}));

import {
  consumeTelegramSessionHandoff,
  createTelegramSessionHandoff,
} from "@/channels/telegram/server/session-handoff";

/**
 * AUD-003: URL must carry a one-time code, not the long-lived session token.
 */
describe("AUD-003 telegram session handoff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stores a hashed one-time code and not the session token in the returned value", async () => {
    create.mockResolvedValue({});
    const sessionToken = "long-lived-session-token-value";

    const code = await createTelegramSessionHandoff(sessionToken);

    expect(code).not.toContain(sessionToken);
    expect(code.length).toBeGreaterThan(20);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sessionToken,
          codeHash: expect.any(String),
          expiresAt: expect.any(Date),
        }),
      }),
    );
    const storedHash = create.mock.calls[0]![0].data.codeHash as string;
    expect(storedHash).not.toBe(code);
    expect(storedHash).toHaveLength(64);
  });

  it("returns the session token once and rejects a second consume", async () => {
    const sessionToken = "session-token-once";
    create.mockResolvedValue({});
    const code = await createTelegramSessionHandoff(sessionToken);

    findUnique.mockResolvedValue({
      id: "handoff-1",
      sessionToken,
      consumedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    updateMany.mockResolvedValue({ count: 1 });

    await expect(consumeTelegramSessionHandoff(code)).resolves.toBe(sessionToken);

    findUnique.mockResolvedValue({
      id: "handoff-1",
      sessionToken,
      consumedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    });

    await expect(consumeTelegramSessionHandoff(code)).resolves.toBeNull();
  });

  it("rejects expired or unknown codes", async () => {
    findUnique.mockResolvedValue(null);
    await expect(consumeTelegramSessionHandoff("unknown")).resolves.toBeNull();

    findUnique.mockResolvedValue({
      id: "handoff-2",
      sessionToken: "x",
      consumedAt: null,
      expiresAt: new Date(Date.now() - 1_000),
    });
    await expect(consumeTelegramSessionHandoff("expired")).resolves.toBeNull();
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
  });
});
