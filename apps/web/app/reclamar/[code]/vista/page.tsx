import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CATEGORIES } from "@michimi/core";
import { supabaseServer } from "@/lib/supabase/server";
import { StoreBadge } from "@/components/StoreBadge";

export const metadata: Metadata = { title: "Vista previa de tu tienda", robots: { index: false, follow: false } };

type Row = { name: string; slug: string; city: string | null; website: string | null; instagram: string | null; phone: string | null;
  id: string | null; title: string | null; price_amount: number | null; currency: string | null; subcategory: string | null; image: string | null };

const SUB = new Map(Object.values(CATEGORIES).flatMap((c) => c.subs.map((s) => [s.slug, s.label] as const)));

export default async function Vista({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ s?: string }> }) {
  const { code } = await params;
  const { s } = await searchParams;
  const supabase = await supabaseServer();
  const { data } = await supabase.rpc("store_preview", { p_code: code });
  const rows = (data ?? []) as Row[];
  if (!rows.length) notFound();
  const h = rows[0]!;
  const all = rows.filter((r) => r.id);
  const counts = new Map<string, number>();
  for (const r of all) counts.set(r.subcategory ?? "decoracion", (counts.get(r.subcategory ?? "decoracion") ?? 0) + 1);
  const items = s ? all.filter((r) => r.subcategory === s) : all;
  const web = h.website ? h.website.replace(/^https?:\/\//, "") : null;

  return (
    <div className="space-y-6">
      <div className="rounded-card border border-ink bg-lima/40 p-4 text-[15px]">
        <p className="font-semibold">Vista previa: así quedaría tu tienda en Michimi.</p>
        <p>Todavía no está publicada y nadie más la ve. Los productos salen de tu web; al reclamarla revisás precios y descripciones y publicás los que quieras.</p>
        <Link href={`/reclamar/${code}`} className="btn-primary mt-3 w-fit">Reclamar mi tienda gratis</Link>
      </div>

      <header className="flex items-center gap-4">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-ink text-2xl font-bold text-lima">{h.name.slice(0, 1)}</div>
        <div>
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold">{h.name}<StoreBadge label /></h1>
          <p className="text-sm text-ink-soft">{h.city ?? "Paraguay"} · michimi.com/tienda/{h.slug}</p>
          <p className="flex flex-wrap gap-x-4 text-sm">
            {web && <span>{web}</span>}
            {h.instagram && <span>@{h.instagram.replace(/^@/, "")}</span>}
            {h.phone && <span>{h.phone}</span>}
          </p>
        </div>
      </header>

      {all.length > 0 && (
        <nav className="flex flex-wrap gap-2">
          <Link href={`/reclamar/${code}/vista`} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${!s ? "bg-ink text-lima" : "border border-line bg-card"}`}>Todo ({all.length})</Link>
          {[...counts].sort((a, b) => b[1] - a[1]).map(([k, n]) => (
            <Link key={k} href={`/reclamar/${code}/vista?s=${k}`} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${s === k ? "bg-ink text-lima" : "border border-line bg-card"}`}>{SUB.get(k) ?? k} ({n})</Link>
          ))}
        </nav>
      )}

      {!all.length ? (
        <p className="rounded-card border border-dashed border-line p-8 text-center text-ink-soft">Todavía no cargamos productos. Al reclamar la tienda podés subirlos vos o mandarnos tu lista a comercios@michimi.com y los cargamos por vos.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {items.map((r) => (
            <div key={r.id} className="overflow-hidden rounded-card border border-line bg-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {r.image && <img src={r.image.includes("cdn.shopify.com") ? `${r.image}${r.image.includes("?") ? "&" : "?"}width=480` : r.image} alt="" loading="lazy" className="aspect-square w-full object-cover" />}
              <div className="space-y-0.5 p-2.5">
                <p className="font-bold">{r.price_amount ? `Gs. ${r.price_amount.toLocaleString("es-PY")}` : "Precio a confirmar"}</p>
                <p className="line-clamp-2 text-sm">{r.title}</p>
                <p className="text-xs text-ink-soft">Nuevo · {h.city ?? "Paraguay"}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
