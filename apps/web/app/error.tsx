"use client";
import { useEffect } from "react";

/** Error amable en español. Un recargar suele alcanzar (por ejemplo, justo después de una actualización). */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="mx-auto max-w-md space-y-3 py-16 text-center">
      <p className="text-2xl font-bold">Algo no cargó bien</p>
      <p className="text-ink-soft">Puede ser una actualización de Michimi en curso. Probá de nuevo en unos segundos.</p>
      <div className="flex justify-center gap-2">
        <button onClick={() => { reset(); location.reload(); }} className="btn-primary">Recargar</button>
        <a href="/" className="btn-ghost">Ir al inicio</a>
      </div>
      {error.digest && <p className="text-xs text-ink-soft">Código: {error.digest}</p>}
    </div>
  );
}
