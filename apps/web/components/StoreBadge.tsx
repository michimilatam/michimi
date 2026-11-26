/** Sello "Comercio": tienda registrada en el piloto de comercios de Michimi. */
export function StoreBadge({ label = false, size = 18 }: { label?: boolean; size?: number }) {
  const icon = (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <rect x="1.5" y="1.5" width="21" height="21" rx="6" fill="#1a1a1a" />
      <path fill="#c6f432" d="M6 9.2 7.2 6h9.6L18 9.2a2 2 0 0 1-3.4 1.4 2 2 0 0 1-2.6.4 2 2 0 0 1-2.6-.4A2 2 0 0 1 6 9.2Zm1.2 3.1c.6.2 1.3.2 1.9 0V17h5.8v-4.7c.6.2 1.3.2 1.9 0V18H7.2z" />
    </svg>
  );
  if (!label) return <span title="Comercio en Michimi" className="inline-flex"><span className="sr-only">Comercio</span>{icon}</span>;
  return (
    <span title="Comercio registrado en Michimi" className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ink/10 py-0.5 pl-0.5 pr-2 text-xs font-semibold text-ink">
      {icon}Comercio
    </span>
  );
}
