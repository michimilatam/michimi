"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export function VerificationActions({ id }: { id: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  async function resolve(status: "aprobada" | "rechazada") {
    const { error } = await supabaseBrowser().from("verification_requests").update({ status, reviewer_note: note.trim() || null }).eq("id", id);
    if (error) setErr(error.message); else router.refresh();
  }
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <input value={note} onChange={(e) => setNote(e.target.value)} className="field h-9 max-w-xs text-sm" placeholder="Nota (opcional)" />
      <button onClick={() => resolve("aprobada")} className="btn-primary h-9 px-4 text-sm">Aprobar</button>
      <button onClick={() => resolve("rechazada")} className="btn-ghost h-9 px-4 text-sm">Rechazar</button>
      {err && <p className="w-full text-sm text-bad">{err}</p>}
    </div>
  );
}

export function ReportActions({ id, listingId, listingStatus }: { id: string; listingId: string | null; listingStatus: string | null }) {
  const router = useRouter();
  async function set(status: "resuelto" | "descartado", pause = false) {
    const supabase = supabaseBrowser();
    if (pause && listingId) await supabase.from("listings").update({ status: "pausada" }).eq("id", listingId);
    await supabase.from("reports").update({ status }).eq("id", id);
    router.refresh();
  }
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {listingId && listingStatus === "activa" && <button onClick={() => set("resuelto", true)} className="btn-primary h-9 px-4 text-sm">Pausar publicación y resolver</button>}
      <button onClick={() => set("resuelto")} className="btn-ghost h-9 px-4 text-sm">Marcar resuelta</button>
      <button onClick={() => set("descartado")} className="btn-ghost h-9 px-4 text-sm">Descartar</button>
    </div>
  );
}

export function ListingModeration({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  async function set(s: "activa" | "pausada") {
    await supabaseBrowser().from("listings").update({ status: s }).eq("id", id);
    router.refresh();
  }
  if (status === "activa") return <button onClick={() => set("pausada")} className="btn-ghost h-9 px-3 text-sm">Pausar</button>;
  if (status === "pausada") return <button onClick={() => set("activa")} className="btn-ghost h-9 px-3 text-sm">Reactivar</button>;
  return null;
}
