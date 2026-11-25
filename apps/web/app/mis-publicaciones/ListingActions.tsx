"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ShareButtons } from "@/components/ShareButtons";

export function ListingActions({ id, title, status }: { id: string; title: string; status: string }) {
  const router = useRouter();
  async function setStatus(s: "activa" | "pausada") {
    await supabaseBrowser().from("listings").update({ status: s }).eq("id", id);
    router.refresh();
  }
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      {status !== "vendida" && <Link href={`/publicacion/${id}/editar`} className="btn-ghost h-9 px-3 text-sm">Editar</Link>}
      {status === "activa" && <button onClick={() => setStatus("pausada")} className="btn-ghost h-9 px-3 text-sm">Pausar</button>}
      {status === "pausada" && <button onClick={() => setStatus("activa")} className="btn-ghost h-9 px-3 text-sm">Reactivar</button>}
      {status === "activa" && <ShareButtons path={`/publicacion/${id}`} title={title} compact />}
    </div>
  );
}
