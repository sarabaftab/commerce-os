import { beforeEach, describe, expect, it, vi } from "vitest";

const { create, findUnique, update } = vi.hoisted(() => ({
  create: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/shared/db/prisma", () => ({
  prisma: {
    scheduledJobRun: { create, findUnique, update },
  },
}));

import {
  claimScheduledJobRun,
  completeScheduledJobRun,
  runTenantScheduledJob,
} from "@/shared/jobs/scheduled-job-runner";

describe("scheduled job runner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("claims a fresh run for the Cambodia date key", async () => {
    create.mockResolvedValue({ id: "run-1" });
    const claim = await claimScheduledJobRun({
      jobKey: "reorder_reminders",
      tenantId: "tenant-a",
      now: new Date("2026-11-25T12:00:00.000Z"),
    });
    expect(claim).toEqual({
      kind: "claimed",
      runId: "run-1",
      runDateKey: "2026-11-25",
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          jobKey: "reorder_reminders",
          tenantId: "tenant-a",
          runDateKey: "2026-11-25",
          status: "running",
        }),
      }),
    );
  });

  it("skips duplicate completed runs the same day", async () => {
    const { Prisma } = await import("@prisma/client");
    create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("unique", {
        code: "P2002",
        clientVersion: "test",
      }),
    );
    findUnique.mockResolvedValue({
      id: "run-1",
      status: "completed",
      startedAt: new Date("2026-11-25T01:00:00.000Z"),
    });

    const claim = await claimScheduledJobRun({
      jobKey: "reorder_reminders",
      tenantId: "tenant-a",
      now: new Date("2026-11-25T12:00:00.000Z"),
    });
    expect(claim).toEqual({
      kind: "already_done",
      runId: "run-1",
      status: "completed",
    });
  });

  it("retries failed runs and records handler results", async () => {
    const { Prisma } = await import("@prisma/client");
    create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("unique", {
        code: "P2002",
        clientVersion: "test",
      }),
    );
    findUnique.mockResolvedValue({
      id: "run-1",
      status: "failed",
      startedAt: new Date("2026-11-25T01:00:00.000Z"),
    });
    update.mockResolvedValue({ id: "run-1" });

    const outcome = await runTenantScheduledJob({
      jobKey: "reorder_reminders",
      tenantId: "tenant-a",
      now: new Date("2026-11-25T12:00:00.000Z"),
      handler: async () => ({
        processedCount: 2,
        successCount: 1,
        failureCount: 1,
        skippedCount: 0,
      }),
    });

    expect(outcome.outcome).toBe("ran");
    expect(outcome.result?.successCount).toBe(1);
    expect(update).toHaveBeenCalled();
  });

  it("marks the run failed when the handler throws", async () => {
    create.mockResolvedValue({ id: "run-2" });
    update.mockResolvedValue({ id: "run-2" });

    const outcome = await runTenantScheduledJob({
      jobKey: "reorder_reminders",
      tenantId: "tenant-a",
      now: new Date("2026-11-25T12:00:00.000Z"),
      handler: async () => {
        throw new Error("boom");
      },
    });

    expect(outcome.errorMessage).toBe("boom");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "failed" }),
      }),
    );
  });

  it("persists completion counts", async () => {
    update.mockResolvedValue({});
    await completeScheduledJobRun({
      runId: "run-1",
      result: {
        processedCount: 3,
        successCount: 2,
        failureCount: 1,
        skippedCount: 0,
      },
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "run-1" },
        data: expect.objectContaining({
          status: "completed",
          processedCount: 3,
          successCount: 2,
          failureCount: 1,
        }),
      }),
    );
  });
});
