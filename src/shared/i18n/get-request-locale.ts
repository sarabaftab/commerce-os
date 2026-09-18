import { cookies } from "next/headers";

import type { Locale } from "./locale";
import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, parseLocale } from "./locale";

/** Server Components / actions — reads the storefront locale cookie. */
export async function getRequestLocale(): Promise<Locale> {
  try {
    const store = await cookies();
    return parseLocale(store.get(LOCALE_COOKIE_NAME)?.value);
  } catch {
    return DEFAULT_LOCALE;
  }
}
