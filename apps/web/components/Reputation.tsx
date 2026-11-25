import { BADGE_LABEL, summarize } from "@michimi/core";

/** Bloque de reputación de UN rol. Comprador y vendedor se muestran siempre por separado. */
export function RoleReputation({ role, scores, completed }: { role: "seller" | "buyer"; scores: number[]; completed: number }) {
  const r = summarize(scores);
  const title = role === "seller" ? "Como vendedor" : "Como comprador";
  const tone = r.badge === "en_observacion" ? "text-bad" : r.badge === "nuevo" ? "text-ink-soft" : "text-ok";
  return (
    <div className="rounded-card border border-line bg-card p-4">
      <p className="text-sm text-ink-soft">{title}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums">
        {r.count ? r.score.toFixed(1) : "—"}
        <span className="ml-1 text-base font-medium text-ink-soft">/ 5</span>
      </p>
      <p className={`text-sm font-semibold ${tone}`}>{BADGE_LABEL[r.badge]}</p>
      <p className="mt-2 text-sm text-ink-soft">
        {r.count} {r.count === 1 ? "calificación" : "calificaciones"} · {completed} {role === "seller" ? "ventas" : "compras"} completadas
      </p>
    </div>
  );
}
