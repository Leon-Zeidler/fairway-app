// Programme — jede Einheit als eigene, geführte Seite (/programm/[id]).
// Quelle sind die kuratierten Seed-Inhalte; Abschluss loggt eine Session
// und hakt die zugehörige Aktivität im Wochen-Log ab.

import {
  DRILLS,
  PITCHING,
  ROUTINES,
  WARMUP_RORY,
  RORY_STRENGTH_A,
  RORY_STRENGTH_B,
  RORY_POWER,
  RORY_CIRCUIT_1,
  RORY_CIRCUIT_2,
  RORY_CONDITIONING,
  RORY_ACTIVATION,
  RORY_RECOVERY,
} from "./seed";
import { Routine, SessionType, Step } from "./types";
import { normalizeStep } from "./gear";

export type ActivityKey = "mobility" | "technik" | "kurzspiel" | "gym" | "platz";

export interface ProgramSection {
  title?: string;
  steps: Step[]; // strukturierte Schritte
}

export interface Program {
  id: string;
  title: string;
  group: "golf" | "mobility" | "gym";
  groupLabel: string;
  focus: string;
  activityKey: ActivityKey;
  sessionType: SessionType;
  sections: ProgramSection[];
  current?: boolean;
}

function routine(id: string): Routine {
  const r = ROUTINES.find((x) => x.id === id);
  if (!r) throw new Error(`Routine ${id} fehlt`);
  return r;
}

export const PROGRAMS: Program[] = [
  {
    id: "range",
    title: "Range-Programm",
    group: "golf",
    groupLabel: "Range & Golf",
    focus: "Dein komplettes Ballprogramm: Swing Path → Driver → Basics",
    activityKey: "technik",
    sessionType: "range",
    current: true,
    sections: [
      { title: "1 · Swing Path", steps: routine("golf2").steps },
      { title: "2 · Driver — Topping & Haltung", steps: routine("golf3").steps },
      {
        title: "Basics · Reverse Pivot (2–3 als Aufwärmen)",
        steps: DRILLS,
      },
    ],
  },
  {
    id: "kurzspiel",
    title: "Kurzspiel · 15 Min",
    group: "golf",
    groupLabel: "Range & Golf",
    focus: "Chippen & Pitchen — ruhige Hände, Landepunkt wählen",
    activityKey: "kurzspiel",
    sessionType: "range",
    sections: [{ steps: PITCHING }],
  },
  {
    id: "rory-strength-a",
    title: "Rory · Strength A (schwer)",
    group: "gym",
    groupLabel: "Rory · Fitness",
    focus: "Schwerer Kraftblock - Trap-Bar, Klimmzuege, Lunges (angelehnt an Rory McIlroy)",
    activityKey: "gym",
    sessionType: "gym",
    sections: [
      { title: "Warmup · Mobility & Activation", steps: WARMUP_RORY },
      { title: "Hauptblock", steps: RORY_STRENGTH_A },
    ],
  },
  {
    id: "rory-strength-b",
    title: "Rory · Strength B (Oberkoerper/Core)",
    group: "gym",
    groupLabel: "Rory · Fitness",
    focus: "Druck/Zug + Core - Schraegbank, Renegade Row, Rotation (angelehnt an Rory McIlroy)",
    activityKey: "gym",
    sessionType: "gym",
    sections: [
      { title: "Warmup · Mobility & Activation", steps: WARMUP_RORY },
      { title: "Hauptblock", steps: RORY_STRENGTH_B },
    ],
  },
  {
    id: "rory-power",
    title: "Rory · Power/Speed",
    group: "gym",
    groupLabel: "Rory · Fitness",
    focus: "Explosivkraft - Box Jumps, Med-Ball-Power, schnelle Lifts (angelehnt an Rory McIlroy)",
    activityKey: "gym",
    sessionType: "gym",
    sections: [
      { title: "Warmup · Mobility & Activation", steps: WARMUP_RORY },
      { title: "Hauptblock", steps: RORY_POWER },
    ],
  },
  {
    id: "rory-circuit",
    title: "Rory · Strength-Endurance-Zirkel",
    group: "gym",
    groupLabel: "Rory · Fitness",
    focus: "Kraftausdauer - zwei Zirkel je 3 Runden (angelehnt an Rory McIlroy)",
    activityKey: "gym",
    sessionType: "gym",
    sections: [
      { title: "Warmup · Mobility & Activation", steps: WARMUP_RORY },
      { title: "Zirkel 1 · 3 Runden", steps: RORY_CIRCUIT_1 },
      { title: "Zirkel 2 · 3 Runden", steps: RORY_CIRCUIT_2 },
    ],
  },
  {
    id: "rory-conditioning",
    title: "Rory · Conditioning",
    group: "gym",
    groupLabel: "Rory · Fitness",
    focus: "Ausdauer + Core - Lauf/Intervalle, Carry, Anti-Rotation (angelehnt an Rory McIlroy)",
    activityKey: "gym",
    sessionType: "gym",
    sections: [
      { title: "Warmup · Mobility & Activation", steps: WARMUP_RORY },
      { title: "Hauptblock", steps: RORY_CONDITIONING },
    ],
  },
  {
    id: "rory-activation",
    title: "Rory · Activation (vor der Runde)",
    group: "gym",
    groupLabel: "Rory · Fitness",
    focus: "Kurz aktivieren, nicht ermueden - vor der Runde (angelehnt an Rory McIlroy)",
    activityKey: "gym",
    sessionType: "gym",
    sections: [{ steps: RORY_ACTIVATION }],
  },
  {
    id: "rory-recovery",
    title: "Rory · Recovery",
    group: "mobility",
    groupLabel: "Rory · Fitness",
    focus: "Aktive Erholung - Foam Roll, Mobility, Atmung (angelehnt an Rory McIlroy)",
    activityKey: "mobility",
    sessionType: "stretch",
    sections: [{ steps: RORY_RECOVERY }],
  },
  ...ROUTINES.filter((r) => r.group === "mobility").map(
    (r): Program => ({
      id: r.id,
      title: r.title,
      group: "mobility",
      groupLabel: "Mobility",
      focus: r.focus,
      activityKey: "mobility",
      sessionType: "stretch",
      sections: [{ steps: r.steps }],
      current: r.current,
    })
  ),
  ...ROUTINES.filter((r) => r.group === "gym").map(
    (r): Program => ({
      id: r.id,
      title: r.title,
      group: "gym",
      groupLabel: "Gym",
      focus: r.focus,
      activityKey: "gym",
      sessionType: "gym",
      sections: [{ steps: r.steps }],
    })
  ),
];

export function getProgram(id: string): Program | undefined {
  return PROGRAMS.find((p) => p.id === id);
}

/* ── Overrides (vom Coach/Nutzer umgeschriebene Programme) ──────── */

export interface ProgramOverride {
  title?: string;
  focus?: string;
  sections?: { title?: string; steps: (string | Step)[] }[];
}

export type ProgramOverrides = Record<string, ProgramOverride>;

/** Macht aus evtl. alten String-Steps strukturierte Steps. */
export function normalizeSections(
  sections: { title?: string; steps: (string | Step)[] }[]
): ProgramSection[] {
  return sections.map((s) => ({
    title: s.title,
    steps: s.steps.map(normalizeStep),
  }));
}

export function applyOverride(p: Program, ov?: ProgramOverride): Program {
  if (!ov) return p;
  return {
    ...p,
    title: ov.title ?? p.title,
    focus: ov.focus ?? p.focus,
    sections: ov.sections ? normalizeSections(ov.sections) : p.sections,
  };
}

export function resolveProgram(
  id: string,
  overrides: ProgramOverrides
): Program | undefined {
  const base = getProgram(id);
  return base ? applyOverride(base, overrides[id]) : undefined;
}

/** Kompakte Programmliste für den Coach-Kontext (mit Overrides). */
export function programsForContext(overrides: ProgramOverrides) {
  return PROGRAMS.map((p) => {
    const r = applyOverride(p, overrides[p.id]);
    return {
      id: r.id,
      title: r.title,
      group: r.group,
      sections: r.sections.map((s) => ({ title: s.title, steps: s.steps })),
    };
  });
}

/** Such-Suffix für die Bild-Links, je Programmgruppe. */
export const DEMO_SUFFIX: Record<Program["group"], string> = {
  golf: "golf drill",
  mobility: "stretch dehnübung",
  gym: "übung exercise",
};
