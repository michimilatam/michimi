import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CATEGORIES, subcategoryLabel, type CategorySlug } from "@michimi/core";
import { supabaseServer } from "@/lib/supabase/server";
import { StoreBadge } from "@/components/StoreBadge";

export const metadata: Metadata = { title: "Vista previa del producto", robots: { index: false, follow: false } };

type P = {
  store_name: string; slug: string; city: string | null; title: string; description: string | null; price_amount: number | null;
  currency: string; category: string; subcategory: string | null; image_urls: string[]; source_url: string | null;
};

const shopify = (u: string, w: number) => (u.includes("cdn.shopify.com") ? `${u}${u.includes("?") ? "&" : "?"}width=${w}` : u);

export default async function VistaProducto({ params }: { params: Promise<{ code: string; id: string }> }) {
  const { code, id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await supabaseServer();
  const { data } = await supabase.rpc("store_preview_product", { p_code: code, p_id: id });
  const p = (data as P[] | null)?.[0];
  if (!p) notFound();
  const cat = CATEGORIES[p.category as CategorySlug]?.label;
  const sub = subcategoryLabel(p.category, p.subcategory);
  const fotos = p.image_urls ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-ink bg-lima/40 p-3 text-sm">
        <p><b>Vista previa:</b> así se vería este producto publicado. Todavía nadie más lo ve.</p>
        <div className="flex gap-2">
          <Link href={`/reclamar/${code}/vista`} className="btn-ghost h-9 px-4 text-sm">← Toda la tienda</Link>
          <Link href={`/reclamar/${code}`} className="btn-primary h-9 px-4 text-sm">Reclamar mi tienda</Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="grid grid-cols-2 content-start gap-2">
          {!fotos.length && <div className="col-span-2 flex aspect-[4/3] items-center justify-center rounded-xl bg-line text-ink-soft">Sin fotos</div>}
          {fotos.map((u, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={u} src={shopify(u, i === 0 ? 1000 : 500)} alt={`${p.title} — foto ${i + 1}`} loading={i < 2 ? "eager" : "lazy"}
              className={`w-full rounded-xl object-cover ${i === 0 ? "col-span-2 aspect-[4/3]" : "aspect-square"}`} />
          ))}
        </div>

        <div className="space-y-5">
          <div>
            <p className="text-sm text-ink-soft">{cat}{sub ? ` › ${sub}` : ""} · {p.city ?? "Paraguay"}</p>
            <h1 className="text-2xl font-bold">{p.title}</h1>
            <p className="mt-2 text-3xl font-bold tabular-nums">{p.price_amount ? `Gs. ${p.price_amount.toLocaleString("es-PY")}` : "Precio a confirmar"}</p>
            <p className="mt-1 text-sm"><span className="rounded-full bg-ink px-2 py-0.5 text-lima">Nuevo</span><span className="ml-2 text-ink-soft">Disponibilidad confirmada hoy</span></p>
          </div>

          <section className="rounded-card border border-line bg-card p-4 text-[15px]">
            <h2 className="font-semibold">Ficha</h2>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
              <dt className="text-ink-soft">Fotos</dt><dd>{fotos.length} ángulos</dd>
              <dt className="text-ink-soft">Entrega</dt><dd>Protegida con PIN</dd>
            </dl>
          </section>

          <div className="grid grid-cols-2 gap-2" aria-disabled="true">
            <span className="btn-primary pointer-events-none opacity-60">Consultar</span>
            <span className="btn-ghost pointer-events-none opacity-60">Hacer oferta</span>
            <p className="col-span-2 text-xs text-ink-soft">Los botones se activan cuando publicás el producto. Los compradores te escriben por el chat de Michimi.</p>
          </div>

          <Link href={`/reclamar/${code}/vista`} className="flex items-center gap-3 rounded-card border border-line bg-card p-4">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-ink text-lg font-bold text-lima">{p.store_name.slice(0, 1)}</div>
            <div>
              <p className="flex items-center gap-2 font-semibold">{p.store_name}<StoreBadge label /></p>
              <p className="text-sm text-ink-soft">michimi.com/tienda/{p.slug}</p>
            </div>
          </Link>

          {p.description && (
            <section>
              <h2 className="mb-1 font-semibold">Descripción</h2>
              <p className="whitespace-pre-line text-[15px]">{p.description}</p>
            </section>
          )}
          {p.source_url && <p className="text-xs text-ink-soft">Datos tomados de <a href={p.source_url} target="_blank" rel="noopener noreferrer nofollow" className="underline">su web</a>. Al reclamar la tienda los podés corregir.</p>}
        </div>
      </div>
    </div>
  );
}
