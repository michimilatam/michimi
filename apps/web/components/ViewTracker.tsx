"use client";
import { useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

/** Identificador anónimo del navegador para contar visitas únicas por día. */
export function viewerKey(): string {
  try {
    let k = localStorage.getItem("michimi_vk");
    if (!k) { k = crypto.randomUUID(); localStorage.setItem("michimi_vk", k); }
    return k;
  } catch { return "anon"; }
}
export function trackListing(listingId: string, kind: "view" | "share") {
  supabaseBrowser().rpc("record_listing_event", { p_listing: listingId, p_kind: kind, p_key: viewerKey() }).then(() => {});
}

/** Cuenta una visita a la publicación (una por persona por día; el dueño no cuenta). */
export function ViewTracker({ listingId }: { listingId: string }) {
  useEffect(() => { trackListing(listingId, "view"); }, [listingId]);
  return null;
}
