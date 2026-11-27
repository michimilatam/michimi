"use client";
import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

/**
 * "Acceder con Google" nativo (Google Identity Services).
 * La ventana de Google muestra "michimi.com" en vez del dominio técnico de Supabase,
 * porque el inicio de sesión se hace desde nuestra página y Supabase solo valida el token.
 * Si falta el Client ID, cae al flujo clásico (redirección vía Supabase).
 */
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

type Gsi = {
  accounts: { id: {
    initialize: (o: Record<string, unknown>) => void;
    renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
  } };
};
declare global { interface Window { google?: Gsi } }

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function GoogleButton({ next, fallback }: { next: string; fallback: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;
    const raw = crypto.randomUUID() + crypto.randomUUID();
    const init = async () => {
      if (cancelled || !window.google || !ref.current) return;
      const hashed = await sha256(raw);
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        nonce: hashed,
        use_fedcm_for_prompt: true,
        callback: async ({ credential }: { credential: string }) => {
          const { error } = await supabaseBrowser().auth.signInWithIdToken({ provider: "google", token: credential, nonce: raw });
          if (error) return setErr("No pudimos ingresar con Google. Probá de nuevo o usá tu email.");
          window.location.assign(next);
        },
      });
      window.google.accounts.id.renderButton(ref.current, {
        type: "standard", theme: "outline", size: "large", shape: "pill", text: "continue_with",
        locale: "es", width: ref.current.offsetWidth || 320,
      });
      setReady(true);
    };
    if (window.google) void init();
    else {
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.onload = () => void init();
      s.onerror = () => setErr("no-gsi");
      document.head.appendChild(s);
    }
    return () => { cancelled = true; };
  }, [next]);

  if (!CLIENT_ID || err === "no-gsi") {
    return (
      <button onClick={fallback} className="btn-ghost mt-8 w-full">
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
          <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
        </svg>
        Continuar con Google
      </button>
    );
  }
  return (
    <div className="mt-8">
      <div ref={ref} className="flex min-h-[44px] w-full justify-center" />
      {!ready && <p className="text-center text-sm text-ink-soft">Cargando Google…</p>}
      {err && err !== "no-gsi" && <p className="mt-2 text-sm text-bad">{err}</p>}
    </div>
  );
}
