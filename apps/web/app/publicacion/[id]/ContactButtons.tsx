"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney, parseMoney, type CurrencyCode } from "@michimi/core";
import { supabaseBrowser } from "@/lib/supabase/client";

export function ContactButtons(props: { listingId: string; currency: string; price: number; isOwner: boolean; loggedIn: boolean; status: string }) {
  const router = useRouter();
  const [offering, setOffering] = useState(false);
  const [value, setValue] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const cur = props.currency as CurrencyCode;

  if (props.isOwner) return <p className="rounded-xl bg-line/60 p-3 text-sm">Es tu publicación. Las ofertas te llegan a Mensajes.</p>;
  if (props.status !== "activa") return <p className="rounded-xl bg-line/60 p-3 text-sm">Este producto está reservado por otro comprador.</p>;

  async function go(withOffer: boolean) {
    if (!props.loggedIn) return router.push(`/ingresar?next=/publicacion/${props.listingId}`);
    setErr(null);
    const supabase = supabaseBrowser();
    const { data: convId, error } = await supabase.rpc("start_conversation", { p_listing: props.listingId });
    if (error) return setErr(error.message);
    if (withOffer) {
      const m = parseMoney(value, cur);
      if (!m) return setErr("Escribí un monto válido");
      const r = await supabase.rpc("make_offer", { p_conversation: convId, p_amount: m.amount, p_currency: cur });
      if (r.error) return setErr(r.error.message);
    }
    router.push(`/mensajes/${convId}`);
  }

  return (
    <div className="space-y-2">
      {offering ? (
        <div className="flex gap-2">
          <input autoFocus inputMode="decimal" className="field" placeholder={formatMoney({ amount: props.price, currency: cur })} value={value} onChange={(e) => setValue(e.target.value)} aria-label="Tu oferta" />
          <button onClick={() => go(true)} className="btn-primary shrink-0">Enviar oferta</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setOffering(true)} className="btn-primary">Hacer una oferta</button>
          <button onClick={() => go(false)} className="btn-ghost">Preguntar</button>
        </div>
      )}
      {err && <p className="text-sm text-bad">{err}</p>}
      <p className="text-xs text-ink-soft">Las ofertas vencen en 24 h. Si el vendedor acepta, el producto queda reservado para vos.</p>
    </div>
  );
}
