// Handicap-Schätzung (WHS-orientiert, pragmatisch). Reine Funktionen.
import { Course, CourseTee } from "./courses";
import { HoleScore } from "./types";

/** Erhaltene Vorgabeschläge auf einem Loch bei gegebenem Course-Handicap. */
function strokesReceived(si: number, courseHandicap: number): number {
  const ch = Math.max(0, Math.round(courseHandicap));
  const base = Math.floor(ch / 18);
  const extra = ch % 18;
  return base + (si <= extra ? 1 : 0);
}

/** Net Double Bogey = Par + 2 + erhaltene Vorgabeschläge (als Score-Obergrenze). */
export function netDoubleBogey(
  par: number,
  si: number,
  courseHandicap: number,
  strokes: number
): number {
  const cap = par + 2 + strokesReceived(si, courseHandicap);
  return Math.min(strokes, cap);
}

/**
 * Adjustierter Brutto-Score: Summe der per Net Double Bogey gecappten Löcher.
 * Ist `courseHandicap` NaN, wird nicht gecappt (Roh-Summe).
 */
export function adjustedGross(
  course: Course,
  holes: HoleScore[],
  courseHandicap: number
): number {
  const byNum = new Map(course.holes.map((h) => [h.hole, h]));
  let sum = 0;
  for (const h of holes) {
    const def = byNum.get(h.hole);
    if (!def) continue;
    sum += Number.isNaN(courseHandicap)
      ? h.strokes
      : netDoubleBogey(def.par, def.si, courseHandicap, h.strokes);
  }
  return sum;
}

/**
 * Score Differential = (113/slope) × (adjGross − CR).
 * 18 Löcher: volle CR. 9 Löcher: CR/2, Ergebnis ×2 (auf 18). < 9 → null.
 */
export function scoreDifferential(
  adjGross: number,
  tee: CourseTee,
  holesPlayed: number
): number | null {
  if (holesPlayed >= 18) {
    return (113 / tee.slope) * (adjGross - tee.cr);
  }
  if (holesPlayed >= 9) {
    const nine = (113 / tee.slope) * (adjGross - tee.cr / 2);
    return nine * 2;
  }
  return null;
}

/** WHS-Reduktionstabelle: wie viele der besten Differentials zählen. */
function countBest(n: number): number {
  if (n >= 20) return 8;
  if (n >= 19) return 7;
  if (n >= 17) return 6;
  if (n >= 15) return 5;
  if (n >= 12) return 4;
  if (n >= 9)  return 4; // korrigiert: war 3
  if (n >= 7)  return 2; // korrigiert: war 3
  if (n >= 5)  return 2;
  if (n >= 3)  return 1;
  return 0; // < 3 Runden: noch keine belastbare Schätzung
}

/** Geschätzter Index = Ø der besten K der letzten 20 Differentials. */
export function estimateHandicap(differentials: number[]): number | null {
  const last20 = differentials.slice(-20);
  const k = countBest(last20.length);
  if (k === 0) return null;
  const best = last20.slice().sort((a, b) => a - b).slice(0, k);
  return best.reduce((a, b) => a + b, 0) / best.length;
}

export interface RoundHandicap {
  differential: number | null;
  counts: boolean; // handicap-wirksam (≥ 9 Löcher)?
}

/** Differential einer einzelnen Runde + ob sie handicap-wirksam ist. */
export function roundHandicap(
  course: Course,
  tee: CourseTee,
  holes: HoleScore[],
  baseHandicap: number
): RoundHandicap {
  const played = holes.filter((h) =>
    course.holes.some((c) => c.hole === h.hole)
  ).length;
  if (played < 9) return { differential: null, counts: false };
  const adj = adjustedGross(course, holes, baseHandicap);
  return { differential: scoreDifferential(adj, tee, played), counts: true };
}
