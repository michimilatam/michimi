"use client";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export function SearchRow({ id, label, href, nuevos }: { id: string; label: string; href: string; nuevos: number }) {
  const router = useRouter();
  async function open() {
    await supabaseBrowser().from("saved_searches").update({ last_seen_at: new Date().toISOString() }).eq("id", id);
    router.push(href);
  }
  async function remove() {
    await supabaseBrowser().from("saved_searches").delete().eq("id", id);
    router.refresh();
  }
  return (
    <li className="flex items-center gap-3 p-3">
      <button onClick={open} className="min-w-0 flex-1 text-left">
        <span className="block truncate font-semibold hover:underline">{label}</span>
        <span className={`text-sm ${nuevos ? "font-semibold text-ink" : "text-ink-soft"}`}>{nuevos ? `${nuevos} nueva${nuevos > 1 ? "s" : ""}` : "Sin novedades"}</span>
      </button>
      {nuevos > 0 && <span className="rounded-full bg-lima px-2 py-0.5 text-xs font-bold text-ink">{nuevos}</span>}
      <button onClick={remove} className="text-sm text-ink-soft underline">Borrar</button>
    </li>
  );
}
