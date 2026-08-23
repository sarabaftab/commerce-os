export type TelegramAuthStatus =
  | "idle"
  | "loading"
  | "authenticated"
  | "error"
  | "skipped";

export type AccountAuthGateView = "connecting" | "refresh" | "retry" | "redirect-home";

/**
 * Account stays session-gated. This only decides unauthenticated UX
 * so Telegram boot is not a silent bounce to the shop home.
 */
export function resolveAccountAuthGate(input: {
  authStatus: TelegramAuthStatus;
  refreshAttempted: boolean;
}): AccountAuthGateView {
  if (input.authStatus === "skipped") {
    return "redirect-home";
  }
  if (input.authStatus === "error") {
    return "retry";
  }
  if (input.authStatus === "authenticated") {
    return input.refreshAttempted ? "retry" : "refresh";
  }
  return "connecting";
}
