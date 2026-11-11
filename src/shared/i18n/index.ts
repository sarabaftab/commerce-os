export type { Locale } from "./locale";
export {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_COOKIE_NAME,
  isLocale,
  localeFromTelegramLanguageCode,
  parseLocale,
} from "./locale";
export { localizedContent, localizedValue } from "./localized";
export {
  buildLocaleCookieHeader,
  LOCALE_STORAGE_KEY,
  readLocaleFromCookieHeader,
  readLocaleFromDocumentCookie,
  writeLocaleDocumentCookie,
} from "./locale-cookie";
export { t, messages, type MessageKey } from "./messages";
export { LocaleProvider, useLocale } from "./locale-context";
export { LanguageSwitcher } from "./language-switcher";
export {
  buildLocalizedOrderPlacedMessage,
  buildLocalizedOrderStatusMessage,
  buildLocalizedPaymentRejectedMessage,
  buildLocalizedPaymentVerifiedMessage,
  localizedFulfillmentLabel,
  localizedPaymentLabel,
} from "./notification-messages";
