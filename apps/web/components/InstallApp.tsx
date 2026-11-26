"use client";
import { useEffect, useState } from "react";

type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** "Instalá Michimi en tu celular": usa el instalador del navegador o explica cómo en iPhone. */
export function InstallApp() {
  const [evt, setEvt] = useState<BIP | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    navigator.serviceWorker?.register("/sw.js").catch(() => {});
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const h = (e: Event) => { e.preventDefault(); setEvt(e as BIP); };
    window.addEventListener("beforeinstallprompt", h);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  if (installed) return null;
  async function install() {
    if (evt) { await evt.prompt(); await evt.userChoice; setEvt(null); }
    else setHelp((h) => !h);
  }
  return (
    <div className="space-y-2">
      <button onClick={install} className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1.5 font-semibold text-ink hover:border-ink">
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 1h10a2 2 0 0 1 2 2v18a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2zm0 3v14h10V4H7zm4 15.5a1 1 0 1 0 2 0 1 1 0 0 0-2 0z" /></svg>
        Instalá Michimi en tu celular
      </button>
      {help && (
        <p className="max-w-sm text-xs">
          {ios
            ? "En iPhone: abrí michimi.com en Safari, tocá Compartir (el cuadrado con la flecha) y elegí “Agregar a inicio”."
            : "En Android: abrí michimi.com en Chrome, tocá el menú ⋮ y elegí “Instalar app” o “Agregar a pantalla principal”."}
        </p>
      )}
    </div>
  );
}
