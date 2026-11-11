/**
 * Public Telegram support chat destination.
 * Username only — never bot tokens, invite hashes, or freeform URLs.
 */

const TELEGRAM_USERNAME_RE = /^[A-Za-z][A-Za-z0-9_]{4,31}$/;

const RESERVED_T_ME_PATHS = new Set([
  "addstickers",
  "boost",
  "c",
  "giftcode",
  "invoice",
  "iv",
  "joinchat",
  "login",
  "proxy",
  "s",
  "share",
  "socks",
]);

export function isTelegramUsername(value: string): boolean {
  return TELEGRAM_USERNAME_RE.test(value);
}

function usernameFromTmeUrl(raw: string): string | null {
  try {
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const url = new URL(withProtocol);
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    if (host !== "t.me" && host !== "telegram.me") {
      return null;
    }
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length !== 1) {
      return null;
    }
    const segment = parts[0] ?? "";
    if (segment.startsWith("+")) {
      return null;
    }
    if (RESERVED_T_ME_PATHS.has(segment.toLowerCase())) {
      return null;
    }
    return isTelegramUsername(segment) ? segment : null;
  } catch {
    return null;
  }
}

/**
 * Accepts @username, username, or https://t.me/username.
 * Returns the bare username, or null when empty/invalid.
 */
export function parseTelegramSupportUsername(raw: unknown): string | null {
  if (typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.length > 128) {
    return null;
  }

  const looksLikeUrl =
    /^https?:\/\//i.test(trimmed) ||
    /^t\.me\//i.test(trimmed) ||
    /^telegram\.me\//i.test(trimmed) ||
    /^www\.t\.me\//i.test(trimmed);

  if (looksLikeUrl) {
    return usernameFromTmeUrl(trimmed);
  }

  if (/[/?#:\s]/.test(trimmed)) {
    return null;
  }

  const candidate = trimmed.replace(/^@/, "");
  return isTelegramUsername(candidate) ? candidate : null;
}

export function telegramSupportChatUrl(username: string | null | undefined): string | null {
  const parsed = parseTelegramSupportUsername(username ?? "");
  if (!parsed) {
    return null;
  }
  return `https://t.me/${parsed}`;
}

export function formatTelegramSupportUsernameInput(username: string | null | undefined): string {
  const parsed = parseTelegramSupportUsername(username ?? "");
  return parsed ? `@${parsed}` : "";
}

function isSafeTelegramChatUrl(url: string): boolean {
  return /^https:\/\/t\.me\/[A-Za-z][A-Za-z0-9_]{4,31}$/.test(url);
}

type TelegramLinkWebApp = {
  openTelegramLink?: (url: string) => void;
};

/**
 * Open a https://t.me/<username> chat inside Telegram when possible.
 * Does not close the Mini App. Refuses anything that is not a user/chat t.me URL.
 */
export function openTelegramHttpsLink(url: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  if (!isSafeTelegramChatUrl(url)) {
    return false;
  }
  const webApp = window.Telegram?.WebApp as TelegramLinkWebApp | undefined;
  if (typeof webApp?.openTelegramLink === "function") {
    webApp.openTelegramLink(url);
    return true;
  }
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}
