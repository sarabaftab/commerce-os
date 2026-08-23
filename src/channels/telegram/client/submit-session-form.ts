export const TELEGRAM_ACCOUNT_NAV_KEY = "commerceos-tg-account-nav";

/**
 * Telegram iOS WebView often ignores Set-Cookie on fetch/XHR.
 * A real form POST (document navigation) is how the session cookie actually lands.
 */
export function submitTelegramSessionForm(input: {
  tenantSlug: string;
  initData: string;
  nextPath: string;
}): void {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = `/api/v1/${input.tenantSlug}/telegram/auth/session`;
  form.style.display = "none";
  form.acceptCharset = "UTF-8";

  const initField = document.createElement("input");
  initField.type = "hidden";
  initField.name = "initData";
  initField.value = input.initData;

  const nextField = document.createElement("input");
  nextField.type = "hidden";
  nextField.name = "next";
  nextField.value = input.nextPath;

  form.append(initField, nextField);
  document.body.appendChild(form);
  form.submit();
}
