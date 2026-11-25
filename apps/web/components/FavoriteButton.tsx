"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

/** Corazón de favorito. Funciona dentro de tarjetas que son links (no navega). */
export function FavoriteButton({ listingId, initial, loggedIn = true, className = "" }: { listingId: string; initial: boolean; loggedIn?: boolean; className?: string }) {
  const router = useRouter();
  const [on, setOn] = useState(initial);
  async function toggle(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    if (!loggedIn) return router.push(`/ingresar?next=/publicacion/${listingId}`);
    const supabase = supabaseBrowser();
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return router.push(`/ingresar?next=/publicacion/${listingId}`);
    setOn(!on);
    const r = on
      ? await supabase.from("favorites").delete().eq("user_id", u.user.id).eq("listing_id", listingId)
      : await supabase.from("favorites").insert({ user_id: u.user.id, listing_id: listingId });
    if (r.error) setOn(on);
  }
  return (
    <button type="button" onClick={toggle} aria-pressed={on} aria-label={on ? "Quitar de favoritos" : "Guardar en favoritos"}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card/90 shadow-sm ring-1 ring-line hover:ring-ink ${className}`}>
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 21s-7.5-4.6-9.5-9.3C1.2 8.4 3.3 5 6.8 5c2 0 3.4 1.1 4.2 2.4h2C13.8 6.1 15.2 5 17.2 5c3.5 0 5.6 3.4 4.3 6.7C19.5 16.4 12 21 12 21z"
          fill={on ? "#e5484d" : "none"} stroke={on ? "#e5484d" : "currentColor"} strokeWidth="1.8" />
      </svg>
    </button>
  );
}
