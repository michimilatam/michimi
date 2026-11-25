"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { RATING_CRITERIA } from "@michimi/core";
import { supabaseBrowser } from "@/lib/supabase/client";

export function OperationActions(props: { service?: boolean; id: string; role: "buyer" | "seller"; status: string; pin: string | null; alreadyRated: boolean }) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [criteria, setCriteria] = useState<Record<string, boolean>>({});
  const [comment, setComment] = useState("");
  // Califico a la contraparte: si soy comprador, califico al vendedor.
  const ratedRole = props.role === "buyer" ? "seller" : "buyer";

  async function complete() {
    const { error } = await supabaseBrowser().rpc("complete_operation", { p_operation: props.id, p_pin: pin.trim() });
    if (error) setErr(error.message); else router.refresh();
  }
  async function cancel() {
    const { error } = await supabaseBrowser().rpc("cancel_operation", { p_operation: props.id });
    if (error) setErr(error.message); else router.refresh();
  }
  async function rate() {
    if (!score) return setErr("Elegí de 1 a 5 estrellas");
    const supabase = supabaseBrowser();
    const { data: u } = await supabase.auth.getUser();
    // ratee_id y role los completa la base (trigger prepare_rating); mandamos placeholders válidos.
    const { error } = await supabase.from("ratings").insert({
      operation_id: props.id, rater_id: u.user!.id, ratee_id: u.user!.id, role: ratedRole,
      score, criteria, comment: comment.trim() || null,
    });
    if (error) setErr(error.message); else router.refresh();
  }

  if (props.status === "reservada") {
    return (
      <section className="space-y-3">
        {props.role === "buyer" ? (
          <div className="rounded-card bg-ink p-5 text-white">
            <p className="text-sm text-white/70">Tu PIN de entrega</p>
            <p className="text-5xl font-bold tracking-[0.3em] text-lima tabular-nums">{props.pin}</p>
            <p className="mt-2 text-sm text-white/80">{props.service ? "Dáselo al profesional solo cuando el trabajo esté terminado y conforme." : "Dáselo al vendedor solo cuando tengas el producto en la mano y lo hayas revisado."}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="label" htmlFor="pin">PIN que te da el comprador al recibir</label>
            <div className="flex gap-2">
              <input id="pin" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value)} className="field text-center text-xl tracking-[0.3em]" />
              <button onClick={complete} className="btn-primary shrink-0">Confirmar entrega</button>
            </div>
          </div>
        )}
        <button onClick={cancel} className="text-sm text-bad underline">Cancelar operación</button>
        {err && <p className="text-sm text-bad">{err}</p>}
      </section>
    );
  }

  if (props.status === "completada" && !props.alreadyRated) {
    return (
      <section className="space-y-4 rounded-card border border-line bg-card p-4">
        <h2 className="text-lg font-semibold">Calificá al {ratedRole === "seller" ? (props.service ? "profesional" : "vendedor") : (props.service ? "cliente" : "comprador")}</h2>
        <div className="flex gap-1" role="radiogroup" aria-label="Puntaje">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} role="radio" aria-checked={score === n} aria-label={`${n} estrellas`} onClick={() => setScore(n)}
              className={`text-4xl ${n <= score ? "text-ink" : "text-line"}`}>★</button>
          ))}
        </div>
        <fieldset className="space-y-1">
          {Object.entries(RATING_CRITERIA[ratedRole === "seller" && props.service ? "provider" : ratedRole]).map(([k, label]) => (
            <label key={k} className="flex items-center gap-2 text-[15px]">
              <input type="checkbox" checked={!!criteria[k]} onChange={(e) => setCriteria({ ...criteria, [k]: e.target.checked })} />
              {label}
            </label>
          ))}
        </fieldset>
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={600} rows={3} className="field h-auto py-2" placeholder="Comentario opcional (público)" />
        <button onClick={rate} className="btn-primary w-full">Enviar calificación</button>
        <p className="text-xs text-ink-soft">Tu calificación se publica cuando la otra parte también califique, o en 14 días. Así nadie califica por revancha.</p>
        {err && <p className="text-sm text-bad">{err}</p>}
      </section>
    );
  }

  return (
    <p className="rounded-xl bg-line/60 p-3 text-[15px]">
      {props.status === "completada" ? "Operación completada. ¡Gracias por calificar!" : (props.service ? "Operación cancelada. El pedido o servicio volvió a quedar abierto." : "Operación cancelada. El producto volvió a estar disponible.")}
    </p>
  );
}
