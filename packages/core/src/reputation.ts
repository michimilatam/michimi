/**
 * Reputation module — two-sided ratings.
 *
 * Rules (enforced again in the database; this module is the readable spec):
 *  1. Only parties of a COMPLETED operation can rate, once each.
 *  2. The buyer rates the seller (role "seller"); the seller rates the buyer (role "buyer").
 *  3. Double-blind: a rating is hidden until the counterpart also rates,
 *     or 14 days pass. Prevents retaliation ratings.
 *  4. Seller and buyer reputations are separate numbers.
 *  5. Few ratings ≠ perfect score: we show a Bayesian average so 1×5★ doesn't beat 80×4.8★.
 */

export type RatedRole = "seller" | "buyer";

export const RATING_CRITERIA = {
  seller: {
    descripcion_fiel: "El producto era como lo describió",
    comunicacion: "Respondió rápido y claro",
    puntualidad: "Cumplió lo acordado (hora, lugar)",
  },
  buyer: {
    compromiso: "Cumplió la oferta que hizo",
    comunicacion: "Respondió rápido y claro",
    puntualidad: "Llegó a tiempo / pagó lo acordado",
  },
} as const;

export const BLIND_WINDOW_DAYS = 14;

/** Prior: behaves as if every user started with PRIOR_COUNT ratings of PRIOR_MEAN. */
const PRIOR_MEAN = 4.0;
const PRIOR_COUNT = 5;

export interface RoleReputation {
  count: number;
  average: number | null; // raw mean, null if no ratings
  score: number; // bayesian, 0–5, what we rank and show
  badge: "nuevo" | "confiable" | "destacado" | "en_observacion";
}

export function summarize(scores: readonly number[]): RoleReputation {
  const count = scores.length;
  const sum = scores.reduce((a, b) => a + b, 0);
  const average = count ? sum / count : null;
  const score = (PRIOR_MEAN * PRIOR_COUNT + sum) / (PRIOR_COUNT + count);
  return { count, average, score: Math.round(score * 10) / 10, badge: badgeFor(count, average) };
}

function badgeFor(count: number, average: number | null): RoleReputation["badge"] {
  if (count < 3 || average === null) return "nuevo";
  if (average < 3.5) return "en_observacion";
  if (count >= 20 && average >= 4.7) return "destacado";
  return "confiable";
}

export const BADGE_LABEL: Record<RoleReputation["badge"], string> = {
  nuevo: "Nuevo en Michimi",
  confiable: "Confiable",
  destacado: "Destacado",
  en_observacion: "En observación",
};

/** Is this rating visible to the public right now? */
export function isRatingVisible(opts: {
  createdAt: Date;
  counterpartRated: boolean;
  now?: Date;
}): boolean {
  const now = opts.now ?? new Date();
  const ageDays = (now.getTime() - opts.createdAt.getTime()) / 86_400_000;
  return opts.counterpartRated || ageDays >= BLIND_WINDOW_DAYS;
}
