import {
  getTelegramBotTokenForTenantSlugOrNull,
  getTelegramBroadcastChannelOrNull,
} from "@/channels/telegram/server/bot-config";
import {
  mapTelegramBroadcastError,
  sendTelegramChannelBroadcast,
} from "@/channels/telegram/server/telegram-bot-api";
import { env } from "@/shared/config/env";
import { AppError } from "@/shared/errors/app-error";

import { broadcastInputSchema, type BroadcastInput } from "../schemas/broadcast";

export type PublishBroadcastResult = {
  channel: string;
  messageId?: number;
};

function storefrontRootUrl(tenantSlug: string): string {
  const base = env().NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  return `${base}/${tenantSlug}`;
}

/**
 * Resolve CTA destination server-side.
 * Empty destination + label → storefront Mini App / web root for this tenant.
 * Relative paths are rooted under the tenant storefront.
 * Absolute destinations must be https.
 */
export function resolveBroadcastButtonUrl(input: {
  tenantSlug: string;
  buttonLabel: string;
  buttonDestination: string;
}): { text: string; url: string } | null {
  const label = input.buttonLabel.trim();
  if (!label) {
    return null;
  }

  const destination = input.buttonDestination.trim();
  const root = storefrontRootUrl(input.tenantSlug);

  if (!destination) {
    return { text: label, url: root };
  }

  if (destination.startsWith("https://")) {
    try {
      const parsed = new URL(destination);
      if (parsed.protocol !== "https:") {
        throw new AppError("VALIDATION", "Button destination must use HTTPS");
      }
      return { text: label, url: parsed.toString() };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError("VALIDATION", "Button destination must be a valid HTTPS URL");
    }
  }

  if (destination.startsWith("http://")) {
    throw new AppError("VALIDATION", "Button destination must use HTTPS");
  }

  if (destination.startsWith("/")) {
    const path = destination.startsWith(`/${input.tenantSlug}`)
      ? destination
      : `/${input.tenantSlug}${destination}`;
    return { text: label, url: `${env().NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}${path}` };
  }

  throw new AppError(
    "VALIDATION",
    "Button destination must be empty (store root), an https URL, or a path like /products",
  );
}

export function getBroadcastChannelForAdmin(tenantSlug: string): string | null {
  return getTelegramBroadcastChannelOrNull(tenantSlug);
}

export async function publishTelegramBroadcast(input: {
  tenantId: string;
  tenantSlug: string;
  adminUserId: string;
  data: BroadcastInput;
}): Promise<PublishBroadcastResult> {
  void input.tenantId;
  void input.adminUserId;

  const parsed = broadcastInputSchema.parse(input.data);
  const channel = getTelegramBroadcastChannelOrNull(input.tenantSlug);
  if (!channel) {
    throw new AppError(
      "VALIDATION",
      "Telegram broadcast channel is not configured for this tenant",
    );
  }

  const botToken = getTelegramBotTokenForTenantSlugOrNull(input.tenantSlug);
  if (!botToken) {
    throw new AppError("VALIDATION", "Telegram bot is not configured for this tenant");
  }

  const button = resolveBroadcastButtonUrl({
    tenantSlug: input.tenantSlug,
    buttonLabel: parsed.buttonLabel ?? "",
    buttonDestination: parsed.buttonDestination ?? "",
  });

  console.info("[broadcast]", {
    tenantSlug: input.tenantSlug,
    channel,
    outcome: "attempted",
    hasButton: Boolean(button),
  });

  const result = await sendTelegramChannelBroadcast({
    botToken,
    channel,
    text: parsed.message,
    button,
  });

  if (!result.ok) {
    console.info("[broadcast]", {
      tenantSlug: input.tenantSlug,
      channel,
      outcome: "failed",
      telegramErrorCode: result.errorCode,
    });
    throw new AppError("INTERNAL", mapTelegramBroadcastError(result.errorCode));
  }

  console.info("[broadcast]", {
    tenantSlug: input.tenantSlug,
    channel,
    outcome: "published",
    messageId: result.messageId ?? null,
  });

  return { channel, messageId: result.messageId };
}
