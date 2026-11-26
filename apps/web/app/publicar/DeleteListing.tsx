"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

/** Pausar / reactivar y borrar la publicación, cada uno con su explicación. */
export function DeleteListing({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [st, setSt] = useState(status);
  const [ask, setAsk] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function togglePause() {
    const next = st === "pausada" ? "activa" : "pausada";
    const { error } = await supabaseBrowser().from("listings").update({ status: next }).eq("id", id);
    if (error) return setErr(error.message);
    setSt(next);
    router.refresh();
  }
  async function del() {
    setBusy(true);
    const { error } = await supabaseBrowser().rpc("delete_listing", { p_listing: id });
    if (error) { setBusy(false); return setErr(error.message); }
    router.push("/mis-publicaciones");
    router.refresh();
  }

  return (
    <section className="mt-6 grid gap-3 sm:grid-cols-2">
      {(st === "activa" || st === "pausada") && (
        <div className="rounded-card border border-line p-4">
          <button type="button" onClick={togglePause} className="btn-ghost h-9 px-4 text-sm">{st === "pausada" ? "Reactivar publicación" : "Pausar publicación"}</button>
          <p className="mt-2 text-sm text-ink-soft">
            {st === "pausada"
              ? "Está pausada: nadie la ve. Al reactivarla vuelve a aparecer con todo igual."
              : "La oculta de Michimi sin perderla. Conserva fotos, datos y mensajes; la reactivás cuando quieras."}
          </p>
        </div>
      )}
      <div className="rounded-card border border-bad/30 p-4">
        {!ask ? (
          <>
            <button type="button" onClick={() => setAsk(true)} className="inline-flex h-9 items-center rounded-full border border-bad/40 px-4 text-sm font-semibold text-bad">Borrar publicación</button>
            <p className="mt-2 text-sm text-ink-soft">La elimina para siempre. No se puede recuperar.</p>
          </>
        ) : (
          <div className="space-y-2">
            <p className="text-sm">¿Seguro? Desaparece de Michimi y no se puede recuperar.</p>
            <div className="flex gap-2">
              <button type="button" disabled={busy} onClick={del} className="inline-flex h-9 items-center rounded-full bg-bad px-4 text-sm font-semibold text-white">{busy ? "Borrando…" : "Sí, borrar"}</button>
              <button type="button" onClick={() => setAsk(false)} className="btn-ghost h-9 px-4 text-sm">Cancelar</button>
            </div>
          </div>
        )}
      </div>
      {err && <p className="text-sm text-bad sm:col-span-2">{err}</p>}
    </section>
  );
}
