"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES } from "@michimi/core";
import { supabaseBrowser } from "@/lib/supabase/client";
import { prepareImage, makeThumb } from "@/lib/image";

export type Draft = {
  id: string; title: string; description: string | null; price_amount: number | null; currency: string;
  category: string; subcategory: string | null; image_urls: string[]; source_url: string | null;
};

const SUBS = CATEGORIES.muebles.subs;
const fmt = (n: number | null) => (n ? n.toLocaleString("es-PY") : "");

export function CatalogReview({ items, userId, city, region, slug }: { items: Draft[]; userId: string; city: string; region: string | null; slug: string }) {
  const router = useRouter();
  const [rows, setRows] = useState(items.map((d) => ({ ...d, on: !!d.price_amount })));
  const [busy, setBusy] = useState<string | null>(null);
  const [errs, setErrs] = useState<string[]>([]);
  const upd = (id: string, patch: Partial<(typeof rows)[number]>) => setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const chosen = rows.filter((r) => r.on);

  async function publish() {
    const supabase = supabaseBrowser();
    const fails: string[] = [];
    for (const [n, d] of chosen.entries()) {
      setBusy(`Publicando ${n + 1} de ${chosen.length}: ${d.title}`);
      if (!d.price_amount || d.price_amount <= 0) { fails.push(`${d.title}: falta el precio`); continue; }
      let description = (d.description ?? "").trim();
      if (description.length < 20) description = `${d.title}. ${description}`.trim().padEnd(20, ".");
      const { data: l, error } = await supabase.from("listings").insert({
        seller_id: userId, kind: "producto", price_type: "fijo", title: d.title, description: description.slice(0, 4000),
        category: d.category, subcategory: d.subcategory, condition: "nuevo", price_amount: d.price_amount, currency: d.currency,
        country: "PY", region, city, attributes: {},
      }).select("id").single();
      if (error || !l) { fails.push(`${d.title}: ${error?.message ?? "error"}`); continue; }
      let pos = 0;
      for (let i = 0; i < d.image_urls.length; i++) {
        try {
          const r = await fetch(`/api/tienda-foto?id=${d.id}&i=${i}`);
          if (!r.ok) continue;
          const blob = await r.blob();
          const file = await prepareImage(new File([blob], `foto-${i}.jpg`, { type: blob.type }));
          const path = `${userId}/${l.id}/${pos}-${crypto.randomUUID()}.jpg`;
          const up = await supabase.storage.from("listing-photos").upload(path, file, { contentType: "image/jpeg", cacheControl: "31536000" });
          if (up.error) continue;
          let thumb_path: string | null = path.replace(/\.jpg$/, "-thumb.jpg");
          try {
            const t = await makeThumb(file);
            const tu = await supabase.storage.from("listing-photos").upload(thumb_path, t, { contentType: "image/jpeg", cacheControl: "31536000" });
            if (tu.error) thumb_path = null;
          } catch { thumb_path = null; }
          await supabase.from("listing_photos").insert({ listing_id: l.id, path, thumb_path, position: pos });
          pos++;
        } catch { /* foto ilegible: se saltea */ }
      }
      if (!pos) { await supabase.from("listings").update({ status: "pausada" }).eq("id", l.id); fails.push(`${d.title}: no se pudo copiar ninguna foto, quedó pausado`); }
      await supabase.from("store_products").update({ status: "publicado", listing_id: l.id }).eq("id", d.id);
    }
    setErrs(fails);
    setBusy(null);
    if (!fails.length) router.push(`/tienda/${slug}`); else router.refresh();
  }

  async function discard() {
    const ids = chosen.map((r) => r.id);
    if (!ids.length) return;
    await supabaseBrowser().from("store_products").update({ status: "descartado" }).in("id", ids);
    router.refresh();
    setRows((r) => r.filter((x) => !ids.includes(x.id)));
  }

  return (
    <div className="space-y-3">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-card border border-line bg-card p-3">
        <span className="text-sm font-semibold">{chosen.length} de {rows.length} elegidos</span>
        <button type="button" className="text-sm underline" onClick={() => setRows((r) => r.map((x) => ({ ...x, on: true })))}>Elegir todos</button>
        <button type="button" className="text-sm underline" onClick={() => setRows((r) => r.map((x) => ({ ...x, on: false })))}>Ninguno</button>
        <span className="flex-1" />
        <button type="button" disabled={!!busy || !chosen.length} onClick={discard} className="btn-ghost h-9 px-4 text-sm">Descartar elegidos</button>
        <button type="button" disabled={!!busy || !chosen.length} onClick={publish} className="btn-primary h-9 px-4 text-sm">Publicar elegidos</button>
      </div>
      {busy && <p className="rounded-card bg-lima/30 p-3 text-sm font-medium">{busy}… no cierres esta página.</p>}
      {!!errs.length && <ul className="rounded-card border border-bad/30 bg-bad/5 p-3 text-sm text-bad">{errs.map((e) => <li key={e}>• {e}</li>)}</ul>}
      <ul className="space-y-2">
        {rows.map((d) => (
          <li key={d.id} className={`flex gap-3 rounded-card border bg-card p-3 ${d.on ? "border-ink" : "border-line"}`}>
            <input type="checkbox" checked={d.on} onChange={(e) => upd(d.id, { on: e.target.checked })} className="mt-1 h-5 w-5 shrink-0" aria-label="Elegir" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={d.image_urls[0]} alt="" loading="lazy" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <input value={d.title} maxLength={90} onChange={(e) => upd(d.id, { title: e.target.value })} className="field h-9 w-full text-sm font-semibold" />
              <div className="flex flex-wrap gap-2">
                <label className="flex items-center gap-1 text-sm">Gs.
                  <input inputMode="numeric" value={fmt(d.price_amount)} placeholder="Precio"
                    onChange={(e) => upd(d.id, { price_amount: Number(e.target.value.replace(/\D/g, "")) || null })} className="field h-9 w-32 text-sm" />
                </label>
                <select value={d.subcategory ?? ""} onChange={(e) => upd(d.id, { subcategory: e.target.value })} className="field h-9 w-auto text-sm">
                  {SUBS.map((s) => <option key={s.slug} value={s.slug}>{s.label}</option>)}
                </select>
                <span className="self-center text-xs text-ink-soft">{d.image_urls.length} fotos</span>
              </div>
              <details className="text-sm">
                <summary className="cursor-pointer text-ink-soft">Descripción</summary>
                <textarea value={d.description ?? ""} rows={4} maxLength={4000} onChange={(e) => upd(d.id, { description: e.target.value })} className="field mt-1 w-full text-sm" />
                {d.source_url && <a href={d.source_url} target="_blank" rel="noopener noreferrer" className="text-xs underline">Ver en tu web</a>}
              </details>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
