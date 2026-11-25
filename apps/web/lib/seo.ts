import { CATEGORIES, COUNTRIES, slugify, type CategorySlug, type CountryCode } from "@michimi/core";

export const SITE = "https://www.michimi.com";
export const SEO_COUNTRY: CountryCode = "PY";

/** "asuncion" -> "Asunción" para el país dado */
export function regionFromSlug(slug: string | undefined, country: CountryCode = SEO_COUNTRY): string | null {
  if (!slug) return null;
  return COUNTRIES[country].regions.find((r) => slugify(r) === slug) ?? null;
}
export function subFromSlug(cat: CategorySlug, slug: string | undefined) {
  if (!slug) return null;
  return CATEGORIES[cat].subs.find((s) => s.slug === slug) ?? null;
}
export const serviceUrl = (sub?: string, region?: string) => `/servicios${sub ? `/${sub}` : ""}${region ? `/${slugify(region)}` : ""}`;
export const productUrl = (cat: string, sub?: string, region?: string) =>
  `/productos/${cat}${sub ? `/${sub}` : region ? "/en" : ""}${region ? `/${slugify(region)}` : ""}`;
