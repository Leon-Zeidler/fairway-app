// Runden-Performance, Weg-zu-Scratch-Benchmarks & Schläger-Empfehlung.
// Reine Funktionen (kein React) — leicht testbar.

import { Session, HoleScore } from "./types";
import { Course } from "./courses";

/* ── Runden-Stats ────────────────────────────────────────────────── */

/** Hat diese (Platz-)Session erfassbare Performance-Daten? */
export function hasRoundStats(s: Session): boolean {
  return (
    s.type === "course" &&
    (s.strokes != null ||
      s.girHit != null ||
      s.fairwaysHit != null ||
      s.putts != null ||
      s.scramblingMade != null ||
      s.penalties != null)
  );
}

export interface RoundStats {
  holes: number; // 9 | 18
  toPar: number | null; // strokes - coursePar
  strokes: number | null;
  fairwayPct: number | null; // 0..1
  girHit: number | null;
  girPct: number | null; // 0..1
  putts: number | null;
  scramblingPct: number | null; // 0..1
  penalties: number | null;
}

export function roundStats(s: Session): RoundStats {
  const holes = s.holesPlayed ?? 18;
  const toPar =
    s.strokes != null && s.coursePar != null ? s.strokes - s.coursePar : null;
  const fairwayPct =
    s.fairwaysHit != null && s.fairwaysPossible
      ? s.fairwaysHit / s.fairwaysPossible
      : null;
  const girPct = s.girHit != null && holes ? s.girHit / holes : null;
  const scramblingPct =
    s.scramblingMade != null && s.scramblingTries
      ? s.scramblingMade / s.scramblingTries
      : null;
  return {
    holes,
    toPar,
    strokes: s.strokes ?? null,
    fairwayPct,
    girHit: s.girHit ?? null,
    girPct,
    putts: s.putts ?? null,
    scramblingPct,
    penalties: s.penalties ?? null,
  };
}

/* ── Aggregat über mehrere Runden (auf 18 Löcher normalisiert) ───── */

export interface Aggregate {
  rounds: number;
  scoringToPar18: number | null; // Ø Schläge zu Par, hochgerechnet auf 18
  girPct: number | null;
  fairwayPct: number | null;
  puttsPer18: number | null;
  scramblingPct: number | null;
  penaltiesPer18: number | null;
}

function avg(nums: number[]): number | null {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
}

export function aggregate(sessions: Session[]): Aggregate {
  const rounds = sessions.filter(hasRoundStats);
  const per18 = (v: number, holes: number) => (v * 18) / (holes || 18);

  const toPar: number[] = [];
  const gir: number[] = [];
  const fw: number[] = [];
  const putts: number[] = [];
  const scr: number[] = [];
  const pen: number[] = [];

  for (const s of rounds) {
    const r = roundStats(s);
    if (r.toPar != null) toPar.push(per18(r.toPar, r.holes));
    if (r.girPct != null) gir.push(r.girPct);
    if (r.fairwayPct != null) fw.push(r.fairwayPct);
    if (r.putts != null) putts.push(per18(r.putts, r.holes));
    if (r.scramblingPct != null) scr.push(r.scramblingPct);
    if (r.penalties != null) pen.push(per18(r.penalties, r.holes));
  }

  return {
    rounds: rounds.length,
    scoringToPar18: avg(toPar),
    girPct: avg(gir),
    fairwayPct: avg(fw),
    puttsPer18: avg(putts),
    scramblingPct: avg(scr),
    penaltiesPer18: avg(pen),
  };
}

/* ── Weg zu Scratch: Benchmarks & Schwachstellen-Analyse ─────────── */

export type MetricKey =
  | "scoring"
  | "gir"
  | "fairways"
  | "putts"
  | "scrambling"
  | "penalties";

interface MetricDef {
  key: MetricKey;
  label: string;
  target: number; // Scratch-Richtwert (pro 18 bzw. Quote 0..1)
  dir: "higher" | "lower";
  isSkill: boolean; // zählt für die Schwachstellen-Analyse (Score = Ergebnis, nicht Ursache)
  href: string; // passende Übung/Seite
  advice: string;
  value: (a: Aggregate) => number | null;
  fmt: (v: number) => string;
}

const pct = (v: number) => `${Math.round(v * 100)} %`;
const signed = (v: number) => (v > 0 ? `+${Math.round(v)}` : `${Math.round(v)}`);
const one = (v: number) => v.toFixed(1);

// Scratch-Richtwerte pro 18 Löcher (gängige Werte für HCP ~0).
export const SCRATCH_METRICS: MetricDef[] = [
  {
    key: "scoring",
    label: "Score zu Par",
    target: 2,
    dir: "lower",
    isSkill: false,
    href: "/training",
    advice: "Dein Gesamtergebnis — folgt aus den Bereichen unten.",
    value: (a) => a.scoringToPar18,
    fmt: signed,
  },
  {
    key: "gir",
    label: "Grüns in Regulation",
    target: 0.67, // ~12/18
    dir: "higher",
    isSkill: true,
    href: "/programm/range-path",
    advice: "Konstanteres Eisenspiel — Annäherungen aufs Grün. Swing Path üben.",
    value: (a) => a.girPct,
    fmt: pct,
  },
  {
    key: "fairways",
    label: "Fairways getroffen",
    target: 0.71, // ~10/14
    dir: "higher",
    isSkill: true,
    href: "/programm/range-driver",
    advice: "Mehr Fairways = einfachere Annäherungen. Driver-Kontrolle trainieren.",
    value: (a) => a.fairwayPct,
    fmt: pct,
  },
  {
    key: "putts",
    label: "Putts / Runde",
    target: 30,
    dir: "lower",
    isSkill: true,
    href: "/programm/kurzspiel",
    advice: "Distanzkontrolle & 3-Putts vermeiden. Lag-Putting üben.",
    value: (a) => a.puttsPer18,
    fmt: (v) => one(v),
  },
  {
    key: "scrambling",
    label: "Scrambling (Up&Down)",
    target: 0.58,
    dir: "higher",
    isSkill: true,
    href: "/programm/kurzspiel",
    advice: "Grün verfehlt? Up&Down retten. Chip- & Pitch-Drills.",
    value: (a) => a.scramblingPct,
    fmt: pct,
  },
  {
    key: "penalties",
    label: "Strafschläge / Runde",
    target: 1,
    dir: "lower",
    isSkill: true,
    href: "/turnier",
    advice: "Schläge verschenkt — sicherere Linien & Course-Management.",
    value: (a) => a.penaltiesPer18,
    fmt: one,
  },
];

export interface BenchmarkRow {
  key: MetricKey;
  label: string;
  value: number | null;
  valueText: string;
  targetText: string;
  onTrack: boolean;
  /** 0..1 Fortschritt Richtung Scratch (für Balken). */
  progress: number;
  severity: number; // wie weit vom Ziel (für Ranking); 0 = am/über Ziel
  dir: "higher" | "lower";
  href: string;
  advice: string;
  isSkill: boolean;
}

function severityOf(def: MetricDef, value: number): number {
  if (def.dir === "higher") return Math.max(0, (def.target - value) / def.target);
  return Math.max(0, (value - def.target) / def.target);
}

function progressOf(def: MetricDef, value: number): number {
  // grobe, robuste Skala: 1 = Ziel erreicht/übertroffen
  if (def.dir === "higher") {
    return Math.max(0, Math.min(1, value / def.target));
  }
  // lower-is-better: bei doppeltem Zielwert → 0, bei Ziel → 1
  return Math.max(0, Math.min(1, (2 * def.target - value) / def.target));
}

export function benchmarkRows(agg: Aggregate): BenchmarkRow[] {
  return SCRATCH_METRICS.map((def) => {
    const value = def.value(agg);
    if (value == null) {
      return {
        key: def.key,
        label: def.label,
        value: null,
        valueText: "—",
        targetText: def.fmt(def.target),
        onTrack: false,
        progress: 0,
        severity: 0,
        dir: def.dir,
        href: def.href,
        advice: def.advice,
        isSkill: def.isSkill,
      };
    }
    const onTrack =
      def.dir === "higher" ? value >= def.target : value <= def.target;
    return {
      key: def.key,
      label: def.label,
      value,
      valueText: def.fmt(value),
      targetText: def.fmt(def.target),
      onTrack,
      progress: progressOf(def, value),
      severity: severityOf(def, value),
      dir: def.dir,
      href: def.href,
      advice: def.advice,
      isSkill: def.isSkill,
    };
  });
}

/** Größter Hebel Richtung Scratch (Skill-Bereich mit größter Lücke). */
export function topFocus(agg: Aggregate): BenchmarkRow | null {
  const rows = benchmarkRows(agg).filter(
    (r) => r.isSkill && r.value != null && r.severity > 0.001
  );
  if (!rows.length) return null;
  return rows.sort((a, b) => b.severity - a.severity)[0];
}

/* ── Schläger-Empfehlung („Welcher Schläger?") ───────────────────── */

/** Carry-Distanz aus Freitext ("150–155 m", "240 m", "— m") → Zahl. */
export function parseDistance(text: string): number | null {
  const nums = (text.match(/\d+/g) || [])
    .map(Number)
    .filter((n) => n > 0 && n < 400);
  if (!nums.length) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

export interface ClubPick {
  name: string;
  dist: number;
  delta: number; // dist - target (negativ = zu kurz)
}

/** Schläger nach Nähe zur Zieldistanz sortiert. */
export function suggestClubs(
  clubs: { name: string; distance: string }[],
  target: number
): ClubPick[] {
  return clubs
    .map((c) => ({ name: c.name, dist: parseDistance(c.distance) }))
    .filter((c): c is { name: string; dist: number } => c.dist != null)
    .map((c) => ({ ...c, delta: c.dist - target }))
    .sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta));
}

/* ── Loch-für-Loch → Summenfelder ableiten ──────────────────────── */

/**
 * Berechnet aus den erfassten Löchern die klassischen Session-Summenfelder.
 * Nur Löcher mit Match im Course zählen. Optionale Werte (Putts/FW/GIR/Strafen)
 * werden nur einbezogen, wenn vorhanden — fehlt z.B. jeder Putt-Wert, bleibt
 * `putts` undefined (= „nicht erfasst").
 */
export function deriveRoundFields(
  course: Course,
  holes: HoleScore[]
): Pick<
  Session,
  | "strokes"
  | "coursePar"
  | "fairwaysHit"
  | "fairwaysPossible"
  | "girHit"
  | "putts"
  | "scramblingMade"
  | "scramblingTries"
  | "penalties"
  | "holesPlayed"
> {
  const byNum = new Map(course.holes.map((h) => [h.hole, h]));
  const played = holes.filter((h) => byNum.has(h.hole));

  let strokes = 0;
  let coursePar = 0;
  let fairwaysHit = 0;
  let fairwaysPossible = 0;
  let girHit = 0;
  let putts = 0;
  let hasPutts = false;
  let scramblingMade = 0;
  let scramblingTries = 0;
  let penalties = 0;
  let hasPenalties = false;
  let hasFairway = false;
  let hasGir = false;

  for (const h of played) {
    const def = byNum.get(h.hole)!;
    strokes += h.strokes;
    coursePar += def.par;

    if (def.par >= 4 && h.fairway != null) {
      fairwaysPossible += 1;
      if (h.fairway) fairwaysHit += 1;
      hasFairway = true;
    }
    if (h.gir != null) {
      hasGir = true;
      if (h.gir) {
        girHit += 1;
      } else {
        // Grün verfehlt → Up&Down-Versuch; Erfolg wenn Score ≤ Par
        scramblingTries += 1;
        if (h.strokes <= def.par) scramblingMade += 1;
      }
    }
    if (h.putts != null) {
      putts += h.putts;
      hasPutts = true;
    }
    if (h.penalties != null) {
      penalties += h.penalties;
      hasPenalties = true;
    }
  }

  return {
    holesPlayed: played.length,
    strokes: played.length ? strokes : undefined,
    coursePar: played.length ? coursePar : 0,
    fairwaysHit: hasFairway ? fairwaysHit : undefined,
    fairwaysPossible: hasFairway ? fairwaysPossible : undefined,
    girHit: hasGir ? girHit : undefined,
    putts: hasPutts ? putts : undefined,
    scramblingMade: hasGir ? scramblingMade : undefined,
    scramblingTries: hasGir ? scramblingTries : undefined,
    penalties: hasPenalties ? penalties : undefined,
  };
}
