import { describe, expect, it } from "vitest";
import { CATEGORIES, CATEGORY_SLUGS, flag, formatMoney, parseMoney, summarize, isRatingVisible, listingDraftSchema, currenciesFor } from "./index";

describe("money", () => {
  it("formats guaraníes without decimals", () => {
    expect(formatMoney({ amount: 1_500_000, currency: "PYG" })).toBe("₲ 1.500.000");
  });
  it("formats USD from cents", () => {
    expect(formatMoney({ amount: 120_050, currency: "USD" })).toBe("US$ 1.200,50");
  });
  it("parses typed guaraníes", () => {
    expect(parseMoney("1.500.000", "PYG")).toEqual({ amount: 1_500_000, currency: "PYG" });
  });
  it("parses typed dollars both ways", () => {
    expect(parseMoney("1.200,50", "USD")?.amount).toBe(120_050);
    expect(parseMoney("1200.5", "USD")?.amount).toBe(120_050);
    expect(parseMoney("350", "USD")?.amount).toBe(35_000);
  });
  it("rejects garbage", () => {
    expect(parseMoney("abc", "PYG")).toBeNull();
  });
  it("Paraguay offers PYG and USD", () => {
    expect(currenciesFor("PY")).toEqual(["PYG", "USD"]);
  });
});

describe("countries", () => {
  it("flag emoji", () => { expect(flag("PY")).toBe("🇵🇾"); });
  it("region must belong to country", () => {
    expect(listingDraftSchema.safeParse({ ...baseDraft, region: "Córdoba" }).success).toBe(false);
  });
});

describe("reputation", () => {
  it("one 5-star rating does not beat a long 4.8 track record", () => {
    const one = summarize([5]);
    const many = summarize(Array(80).fill(4.8));
    expect(many.score).toBeGreaterThan(one.score);
    expect(one.badge).toBe("nuevo");
  });
  it("flags poor reputation", () => {
    expect(summarize([2, 3, 2, 3]).badge).toBe("en_observacion");
  });
  it("double-blind: hidden until counterpart rates or 14 days", () => {
    const createdAt = new Date("2026-01-01");
    expect(isRatingVisible({ createdAt, counterpartRated: false, now: new Date("2026-01-05") })).toBe(false);
    expect(isRatingVisible({ createdAt, counterpartRated: true, now: new Date("2026-01-05") })).toBe(true);
    expect(isRatingVisible({ createdAt, counterpartRated: false, now: new Date("2026-01-20") })).toBe(true);
  });
});

const baseDraft = {
    title: "iPhone 13 128GB azul",
    description: "Impecable, siempre con funda y vidrio templado. Batería original.",
    category: "celulares" as const,
    subcategory: "celulares-y-smartphones",
    condition: "excelente" as const,
    priceAmount: 3_500_000,
    currency: "PYG" as const,
    country: "PY" as const,
    region: "Asunción",
    city: "Asunción",
    photoCount: 0,
    attributes: { marca: "Apple", modelo: "iPhone 13", bateria_pct: "88" },
  };
describe("listing draft", () => {
  const base = baseDraft;
  it("accepts a complete phone listing", () => {
    expect(listingDraftSchema.safeParse(base).success).toBe(true);
  });
  it("brand and other detail fields are optional", () => {
    expect(listingDraftSchema.safeParse({ ...base, attributes: {} }).success).toBe(true);
  });
  it("short title and empty description are allowed", () => {
    expect(listingDraftSchema.safeParse({ ...base, title: "Bici", description: "" }).success).toBe(true);
  });
  it("subcategory must belong to the category", () => {
    expect(listingDraftSchema.safeParse({ ...base, subcategory: "autos" }).success).toBe(false);
    expect(listingDraftSchema.safeParse({ ...base, subcategory: "" }).success).toBe(false);
  });
  it("category tree has 23 categories with unique sub slugs", () => {
    expect(CATEGORY_SLUGS.length).toBe(23);
    for (const c of Object.values(CATEGORIES)) expect(new Set(c.subs.map((x) => x.slug)).size).toBe(c.subs.length);
  });
  it("category must be chosen", () => {
    expect(listingDraftSchema.safeParse({ ...base, category: "" }).success).toBe(false);
  });
  it("rejects a foreign currency in Paraguay", () => {
    expect(listingDraftSchema.safeParse({ ...base, currency: "BRL" }).success).toBe(false);
  });
});

import { riskFlags } from "./safety";
describe("detector de estafas", () => {
  it("detecta códigos, links, teléfonos y pagos por adelantado", () => {
    expect(riskFlags("Pasame el código que te llegó por SMS")).toContain("codigo");
    expect(riskFlags("mirá acá https://bit.ly/xx")).toContain("link");
    expect(riskFlags("escribime al 0981 123 456")).toEqual(expect.arrayContaining(["telefono", "fuera_plataforma"]));
    expect(riskFlags("necesito que me pagues una seña por adelantado")).toContain("pago_adelantado");
    expect(riskFlags("pasame el número de tarjeta y el cvv")).toContain("datos_sensibles");
  });
  it("no molesta en mensajes normales", () => {
    expect(riskFlags("Hola, ¿sigue disponible? ¿Dónde se puede retirar?")).toEqual([]);
    expect(riskFlags("Te paso el presupuesto mañana, incluye materiales")).toEqual([]);
    expect(riskFlags("¿Aceptás transferencia al retirar?")).toEqual([]);
  });
});
