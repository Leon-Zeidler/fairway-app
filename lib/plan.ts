// Wochenplan — eine Quelle für "Heute" und "Woche".
// Der Plan ist kuratiert (Guidance), das Abhaken landet im weekLog-Store.

export interface Activity {
  key: string;
  label: string;
  short: string;
  desc: string; // was konkret zu tun ist
}

export const ACTIVITIES: Activity[] = [
  {
    key: "mobility",
    label: "Mobility",
    short: "Mob",
    desc: "10 Min Hüfte & Brustwirbelsäule — Basis gegen Aufrichten",
  },
  {
    key: "technik",
    label: "Technik · Range",
    short: "Tec",
    desc: "Swing-Path- & Topping-Drills, 60 Bälle reichen",
  },
  {
    key: "kurzspiel",
    label: "Kurzspiel",
    short: "Kurz",
    desc: "Chippen & Pitchen — ruhige Hände, Landepunkt",
  },
  {
    key: "gym",
    label: "Gym",
    short: "Gym",
    desc: "Kraft laut Routine (Beine/Rumpf im Wechsel)",
  },
  {
    key: "platz",
    label: "Platz",
    short: "Platz",
    desc: "Runde spielen — Score zählt weniger als Prozess",
  },
];

// Hinweis: Gym & Mobility kommen fix aus dem Tagesplan (RORY_BY_DOW + tägliche MOBILITY_BY_DOW); PLAN steuert technik/kurzspiel/platz + den Woche-Tracker.
// Empfehlung pro Wochentag (0 = Mo … 6 = So).
export const PLAN: Record<string, number[]> = {
  mobility: [0, 1, 2, 3, 4, 5, 6], // täglich
  technik: [0, 2, 4], // Mo · Mi · Fr
  kurzspiel: [2, 5], // Mi · Sa
  gym: [0, 3], // Mo · Do
  platz: [5, 6], // Sa · So
};

export const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

/* ── Datum-Helfer (lokal, ohne UTC-Verschiebung) ────────────────── */

export function isoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

export function mondayOf(weekOffset: number): Date {
  const d = new Date();
  const dow = (d.getDay() + 6) % 7; // 0 = Mo
  d.setDate(d.getDate() - dow + weekOffset * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Wochentag-Index (0 = Mo) eines Datums. */
export function dowIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

/* ── Konkrete Tagesaufgaben (Guidance) ──────────────────────────── */

export interface DayTask {
  key: string; // Aktivitäts-Key → weekLog
  title: string; // was genau
  desc: string; // wie/warum, kurz
  href?: string; // wo die Anleitung liegt
}

// Rory-Fitness: fester 7-Tage-Rhythmus (Strength 2×: Mo+Do); läuft am selben Tag wie Golf.
const RORY_BY_DOW: Record<number, DayTask> = {
  0: { key: "gym", title: "Rory · Strength", desc: "Kreuzheben, Klimmzüge, Drücken, Lunges + Warmup", href: "/programm/rory-strength" },
  1: { key: "gym", title: "Rory · Strength-Endurance-Zirkel", desc: "2 Zirkel je 3 Runden", href: "/programm/rory-circuit" },
  2: { key: "gym", title: "Rory · Power/Speed", desc: "Box Jumps, Med-Ball-Power, schnelle Lifts", href: "/programm/rory-power" },
  3: { key: "gym", title: "Rory · Strength", desc: "Kreuzheben, Klimmzüge, Drücken, Lunges + Warmup", href: "/programm/rory-strength" },
  4: { key: "gym", title: "Rory · Conditioning", desc: "Schwimmen/Intervalle + Core", href: "/programm/rory-conditioning" },
  5: { key: "gym", title: "Rory · Activation (vor der Runde)", desc: "kurzer Aktivierungs-Zirkel", href: "/programm/rory-activation" },
  6: { key: "mobility", title: "Rory · Recovery", desc: "Foam Roll, Mobility, aktive Erholung", href: "/programm/rory-recovery" },
};

// Tägliche Mobility (Mo–Sa eigene Einheit; So übernimmt Recovery die Mobility).
const MOBILITY_BY_DOW: Record<number, DayTask> = {
  0: { key: "mobility", title: "Mobility · Rotation & Wirbelsäule", desc: "10 Min — Drehung freimachen", href: "/programm/mob1" },
  1: { key: "mobility", title: "Mobility · Hüfte & Gesäß", desc: "10 Min — Basis gegen Aufrichten", href: "/programm/mob2" },
  2: { key: "mobility", title: "Mobility · Pivot (Fokus)", desc: "10 Min — direkt für deinen Swing-Path-Fix", href: "/programm/mob5" },
  3: { key: "mobility", title: "Mobility · Schultern & Brust", desc: "10 Min — freier Schulter-Turn", href: "/programm/mob3" },
  4: { key: "mobility", title: "Mobility · Pivot (Fokus)", desc: "10 Min — Swing-Path-Fix", href: "/programm/mob5" },
  5: { key: "mobility", title: "Mobility · Hüfte kurz", desc: "5 Min — vor der Runde lockern", href: "/programm/mob2" },
};

/** Konkrete Aufgaben fuer einen Wochentag (0 = Mo). Rory-Fitness fix, Golf plan-gesteuert. */
export function dayTasks(
  dow: number,
  plan: Record<string, number[]> = PLAN
): DayTask[] {
  const tasks: DayTask[] = [];
  const on = (key: string) => (plan[key] ?? PLAN[key] ?? []).includes(dow);

  // Rory-Haupt-Session (fest): Strength 2× (Mo+Do), sonst Zirkel/Power/Conditioning/Activation/Recovery.
  const rory = RORY_BY_DOW[dow];
  if (rory) tasks.push(rory);

  // Tägliche Mobility als eigene Einheit (Mo–Sa; So deckt Recovery die Mobility ab).
  const mob = MOBILITY_BY_DOW[dow];
  if (mob) tasks.push(mob);

  // Golf bleibt nutzer-/coach-gesteuert über den Wochenplan – am selben Tag.
  // Range über die Range-Tage verteilt: Mo Swing Path, Mi Driver, Fr Basics.
  if (on("technik")) {
    const block =
      dow === 2
        ? { id: "range-driver", title: "Range · Driver & Topping", desc: "Sauberer Treffer, Haltung halten – 60 Bälle reichen" }
        : dow === 4
        ? { id: "range-basics", title: "Range · Basics (Reverse Pivot)", desc: "Kopf hoch, Gewicht rechts laden – Basis-Drills" }
        : { id: "range-path", title: "Range · Swing Path", desc: "Von innen schwingen – Gate- & Headcover-Drills" };
    tasks.push({ key: "technik", title: block.title, desc: block.desc, href: `/programm/${block.id}` });
  }
  if (on("kurzspiel")) {
    tasks.push({
      key: "kurzspiel",
      title: "Kurzspiel · 15 Min",
      desc: "Chippen und Pitchen – ruhige Hände, Landepunkt wählen",
      href: "/programm/kurzspiel",
    });
  }
  if (on("platz")) {
    tasks.push({
      key: "platz",
      title: "Platz · Runde spielen",
      desc: "Prozess vor Score – ein Gedanke pro Schwung, Driver nur wenn sicher",
    });
  }
  return tasks;
}
