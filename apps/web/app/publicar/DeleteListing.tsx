"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

/** Borrar publicación con confirmación en dos pasos (sin diálogos del navegador). */
export function DeleteListing({ id }: { id: string }) {
  const router = useRouter();
  const [ask, setAsk] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function del() {
    setBusy(true);
    const { error } = await supabaseBrowser().rpc("delete_listing", { p_listing: id });
    if (error) { setBusy(false); return setErr(error.message); }
    router.push("/mis-publicaciones");
    router.refresh();
  }
  return (
    <section className="mt-4 rounded-card border border-bad/30 p-4">
      {!ask ? (
        <button type="button" onClick={() => setAsk(true)} className="text-sm font-semibold text-bad underline">Borrar publicación</button>
      ) : (
        <div className="space-y-2">
          <p className="text-sm">¿Seguro? La publicación desaparece de Michimi y no se puede recuperar. Si solo querés frenarla un tiempo, usá <b>Pausar</b> en Mis publicaciones.</p>
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={del} className="inline-flex h-9 items-center rounded-full bg-bad px-4 text-sm font-semibold text-white">{busy ? "Borrando…" : "Sí, borrar"}</button>
            <button type="button" onClick={() => setAsk(false)} className="btn-ghost h-9 px-4 text-sm">Cancelar</button>
          </div>
        </div>
      )}
      {err && <p className="mt-2 text-sm text-bad">{err}</p>}
    </section>
  );
}
