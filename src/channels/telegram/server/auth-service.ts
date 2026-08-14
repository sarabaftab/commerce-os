import { prisma } from "@/shared/db/prisma";
import { AppError } from "@/shared/errors/app-error";

import {
  getTelegramBotTokenForTenantSlug,
  getTelegramInitDataMaxAgeSeconds,
} from "./bot-config";
import {
  attachAttributionCookie,
  attachCustomerSessionCookie,
  createCustomerSession,
  type CustomerSessionPayload,
} from "./customer-session";
import {
  telegramDisplayName,
  validateTelegramInitData,
  type TelegramWebAppUser,
} from "./validate-init-data";

export type TelegramAuthResult = {
  customerId: string;
  tenantId: string;
  displayName: string;
  telegramUserId: string;
  startParam?: string;
  isNewCustomer: boolean;
};

async function upsertTelegramCustomer(input: {
  tenantId: string;
  user: TelegramWebAppUser;
}) {
  const externalId = String(input.user.id);
  const displayName = telegramDisplayName(input.user);
  const meta = {
    username: input.user.username ?? null,
    languageCode: input.user.language_code ?? null,
    isPremium: input.user.is_premium ?? false,
    photoUrl: input.user.photo_url ?? null,
  };

  const existing = await prisma.customerIdentity.findUnique({
    where: {
      tenantId_channel_externalId: {
        tenantId: input.tenantId,
        channel: "telegram",
        externalId,
      },
    },
    include: { customer: true },
  });

  if (existing) {
    if (existing.customer.deletedAt) {
      throw new AppError("FORBIDDEN", "Customer account is disabled");
    }

    await prisma.customerIdentity.update({
      where: { id: existing.id },
      data: {
        meta,
        lastAuthenticatedAt: new Date(),
      },
    });

    // Never overwrite customer-edited profile fields on re-auth.
    // Only seed displayName when still empty.
    let customer = existing.customer;
    if (!existing.customer.displayName?.trim()) {
      customer = await prisma.customer.update({
        where: { id: existing.customerId },
        data: { displayName },
      });
    }

    return { customer, isNewCustomer: false };
  }

  const customer = await prisma.$transaction(async (tx) => {
    const created = await tx.customer.create({
      data: {
        tenantId: input.tenantId,
        firstName: input.user.first_name?.trim() || null,
        lastName: input.user.last_name?.trim() || null,
        displayName,
      },
    });

    await tx.customerIdentity.create({
      data: {
        tenantId: input.tenantId,
        customerId: created.id,
        channel: "telegram",
        externalId,
        meta,
        lastAuthenticatedAt: new Date(),
      },
    });

    return created;
  });

  return { customer, isNewCustomer: true };
}

export async function authenticateTelegramInitData(input: {
  tenantId: string;
  tenantSlug: string;
  initData: string;
  existingSession?: CustomerSessionPayload | null;
}): Promise<{
  result: TelegramAuthResult;
  sessionToken: string | null;
  startParam?: string;
  sessionReused: boolean;
}> {
  const botToken = getTelegramBotTokenForTenantSlug(input.tenantSlug);
  const validated = validateTelegramInitData(input.initData, botToken, {
    maxAgeSeconds: getTelegramInitDataMaxAgeSeconds(),
  });

  const { customer, isNewCustomer } = await upsertTelegramCustomer({
    tenantId: input.tenantId,
    user: validated.user,
  });

  const canReuse =
    input.existingSession &&
    input.existingSession.tenantId === input.tenantId &&
    input.existingSession.customerId === customer.id;

  if (canReuse) {
    return {
      sessionToken: null,
      sessionReused: true,
      startParam: validated.startParam,
      result: {
        customerId: customer.id,
        tenantId: input.tenantId,
        displayName: customer.displayName ?? telegramDisplayName(validated.user),
        telegramUserId: String(validated.user.id),
        startParam: validated.startParam,
        isNewCustomer: false,
      },
    };
  }

  const { token } = await createCustomerSession({
    tenantId: input.tenantId,
    customerId: customer.id,
  });

  return {
    sessionToken: token,
    sessionReused: false,
    startParam: validated.startParam,
    result: {
      customerId: customer.id,
      tenantId: input.tenantId,
      displayName: customer.displayName ?? telegramDisplayName(validated.user),
      telegramUserId: String(validated.user.id),
      startParam: validated.startParam,
      isNewCustomer,
    },
  };
}

export function applyTelegramAuthCookies(
  response: import("next/server").NextResponse,
  sessionToken: string,
  startParam?: string,
) {
  attachCustomerSessionCookie(response, sessionToken);
  if (startParam) {
    attachAttributionCookie(response, startParam);
  }
  return response;
}
