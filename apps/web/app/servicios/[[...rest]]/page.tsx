import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { COUNTRIES } from "@michimi/core";
import { SeoListing } from "@/components/SeoListing";
import { SEO_COUNTRY, regionFromSlug, subFromSlug, serviceUrl } from "@/lib/seo";

type P = Promise<{ rest?: string[] }>;
function resolve(rest: string[] = []) {
  const [a, b] = rest;
  if (rest.length > 2) return null;
  const sub = subFromSlug("servicios", a);
  const region = sub ? regionFromSlug(b) : regionFromSlug(a);
  if (a && !sub && !region) return null;
  if (b && !region) return null;
  if (!sub && b) return null;
  return { sub, region };
}
export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const r = resolve((await params).rest);
  if (!r) return {};
  const what = r.sub?.label ?? "Servicios y profesionales";
  const where = r.region ?? COUNTRIES[SEO_COUNTRY].name;
  const title = `${what} en ${where}`;
  const description = `${what} en ${where}: compará profesionales con reputación verificada, pedí presupuesto gratis por chat y pagá cuando el trabajo esté hecho. Michimi.`;
  return { title, description, alternates: { canonical: serviceUrl(r.sub?.slug, r.region ?? undefined) }, openGraph: { title, description } };
}
export default async function Page({ params }: { params: P }) {
  const r = resolve((await params).rest);
  if (!r) notFound();
  const where = r.region ?? COUNTRIES[SEO_COUNTRY].name;
  return <SeoListing kind="servicio" cat="servicios" sub={r.sub} region={r.region} heading={`${r.sub?.label ?? "Servicios y profesionales"} en ${where}`} path={serviceUrl(r.sub?.slug, r.region ?? undefined)} />;
}
