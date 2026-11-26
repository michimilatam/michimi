"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

/** Borrar la cuenta: hay que escribir BORRAR para confirmar. */
export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function del() {
    setBusy(true); setErr(null);
    const supabase = supabaseBrowser();
    const { error } = await supabase.rpc("delete_my_account");
    if (error) { setBusy(false); return setErr(error.message); }
    await supabase.auth.signOut();
    location.href = "/?cuenta=borrada";
  }
  return (
    <section className="mx-auto mt-10 max-w-xl rounded-card border border-bad/30 p-4">
      <h2 className="font-semibold text-bad">Borrar mi cuenta</h2>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="mt-1 text-sm underline">Quiero borrar mi cuenta de Michimi</button>
      ) : (
        <div className="mt-2 space-y-2 text-sm">
          <p>Se borran tu nombre, foto y datos de perfil, se ocultan todas tus publicaciones y se cierra tu acceso. Las calificaciones de operaciones pasadas quedan como “Usuario eliminado” para que la reputación de los demás siga siendo real. <b>No se puede deshacer.</b></p>
          <label className="block">Escribí <b>BORRAR</b> para confirmar
            <input value={word} onChange={(e) => setWord(e.target.value)} className="field mt-1" autoComplete="off" />
          </label>
          <div className="flex gap-2">
            <button type="button" disabled={word !== "BORRAR" || busy} onClick={del} className="inline-flex h-9 items-center rounded-full bg-bad px-4 font-semibold text-white disabled:opacity-40">{busy ? "Borrando…" : "Borrar mi cuenta"}</button>
            <button type="button" onClick={() => { setOpen(false); setWord(""); }} className="btn-ghost h-9 px-4">Cancelar</button>
          </div>
          {err && <p className="text-bad">{err}</p>}
        </div>
      )}
    </section>
  );
}
