import { z } from "zod";
import { CURRENCIES } from "./money";
import { COUNTRIES } from "./countries";
import { CATEGORIES, CATEGORY_SLUGS, type CategorySlug } from "./categories";
export * from "./categories";

export const CONDITIONS = {
  nuevo: "Nuevo",
  excelente: "Excelente",
  muy_bueno: "Muy bueno",
  bueno: "Bueno",
  usado: "Usado",
  para_reparar: "Para reparar",
} as const;
export type Condition = keyof typeof CONDITIONS;

export type ListingKind = "producto" | "servicio";
export const PRICE_TYPES = {
  fijo: "Precio fijo",
  desde: "Desde",
  hora: "Por hora",
  presupuesto: "A presupuestar",
} as const;
export type PriceType = keyof typeof PRICE_TYPES;


const currencyEnum = z.enum(Object.keys(CURRENCIES) as [keyof typeof CURRENCIES, ...(keyof typeof CURRENCIES)[]]);
const countryEnum = z.enum(Object.keys(COUNTRIES) as [keyof typeof COUNTRIES, ...(keyof typeof COUNTRIES)[]]);

/**
 * Listing draft validation — shared by web and mobile so a "Publicar" form
 * behaves identically everywhere. Only title, category, condition, price and
 * location are required; length limits are intentionally not enforced.
 */
export const listingDraftSchema = z
  .object({
    title: z.string().trim().min(1, "Escribí un título"),
    description: z.string().trim().default(""),
    category: z.enum(CATEGORY_SLUGS as [CategorySlug, ...CategorySlug[]], { error: "Elegí una categoría" }),
    subcategory: z.string({ error: "Elegí una subcategoría" }).min(1, "Elegí una subcategoría"),
    kind: z.enum(["producto", "servicio"]).default("producto"),
    condition: z.enum(Object.keys(CONDITIONS) as [Condition, ...Condition[]]).optional(),
    priceType: z.enum(Object.keys(PRICE_TYPES) as [PriceType, ...PriceType[]]).default("fijo"),
    priceAmount: z.number().int().positive("Poné un precio").optional(),
    coverageRegions: z.array(z.string()).default([]),
    schedule: z.string().trim().optional(),
    currency: currencyEnum,
    country: countryEnum.default("PY"),
    region: z.string().trim().min(2, "Elegí una opción"),
    city: z.string().trim().min(2, "Escribí la ciudad"),
    defects: z.string().trim().optional(),
    accessories: z.string().trim().optional(),
    attributes: z.record(z.string(), z.string()).default({}),
    photoCount: z.number().int().min(0).max(12),
  })
  .superRefine((d, ctx) => {
    if (d.kind === "producto" && !d.condition) ctx.addIssue({ code: "custom", path: ["condition"], message: "Elegí el estado" });
    if (d.priceType !== "presupuesto" && !d.priceAmount) ctx.addIssue({ code: "custom", path: ["priceAmount"], message: "Poné un precio" });
    if (d.kind === "servicio" && d.category !== "servicios") ctx.addIssue({ code: "custom", path: ["category"], message: "Los servicios van en Servicios y clases" });
    if (!CATEGORIES[d.category].subs.some((x) => x.slug === d.subcategory)) {
      ctx.addIssue({ code: "custom", path: ["subcategory"], message: "Elegí una subcategoría" });
    }
    if (!(COUNTRIES[d.country].regions as readonly string[]).includes(d.region)) {
      ctx.addIssue({ code: "custom", path: ["region"], message: `${COUNTRIES[d.country].regionLabel} inválido` });
    }
    const local = COUNTRIES[d.country].local;
    if (d.currency !== local && d.currency !== "USD") {
      ctx.addIssue({ code: "custom", path: ["currency"], message: `En ${COUNTRIES[d.country].name} usá ${local} o USD` });
    }
  });

export type ListingDraft = z.infer<typeof listingDraftSchema>;

/** "₲ 150.000", "Desde ₲ 150.000", "₲ 80.000 / hora" o "A presupuestar". */
export function formatPrice(p: { priceType?: PriceType | string | null; amount?: number | null; currency: string }, fmt: (a: number) => string): string {
  const t = (p.priceType ?? "fijo") as PriceType;
  if (t === "presupuesto" || !p.amount) return "A presupuestar";
  const v = fmt(p.amount);
  return t === "desde" ? `Desde ${v}` : t === "hora" ? `${v} / hora` : v;
}

/** Pedido de presupuesto (cliente → profesionales). */
export const serviceRequestSchema = z.object({
  subcategory: z.string().min(1, "Elegí qué servicio necesitás"),
  title: z.string().trim().min(1, "Contá en una línea qué necesitás"),
  description: z.string().trim().default(""),
  country: countryEnum.default("PY"),
  region: z.string().trim().min(2, "Elegí una opción"),
  city: z.string().trim().min(2, "Escribí la ciudad"),
  whenText: z.string().trim().optional(),
});
export type ServiceRequestDraft = z.infer<typeof serviceRequestSchema>;
