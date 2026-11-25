"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export function SaveSearch({ query, filters, country, loggedIn }: { query: string; filters: Record<string, string>; country: string; loggedIn: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  async function save() {
    if (!loggedIn) return router.push("/ingresar?next=/busquedas");
    setState("saving");
    const supabase = supabaseBrowser();
    const { data: u } = await supabase.auth.getUser();
    const clean = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    const { error } = await supabase.from("saved_searches").insert({ user_id: u.user!.id, query: query || null, filters: clean, country });
    setState(error ? "idle" : "saved");
  }
  if (state === "saved") return <a href="/busquedas" className="text-sm font-semibold underline decoration-lima decoration-2 underline-offset-4">Búsqueda guardada · ver mis búsquedas</a>;
  return (
    <button type="button" onClick={save} disabled={state === "saving"} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-card px-3 text-sm font-semibold hover:border-ink">
      <span aria-hidden="true">🔔</span> Guardar búsqueda y avisarme
    </button>
  );
}
