/**
 * Operation (transaction) lifecycle — "expediente" of a deal.
 *
 *   offer accepted ─▶ reservada ─▶ entregada (buyer gives PIN to seller) ─▶ completada
 *                         │
 *                         └──▶ cancelada (either party, or auto after reserve expires)
 *
 * v1 has no in-app payment: "completada" means the seller entered the buyer's
 * delivery PIN in person. That PIN is the proof that unlocks ratings.
 */
export type OperationStatus = "reservada" | "completada" | "cancelada";

export const OPERATION_LABEL: Record<OperationStatus, string> = {
  reservada: "Reservada",
  completada: "Completada",
  cancelada: "Cancelada",
};

export const RESERVE_MINUTES_DEFAULT = 30;
export const OFFER_TTL_HOURS = 24;

export function canRate(status: OperationStatus): boolean {
  return status === "completada";
}
