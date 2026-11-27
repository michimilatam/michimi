"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { GoogleButton } from "./GoogleButton";

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

      <GoogleButton next={next} fallback={google} />

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
