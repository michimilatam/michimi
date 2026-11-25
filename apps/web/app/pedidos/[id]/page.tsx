import Link from "next/link";
import { notFound } from "next/navigation";
import { CURRENCIES, formatMoney, subcategoryLabel, type CurrencyCode } from "@michimi/core";
import { supabaseServer } from "@/lib/supabase/server";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { SendQuote, CloseRequest } from "./Actions";

export default async function Pedido({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data: u } = await supabase.auth.getUser();
  const { data: r } = await supabase.from("service_requests").select("*, client:profiles!service_requests_client_id_fkey(display_name)").eq("id", id).maybeSingle();
  if (!r) notFound();
  const mine = u.user?.id === r.client_id;
  const cur = (r.currency ?? "PYG") as CurrencyCode;

  // Presupuestos recibidos (solo el cliente los ve todos; cada profesional ve el suyo por RLS)
  const { data: convs } = await supabase
    .from("conversations")
    .select("id,seller_id,seller:profiles!conversations_seller_id_fkey(display_name,avatar_url,profession,professional_status),offers(amount,currency,status,created_at)")
    .eq("request_id", id);
  const ids = (convs ?? []).map((c) => c.seller_id);
  const { data: reps } = ids.length ? await supabase.from("user_reputation").select("user_id,seller_avg,seller_count,sales_completed").in("user_id", ids) : { data: [] };
  const rep = new Map((reps ?? []).map((x) => [x.user_id, x]));
  type Seller = { display_name: string; avatar_url: string | null; profession: string | null; professional_status: string };
  type Off = { amount: number; currency: string; status: string; created_at: string };
  const myConv = !mine ? (convs ?? []).find((c) => c.seller_id === u.user?.id) : undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-sm text-ink-soft">{subcategoryLabel("servicios", r.subcategory) ?? "Servicio"} · {r.city}, {r.region} · {r.status === "abierto" ? "Abierto" : r.status === "adjudicado" ? "Adjudicado" : "Cerrado"}</p>
        <h1 className="text-2xl font-bold">{r.title}</h1>
        {r.when_text && <p>Para: {r.when_text}</p>}
        {r.description && <p className="mt-2 whitespace-pre-line text-[15px]">{r.description}</p>}
        <p className="mt-2 text-xs text-ink-soft">Pedido por {(r.client as { display_name: string } | null)?.display_name ?? "un usuario"} el {new Date(r.created_at).toLocaleDateString("es-PY")}</p>
      </header>

      {mine ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Presupuestos recibidos ({convs?.length ?? 0})</h2>
          {!convs?.length && <p className="rounded-card border border-dashed border-line p-6 text-center text-ink-soft">Todavía nadie respondió. Los profesionales de {r.region} ya pueden ver tu pedido.</p>}
          <ul className="space-y-2">
            {convs?.map((c) => {
              const s = c.seller as unknown as Seller | null;
              const o = ((c.offers ?? []) as Off[]).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
              const rp = rep.get(c.seller_id);
              return (
                <li key={c.id}>
                  <Link href={`/mensajes/${c.id}`} className="flex items-center justify-between gap-3 rounded-card border border-line bg-card p-4 hover:border-ink">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 font-semibold">{s?.display_name}{s?.professional_status === "verificado" && <VerifiedBadge />}</p>
                      <p className="text-sm text-ink-soft">{s?.profession ?? "Profesional"} · {rp?.seller_count ? `★ ${Number(rp.seller_avg).toFixed(1)} (${rp.seller_count})` : "sin calificaciones"} · {rp?.sales_completed ?? 0} trabajos</p>
                    </div>
                    <p className="shrink-0 text-right font-bold tabular-nums">{o ? formatMoney({ amount: o.amount, currency: o.currency as CurrencyCode }) : "Sin precio aún"}<br /><span className="text-xs font-normal text-ink-soft">Abrir chat</span></p>
                  </Link>
                </li>
              );
            })}
          </ul>
          {r.status === "abierto" && <CloseRequest id={id} />}
        </section>
      ) : myConv ? (
        <Link href={`/mensajes/${myConv.id}`} className="btn-primary w-full">Ya enviaste presupuesto: ir al chat</Link>
      ) : r.status === "abierto" ? (
        <SendQuote requestId={id} currency={cur} symbol={CURRENCIES[cur].symbol} loggedIn={!!u.user} />
      ) : (
        <p className="rounded-xl bg-line/60 p-3 text-sm">Este pedido ya no recibe presupuestos.</p>
      )}
    </div>
  );
}
