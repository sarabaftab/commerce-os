import { NextResponse } from "next/server";

import { runReorderRemindersForAllEnabledTenants } from "@/modules/notifications/services/reorder-reminder-service";
import { authorizeCronRequest } from "@/shared/jobs/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Hobby-safe daily budget; keep work bounded inside handlers. */
export const maxDuration = 60;

async function handle(request: Request) {
  const auth = authorizeCronRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const started = Date.now();
  const result = await runReorderRemindersForAllEnabledTenants();

  console.info(
    JSON.stringify({
      event: "cron.daily.completed",
      tenantCount: result.tenantCount,
      outcomes: result.outcomes.map((row) => ({
        tenantId: row.tenantId,
        slug: row.slug,
        outcome: row.outcome,
        runId: row.runId,
        processed: row.result?.processedCount ?? 0,
        success: row.result?.successCount ?? 0,
        failure: row.result?.failureCount ?? 0,
        skipped: row.result?.skippedCount ?? 0,
        errorMessage: row.errorMessage ?? null,
      })),
      durationMs: Date.now() - started,
    }),
  );

  return NextResponse.json({
    ok: true,
    job: "daily",
    tenantCount: result.tenantCount,
    outcomes: result.outcomes,
  });
}

/** Vercel Cron uses GET. */
export async function GET(request: Request) {
  return handle(request);
}

/** Allow authenticated manual POST smoke tests. */
export async function POST(request: Request) {
  return handle(request);
}
