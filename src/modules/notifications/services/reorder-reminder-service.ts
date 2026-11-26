import { getTelegramBotTokenForTenantSlugOrNull } from "@/channels/telegram/server/bot-config";
import { sendTelegramBotMessage } from "@/channels/telegram/server/telegram-bot-api";
import { env } from "@/shared/config/env";
import { prisma } from "@/shared/db/prisma";
import {
  REORDER_REMINDERS_JOB_KEY,
  runTenantScheduledJob,
  type ScheduledJobHandlerResult,
} from "@/shared/jobs/scheduled-job-runner";

import {
  clampIntervalDays,
  evaluateReorderEligibility,
  reorderSourceCutoff,
} from "../reorder-eligibility";
import {
  buildLocalizedReorderReminderMessage,
  buildReorderWebAppUrl,
} from "../templates/reorder-reminder";

export const REORDER_REMINDER_BATCH_SIZE = 25;

type EligibleCandidate = {
  customerId: string;
  telegramExternalId: string;
  locale: string | null;
  orderId: string;
  orderNumber: string;
  orderPlacedAt: Date;
};

/**
 * Process reorder reminders for one tenant (bounded batch). Idempotent per Cambodia day via job run claim.
 */
export async function processReorderRemindersForTenant(input: {
  tenantId: string;
  runId: string;
  now: Date;
}): Promise<ScheduledJobHandlerResult> {
  const tenant = await prisma.tenant.findFirst({
    where: { id: input.tenantId, isActive: true },
    select: {
      id: true,
      slug: true,
      name: true,
      settings: {
        select: {
          reorderRemindersEnabled: true,
          reorderReminderIntervalDays: true,
          telegramOrderNotificationsEnabled: true,
          displayName: true,
        },
      },
    },
  });

  const settings = tenant?.settings;
  if (
    !tenant ||
    !settings?.reorderRemindersEnabled ||
    settings.telegramOrderNotificationsEnabled === false
  ) {
    return emptyResult();
  }

  const botToken = getTelegramBotTokenForTenantSlugOrNull(tenant.slug);
  if (!botToken) {
    return emptyResult();
  }

  const intervalDays = clampIntervalDays(settings.reorderReminderIntervalDays);
  const cutoff = reorderSourceCutoff(input.now, intervalDays);
  const candidates = await findEligibleReorderCandidates({
    tenantId: tenant.id,
    cutoff,
    limit: REORDER_REMINDER_BATCH_SIZE,
  });

  let successCount = 0;
  let failureCount = 0;
  let skippedCount = 0;
  let processedCount = 0;

  const storeName = settings.displayName?.trim() || tenant.name;
  const appUrl = env().NEXT_PUBLIC_APP_URL;

  for (const candidate of candidates) {
    processedCount += 1;

    const lastReminder = await prisma.reorderReminder.findFirst({
      where: {
        tenantId: tenant.id,
        customerId: candidate.customerId,
        status: "sent",
        sentAt: { not: null },
      },
      orderBy: { sentAt: "desc" },
      select: { sentAt: true },
    });

    const decision = evaluateReorderEligibility({
      now: input.now,
      intervalDays,
      lastCompletedOrderPlacedAt: candidate.orderPlacedAt,
      lastSuccessfulReminderSentAt: lastReminder?.sentAt ?? null,
      hasTelegramIdentity: true,
      tenantReorderRemindersEnabled: true,
      tenantTelegramOrderNotificationsEnabled: true,
      customerDeleted: false,
    });

    if (!decision.eligible) {
      skippedCount += 1;
      await prisma.reorderReminder.create({
        data: {
          tenantId: tenant.id,
          customerId: candidate.customerId,
          sourceOrderId: candidate.orderId,
          jobRunId: input.runId,
          status: "skipped",
          errorCode: decision.reason.slice(0, 64),
        },
      });
      continue;
    }

    const message = buildLocalizedReorderReminderMessage({
      locale: candidate.locale,
      storeName,
      orderNumber: candidate.orderNumber,
    });
    const webAppUrl = buildReorderWebAppUrl({
      appUrl,
      tenantSlug: tenant.slug,
      orderNumber: candidate.orderNumber,
    });

    const result = await sendTelegramBotMessage({
      botToken,
      chatId: candidate.telegramExternalId,
      text: message.text,
      webAppUrl,
      buttonText: message.buttonText,
    });

    if (result.ok) {
      successCount += 1;
      await prisma.reorderReminder.create({
        data: {
          tenantId: tenant.id,
          customerId: candidate.customerId,
          sourceOrderId: candidate.orderId,
          jobRunId: input.runId,
          status: "sent",
          sentAt: new Date(),
        },
      });
    } else {
      failureCount += 1;
      await prisma.reorderReminder.create({
        data: {
          tenantId: tenant.id,
          customerId: candidate.customerId,
          sourceOrderId: candidate.orderId,
          jobRunId: input.runId,
          status: "failed",
          errorCode: (result.errorCode ?? "send_failed").slice(0, 64),
        },
      });
    }
  }

  return { processedCount, successCount, failureCount, skippedCount };
}

export async function runReorderRemindersJobForTenant(input: {
  tenantId: string;
  now?: Date;
}) {
  return runTenantScheduledJob({
    jobKey: REORDER_REMINDERS_JOB_KEY,
    tenantId: input.tenantId,
    now: input.now,
    handler: async ({ tenantId, runId, now }) =>
      processReorderRemindersForTenant({ tenantId, runId, now }),
  });
}

export async function runReorderRemindersForAllEnabledTenants(input?: {
  now?: Date;
}) {
  const now = input?.now ?? new Date();
  const tenants = await prisma.tenant.findMany({
    where: {
      isActive: true,
      settings: { reorderRemindersEnabled: true },
    },
    select: { id: true, slug: true },
    take: 50,
  });

  const outcomes = [];
  for (const tenant of tenants) {
    outcomes.push({
      tenantId: tenant.id,
      slug: tenant.slug,
      ...(await runReorderRemindersJobForTenant({ tenantId: tenant.id, now })),
    });
  }
  return { tenantCount: tenants.length, outcomes };
}

export async function getReorderReminderAdminSummary(tenantId: string) {
  const [settings, lastRun, recentFailures] = await Promise.all([
    prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: {
        reorderRemindersEnabled: true,
        reorderReminderIntervalDays: true,
        telegramOrderNotificationsEnabled: true,
      },
    }),
    prisma.scheduledJobRun.findFirst({
      where: { tenantId, jobKey: REORDER_REMINDERS_JOB_KEY },
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        status: true,
        runDateKey: true,
        processedCount: true,
        successCount: true,
        failureCount: true,
        skippedCount: true,
        errorMessage: true,
        startedAt: true,
        finishedAt: true,
      },
    }),
    prisma.reorderReminder.count({
      where: {
        tenantId,
        status: "failed",
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  return {
    enabled: settings?.reorderRemindersEnabled ?? false,
    intervalDays: settings?.reorderReminderIntervalDays ?? 14,
    telegramOrderNotificationsEnabled:
      settings?.telegramOrderNotificationsEnabled ?? true,
    lastRun,
    recentFailureCount: recentFailures,
  };
}

async function findEligibleReorderCandidates(input: {
  tenantId: string;
  cutoff: Date;
  limit: number;
}): Promise<EligibleCandidate[]> {
  // Latest completed order per customer that is still on/before the cutoff,
  // with a Telegram identity, excluding customers reminded successfully after cutoff.
  const rows = await prisma.$queryRaw<
    Array<{
      customer_id: string;
      external_id: string;
      customer_locale: string | null;
      order_id: string;
      order_number: string;
      placed_at: Date;
    }>
  >`
    SELECT
      c.id AS customer_id,
      ci.external_id,
      latest.customer_locale,
      latest.order_id,
      latest.order_number,
      latest.placed_at
    FROM customers c
    INNER JOIN customer_identities ci
      ON ci.customer_id = c.id
      AND ci.tenant_id = c.tenant_id
      AND ci.channel = 'telegram'
    INNER JOIN LATERAL (
      SELECT
        o.id AS order_id,
        o.order_number,
        o.placed_at,
        o.customer_locale
      FROM orders o
      WHERE o.tenant_id = c.tenant_id
        AND o.customer_id = c.id
        AND o.status = 'completed'
      ORDER BY o.placed_at DESC, o.id DESC
      LIMIT 1
    ) latest ON TRUE
    WHERE c.tenant_id = ${input.tenantId}
      AND c.deleted_at IS NULL
      AND latest.placed_at <= ${input.cutoff}
      AND NOT EXISTS (
        SELECT 1
        FROM reorder_reminders rr
        WHERE rr.tenant_id = c.tenant_id
          AND rr.customer_id = c.id
          AND rr.status = 'sent'
          AND rr.sent_at IS NOT NULL
          AND rr.sent_at > ${input.cutoff}
      )
    ORDER BY latest.placed_at ASC
    LIMIT ${input.limit}
  `;

  return rows.map((row) => ({
    customerId: row.customer_id,
    telegramExternalId: row.external_id,
    locale: row.customer_locale,
    orderId: row.order_id,
    orderNumber: row.order_number,
    orderPlacedAt: row.placed_at,
  }));
}

function emptyResult(): ScheduledJobHandlerResult {
  return {
    processedCount: 0,
    successCount: 0,
    failureCount: 0,
    skippedCount: 0,
  };
}
