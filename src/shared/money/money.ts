export type Money = {
  amountMinor: number;
  currency: string;
};

const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "JPY",
  "KMF",
  "KRW",
  "MGA",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
]);

export function getCurrencyExponent(currency: string): number {
  const code = currency.toUpperCase();
  return ZERO_DECIMAL_CURRENCIES.has(code) ? 0 : 2;
}

/** Convert a major-unit number (e.g. 12.50) to integer minor units. */
export function toMinor(amountMajor: number, currency: string): number {
  if (!Number.isFinite(amountMajor)) {
    throw new Error("Amount must be a finite number");
  }

  const exponent = getCurrencyExponent(currency);
  const factor = 10 ** exponent;
  return Math.round(amountMajor * factor);
}

/** Convert integer minor units to major units. */
export function fromMinor(amountMinor: number, currency: string): number {
  if (!Number.isInteger(amountMinor)) {
    throw new Error("amountMinor must be an integer");
  }

  const exponent = getCurrencyExponent(currency);
  const factor = 10 ** exponent;
  return amountMinor / factor;
}

export function formatMoney(amountMinor: number, currency: string, locale = "en-US"): string {
  const amountMajor = fromMinor(amountMinor, currency);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountMajor);
}

export function createMoney(amountMinor: number, currency: string): Money {
  if (!Number.isInteger(amountMinor)) {
    throw new Error("amountMinor must be an integer");
  }
  if (!/^[A-Z]{3}$/.test(currency.toUpperCase())) {
    throw new Error("currency must be a 3-letter ISO 4217 code");
  }

  return {
    amountMinor,
    currency: currency.toUpperCase(),
  };
}
