import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CATEGORIES, CONDITIONS, subcategoryLabel, type CategorySlug, type Condition } from "@michimi/core";
import { supabaseServer } from "@/lib/supabase/server";
import { SearchRow } from "./SearchRow";

export const metadata: Metadata = { title: "Búsquedas guardadas" };

export default async function Busquedas() {
  const supabase = await supabaseServer();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) redirect("/ingresar?next=/busquedas");
  const [{ data }, { data: counts }] = await Promise.all([
    supabase.from("saved_searches").select("*").eq("user_id", u.user.id).order("created_at", { ascending: false }),
    supabase.rpc("saved_search_counts"),
  ]);
  const n = new Map(((counts as { id: string; nuevos: number }[] | null) ?? []).map((c) => [c.id, Number(c.nuevos)]));

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Búsquedas guardadas</h1>
      <p className="text-sm text-ink-soft">Te mostramos cuántas publicaciones nuevas aparecieron desde la última vez que entraste a cada una.</p>
      {!data?.length && <p className="rounded-card border border-dashed border-line p-10 text-center text-ink-soft">Filtrá o buscá algo en la portada y tocá “Guardar búsqueda”.</p>}
      <ul className="divide-y divide-line rounded-card border border-line bg-card">
        {data?.map((s) => {
          const f = s.filters as Record<string, string>;
          const servicio = f.tipo === "servicio";
          const parts = [
            servicio ? "Servicios" : "Productos",
            s.query && `“${s.query}”`,
            f.cat && CATEGORIES[f.cat as CategorySlug]?.label,
            f.sub && subcategoryLabel(servicio ? "servicios" : f.cat, f.sub),
            f.region, f.cond && CONDITIONS[f.cond as Condition], f.cur,
          ].filter(Boolean) as string[];
          const qs = new URLSearchParams({ ...(servicio ? { tipo: "servicios" } : {}), ...(s.query ? { q: s.query } : {}), ...Object.fromEntries(Object.entries(f).filter(([k]) => k !== "tipo")) });
          return <SearchRow key={s.id} id={s.id} label={parts.join(" · ")} href={`/?${qs}`} nuevos={n.get(s.id) ?? 0} />;
        })}
      </ul>
    </div>
  );
}
