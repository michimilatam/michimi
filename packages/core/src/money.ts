/**
 * Money module.
 *
 * Interface: an amount is ALWAYS an integer in the currency's minor unit.
 *  - PYG has no minor unit: 1.500.000 Gs = 1500000
 *  - USD uses cents:        US$ 1.200,50 = 120050
 * Floats never cross this seam. Formatting and parsing live here and nowhere else.
 */

export const CURRENCIES = {
  PYG: { code: "PYG", symbol: "₲", decimals: 0, label: "Guaraníes" },
  USD: { code: "USD", symbol: "US$", decimals: 2, label: "Dólares" },
  ARS: { code: "ARS", symbol: "$", decimals: 2, label: "Pesos argentinos" },
  BRL: { code: "BRL", symbol: "R$", decimals: 2, label: "Reales" },
  UYU: { code: "UYU", symbol: "$U", decimals: 2, label: "Pesos uruguayos" },
  BOB: { code: "BOB", symbol: "Bs", decimals: 2, label: "Bolivianos" },
  CLP: { code: "CLP", symbol: "$", decimals: 0, label: "Pesos chilenos" },
  PEN: { code: "PEN", symbol: "S/", decimals: 2, label: "Soles" },
  COP: { code: "COP", symbol: "$", decimals: 0, label: "Pesos colombianos" },
  MXN: { code: "MXN", symbol: "$", decimals: 2, label: "Pesos mexicanos" },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;

export interface Money {
  amount: number; // integer, minor units
  currency: CurrencyCode;
}

export function isCurrency(code: string): code is CurrencyCode {
  return code in CURRENCIES;
}

/** "₲ 1.500.000" / "US$ 1.200,50" — es-PY grouping by default. */
export function formatMoney(m: Money, locale = "es-PY"): string {
  const c = CURRENCIES[m.currency];
  if (!Number.isInteger(m.amount)) throw new Error("Money.amount must be an integer in minor units");
  const major = m.amount / 10 ** c.decimals;
  const n = new Intl.NumberFormat(locale, {
    minimumFractionDigits: c.decimals,
    maximumFractionDigits: c.decimals,
  }).format(major);
  return `${c.symbol} ${n}`;
}

/**
 * Parses what a person types ("1.500.000", "1500000", "1.200,50", "1200.50")
 * into minor units. Returns null on garbage. Treats the LAST separator as decimal
 * only when the currency has decimals and 1–2 digits follow it.
 */
export function parseMoney(input: string, currency: CurrencyCode): Money | null {
  const c = CURRENCIES[currency];
  const s = input.replace(/[^\d.,]/g, "");
  if (!/\d/.test(s)) return null;
  let intPart = s;
  let fracPart = "";
  if (c.decimals > 0) {
    const m = s.match(/^(.*)[.,](\d{1,2})$/);
    if (m && m[1] !== undefined && m[2] !== undefined) {
      intPart = m[1];
      fracPart = m[2];
    }
  }
  const digits = intPart.replace(/[.,]/g, "");
  if (digits === "" && fracPart === "") return null;
  const frac = (fracPart + "0".repeat(c.decimals)).slice(0, c.decimals);
  const amount = Number((digits || "0") + frac);
  if (!Number.isSafeInteger(amount)) return null;
  return { amount, currency };
}
