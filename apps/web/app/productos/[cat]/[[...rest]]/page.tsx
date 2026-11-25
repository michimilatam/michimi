import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CATEGORIES, COUNTRIES, type CategorySlug } from "@michimi/core";
import { SeoListing } from "@/components/SeoListing";
import { SEO_COUNTRY, regionFromSlug, subFromSlug, productUrl } from "@/lib/seo";

type P = Promise<{ cat: string; rest?: string[] }>;
function resolve(catSlug: string, rest: string[] = []) {
  if (!(catSlug in CATEGORIES) || catSlug === "servicios") return null;
  const cat = catSlug as CategorySlug;
  const [a, b] = rest;
  if (rest.length > 2) return null;
  if (a === "en") { const region = regionFromSlug(b); return region ? { cat, sub: null, region } : null; }
  const sub = subFromSlug(cat, a);
  if (a && !sub) return null;
  const region = regionFromSlug(b);
  if (b && !region) return null;
  return { cat, sub, region };
}
export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const { cat, rest } = await params;
  const r = resolve(cat, rest);
  if (!r) return {};
  const what = r.sub?.label ?? CATEGORIES[r.cat].label;
  const where = r.region ?? COUNTRIES[SEO_COUNTRY].name;
  const title = `${what} en ${where} – usados y nuevos`;
  const description = `${what} en venta en ${where}. Comprá directo a personas, con reputación real, ofertas por chat y entrega con PIN. Publicar es gratis en Michimi.`;
  return { title, description, alternates: { canonical: productUrl(r.cat, r.sub?.slug, r.region ?? undefined) }, openGraph: { title, description } };
}
export default async function Page({ params }: { params: P }) {
  const { cat, rest } = await params;
  const r = resolve(cat, rest);
  if (!r) notFound();
  const where = r.region ?? COUNTRIES[SEO_COUNTRY].name;
  return <SeoListing kind="producto" cat={r.cat} sub={r.sub} region={r.region} heading={`${r.sub?.label ?? CATEGORIES[r.cat].label} en ${where}`} path={productUrl(r.cat, r.sub?.slug, r.region ?? undefined)} />;
}
