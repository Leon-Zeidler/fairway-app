// Programme — jede Einheit als eigene, geführte Seite (/programm/[id]).
// Quelle sind die kuratierten Seed-Inhalte; Abschluss loggt eine Session
// und hakt die zugehörige Aktivität im Wochen-Log ab.

import { DRILLS, PITCHING, ROUTINES } from "./seed";
import { Routine, SessionType } from "./types";

export type ActivityKey = "mobility" | "technik" | "kurzspiel" | "gym" | "platz";

export interface ProgramSection {
  title?: string;
  steps: string[]; // "Name — Detail"
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
        steps: DRILLS.map((d) => `${d.name} — ${d.detail}`),
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
  sections?: ProgramSection[];
}

export type ProgramOverrides = Record<string, ProgramOverride>;

export function applyOverride(p: Program, ov?: ProgramOverride): Program {
  if (!ov) return p;
  return {
    ...p,
    title: ov.title ?? p.title,
    focus: ov.focus ?? p.focus,
    sections: ov.sections ?? p.sections,
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
