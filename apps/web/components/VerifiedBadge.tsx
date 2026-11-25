/** Ícono de "Profesional verificado": documento y título/matrícula revisados por Michimi. */
export function VerifiedBadge({ label = false, size = 18 }: { label?: boolean; size?: number }) {
  const icon = (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <path fill="#1d9bf0" d="M12 1.5l2.6 1.9 3.2-.1 1 3 2.6 1.9-1 3 1 3-2.6 1.9-1 3-3.2-.1L12 22.5l-2.6-1.9-3.2.1-1-3-2.6-1.9 1-3-1-3 2.6-1.9 1-3 3.2.1z" />
      <path fill="#fff" d="M10.6 15.6 7.4 12.4l1.4-1.4 1.8 1.8 4.6-4.6 1.4 1.4z" />
    </svg>
  );
  if (!label) return <span title="Profesional verificado por Michimi" className="inline-flex"><span className="sr-only">Profesional verificado</span>{icon}</span>;
  return (
    <span title="Documento y título revisados por Michimi" className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#1d9bf0]/10 py-0.5 pl-0.5 pr-2 text-xs font-semibold text-[#0c7abf]">
      {icon}Verificado
    </span>
  );
}
