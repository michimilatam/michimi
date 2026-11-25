import Link from "next/link";
import { COUNTRIES, CATEGORIES, formatMoney, type CategorySlug, type CurrencyCode } from "@michimi/core";
import { supabaseServer } from "@/lib/supabase/server";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { ServiceCard, type ServiceCardData } from "@/components/ServiceCard";
import { SEO_COUNTRY, SITE, productUrl, serviceUrl } from "@/lib/seo";
import { photoUrl } from "@/lib/photo";

/** Página indexable: "Electricistas en Asunción", "Autos en Central", etc. */
export async function SeoListing(p: {
  kind: "producto" | "servicio"; cat: CategorySlug; sub: { slug: string; label: string } | null; region: string | null;
  heading: string; path: string;
}) {
  const supabase = await supabaseServer();
  const svc = p.kind === "servicio";
  let q = supabase.from("listings")
    .select("id,title,price_amount,price_type,currency,condition,city,region,status,seller_id,coverage_regions,subcategory,listing_photos(path,position),seller:profiles!listings_seller_id_fkey(display_name,avatar_url,profession,professional_status)")
    .eq("country", SEO_COUNTRY).eq("kind", p.kind).in("status", ["activa", "reservada"])
    .order("created_at", { ascending: false }).limit(60);
  if (!svc) q = q.eq("category", p.cat);
  if (p.sub) q = q.eq("subcategory", p.sub.slug);
  if (p.region) q = svc ? q.or(`region.eq.${p.region},coverage_regions.cs.{"${p.region}"}`) : q.eq("region", p.region);
  const { data } = await q;
  const rows = data ?? [];

  const rep = new Map<string, { avg: number | null; count: number; done: number }>();
  if (svc && rows.length) {
    const { data: reps } = await supabase.from("user_reputation").select("user_id,seller_avg,seller_count,sales_completed").in("user_id", [...new Set(rows.map((l) => l.seller_id as string))]);
    for (const r of reps ?? []) rep.set(r.user_id, { avg: r.seller_avg ? Number(r.seller_avg) : null, count: Number(r.seller_count), done: Number(r.sales_completed) });
  }

  const c = COUNTRIES[SEO_COUNTRY];
  const where = p.region ?? c.name;
  const jsonLd = {
    "@context": "https://schema.org", "@type": "ItemList", name: `${p.heading}`, url: `${SITE}${p.path}`,
    numberOfItems: rows.length,
    itemListElement: rows.slice(0, 30).map((l, i) => ({
      "@type": "ListItem", position: i + 1, url: `${SITE}/publicacion/${l.id}`, name: l.title,
      ...(l.listing_photos?.[0] ? { image: photoUrl(l.listing_photos[0].path) } : {}),
    })),
  };
  const siblings = svc
    ? (p.sub ? c.regions.map((r) => ({ href: serviceUrl(p.sub!.slug, r), label: `${p.sub!.label} en ${r}` })) : CATEGORIES.servicios.subs.map((s) => ({ href: serviceUrl(s.slug, p.region ?? undefined), label: `${s.label}${p.region ? ` en ${p.region}` : ""}` })))
    : (p.sub ? c.regions.map((r) => ({ href: productUrl(p.cat, p.sub!.slug, r), label: `${p.sub!.label} en ${r}` })) : CATEGORIES[p.cat].subs.map((s) => ({ href: productUrl(p.cat, s.slug, p.region ?? undefined), label: s.label })));
  const minPrice = rows.filter((r) => r.price_amount).sort((a, b) => (a.price_amount ?? 0) - (b.price_amount ?? 0))[0];

  return (
    <div className="space-y-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav aria-label="Ruta" className="text-sm text-ink-soft">
        <Link href="/" className="hover:underline">Inicio</Link> ›{" "}
        {svc ? <Link href="/servicios" className="hover:underline">Servicios</Link> : <Link href={productUrl(p.cat)} className="hover:underline">{CATEGORIES[p.cat].label}</Link>}
        {p.sub && <> › <Link href={svc ? serviceUrl(p.sub.slug) : productUrl(p.cat, p.sub.slug)} className="hover:underline">{p.sub.label}</Link></>}
        {p.region && <> › {p.region}</>}
      </nav>
      <header>
        <h1 className="text-2xl font-bold">{p.heading}</h1>
        <p className="text-[15px] text-ink-soft">
          {rows.length ? `${rows.length} ${svc ? "profesionales" : "publicaciones"} en ${where}` : `Todavía no hay ${svc ? "profesionales" : "publicaciones"} en ${where}.`}
          {minPrice && !svc ? ` · desde ${formatMoney({ amount: minPrice.price_amount!, currency: minPrice.currency as CurrencyCode })}` : ""}
          {svc ? " Pedí presupuesto por chat, mirá su reputación y pagá recién cuando el trabajo esté hecho." : " Comprá directo a personas, con reputación real y entrega con PIN."}
        </p>
      </header>
      {!rows.length && (
        <div className="rounded-card border border-dashed border-line p-8 text-center">
          <Link href={svc ? "/pedidos/nuevo" : "/publicar"} className="btn-primary">{svc ? "Pedí presupuestos gratis" : "Publicá gratis"}</Link>
        </div>
      )}
      {svc ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{(rows as unknown as ServiceCardData[]).map((l) => <ServiceCard key={l.id} l={l} rep={rep.get(l.seller_id)} />)}</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{(rows as unknown as ListingCardData[]).map((l) => <ListingCard key={l.id} l={l} />)}</div>
      )}
      <section className="pt-4">
        <h2 className="mb-2 text-sm font-semibold text-ink-soft">{p.sub ? "En otros departamentos" : "Ver también"}</h2>
        <ul className="flex flex-wrap gap-2">
          {siblings.map((s) => <li key={s.href}><Link href={s.href} className="inline-block rounded-full border border-line bg-card px-3 py-1 text-sm hover:border-ink">{s.label}</Link></li>)}
        </ul>
      </section>
    </div>
  );
}
