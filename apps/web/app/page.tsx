import Link from "next/link";
import { CATEGORIES, CONDITIONS } from "@michimi/core";
import { supabaseServer } from "@/lib/supabase/server";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";

type SP = Promise<{ q?: string; cat?: string; cond?: string; cur?: string; orden?: string }>;

export default async function Home({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const supabase = await supabaseServer();
  let query = supabase
    .from("listings")
    .select("id,title,price_amount,currency,condition,city,status,listing_photos(path,position)")
    .eq("country", "PY")
    .in("status", ["activa", "reservada"])
    .limit(48);
  if (sp.q) query = query.textSearch("search", sp.q, { type: "websearch", config: "spanish" });
  if (sp.cat) query = query.eq("category", sp.cat);
  if (sp.cond) query = query.eq("condition", sp.cond);
  if (sp.cur) query = query.eq("currency", sp.cur);
  query = sp.orden === "precio" ? query.order("price_amount") : query.order("created_at", { ascending: false });
  const { data, error } = await query;

  return (
    <div className="grid gap-6 md:grid-cols-[220px_1fr]">
      <aside>
        <form className="space-y-4">
          {sp.q && <input type="hidden" name="q" value={sp.q} />}
          <div>
            <label className="label" htmlFor="cat">Categoría</label>
            <select id="cat" name="cat" defaultValue={sp.cat ?? ""} className="field">
              <option value="">Todas</option>
              {Object.entries(CATEGORIES).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
            </select>
          </div>
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
              <option value="">₲ y US$</option>
              <option value="PYG">Guaraníes (₲)</option>
              <option value="USD">Dólares (US$)</option>
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
          {sp.q ? <>Resultados para “{sp.q}”</> : "Publicaciones en Paraguay"}
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
