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

// Hinweis: gym/mobility steuern den Tagesplan nicht mehr (Rory ist fix in RORY_BY_DOW); genutzt fuer technik/kurzspiel/platz + Woche-Tracker.
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

// Rory-Fitness: fester 7-Tage-Rhythmus (Gym laeuft am selben Tag wie Golf).
const RORY_BY_DOW: Record<number, DayTask> = {
  0: { key: "gym", title: "Rory · Strength A (schwer)", desc: "Trap-Bar, Klimmzuege, Lunges + Mobility-Warmup", href: "/programm/rory-strength-a" },
  1: { key: "gym", title: "Rory · Strength B (Oberkoerper/Core)", desc: "Schraegbank-Druecken, Renegade Row, Rotation", href: "/programm/rory-strength-b" },
  2: { key: "gym", title: "Rory · Power/Speed", desc: "Box Jumps, Med-Ball-Power, schnelle Lifts", href: "/programm/rory-power" },
  3: { key: "gym", title: "Rory · Strength-Endurance-Zirkel", desc: "2 Zirkel je 3 Runden", href: "/programm/rory-circuit" },
  4: { key: "gym", title: "Rory · Conditioning", desc: "5K-Lauf/Intervalle + Core", href: "/programm/rory-conditioning" },
  5: { key: "gym", title: "Rory · Activation (vor der Runde)", desc: "kurzer Aktivierungs-Zirkel", href: "/programm/rory-activation" },
  6: { key: "mobility", title: "Rory · Recovery", desc: "Foam Roll, Mobility, aktive Erholung", href: "/programm/rory-recovery" },
};

/** Konkrete Aufgaben fuer einen Wochentag (0 = Mo). Rory-Fitness fix, Golf plan-gesteuert. */
export function dayTasks(
  dow: number,
  plan: Record<string, number[]> = PLAN
): DayTask[] {
  const tasks: DayTask[] = [];
  const on = (key: string) => (plan[key] ?? PLAN[key] ?? []).includes(dow);

  // Rory-Fitness: jeden Tag die passende Session (fest verdrahtet).
  const rory = RORY_BY_DOW[dow];
  if (rory) tasks.push(rory);

  // Golf bleibt nutzer-/coach-gesteuert ueber den Wochenplan - am selben Tag.
  if (on("technik")) {
    tasks.push({
      key: "technik",
      title: "Range · gefuehrtes Programm",
      desc: "Swing Path -> Driver -> Basics · 60 Baelle reichen",
      href: "/programm/range",
    });
  }
  if (on("kurzspiel")) {
    tasks.push({
      key: "kurzspiel",
      title: "Kurzspiel · 15 Min",
      desc: "Chippen und Pitchen - ruhige Haende, Landepunkt waehlen",
      href: "/programm/kurzspiel",
    });
  }
  if (on("platz")) {
    tasks.push({
      key: "platz",
      title: "Platz · Runde spielen",
      desc: "Prozess vor Score - ein Gedanke pro Schwung, Driver nur wenn sicher",
    });
  }
  return tasks;
}
