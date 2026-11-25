import { describe, expect, it } from "vitest";
import { formatMoney, parseMoney, summarize, isRatingVisible, listingDraftSchema, currenciesFor } from "./index";

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

describe("listing draft", () => {
  const base = {
    title: "iPhone 13 128GB azul",
    description: "Impecable, siempre con funda y vidrio templado. Batería original.",
    category: "celulares" as const,
    condition: "excelente" as const,
    priceAmount: 3_500_000,
    currency: "PYG" as const,
    country: "PY" as const,
    city: "Asunción",
    photoCount: 4,
    attributes: { marca: "Apple", modelo: "iPhone 13", bateria_pct: "88" },
  };
  it("accepts a complete phone listing", () => {
    expect(listingDraftSchema.safeParse(base).success).toBe(true);
  });
  it("requires category fields", () => {
    const r = listingDraftSchema.safeParse({ ...base, attributes: { marca: "Apple" } });
    expect(r.success).toBe(false);
  });
  it("rejects a foreign currency in Paraguay", () => {
    expect(listingDraftSchema.safeParse({ ...base, currency: "BRL" }).success).toBe(false);
  });
});
