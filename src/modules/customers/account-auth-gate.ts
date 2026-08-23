export type TelegramAuthStatus =
  | "idle"
  | "loading"
  | "authenticated"
  | "error"
  | "skipped";

export type AccountAuthGateView = "connecting" | "refresh" | "retry" | "redirect-home";

export const ACCOUNT_SESSION_SYNC_KEY = "commerceos-tg-account-sync";

/**
 * Account stays session-gated. This only decides unauthenticated UX
 * so Telegram boot is not a silent bounce to the shop home.
 */
export function resolveAccountAuthGate(input: {
  authStatus: TelegramAuthStatus;
  storageReady: boolean;
  hardReloadAttempted: boolean;
}): AccountAuthGateView {
  if (input.authStatus === "skipped") {
    return "redirect-home";
  }
  if (input.authStatus === "error") {
    return "retry";
  }
  if (input.authStatus === "authenticated") {
    if (!input.storageReady) {
      return "connecting";
    }
    return input.hardReloadAttempted ? "retry" : "refresh";
  }
  return "connecting";
}

export function accountSyncWasRecent(now = Date.now(), windowMs = 20_000): boolean {
  if (typeof sessionStorage === "undefined") {
    return false;
  }
  const raw = sessionStorage.getItem(ACCOUNT_SESSION_SYNC_KEY);
  if (!raw) {
    return false;
  }
  const at = Number(raw);
  return Number.isFinite(at) && now - at < windowMs;
}
