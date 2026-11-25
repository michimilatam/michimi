import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { CATEGORIES, COUNTRIES, type CategorySlug } from "@michimi/core";
import { SITE, SEO_COUNTRY, productUrl, serviceUrl } from "@/lib/seo";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data } = await supabase.from("listings").select("id,updated_at:availability_confirmed_at").in("status", ["activa", "reservada"]).order("created_at", { ascending: false }).limit(20000);
  const regions = COUNTRIES[SEO_COUNTRY].regions;
  const out: MetadataRoute.Sitemap = [
    { url: SITE, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE}/servicios`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE}/pedidos`, changeFrequency: "hourly", priority: 0.6 },
  ];
  for (const s of CATEGORIES.servicios.subs) {
    out.push({ url: SITE + serviceUrl(s.slug), changeFrequency: "daily", priority: 0.8 });
    for (const r of regions) out.push({ url: SITE + serviceUrl(s.slug, r), changeFrequency: "daily", priority: 0.7 });
  }
  for (const r of regions) out.push({ url: SITE + serviceUrl(undefined, r), changeFrequency: "daily", priority: 0.7 });
  for (const cat of Object.keys(CATEGORIES) as CategorySlug[]) {
    if (cat === "servicios") continue;
    out.push({ url: SITE + productUrl(cat), changeFrequency: "daily", priority: 0.8 });
    for (const r of regions) out.push({ url: SITE + productUrl(cat, undefined, r), changeFrequency: "daily", priority: 0.6 });
    for (const s of CATEGORIES[cat].subs) out.push({ url: SITE + productUrl(cat, s.slug), changeFrequency: "daily", priority: 0.6 });
  }
  for (const l of data ?? []) out.push({ url: `${SITE}/publicacion/${l.id}`, lastModified: l.updated_at ?? undefined, changeFrequency: "daily", priority: 0.7 });
  return out;
}
