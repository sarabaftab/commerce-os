import { Prisma } from "@prisma/client";

import { cambodiaDateKey } from "@/shared/time/format-cambodia";
import { prisma } from "@/shared/db/prisma";

export const REORDER_REMINDERS_JOB_KEY = "reorder_reminders" as const;

export type ScheduledJobHandlerResult = {
  processedCount: number;
  successCount: number;
  failureCount: number;
  skippedCount: number;
};

export type ScheduledJobHandler = (input: {
  tenantId: string;
  runId: string;
  runDateKey: string;
  now: Date;
}) => Promise<ScheduledJobHandlerResult>;

export type ClaimedJobRun =
  | { kind: "claimed"; runId: string; runDateKey: string }
  | { kind: "already_done"; runId: string; status: string }
  | { kind: "in_progress"; runId: string };

const STALE_RUNNING_MS = 45 * 60 * 1000;

/**
 * Claim a per-tenant calendar-day job run (Asia/Phnom_Penh date key).
 * Duplicate claims for the same day are rejected unless a prior run failed or is stale.
 */
export async function claimScheduledJobRun(input: {
  jobKey: string;
  tenantId: string;
  now?: Date;
}): Promise<ClaimedJobRun> {
  const now = input.now ?? new Date();
  const runDateKey = cambodiaDateKey(now);

  try {
    const created = await prisma.scheduledJobRun.create({
      data: {
        jobKey: input.jobKey,
        tenantId: input.tenantId,
        runDateKey,
        status: "running",
        startedAt: now,
      },
      select: { id: true },
    });
    return { kind: "claimed", runId: created.id, runDateKey };
  } catch (error) {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== "P2002"
    ) {
      throw error;
    }
  }

  const existing = await prisma.scheduledJobRun.findUnique({
    where: {
      jobKey_tenantId_runDateKey: {
        jobKey: input.jobKey,
        tenantId: input.tenantId,
        runDateKey,
      },
    },
  });

  if (!existing) {
    throw new Error("Scheduled job claim race without existing row");
  }

  if (existing.status === "completed") {
    return { kind: "already_done", runId: existing.id, status: existing.status };
  }

  if (existing.status === "failed") {
    const retried = await prisma.scheduledJobRun.update({
      where: { id: existing.id },
      data: {
        status: "running",
        processedCount: 0,
        successCount: 0,
        failureCount: 0,
        skippedCount: 0,
        errorMessage: null,
        startedAt: now,
        finishedAt: null,
      },
      select: { id: true },
    });
    return { kind: "claimed", runId: retried.id, runDateKey };
  }

  const ageMs = now.getTime() - existing.startedAt.getTime();
  if (ageMs >= STALE_RUNNING_MS) {
    const retried = await prisma.scheduledJobRun.update({
      where: { id: existing.id },
      data: {
        status: "running",
        processedCount: 0,
        successCount: 0,
        failureCount: 0,
        skippedCount: 0,
        errorMessage: null,
        startedAt: now,
        finishedAt: null,
      },
      select: { id: true },
    });
    return { kind: "claimed", runId: retried.id, runDateKey };
  }

  return { kind: "in_progress", runId: existing.id };
}

export async function completeScheduledJobRun(input: {
  runId: string;
  result: ScheduledJobHandlerResult;
  errorMessage?: string | null;
  failed?: boolean;
}) {
  await prisma.scheduledJobRun.update({
    where: { id: input.runId },
    data: {
      status: input.failed ? "failed" : "completed",
      processedCount: input.result.processedCount,
      successCount: input.result.successCount,
      failureCount: input.result.failureCount,
      skippedCount: input.result.skippedCount,
      errorMessage: input.errorMessage ?? null,
      finishedAt: new Date(),
    },
  });
}

/**
 * Claim → run handler → persist counts. Safe to call repeatedly the same day.
 */
export async function runTenantScheduledJob(input: {
  jobKey: string;
  tenantId: string;
  handler: ScheduledJobHandler;
  now?: Date;
}): Promise<{
  outcome: "ran" | "skipped_done" | "skipped_in_progress";
  runId: string;
  runDateKey?: string;
  result?: ScheduledJobHandlerResult;
  errorMessage?: string;
}> {
  const now = input.now ?? new Date();
  const claim = await claimScheduledJobRun({
    jobKey: input.jobKey,
    tenantId: input.tenantId,
    now,
  });

  if (claim.kind === "already_done") {
    return { outcome: "skipped_done", runId: claim.runId };
  }
  if (claim.kind === "in_progress") {
    return { outcome: "skipped_in_progress", runId: claim.runId };
  }

  try {
    const result = await input.handler({
      tenantId: input.tenantId,
      runId: claim.runId,
      runDateKey: claim.runDateKey,
      now,
    });
    await completeScheduledJobRun({ runId: claim.runId, result });
    return {
      outcome: "ran",
      runId: claim.runId,
      runDateKey: claim.runDateKey,
      result,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    await completeScheduledJobRun({
      runId: claim.runId,
      result: {
        processedCount: 0,
        successCount: 0,
        failureCount: 0,
        skippedCount: 0,
      },
      errorMessage: message.slice(0, 500),
      failed: true,
    });
    return {
      outcome: "ran",
      runId: claim.runId,
      runDateKey: claim.runDateKey,
      errorMessage: message,
    };
  }
}
