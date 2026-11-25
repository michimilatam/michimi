import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { supabase } from "./supabase";

/** Total de mensajes sin leer; se refresca en tiempo real y al volver a la app. */
export function useUnread(userId: string | null) {
  const [count, setCount] = useState(0);
  const refresh = useCallback(async () => {
    if (!userId) return setCount(0);
    const { data } = await supabase.rpc("unread_counts");
    setCount(((data as { unread: number }[] | null) ?? []).reduce((a, r) => a + Number(r.unread), 0));
  }, [userId]);
  useEffect(() => {
    refresh();
    if (!userId) return;
    const ch = supabase.channel(`unread:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => refresh())
      .subscribe();
    const sub = AppState.addEventListener("change", (s) => { if (s === "active") refresh(); });
    const t = setInterval(refresh, 30_000);
    return () => { supabase.removeChannel(ch); sub.remove(); clearInterval(t); };
  }, [refresh, userId]);
  return count;
}
