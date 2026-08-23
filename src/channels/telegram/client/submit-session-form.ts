export const TELEGRAM_ACCOUNT_NAV_KEY = "commerceos-tg-account-nav";

function encodeInitData(initData: string): string {
  return btoa(unescape(encodeURIComponent(initData)));
}

/**
 * Telegram iOS WebView often ignores Set-Cookie on fetch/XHR and on /api redirects.
 * Post to a storefront document URL and send initData as base64 so "&" in the payload
 * cannot be split as extra form fields.
 */
export function submitTelegramSessionForm(input: {
  tenantSlug: string;
  initData: string;
  nextPath: string;
}): void {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = `/${input.tenantSlug}/telegram-session`;
  form.style.display = "none";
  form.acceptCharset = "UTF-8";

  const initField = document.createElement("input");
  initField.type = "hidden";
  initField.name = "initDataB64";
  initField.value = encodeInitData(input.initData);

  const nextField = document.createElement("input");
  nextField.type = "hidden";
  nextField.name = "next";
  nextField.value = input.nextPath;

  form.append(initField, nextField);
  document.body.appendChild(form);
  form.submit();
}
