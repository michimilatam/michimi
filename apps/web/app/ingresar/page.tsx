"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

function Ingresar() {
  const next = useSearchParams().get("next") ?? "/";
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const redirectTo = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function google() {
    const supabase = supabaseBrowser();
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectTo() } });
  }
  async function magicLink(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo() } });
    setState(error ? "error" : "sent");
  }

  return (
    <div className="mx-auto max-w-sm py-10">
      <h1 className="text-3xl font-bold">Entrá a Michimi</h1>
      <p className="mt-2 text-ink-soft">Con una sola cuenta comprás y vendés. Tu reputación se construye en cada operación.</p>

      <button onClick={google} className="btn-ghost mt-8 w-full">
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
          <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
        </svg>
        Continuar con Google
      </button>

      <div className="my-6 flex items-center gap-3 text-sm text-ink-soft"><span className="h-px flex-1 bg-line" />o con tu email<span className="h-px flex-1 bg-line" /></div>

      {state === "sent" ? (
        <p className="rounded-xl bg-lima/30 p-4">Te mandamos un enlace a <b>{email}</b>. Abrilo desde este dispositivo.</p>
      ) : (
        <form onSubmit={magicLink} className="space-y-3">
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="field" autoComplete="email" />
          <button disabled={state === "sending"} className="btn-primary w-full">{state === "sending" ? "Enviando…" : "Recibir enlace de ingreso"}</button>
          {state === "error" && <p className="text-sm text-bad">No pudimos enviar el enlace. Revisá el email e intentá de nuevo.</p>}
        </form>
      )}
      <p className="mt-6 text-xs text-ink-soft">Nunca mostramos tu email ni tu teléfono en tu perfil público.</p>
    </div>
  );
}

export default function Page() {
  return <Suspense><Ingresar /></Suspense>;
}
