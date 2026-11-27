"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatMoney, parseMoney, riskFlags, RISK_LABEL, type CurrencyCode, type RiskFlag } from "@michimi/core";
import { ChatMenu } from "./ChatMenu";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { supabaseBrowser } from "@/lib/supabase/client";
import { photoUrl } from "@/lib/photo";
import { READ_EVENT } from "@/components/MessagesBadge";

type Msg = { id: number; sender_id: string | null; kind: "texto" | "oferta" | "sistema"; body: string; offer_id: string | null; created_at: string };
type Offer = { id: string; created_by: string; amount: number; currency: string; status: string; expires_at: string };

const QUICK = {
  producto: { compro: ["¿Sigue disponible?", "¿Dónde se puede retirar?", "¿Aceptás transferencia?"], vendo: ["Sí, sigue disponible", "Se retira en", "Acepto transferencia"] },
  servicio: { compro: ["¿Qué días tenés disponible?", "¿Cuánto tardás?", "¿Incluye materiales?", "¿Hacés factura?"], vendo: ["¿Me mandás fotos del trabajo?", "¿En qué barrio es?", "Puedo ir a ver sin costo", "Te paso el presupuesto"] },
} as const;
// Advertencia anti-fuga: detecta teléfonos o pedidos de códigos
const RISKY = /(\+?595|09\d{2})[\s-]?\d{3}[\s-]?\d{3}|c[oó]digo (de )?(verificaci[oó]n|sms|whatsapp)/i;
const OFFER_STATUS: Record<string, string> = { pendiente: "Pendiente", aceptada: "Aceptada", rechazada: "Rechazada", contraofertada: "Contraofertada", vencida: "Vencida", retirada: "Retirada" };

export function Chat(props: {
  me: string;
  role: "vendo" | "compro";
  other: { id: string; name: string; avatar: string | null; verified?: boolean; isNew?: boolean };
  conversation: { id: string; buyerId: string; listing: { id: string; title: string; currency: string; price_amount: number | null; status: string; cover: string | null; href?: string } };
  initialMessages: Msg[];
  initialOffers: Offer[];
  operation: { id: string; status: string } | null;
  service?: boolean;
  blockedByMe?: boolean;
}) {
  const [warnSend, setWarnSend] = useState<RiskFlag[] | null>(null);
  const [blocked, setBlocked] = useState(!!props.blockedByMe);
  const svc = !!props.service;
  const word = svc ? "presupuesto" : "oferta";
  const router = useRouter();
  const [messages, setMessages] = useState(props.initialMessages);
  const [offers, setOffers] = useState(props.initialOffers);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [counter, setCounter] = useState<{ parent: string | null; value: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const cur = props.conversation.listing.currency as CurrencyCode;
  // En un comercio varias personas responden: "mío" es todo lo de mi lado (comprador o comercio).
  const sameSide = (id: string | null) => id !== null && (props.role === "compro" ? id === props.conversation.buyerId : id !== props.conversation.buyerId);
  const convId = props.conversation.id;
  const l = props.conversation.listing;

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

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  // Marca la conversación como leída al abrirla y cada vez que llega algo nuevo.
  // (Las llaves importan: el efecto no debe devolver la promesa.)
  useEffect(() => {
    void supabaseBrowser()
      .rpc("mark_conversation_read", { p_conversation: convId })
      .then(() => { window.dispatchEvent(new Event(READ_EVENT)); });
  }, [convId, messages.length]);

  async function send(body: string, force = false) {
    if (!body.trim() || sending) return;
    const flags = riskFlags(body);
    if (!force && flags.length) return setWarnSend(flags);
    setWarnSend(null);
    setSending(true);
    setErr(null);
    const { data, error } = await supabaseBrowser()
      .from("messages")
      .insert({ conversation_id: convId, sender_id: props.me, body: body.trim() })
      .select("*")
      .single();
    setSending(false);
    if (error) return setErr(error.message);
    setText("");
    if (data) setMessages((m) => (m.some((x) => x.id === (data as Msg).id) ? m : [...m, data as Msg]));
  }
  async function accept(offerId: string) {
    const { data, error } = await supabaseBrowser().rpc("accept_offer", { p_offer: offerId });
    if (error) return setErr(error.message);
    router.push(`/operacion/${data}`);
  }
  async function withdraw(offerId: string) {
    const { error } = await supabaseBrowser().from("offers").update({ status: "retirada" }).eq("id", offerId);
    if (error) setErr("Solo quien hizo la oferta puede retirarla.");
  }
  /** Trae mensajes y ofertas recién creados (el que envía los ve al instante, sin esperar el tiempo real). */
  async function reload() {
    const supabase = supabaseBrowser();
    const [{ data: ms }, { data: os }] = await Promise.all([
      supabase.from("messages").select("*").eq("conversation_id", convId).order("created_at"),
      supabase.from("offers").select("*").eq("conversation_id", convId),
    ]);
    if (ms) setMessages(ms as Msg[]);
    if (os) setOffers(os as Offer[]);
  }
  async function sendCounter() {
    if (!counter) return;
    const m = parseMoney(counter.value, cur);
    if (!m) return setErr("Monto inválido");
    const p = props.conversation.listing.price_amount;
    if (p && m.amount > p * 20 && !confirm(`¿Seguro? ${formatMoney(m)} es mucho más que el precio publicado.`)) return;
    const { error } = await supabaseBrowser().rpc("make_offer", { p_conversation: convId, p_amount: m.amount, p_currency: cur, p_parent: counter.parent ?? undefined });
    if (error) setErr(error.message); else { setCounter(null); reload(); }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Cabecera: con quién hablo y sobre qué producto */}
      <header className="flex items-center gap-3 border-b border-line bg-card px-4 py-3">
        <Link href="/mensajes" className="-ml-1 flex h-9 w-9 items-center justify-center rounded-full hover:bg-paper md:hidden" aria-label="Volver a mensajes">←</Link>
        <Link href={`/perfil/${props.other.id}`} className="shrink-0">
          {props.other.avatar
            ? <img src={props.other.avatar} alt="" className="h-10 w-10 rounded-full object-cover" referrerPolicy="no-referrer" />
            : <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink font-semibold text-lima">{(props.other.name[0] ?? "U").toUpperCase()}</span>}
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/perfil/${props.other.id}`} className="flex items-center gap-1 truncate font-semibold hover:underline">{props.other.name}{props.other.verified && <VerifiedBadge size={16} />}</Link>
          <p className="truncate text-xs text-ink-soft">{svc ? (props.role === "vendo" ? "Cliente" : "Profesional") : (props.role === "vendo" ? "Le interesa tu producto" : "Vendedor")}{props.other.isNew && <span className="ml-1.5 rounded-full bg-warn/15 px-1.5 text-warn">Cuenta nueva</span>}</p>
        </div>
        <ChatMenu conversationId={convId} otherId={props.other.id} otherName={props.other.name} blocked={blocked} onBlocked={setBlocked} />
        <Link href={l.href ?? `/publicacion/${l.id}`} className="flex max-w-[40%] items-center gap-2 rounded-xl border border-line px-2 py-1.5 hover:border-ink">
          <span className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-line">
            {l.cover && <img src={photoUrl(l.cover)} alt="" className="h-full w-full object-cover" />}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{l.title}</span>
            <span className="block text-xs tabular-nums text-ink-soft">{l.price_amount ? formatMoney({ amount: l.price_amount, currency: cur }) : "A presupuestar"}</span>
          </span>
        </Link>
      </header>

      {props.operation?.status === "cancelada" && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-line/70 px-4 py-2 text-sm">
          <span>La operación anterior se canceló. Pueden retomarla con {svc ? "un nuevo presupuesto" : "una nueva oferta"}.</span>
          <button onClick={() => setCounter({ parent: null, value: "" })}
            className="rounded-full bg-lima px-3 py-1 font-semibold text-ink">{svc ? (props.role === "vendo" ? "Enviar de nuevo" : "Proponer de nuevo") : "Proponer de nuevo"}</button>
        </div>
      )}
      {props.operation && props.operation.status !== "cancelada" && (
        <Link href={`/operacion/${props.operation.id}`} className="flex items-center justify-between bg-lima px-4 py-2 text-sm font-semibold">
          <span>Operación {props.operation.status}</span><span>Ver PIN, entrega y calificación →</span>
        </Link>
      )}

      <ol className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {messages.length === 0 && <li className="py-8 text-center text-sm text-ink-soft">Empezá la conversación. Las ofertas formales aparecen como tarjetas.</li>}
        {messages.map((m) => {
          const mine = sameSide(m.sender_id);
          if (m.kind === "sistema") return (
            <li key={m.id} className="mx-auto max-w-md rounded-2xl bg-line/60 px-3 py-1.5 text-center text-xs text-ink-soft">
              {m.body}
              {props.operation && /PIN/.test(m.body) && <Link href={`/operacion/${props.operation.id}`} className="mt-1 block font-semibold text-ink underline">Ver PIN, entrega y calificación →</Link>}
            </li>
          );
          if (m.kind === "oferta") {
            const o = offers.find((x) => x.id === m.offer_id);
            if (!o) return null;
            const canAnswer = o.status === "pendiente" && !sameSide(o.created_by) && new Date(o.expires_at) > new Date();
            return (
              <li key={m.id} className={`w-fit max-w-[80%] rounded-2xl border-2 border-ink bg-card p-3 ${mine ? "ml-auto" : ""}`}>
                <p className="text-xs uppercase tracking-wide text-ink-soft">{mine ? `Tu ${word}` : svc ? "Presupuesto recibido" : "Oferta recibida"} · {OFFER_STATUS[o.status] ?? o.status}</p>
                <p className="text-2xl font-bold tabular-nums">{formatMoney({ amount: o.amount, currency: o.currency as CurrencyCode })}</p>
                {canAnswer && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button onClick={() => accept(o.id)} className="btn-primary h-9 px-4 text-sm">{svc ? "Aceptar presupuesto" : "Aceptar y reservar"}</button>
                    <button onClick={() => setCounter({ parent: o.id, value: "" })} className="btn-ghost h-9 px-4 text-sm">{svc ? "Proponer otro precio" : "Contraofertar"}</button>
                  </div>
                )}
                {o.status === "pendiente" && o.created_by === props.me && (
                  <button onClick={() => withdraw(o.id)} className="mt-2 text-sm underline">Retirar {word}</button>
                )}
              </li>
            );
          }
          return (
            <li key={m.id} className={`w-fit max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-[15px] ${mine ? "ml-auto bg-ink text-white" : "border border-line bg-card"}`}>
              {m.body}
              <span className={`ml-2 align-bottom text-[10px] ${mine ? "text-white/60" : "text-ink-soft"}`}>
                {new Date(m.created_at).toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" })}
              </span>
              {!mine && riskFlags(m.body).map((f) => (
                <span key={f} className="mt-2 block whitespace-normal rounded-lg bg-warn/15 px-2 py-1.5 text-xs font-medium text-warn">⚠ {RISK_LABEL[f]}</span>
              ))}
            </li>
          );
        })}
        <div ref={bottom} />
      </ol>

      <div className="border-t border-line bg-card px-4 pb-4 pt-3">
        {RISKY.test(text) && (
          <p className="mb-2 rounded-xl bg-warn/10 p-2 text-sm text-warn">
            Ojo: compartir teléfonos o códigos fuera de Michimi te deja sin reputación ni respaldo. Nunca compartas códigos de verificación.
          </p>
        )}
        {counter && (
          <div className="mb-2 flex gap-2">
            <input autoFocus inputMode="decimal" className="field" placeholder={counter.parent ? (svc ? "Otro precio" : "Tu contraoferta") : svc ? "Monto del presupuesto" : "Monto de tu oferta"} value={counter.value} onChange={(e) => setCounter({ ...counter, value: e.target.value })} />
            <button onClick={sendCounter} className="btn-primary shrink-0">Enviar</button>
            <button onClick={() => setCounter(null)} className="btn-ghost shrink-0">Cancelar</button>
          </div>
        )}
        <div className="mb-2 flex gap-2 overflow-x-auto">
          {!counter && (!props.operation || props.operation.status === "cancelada") && ((svc && props.role === "vendo") || (!svc && props.role === "compro")) && (
            <button onClick={() => setCounter({ parent: null, value: "" })} className="shrink-0 rounded-full bg-lima px-3 py-1 text-sm font-semibold text-ink">{svc ? "Enviar presupuesto" : "Hacer oferta"}</button>
          )}
          {QUICK[svc ? "servicio" : "producto"][props.role].map((q) => <button key={q} onClick={() => send(q)} className="shrink-0 rounded-full border border-line bg-paper px-3 py-1 text-sm hover:border-ink">{q}</button>)}
        </div>
        {warnSend && (
          <div className="mb-2 rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm">
            <p className="font-semibold">Revisá antes de enviar</p>
            <ul className="mt-1 list-disc pl-5">{warnSend.map((f) => <li key={f}>{RISK_LABEL[f]}</li>)}</ul>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => setWarnSend(null)} className="btn-primary h-9 px-4 text-sm">Editar mensaje</button>
              <button type="button" onClick={() => send(text, true)} className="btn-ghost h-9 px-4 text-sm">Enviar igual</button>
            </div>
          </div>
        )}
        {blocked && <p className="mb-2 rounded-xl bg-line/60 p-3 text-sm">Bloqueaste a esta persona: no puede escribirte ni vos a ella. Podés desbloquearla desde el menú ⋯.</p>}
        <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="flex gap-2" hidden={blocked}>
          <input value={text} onChange={(e) => setText(e.target.value)} className="field" placeholder="Escribí un mensaje" aria-label="Mensaje" />
          <button disabled={sending || !text.trim()} className="btn-primary shrink-0">Enviar</button>
        </form>
        {err && <p className="mt-1 text-sm text-bad">{err}</p>}
      </div>
    </div>
  );
}
