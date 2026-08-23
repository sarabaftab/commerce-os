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

/**
 * Bot API sendMessage. Token is only used as a request path segment — never logged.
 */
export async function sendTelegramBotMessage(
  input: SendTelegramMessageInput,
): Promise<TelegramSendMessageResult> {
  const url = `https://api.telegram.org/bot${input.botToken}/sendMessage`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: input.chatId,
        text: input.text,
        reply_markup: {
          inline_keyboard: [
            [{ text: input.buttonText, web_app: { url: input.webAppUrl } }],
          ],
        },
      }),
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

    const code =
      payload?.error_code != null
        ? String(payload.error_code)
        : `http_${response.status}`;
    return { ok: false, errorCode: code.slice(0, 64) };
  } catch {
    return { ok: false, errorCode: "network" };
  }
}
