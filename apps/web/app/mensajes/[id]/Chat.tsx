"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatMoney, parseMoney, type CurrencyCode } from "@michimi/core";
import { supabaseBrowser } from "@/lib/supabase/client";
import { READ_EVENT } from "@/components/MessagesBadge";

type Msg = { id: number; sender_id: string | null; kind: "texto" | "oferta" | "sistema"; body: string; offer_id: string | null; created_at: string };
type Offer = { id: string; created_by: string; amount: number; currency: string; status: string; expires_at: string };

const QUICK = ["¿Sigue disponible?", "¿Dónde se puede retirar?", "¿Aceptás transferencia?"];
// Advertencia anti-fuga: detecta teléfonos o pedidos de códigos
const RISKY = /(\+?595|09\d{2})[\s-]?\d{3}[\s-]?\d{3}|c[oó]digo (de )?(verificaci[oó]n|sms|whatsapp)/i;

export function Chat(props: {
  me: string;
  conversation: { id: string; buyerId: string; listing: { id: string; title: string; currency: string; price_amount: number; status: string } };
  initialMessages: Msg[];
  initialOffers: Offer[];
  operation: { id: string; status: string } | null;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState(props.initialMessages);
  const [offers, setOffers] = useState(props.initialOffers);
  const [text, setText] = useState("");
  const [counter, setCounter] = useState<{ parent: string; value: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const cur = props.conversation.listing.currency as CurrencyCode;
  const convId = props.conversation.id;

  useEffect(() => {
    const supabase = supabaseBrowser();
    const ch = supabase
      .channel(`conv:${convId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${convId}` },
        (p) => setMessages((m) => (m.some((x) => x.id === (p.new as Msg).id) ? m : [...m, p.new as Msg])))
      .on("postgres_changes", { event: "*", schema: "public", table: "offers", filter: `conversation_id=eq.${convId}` },
        (p) => setOffers((o) => [...o.filter((x) => x.id !== (p.new as Offer).id), p.new as Offer]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [convId]);
  useEffect(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), [messages.length]);
  // Marca la conversación como leída al abrirla y cada vez que llega algo nuevo
  useEffect(() => {
    supabaseBrowser().rpc("mark_conversation_read", { p_conversation: convId })
      .then(() => window.dispatchEvent(new Event(READ_EVENT)));
  }, [convId, messages.length]);

  async function send(body: string) {
    if (!body.trim()) return;
    const supabase = supabaseBrowser();
    const { error } = await supabase.from("messages").insert({ conversation_id: convId, sender_id: props.me, body });
    if (error) setErr(error.message); else setText("");
  }
  async function accept(offerId: string) {
    const { data, error } = await supabaseBrowser().rpc("accept_offer", { p_offer: offerId });
    if (error) return setErr(error.message);
    router.push(`/operacion/${data}`);
  }
  async function reject(offerId: string) {
    const { error } = await supabaseBrowser().from("offers").update({ status: "retirada" }).eq("id", offerId);
    if (error) setErr("Solo quien hizo la oferta puede retirarla. Respondé con una contraoferta.");
  }
  async function sendCounter() {
    if (!counter) return;
    const m = parseMoney(counter.value, cur);
    if (!m) return setErr("Monto inválido");
    const { error } = await supabaseBrowser().rpc("make_offer", { p_conversation: convId, p_amount: m.amount, p_currency: cur, p_parent: counter.parent });
    if (error) setErr(error.message); else setCounter(null);
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-10rem)] max-w-2xl flex-col">
      <header className="border-b border-line pb-3">
        <Link href={`/publicacion/${props.conversation.listing.id}`} className="font-semibold hover:underline">{props.conversation.listing.title}</Link>
        <p className="text-sm text-ink-soft">Publicado a {formatMoney({ amount: props.conversation.listing.price_amount, currency: cur })}</p>
        {props.operation && (
          <Link href={`/operacion/${props.operation.id}`} className="mt-2 inline-block rounded-full bg-lima px-3 py-1 text-sm font-semibold">
            Ver operación ({props.operation.status}) →
          </Link>
        )}
      </header>

      <ol className="flex-1 space-y-2 overflow-y-auto py-4">
        {messages.map((m) => {
          const mine = m.sender_id === props.me;
          if (m.kind === "sistema") return <li key={m.id} className="text-center text-xs text-ink-soft">{m.body}</li>;
          if (m.kind === "oferta") {
            const o = offers.find((x) => x.id === m.offer_id);
            if (!o) return null;
            const canAnswer = o.status === "pendiente" && o.created_by !== props.me && new Date(o.expires_at) > new Date();
            return (
              <li key={m.id} className={`max-w-[80%] rounded-2xl border-2 border-ink p-3 ${mine ? "ml-auto" : ""}`}>
                <p className="text-xs uppercase tracking-wide text-ink-soft">{mine ? "Tu oferta" : "Oferta recibida"} · {o.status}</p>
                <p className="text-2xl font-bold tabular-nums">{formatMoney({ amount: o.amount, currency: o.currency as CurrencyCode })}</p>
                {canAnswer && (
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => accept(o.id)} className="btn-primary h-9 px-4 text-sm">Aceptar y reservar</button>
                    <button onClick={() => setCounter({ parent: o.id, value: "" })} className="btn-ghost h-9 px-4 text-sm">Contraofertar</button>
                  </div>
                )}
                {o.status === "pendiente" && o.created_by === props.me && (
                  <button onClick={() => reject(o.id)} className="mt-2 text-sm underline">Retirar oferta</button>
                )}
              </li>
            );
          }
          return (
            <li key={m.id} className={`max-w-[80%] rounded-2xl px-3 py-2 text-[15px] ${mine ? "ml-auto bg-ink text-white" : "bg-card border border-line"}`}>
              {m.body}
            </li>
          );
        })}
        <div ref={bottom} />
      </ol>

      {RISKY.test(text) && (
        <p className="mb-2 rounded-xl bg-warn/10 p-2 text-sm text-warn">
          Ojo: compartir teléfonos o códigos fuera de Michimi te deja sin reputación ni respaldo. Nunca compartas códigos de verificación.
        </p>
      )}
      {counter && (
        <div className="mb-2 flex gap-2">
          <input autoFocus className="field" placeholder="Tu contraoferta" value={counter.value} onChange={(e) => setCounter({ ...counter, value: e.target.value })} />
          <button onClick={sendCounter} className="btn-primary shrink-0">Enviar</button>
          <button onClick={() => setCounter(null)} className="btn-ghost shrink-0">Cancelar</button>
        </div>
      )}
      <div className="mb-2 flex gap-2 overflow-x-auto">
        {QUICK.map((q) => <button key={q} onClick={() => send(q)} className="shrink-0 rounded-full border border-line bg-card px-3 py-1 text-sm">{q}</button>)}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} className="field" placeholder="Escribí un mensaje" aria-label="Mensaje" />
        <button className="btn-primary shrink-0">Enviar</button>
      </form>
      {err && <p className="mt-1 text-sm text-bad">{err}</p>}
    </div>
  );
}
