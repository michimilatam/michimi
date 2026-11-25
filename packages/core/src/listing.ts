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
