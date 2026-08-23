export type TelegramSendMessageResult =
  | { ok: true }
  | { ok: false; errorCode: string };

type SendTelegramMessageInput = {
  botToken: string;
  chatId: string;
  text: string;
  webAppUrl: string;
  buttonText: string;
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
    } | null;

    if (response.ok && payload?.ok) {
      return { ok: true };
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
