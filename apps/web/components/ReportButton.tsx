"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

const REASONS = { estafa: "Posible estafa", producto_falso: "Producto falso o réplica", precio_sospechoso: "Precio sospechoso", spam: "Spam o duplicado", ofensivo: "Contenido ofensivo", otro: "Otro motivo" } as const;

export function ReportButton({ listingId, sellerId, loggedIn }: { listingId: string; sellerId: string; loggedIn: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const supabase = supabaseBrowser();
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("reports").insert({
      reporter_id: u.user!.id, listing_id: listingId, reported_user_id: sellerId,
      reason: String(f.get("reason")), details: String(f.get("details") ?? "").trim() || null,
    });
    if (error) setErr(error.message); else setDone(true);
  }
  if (done) return <p className="text-sm text-ink-soft">Gracias. Revisamos la denuncia y actuamos si corresponde.</p>;
  if (!open) return <button type="button" onClick={() => (loggedIn ? setOpen(true) : router.push(`/ingresar?next=/publicacion/${listingId}`))} className="text-sm text-ink-soft underline">Denunciar publicación</button>;
  return (
    <form onSubmit={onSubmit} className="space-y-2 rounded-card border border-line bg-card p-3">
      <select name="reason" className="field" defaultValue="estafa">{Object.entries(REASONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      <input name="details" className="field" placeholder="Contanos qué pasó (opcional)" />
      {err && <p className="text-sm text-bad">{err}</p>}
      <div className="flex gap-2"><button className="btn-primary h-9 px-4 text-sm">Enviar denuncia</button><button type="button" onClick={() => setOpen(false)} className="btn-ghost h-9 px-4 text-sm">Cancelar</button></div>
    </form>
  );
}
