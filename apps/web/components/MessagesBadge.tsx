"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";

export const READ_EVENT = "michimi:read";

/** Link "Mensajes" con globo de no leídos. Se actualiza en tiempo real y al volver a la pestaña. */
export function MessagesBadge({ userId }: { userId: string }) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    const { data } = await supabaseBrowser().rpc("unread_counts");
    setCount(((data as { unread: number }[] | null) ?? []).reduce((a, r) => a + Number(r.unread), 0));
  }, []);

  useEffect(() => {
    refresh();
    const supabase = supabaseBrowser();
    const ch = supabase
      .channel(`unread:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (p) => {
        if ((p.new as { sender_id: string | null }).sender_id !== userId) refresh();
      })
      .subscribe();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    window.addEventListener(READ_EVENT, onFocus);
    const t = setInterval(refresh, 60_000);
    return () => {
      supabase.removeChannel(ch);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(READ_EVENT, onFocus);
      clearInterval(t);
    };
  }, [refresh, userId]);

  return (
    <Link href="/mensajes" className="relative inline-flex h-10 items-center px-1 text-sm" aria-label={count ? `Mensajes, ${count} sin leer` : "Mensajes"}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" strokeLinejoin="round" />
      </svg>
      <span className="ml-1.5 hidden sm:inline">Mensajes</span>
      {count > 0 && (
        <span className="absolute -right-1 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-lima px-1 text-[11px] font-bold text-ink ring-2 ring-ink">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
