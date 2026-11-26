"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

const KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
function b64ToBytes(b64: string) {
  const s = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

/** Activar avisos instantáneos (push) en este dispositivo. */
export function PushToggle({ userId }: { userId: string }) {
  const [state, setState] = useState<"cargando" | "no-soportado" | "bloqueado" | "activo" | "inactivo">("cargando");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return setState("no-soportado");
      if (Notification.permission === "denied") return setState("bloqueado");
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "activo" : "inactivo");
    })().catch(() => setState("no-soportado"));
  }, []);

  async function enable() {
    setMsg(null);
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return setState(perm === "denied" ? "bloqueado" : "inactivo");
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(KEY) });
    const j = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
    const { error } = await supabaseBrowser().from("push_subscriptions").upsert(
      { user_id: userId, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, user_agent: navigator.userAgent.slice(0, 200) },
      { onConflict: "endpoint" },
    );
    if (error) return setMsg(error.message);
    setState("activo");
  }
  async function disable() {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await supabaseBrowser().from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      await sub.unsubscribe();
    }
    setState("inactivo");
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-card border border-line bg-card p-4">
      <span>
        <span className="block font-semibold">Avisos instantáneos en este dispositivo</span>
        <span className="text-sm text-ink-soft">
          {state === "activo" ? "Activados: te avisamos al instante cuando te escriben o te ofertan."
            : state === "bloqueado" ? "Bloqueaste las notificaciones de michimi.com. Habilitalas desde la configuración del navegador (ícono del candado)."
            : state === "no-soportado" ? "Este navegador no permite avisos. En iPhone: primero instalá Michimi en la pantalla de inicio."
            : "Recibí un aviso en el celular o la compu apenas te escriben, aunque Michimi esté cerrado."}
        </span>
        {msg && <span className="block text-sm text-bad">{msg}</span>}
      </span>
      {state === "inactivo" && <button onClick={enable} className="btn-primary h-9 shrink-0 px-4 text-sm">Activar</button>}
      {state === "activo" && <button onClick={disable} className="btn-ghost h-9 shrink-0 px-4 text-sm">Desactivar</button>}
    </div>
  );
}
