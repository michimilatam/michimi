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


  return (
    <div className="space-y-3 md:space-y-5">

      {servicios && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-line bg-card px-3 py-2 text-sm">
          <span className="font-semibold">¿Necesitás un profesional?</span>
          <Link href="/pedidos/nuevo" className="font-semibold underline decoration-lima decoration-2 underline-offset-4">Pedí presupuestos gratis</Link>
          <span className="text-ink-soft">·</span>
          <Link href="/pedidos" className="text-ink-soft hover:text-ink hover:underline">Soy profesional: ver pedidos</Link>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-[220px_1fr] md:gap-6">
        <aside>
          <input id="ver-filtros" type="checkbox" className="peer sr-only" />
          <label htmlFor="ver-filtros" className="flex cursor-pointer items-center justify-between rounded-xl border border-line bg-card px-3 py-2 text-sm font-semibold md:hidden">
            Filtros <span className="text-ink-soft" aria-hidden="true">▾</span>
          </label>
          <form className="mt-3 hidden space-y-4 peer-checked:block md:mt-0 md:block">
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
            <button className="btn-ghost w-full">Aplicar filtros</button>
          </form>
        </aside>

        <section>
          {sp.q && <h1 className="mb-3 text-xl font-bold">Resultados para “{sp.q}”</h1>}
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
