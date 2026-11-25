"use client";
import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

const REASONS = { estafa: "Intento de estafa", ofensivo: "Mensajes ofensivos", spam: "Spam", otro: "Otro motivo" } as const;

/** Menú ⋯ del chat: bloquear / desbloquear y denunciar la conversación. */
export function ChatMenu({ conversationId, otherId, otherName, blocked, onBlocked }: {
  conversationId: string; otherId: string; otherName: string; blocked: boolean; onBlocked: (b: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) { setOpen(false); setReporting(false); } };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  async function toggleBlock() {
    const supabase = supabaseBrowser();
    const r = blocked
      ? await supabase.from("blocks").delete().eq("blocked_id", otherId)
      : await supabase.from("blocks").insert({ blocked_id: otherId });
    if (r.error) return setMsg(r.error.message);
    onBlocked(!blocked);
    setOpen(false);
  }
  async function report(reason: keyof typeof REASONS) {
    const supabase = supabaseBrowser();
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("reports").insert({ reporter_id: u.user!.id, reported_user_id: otherId, conversation_id: conversationId, reason });
    setMsg(error ? error.message : "Denuncia enviada. La revisamos.");
    setReporting(false);
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={() => { setOpen(!open); setMsg(null); }} aria-label="Más opciones" aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-full text-xl leading-none hover:bg-paper">⋯</button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-64 overflow-hidden rounded-card border border-line bg-card text-[15px] shadow-lg">
          {msg ? <p className="p-3 text-sm">{msg}</p> : reporting ? (
            <div className="p-1">
              <p className="px-3 py-2 text-xs font-semibold text-ink-soft">¿Por qué denunciás a {otherName}?</p>
              {Object.entries(REASONS).map(([k, v]) => (
                <button key={k} onClick={() => report(k as keyof typeof REASONS)} className="block w-full px-3 py-2 text-left hover:bg-paper">{v}</button>
              ))}
            </div>
          ) : (
            <>
              <button onClick={() => setReporting(true)} className="block w-full px-4 py-2.5 text-left hover:bg-paper">Denunciar conversación</button>
              <button onClick={toggleBlock} className="block w-full px-4 py-2.5 text-left text-bad hover:bg-paper">{blocked ? `Desbloquear a ${otherName}` : `Bloquear a ${otherName}`}</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
