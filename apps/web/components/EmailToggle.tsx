"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export function EmailToggle({ userId, initial }: { userId: string; initial: boolean }) {
  const [on, setOn] = useState(initial);
  async function toggle() {
    setOn(!on);
    const { error } = await supabaseBrowser().from("profiles").update({ email_notifications: !on }).eq("id", userId);
    if (error) setOn(on);
  }
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-card border border-line bg-card p-4">
      <span><span className="block font-semibold">Avisos por email</span><span className="text-sm text-ink-soft">Mensajes, ofertas y novedades de tus búsquedas guardadas.</span></span>
      <input type="checkbox" checked={on} onChange={toggle} className="h-5 w-5 accent-[#111]" />
    </label>
  );
}
