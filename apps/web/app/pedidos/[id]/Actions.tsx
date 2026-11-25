"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseMoney, type CurrencyCode } from "@michimi/core";
import { supabaseBrowser } from "@/lib/supabase/client";

/** El profesional abre la conversación con el cliente y manda su presupuesto como oferta. */
export function SendQuote({ requestId, currency, symbol, loggedIn }: { requestId: string; currency: CurrencyCode; symbol: string; loggedIn: boolean }) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!loggedIn) return router.push(`/ingresar?next=/pedidos/${requestId}`);
    const f = new FormData(e.currentTarget);
    const m = parseMoney(String(f.get("amount") ?? ""), currency);
    const note = String(f.get("note") ?? "").trim();
    if (!m) return setErr("Escribí el monto de tu presupuesto");
    setBusy(true); setErr(null);
    const supabase = supabaseBrowser();
    const { data: u } = await supabase.auth.getUser();
    const { data: conv, error } = await supabase.rpc("start_request_conversation", { p_request: requestId });
    if (error) { setBusy(false); return setErr(error.message); }
    if (note) await supabase.from("messages").insert({ conversation_id: conv, sender_id: u.user!.id, body: note });
    const r = await supabase.rpc("make_offer", { p_conversation: conv, p_amount: m.amount, p_currency: currency });
    if (r.error) { setBusy(false); return setErr(r.error.message); }
    router.push(`/mensajes/${conv}`);
  }
  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-card border border-line bg-card p-4">
      <h2 className="text-lg font-semibold">Mandá tu presupuesto</h2>
      <div>
        <label className="label" htmlFor="amount">Precio total ({symbol})</label>
        <input id="amount" name="amount" inputMode="decimal" className="field" />
      </div>
      <div>
        <label className="label" htmlFor="note">Qué incluye <span className="font-normal">(recomendado)</span></label>
        <textarea id="note" name="note" rows={3} className="field h-auto py-2" placeholder="Materiales, plazo, garantía, si cobrás anticipo…" />
      </div>
      {err && <p className="text-sm text-bad">{err}</p>}
      <button disabled={busy} className="btn-primary w-full">{busy ? "Enviando…" : "Enviar presupuesto"}</button>
      <p className="text-xs text-ink-soft">El cliente lo ve junto a tu reputación. Si lo acepta, queda una operación con PIN.</p>
    </form>
  );
}

export function CloseRequest({ id }: { id: string }) {
  const router = useRouter();
  async function close() {
    await supabaseBrowser().from("service_requests").update({ status: "cerrado" }).eq("id", id);
    router.refresh();
  }
  return <button onClick={close} className="btn-ghost w-full">Ya no lo necesito: cerrar pedido</button>;
}
