import Link from "next/link";
import { CATEGORIES, CONDITIONS, subcategoryLabel, type CategorySlug, COUNTRIES, CURRENCIES, currenciesFor, flag } from "@michimi/core";
import { supabaseServer } from "@/lib/supabase/server";
import { currentCountry } from "@/lib/country";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { ServiceCard, type ServiceCardData } from "@/components/ServiceCard";

type SP = Promise<{ q?: string; cat?: string; sub?: string; cond?: string; cur?: string; orden?: string; region?: string; tipo?: string }>;

export default async function Home({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const servicios = sp.tipo === "servicios";
  const country = await currentCountry();
  const c = COUNTRIES[country];
  const supabase = await supabaseServer();

  let query = supabase
    .from("listings")
    .select("id,title,price_amount,price_type,currency,condition,city,region,status,seller_id,coverage_regions,subcategory,listing_photos(path,position),seller:profiles!listings_seller_id_fkey(display_name,avatar_url,profession,professional_status)")
    .eq("country", country)
    .eq("kind", servicios ? "servicio" : "producto")
    .in("status", ["activa", "reservada"])
    .limit(48);
  if (sp.q) query = query.textSearch("search", sp.q, { type: "websearch", config: "spanish" });
  if (sp.region) query = servicios ? query.or(`region.eq.${sp.region},coverage_regions.cs.{"${sp.region}"}`) : query.eq("region", sp.region);
  const cat = servicios ? "servicios" : sp.cat;
  if (cat && !servicios) query = query.eq("category", cat);
  if (cat && sp.sub) query = query.eq("subcategory", sp.sub);
  if (!servicios && sp.cond) query = query.eq("condition", sp.cond);
  if (sp.cur) query = query.eq("currency", sp.cur);
  query = sp.orden === "precio" ? query.order("price_amount", { nullsFirst: false }) : query.order("created_at", { ascending: false });
  const { data, error } = await query;

  // Reputación de los profesionales (para las tarjetas de servicio)
  const rep = new Map<string, { avg: number | null; count: number; done: number }>();
  if (servicios && data?.length) {
    const ids = [...new Set(data.map((l) => l.seller_id as string))];
    const { data: reps } = await supabase.from("user_reputation").select("user_id,seller_avg,seller_count,sales_completed").in("user_id", ids);
    for (const r of reps ?? []) rep.set(r.user_id, { avg: r.seller_avg ? Number(r.seller_avg) : null, count: Number(r.seller_count), done: Number(r.sales_completed) });
  }

  const heading = sp.q
    ? <>Resultados para “{sp.q}”</>
    : servicios
      ? <><span aria-hidden="true">{flag(country)}</span> {subcategoryLabel("servicios", sp.sub) ?? "Servicios y profesionales"} en {sp.region ?? c.name}</>
      : <><span aria-hidden="true">{flag(country)}</span> {subcategoryLabel(sp.cat, sp.sub) ?? (sp.cat && sp.cat in CATEGORIES ? CATEGORIES[sp.cat as CategorySlug].label : "Publicaciones")} en {sp.region ?? c.name}</>;

  return (
    <div className="space-y-5">

      {servicios && (
        <div className="grid gap-3 rounded-card bg-ink p-5 text-white sm:grid-cols-[1fr_auto_auto] sm:items-center">
          <div>
            <p className="text-lg font-bold">¿Necesitás un profesional?</p>
            <p className="text-sm text-white/75">Contá qué necesitás y los profesionales de tu zona te mandan presupuestos. Gratis y sin compromiso.</p>
          </div>
          <Link href="/pedidos/nuevo" className="btn-primary">Pedir presupuestos</Link>
          <Link href="/pedidos" className="btn-base border border-white/30 text-white hover:border-lima">Soy profesional: ver pedidos</Link>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <aside>
          <form className="space-y-4">
            {servicios && <input type="hidden" name="tipo" value="servicios" />}
            {sp.q && <input type="hidden" name="q" value={sp.q} />}
            <div>
              <label className="label" htmlFor="region">{c.regionLabel}</label>
              <select id="region" name="region" defaultValue={sp.region ?? ""} className="field">
                <option value="">Todo {c.name}</option>
                {c.regions.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            {servicios ? (
              <div>
                <label className="label" htmlFor="sub">Tipo de servicio</label>
                <select id="sub" name="sub" defaultValue={sp.sub ?? ""} className="field">
                  <option value="">Todos</option>
                  {CATEGORIES.servicios.subs.map((x) => <option key={x.slug} value={x.slug}>{x.label}</option>)}
                </select>
              </div>
            ) : (
              <>
                <div>
                  <label className="label" htmlFor="cat">Categoría</label>
                  <select id="cat" name="cat" defaultValue={sp.cat ?? ""} className="field">
                    <option value="">Todas</option>
                    {Object.entries(CATEGORIES).filter(([k]) => k !== "servicios").map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                {sp.cat && sp.cat in CATEGORIES && (
                  <div>
                    <label className="label" htmlFor="sub">Subcategoría</label>
                    <select id="sub" name="sub" defaultValue={sp.sub ?? ""} className="field">
                      <option value="">Todas</option>
                      {CATEGORIES[sp.cat as CategorySlug].subs.map((x) => <option key={x.slug} value={x.slug}>{x.label}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="label" htmlFor="cond">Estado</label>
                  <select id="cond" name="cond" defaultValue={sp.cond ?? ""} className="field">
                    <option value="">Cualquiera</option>
                    {Object.entries(CONDITIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </>
            )}
            <div>
              <label className="label" htmlFor="cur">Moneda</label>
              <select id="cur" name="cur" defaultValue={sp.cur ?? ""} className="field">
                <option value="">{CURRENCIES[c.local].symbol} y US$</option>
                {currenciesFor(country).map((k) => <option key={k} value={k}>{CURRENCIES[k].label} ({CURRENCIES[k].symbol})</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="orden">Ordenar</label>
              <select id="orden" name="orden" defaultValue={sp.orden ?? ""} className="field">
                <option value="">Más recientes</option>
                <option value="precio">Menor precio</option>
              </select>
            </div>
            <button className="btn-ghost w-full">Aplicar</button>
          </form>
        </aside>

        <section>
          <h1 className="mb-4 text-2xl font-bold">{heading}</h1>
          {error && <p className="text-bad">No pudimos cargar las publicaciones. Probá de nuevo en un momento.</p>}
          {data && data.length === 0 && (
            <div className="rounded-card border border-dashed border-line p-10 text-center">
              <p className="text-lg font-semibold">Todavía no hay nada con esos filtros.</p>
              <p className="mt-1 text-ink-soft">{servicios ? "¿Sos profesional? Ofrecé tu servicio gratis." : "Sé el primero en publicar: vender en Michimi es gratis."}</p>
              <Link href={servicios ? "/publicar?tipo=servicio" : "/publicar"} className="btn-primary mt-4">{servicios ? "Ofrecer un servicio" : "Publicar un producto"}</Link>
            </div>
          )}
          {servicios ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(data as unknown as ServiceCardData[] | null)?.map((l) => <ServiceCard key={l.id} l={l} rep={rep.get(l.seller_id)} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {(data as unknown as ListingCardData[] | null)?.map((l) => <ListingCard key={l.id} l={l} />)}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
