import { notFound } from "next/navigation";
import { formatMoney, OPERATION_LABEL, type CurrencyCode, type OperationStatus } from "@michimi/core";
import { supabaseServer } from "@/lib/supabase/server";
import { OperationActions } from "./OperationActions";

/** Expediente de la operación: estado, PIN, checklist de seguridad y calificación. */
export default async function Operacion({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data: u } = await supabase.auth.getUser();
  const { data: op } = await supabase.from("operations").select("*, listing:listings(title)").eq("id", id).maybeSingle();
  if (!op || !u.user) notFound();
  const role = op.buyer_id === u.user.id ? "buyer" : "seller";
  const [{ data: pin }, { data: myRating }] = await Promise.all([
    role === "buyer" ? supabase.from("operation_pins").select("pin").eq("operation_id", id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("ratings").select("score").eq("operation_id", id).eq("rater_id", u.user.id).maybeSingle(),
  ]);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <header>
        <p className="text-sm text-ink-soft">Operación · {OPERATION_LABEL[op.status as OperationStatus]}</p>
        <h1 className="text-2xl font-bold">{op.listing?.title}</h1>
        <p className="text-3xl font-bold tabular-nums">{formatMoney({ amount: op.amount, currency: op.currency as CurrencyCode })}</p>
      </header>

      {op.status === "reservada" && (
        <section className="rounded-card border border-line bg-card p-4">
          <h2 className="font-semibold">Antes de encontrarse</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px]">
            <li>Encontrate en un lugar público y con gente (shopping, estación de servicio).</li>
            <li>Revisá el producto antes de pagar y antes de dar el PIN.</li>
            <li>Nunca compartas códigos que te lleguen por SMS o WhatsApp.</li>
            {role === "seller" && <li>No entregues hasta tener el pago acreditado en tu cuenta, no solo un comprobante.</li>}
          </ul>
        </section>
      )}

      <OperationActions id={id} role={role} status={op.status} pin={pin?.pin ?? null} alreadyRated={!!myRating} />
    </div>
  );
}
