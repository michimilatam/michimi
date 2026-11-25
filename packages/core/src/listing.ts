import { z } from "zod";
import { CURRENCIES } from "./money";
import { COUNTRIES } from "./countries";

export const CONDITIONS = {
  nuevo: "Nuevo",
  excelente: "Excelente",
  muy_bueno: "Muy bueno",
  bueno: "Bueno",
  usado: "Usado",
  para_reparar: "Para reparar",
} as const;
export type Condition = keyof typeof CONDITIONS;

/** Launch categories (see product doc §4) + suggested (optional) detail fields per category. */
export const CATEGORIES = {
  celulares: { label: "Celulares y electrónica", fields: ["marca", "modelo", "bateria_pct"] },
  muebles: { label: "Muebles y electrodomésticos", fields: ["marca", "medidas"] },
  herramientas: { label: "Herramientas y equipamiento", fields: ["marca", "modelo"] },
  deportes: { label: "Artículos deportivos", fields: ["marca"] },
} as const satisfies Record<string, { label: string; fields: readonly string[] }>;
export type CategorySlug = keyof typeof CATEGORIES;

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
    category: z.enum(Object.keys(CATEGORIES) as [CategorySlug, ...CategorySlug[]], { error: "Elegí una categoría" }),
    condition: z.enum(Object.keys(CONDITIONS) as [Condition, ...Condition[]]),
    priceAmount: z.number().int().positive("Poné un precio"),
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
    if (!(COUNTRIES[d.country].regions as readonly string[]).includes(d.region)) {
      ctx.addIssue({ code: "custom", path: ["region"], message: `${COUNTRIES[d.country].regionLabel} inválido` });
    }
    const local = COUNTRIES[d.country].local;
    if (d.currency !== local && d.currency !== "USD") {
      ctx.addIssue({ code: "custom", path: ["currency"], message: `En ${COUNTRIES[d.country].name} usá ${local} o USD` });
    }
  });

export type ListingDraft = z.infer<typeof listingDraftSchema>;
