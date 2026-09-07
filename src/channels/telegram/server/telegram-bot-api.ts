export type TelegramSendMessageResult =
  | { ok: true; messageId?: number }
  | { ok: false; errorCode: string };

type SendTelegramMessageInput = {
  botToken: string;
  chatId: string;
  text: string;
  webAppUrl: string;
  buttonText: string;
};

type SendTelegramChannelBroadcastInput = {
  botToken: string;
  /** Channel username including `@`, or numeric chat id. */
  channel: string;
  text: string;
  /** Channel posts use HTTPS URL buttons (web_app is private-chat only). */
  button?: { text: string; url: string } | null;
};

function telegramChatId(chatId: string): string | number {
  return /^\d+$/.test(chatId) ? Number(chatId) : chatId;
}

function telegramErrorCode(payload: { error_code?: number; description?: string } | null, httpStatus: number) {
  const code = payload?.error_code != null ? String(payload.error_code) : `http_${httpStatus}`;
  const description = payload?.description?.replace(/bot\d+:\S+/gi, "[token]").slice(0, 80);
  return (description ? `${code}:${description}` : code).slice(0, 64);
}

async function postSendMessage(
  botToken: string,
  body: Record<string, unknown>,
): Promise<TelegramSendMessageResult> {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });

    const payload = (await response.json().catch(() => null)) as {
      ok?: boolean;
      error_code?: number;
      description?: string;
      result?: { message_id?: number };
    } | null;

    if (response.ok && payload?.ok) {
      return {
        ok: true,
        messageId:
          typeof payload.result?.message_id === "number" ? payload.result.message_id : undefined,
      };
    }

    return { ok: false, errorCode: telegramErrorCode(payload, response.status) };
  } catch {
    return { ok: false, errorCode: "network" };
  }
}

/**
 * Bot API sendMessage. Token is only used as a request path segment — never logged.
 * If the Mini App button is rejected, retry the same text without a button so the update still arrives.
 */
export async function sendTelegramBotMessage(
  input: SendTelegramMessageInput,
): Promise<TelegramSendMessageResult> {
  const chatId = telegramChatId(input.chatId);
  const withButton = await postSendMessage(input.botToken, {
    chat_id: chatId,
    text: input.text,
    reply_markup: {
      inline_keyboard: [[{ text: input.buttonText, web_app: { url: input.webAppUrl } }]],
    },
  });
  if (withButton.ok) {
    return withButton;
  }

  const withoutButton = await postSendMessage(input.botToken, {
    chat_id: chatId,
    text: input.text,
  });
  return withoutButton.ok ? withoutButton : withButton;
}

/**
 * Publish a plain-text announcement to a public Telegram channel.
 * Uses URL inline buttons (compatible with channels); never logs the bot token.
 */
export async function sendTelegramChannelBroadcast(
  input: SendTelegramChannelBroadcastInput,
): Promise<TelegramSendMessageResult> {
  const chatId = telegramChatId(input.channel);
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text: input.text,
    disable_web_page_preview: true,
  };

  if (input.button?.text && input.button.url) {
    body.reply_markup = {
      inline_keyboard: [[{ text: input.button.text, url: input.button.url }]],
    };
  }

  return postSendMessage(input.botToken, body);
}

/** Map Telegram API failure codes to Admin-safe copy (never expose tokens). */
export function mapTelegramBroadcastError(errorCode: string): string {
  const lower = errorCode.toLowerCase();
  if (
    lower.includes("403") ||
    lower.includes("forbidden") ||
    lower.includes("not enough rights") ||
    lower.includes("chat not found") ||
    lower.includes("bot is not a member") ||
    lower.includes("need administrator")
  ) {
    return "Telegram channel publishing failed. Please verify the bot is still an administrator with permission to post messages.";
  }
  if (lower.includes("401") || lower.includes("unauthorized")) {
    return "Unable to publish the broadcast. Please verify the Telegram bot token configuration.";
  }
  return "Unable to publish the broadcast. Please try again.";
}
