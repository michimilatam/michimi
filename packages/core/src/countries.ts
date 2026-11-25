import type { CurrencyCode } from "./money";

/**
 * Countries Michimi can operate in. Each market offers its local currency + USD.
 * Paraguay is the default market.
 */
export const COUNTRIES = {
  PY: { name: "Paraguay", local: "PYG", phonePrefix: "+595", locale: "es-PY" },
  AR: { name: "Argentina", local: "ARS", phonePrefix: "+54", locale: "es-AR" },
  BR: { name: "Brasil", local: "BRL", phonePrefix: "+55", locale: "pt-BR" },
  UY: { name: "Uruguay", local: "UYU", phonePrefix: "+598", locale: "es-UY" },
  BO: { name: "Bolivia", local: "BOB", phonePrefix: "+591", locale: "es-BO" },
  CL: { name: "Chile", local: "CLP", phonePrefix: "+56", locale: "es-CL" },
  PE: { name: "Perú", local: "PEN", phonePrefix: "+51", locale: "es-PE" },
  CO: { name: "Colombia", local: "COP", phonePrefix: "+57", locale: "es-CO" },
  MX: { name: "México", local: "MXN", phonePrefix: "+52", locale: "es-MX" },
} as const satisfies Record<string, { name: string; local: CurrencyCode; phonePrefix: string; locale: string }>;

export type CountryCode = keyof typeof COUNTRIES;
export const DEFAULT_COUNTRY: CountryCode = "PY";

/** Currencies a listing may use in a given country: local first, then USD. */
export function currenciesFor(country: CountryCode): CurrencyCode[] {
  return [COUNTRIES[country].local, "USD"];
}
