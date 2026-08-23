export type TelegramAuthStatus =
  | "idle"
  | "loading"
  | "authenticated"
  | "error"
  | "skipped";

export type AccountAuthGateView = "connecting" | "retry" | "redirect-home";

export const ACCOUNT_SESSION_SYNC_KEY = "commerceos-tg-account-sync";
export const TELEGRAM_ACCOUNT_NAV_KEY = "commerceos-tg-account-nav";

/**
 * Account stays session-gated. Telegram cookies are set via a document POST,
 * not fetch, so this gate waits on that navigation instead of a silent home bounce.
 */
export function resolveAccountAuthGate(input: {
  authStatus: TelegramAuthStatus;
  navigationAttempted: boolean;
}): AccountAuthGateView {
  if (input.authStatus === "skipped") {
    return "redirect-home";
  }
  if (input.navigationAttempted) {
    return "retry";
  }
  return "connecting";
}
