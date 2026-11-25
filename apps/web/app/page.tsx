import Link from "next/link";
import { CATEGORIES, CONDITIONS, subcategoryLabel, type CategorySlug, COUNTRIES, CURRENCIES, currenciesFor, flag } from "@michimi/core";
import { supabaseServer } from "@/lib/supabase/server";
import { currentCountry } from "@/lib/country";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";

type SP = Promise<{ q?: string; cat?: string; sub?: string; cond?: string; cur?: string; orden?: string; region?: string }>;

export default async function Home({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const country = await currentCountry();
  const c = COUNTRIES[country];
  const supabase = await supabaseServer();
  let query = supabase
    .from("listings")
    .select("id,title,price_amount,currency,condition,city,region,status,listing_photos(path,position)")
    .eq("country", country)
    .in("status", ["activa", "reservada"])
    .limit(48);
  if (sp.q) query = query.textSearch("search", sp.q, { type: "websearch", config: "spanish" });
  if (sp.region) query = query.eq("region", sp.region);
  if (sp.cat) query = query.eq("category", sp.cat);
  if (sp.cat && sp.sub) query = query.eq("subcategory", sp.sub);
  if (sp.cond) query = query.eq("condition", sp.cond);
  if (sp.cur) query = query.eq("currency", sp.cur);
  query = sp.orden === "precio" ? query.order("price_amount") : query.order("created_at", { ascending: false });
  const { data, error } = await query;
  const local = c.local;

  return (
    <div className="grid gap-6 md:grid-cols-[220px_1fr]">
      <aside>
        <form className="space-y-4">
          {sp.q && <input type="hidden" name="q" value={sp.q} />}
          <div>
            <label className="label" htmlFor="region">{c.regionLabel}</label>
            <select id="region" name="region" defaultValue={sp.region ?? ""} className="field">
              <option value="">Todo {c.name}</option>
              {c.regions.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="cat">Categoría</label>
            <select id="cat" name="cat" defaultValue={sp.cat ?? ""} className="field">
              <option value="">Todas</option>
              {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
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
          <div>
            <label className="label" htmlFor="cur">Moneda</label>
            <select id="cur" name="cur" defaultValue={sp.cur ?? ""} className="field">
              <option value="">{CURRENCIES[local].symbol} y US$</option>
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
        <h1 className="mb-4 text-2xl font-bold">
          {sp.q ? <>Resultados para “{sp.q}”</> : <><span aria-hidden="true">{flag(country)}</span> {subcategoryLabel(sp.cat, sp.sub) ?? (sp.cat && sp.cat in CATEGORIES ? CATEGORIES[sp.cat as CategorySlug].label : "Publicaciones")} en {sp.region ?? c.name}</>}
        </h1>
        {error && <p className="text-bad">No pudimos cargar las publicaciones. Probá de nuevo en un momento.</p>}
        {data && data.length === 0 && (
          <div className="rounded-card border border-dashed border-line p-10 text-center">
            <p className="text-lg font-semibold">Todavía no hay nada con esos filtros.</p>
            <p className="mt-1 text-ink-soft">Sé el primero en publicar: vender en Michimi es gratis.</p>
            <Link href="/publicar" className="btn-primary mt-4">Publicar un producto</Link>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {(data as ListingCardData[] | null)?.map((l) => <ListingCard key={l.id} l={l} />)}
        </div>
      </section>
    </div>
  );
}
