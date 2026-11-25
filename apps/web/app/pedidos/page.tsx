import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORIES, COUNTRIES, subcategoryLabel } from "@michimi/core";
import { supabaseServer } from "@/lib/supabase/server";
import { currentCountry } from "@/lib/country";

export const metadata: Metadata = { title: "Pedidos de presupuesto" };

export default async function Pedidos({ searchParams }: { searchParams: Promise<{ region?: string; sub?: string }> }) {
  const sp = await searchParams;
  const country = await currentCountry();
  const c = COUNTRIES[country];
  const supabase = await supabaseServer();
  const { data: u } = await supabase.auth.getUser();
  let q = supabase.from("service_requests").select("id,title,subcategory,region,city,when_text,created_at,client_id").eq("country", country).eq("status", "abierto").order("created_at", { ascending: false }).limit(60);
  if (sp.region) q = q.eq("region", sp.region);
  if (sp.sub) q = q.eq("subcategory", sp.sub);
  const [{ data }, { data: mine }] = await Promise.all([
    q,
    u.user ? supabase.from("service_requests").select("id,title,status,created_at").eq("client_id", u.user.id).order("created_at", { ascending: false }) : Promise.resolve({ data: null }),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Pedidos de presupuesto</h1>
          <p className="text-ink-soft">Personas que necesitan un profesional. Mandá tu presupuesto por chat.</p>
        </div>
        <Link href="/pedidos/nuevo" className="btn-primary">Pedir presupuestos</Link>
      </header>

      {mine && mine.length > 0 && (
        <section className="rounded-card border border-line bg-card p-4">
          <h2 className="font-semibold">Mis pedidos</h2>
          <ul className="mt-2 divide-y divide-line">
            {mine.map((r) => (
              <li key={r.id}><Link href={`/pedidos/${r.id}`} className="flex justify-between py-2 hover:underline"><span>{r.title}</span><span className="text-sm text-ink-soft">{r.status}</span></Link></li>
            ))}
          </ul>
        </section>
      )}

      <form className="flex flex-wrap gap-2">
        <select name="region" defaultValue={sp.region ?? ""} className="field w-auto" aria-label={c.regionLabel}>
          <option value="">Todo {c.name}</option>
          {c.regions.map((r) => <option key={r}>{r}</option>)}
        </select>
        <select name="sub" defaultValue={sp.sub ?? ""} className="field w-auto" aria-label="Tipo de servicio">
          <option value="">Todos los servicios</option>
          {CATEGORIES.servicios.subs.map((x) => <option key={x.slug} value={x.slug}>{x.label}</option>)}
        </select>
        <button className="btn-ghost">Filtrar</button>
      </form>

      {data?.length === 0 && <p className="rounded-card border border-dashed border-line p-10 text-center text-ink-soft">No hay pedidos abiertos con esos filtros.</p>}
      <ul className="grid gap-3 sm:grid-cols-2">
        {data?.map((r) => (
          <li key={r.id}>
            <Link href={`/pedidos/${r.id}`} className="block rounded-card border border-line bg-card p-4 hover:border-ink">
              <p className="text-sm text-ink-soft">{subcategoryLabel("servicios", r.subcategory) ?? "Servicio"} · {r.city}, {r.region}</p>
              <p className="mt-1 font-semibold">{r.title}</p>
              {r.when_text && <p className="text-sm">Para: {r.when_text}</p>}
              <p className="mt-1 text-xs text-ink-soft">{new Date(r.created_at).toLocaleDateString("es-PY")}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
