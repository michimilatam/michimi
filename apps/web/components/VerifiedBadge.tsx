/** Distintivo "Profesional verificado": documento y título/matrícula revisados por Michimi. */
export function VerifiedBadge({ label = false }: { label?: boolean }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-lima px-1.5 py-0.5 text-[11px] font-bold text-ink" title="Profesional verificado por Michimi">
      <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" /></svg>
      {label ? "Profesional verificado" : <span className="sr-only">Profesional verificado</span>}
    </span>
  );
}
