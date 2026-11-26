import { supabaseServer } from "@/lib/supabase/server";

export type Stats = { views: number; views_7d: number; views_today: number; shares: number; favorites: number; chats: number; offers: number };

export async function getStats(ids: string[]): Promise<Map<string, Stats>> {
  const m = new Map<string, Stats>();
  if (!ids.length) return m;
  const supabase = await supabaseServer();
  const { data } = await supabase.rpc("my_listing_stats", { p_ids: ids });
  for (const r of (data as (Stats & { listing_id: string })[] | null) ?? [])
    m.set(r.listing_id, { views: +r.views, views_7d: +r.views_7d, views_today: +r.views_today, shares: +r.shares, favorites: +r.favorites, chats: +r.chats, offers: +r.offers });
  return m;
}

/** Consejos concretos según cómo le va al aviso. */
export function statsTips(s: Stats, o: { photos: number; daysOnline: number; service: boolean; hasDescription: boolean }): string[] {
  const t: string[] = [];
  if (o.photos === 0) t.push("Agregá fotos: los avisos con fotos reciben muchas más consultas.");
  else if (o.photos < 3 && !o.service) t.push("Sumá al menos 3 fotos desde distintos ángulos.");
  if (!o.hasDescription) t.push("Escribí una descripción: medidas, estado, qué incluye.");
  if (s.views >= 30 && s.chats === 0) t.push(o.service ? "Muchas visitas y ninguna consulta: probá mostrar un precio “desde” o fotos de trabajos." : "Muchas visitas y ninguna consulta: puede que el precio esté alto para el mercado.");
  if (s.favorites >= 3 && s.offers === 0) t.push(`${s.favorites} personas lo guardaron en favoritos: una pequeña rebaja puede convertirlos en compradores.`);
  if (o.daysOnline >= 7 && s.views_7d < 5) t.push("Pocas visitas esta semana: compartilo en tus redes y grupos de WhatsApp.");
  return t.slice(0, 3);
}

const n = (x: number) => x.toLocaleString("es-PY");

/** Fila compacta para "Mis publicaciones". */
export function StatsRow({ s }: { s: Stats }) {
  const items: [string, number][] = [["visitas", s.views], ["favoritos", s.favorites], ["consultas", s.chats], ["ofertas", s.offers], ["compartidos", s.shares]];
  return (
    <span className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-soft">
      {items.map(([k, v]) => <span key={k}><b className="text-ink tabular-nums">{n(v)}</b> {k}</span>)}
      {s.views_today > 0 && <span className="font-semibold text-ink">+{n(s.views_today)} hoy</span>}
    </span>
  );
}

/** Panel completo, solo visible para el dueño en su publicación. */
export async function StatsPanel({ listingId, tips }: { listingId: string; tips: string[] }) {
  const supabase = await supabaseServer();
  const [stats, { data: daily }] = await Promise.all([getStats([listingId]), supabase.rpc("my_listing_daily", { p_listing: listingId })]);
  const s = stats.get(listingId);
  if (!s) return null;
  const days = (daily as { day: string; views: number }[] | null) ?? [];
  const max = Math.max(1, ...days.map((d) => +d.views));
  const conv = s.views ? Math.round((s.chats / s.views) * 100) : 0;
  const cards: [string, string, string?][] = [
    ["Visitas", n(s.views), `${n(s.views_7d)} en 7 días`],
    ["Favoritos", n(s.favorites)],
    ["Consultas", n(s.chats), s.views ? `${conv}% de las visitas` : undefined],
    ["Ofertas", n(s.offers)],
    ["Compartidos", n(s.shares)],
  ];
  return (
    <section className="rounded-card border border-line bg-card p-4">
      <h2 className="font-semibold">Estadísticas de tu publicación</h2>
      <p className="text-xs text-ink-soft">Solo vos ves esto. Una visita = una persona por día.</p>
      <dl className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
        {cards.map(([k, v, sub]) => (
          <div key={k} className="rounded-xl bg-paper p-2">
            <dt className="text-xs text-ink-soft">{k}</dt>
            <dd className="text-xl font-bold tabular-nums">{v}</dd>
            {sub && <dd className="text-[11px] text-ink-soft">{sub}</dd>}
          </div>
        ))}
      </dl>
      <div className="mt-4" aria-label="Visitas de los últimos 14 días">
        <div className="flex h-20 items-end gap-1">
          {days.map((d) => (
            <div key={d.day} className="flex-1 rounded-t bg-ink/80" style={{ height: `${Math.max(4, (+d.views / max) * 100)}%`, opacity: +d.views ? 1 : 0.15 }}
              title={`${new Date(d.day + "T12:00").toLocaleDateString("es-PY", { day: "numeric", month: "short" })}: ${d.views} visitas`} />
          ))}
        </div>
        <p className="mt-1 flex justify-between text-[11px] text-ink-soft"><span>Hace 14 días</span><span>Hoy</span></p>
      </div>
      {tips.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {tips.map((t) => <li key={t} className="flex gap-2"><span aria-hidden="true">💡</span>{t}</li>)}
        </ul>
      )}
    </section>
  );
}
