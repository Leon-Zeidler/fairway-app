// Reine Helfer rund um strukturierte Steps und das Material-Inventar.
// Kein React, keine Seiteneffekte → vollständig unit-testbar.

import { GearId, GearItem, Step } from "./types";

export type StepStatus = "ok" | "adapted" | "unavailable";

/** Alle bekannten Material-IDs (für Validierung & Tests). */
export const GEAR_IDS: GearId[] = [
  "foam-roller",
  "band",
  "barbell",
  "dumbbells",
  "pull-up-bar",
  "bench",
  "cable",
  "kettlebell",
  "med-ball",
];

/** Wandelt das alte String-Format ("Name — Detail") in einen Step. Idempotent. */
export function normalizeStep(s: string | Step): Step {
  if (typeof s !== "string") return s;
  const [name, ...rest] = s.split(" — ");
  return { name: name.trim(), detail: rest.join(" — ").trim() };
}

/** Baut aus dem Inventar eine id→available-Map. */
export function gearRecord(items: GearItem[]): Record<GearId, boolean> {
  const rec = {} as Record<GearId, boolean>;
  for (const g of items) rec[g.id] = g.available;
  return rec;
}

/**
 * Löst die Material-Verfügbarkeit pro Schritt auf:
 *  - kein gear ODER verfügbar      → ok (Original)
 *  - gear fehlt UND alt vorhanden  → adapted (alt-Variante)
 *  - gear fehlt UND kein alt       → unavailable (Original, markiert)
 * Ein fehlender Eintrag in `gear` gilt als verfügbar.
 */
export function resolveSteps(
  steps: Step[],
  gear: Record<GearId, boolean>
): { step: Step; status: StepStatus }[] {
  return steps.map((step) => {
    if (!step.gear || gear[step.gear] !== false) return { step, status: "ok" as const };
    if (step.alt) return { step: { ...step.alt }, status: "adapted" as const };
    return { step, status: "unavailable" as const };
  });
}
