export const TELEGRAM_INIT_DATA_WAIT_MS = 1500;
export const TELEGRAM_INIT_DATA_POLL_MS = 100;

/**
 * Some Telegram clients leave `initData` empty until after `WebApp.ready()`.
 * Poll briefly; return null if it never appears.
 */
export async function waitForTelegramInitData(
  readInitData: () => string | undefined | null,
  options?: {
    timeoutMs?: number;
    intervalMs?: number;
    sleep?: (ms: number) => Promise<void>;
  },
): Promise<string | null> {
  const timeoutMs = options?.timeoutMs ?? TELEGRAM_INIT_DATA_WAIT_MS;
  const intervalMs = options?.intervalMs ?? TELEGRAM_INIT_DATA_POLL_MS;
  const sleep =
    options?.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));

  const first = readInitData()?.trim() ?? "";
  if (first) {
    return first;
  }

  let elapsed = 0;
  while (elapsed < timeoutMs) {
    await sleep(intervalMs);
    elapsed += intervalMs;
    const next = readInitData()?.trim() ?? "";
    if (next) {
      return next;
    }
  }

  return null;
}
