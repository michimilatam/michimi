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

/** Launch categories (see product doc §4) + required fields per category. */
export const CATEGORIES = {
  celulares: { label: "Celulares y electrónica", required: ["marca", "modelo", "bateria_pct"] },
  muebles: { label: "Muebles y electrodomésticos", required: ["medidas"] },
  herramientas: { label: "Herramientas y equipamiento", required: ["marca"] },
  deportes: { label: "Artículos deportivos", required: [] },
} as const satisfies Record<string, { label: string; required: readonly string[] }>;
export type CategorySlug = keyof typeof CATEGORIES;

const currencyEnum = z.enum(Object.keys(CURRENCIES) as [keyof typeof CURRENCIES, ...(keyof typeof CURRENCIES)[]]);
const countryEnum = z.enum(Object.keys(COUNTRIES) as [keyof typeof COUNTRIES, ...(keyof typeof COUNTRIES)[]]);

/**
 * Listing draft validation — shared by web and mobile so a "Publicar" form
 * behaves identically everywhere. Category-specific required attributes are
 * enforced in superRefine.
 */
export const listingDraftSchema = z
  .object({
    title: z.string().trim().min(6, "El título es muy corto").max(90),
    description: z.string().trim().min(20, "Contá un poco más del producto").max(4000),
    category: z.enum(Object.keys(CATEGORIES) as [CategorySlug, ...CategorySlug[]]),
    condition: z.enum(Object.keys(CONDITIONS) as [Condition, ...Condition[]]),
    priceAmount: z.number().int().positive("Poné un precio"),
    currency: currencyEnum,
    country: countryEnum.default("PY"),
    city: z.string().trim().min(2),
    defects: z.string().trim().max(1000).optional(),
    accessories: z.string().trim().max(1000).optional(),
    attributes: z.record(z.string(), z.string()).default({}),
    photoCount: z.number().int().min(3, "Subí al menos 3 fotos desde distintos ángulos").max(12),
  })
  .superRefine((d, ctx) => {
    for (const key of CATEGORIES[d.category].required) {
      if (!d.attributes[key]?.trim()) {
        ctx.addIssue({ code: "custom", path: ["attributes", key], message: `Falta: ${key}` });
      }
    }
    const local = COUNTRIES[d.country].local;
    if (d.currency !== local && d.currency !== "USD") {
      ctx.addIssue({ code: "custom", path: ["currency"], message: `En ${COUNTRIES[d.country].name} usá ${local} o USD` });
    }
  });

export type ListingDraft = z.infer<typeof listingDraftSchema>;
