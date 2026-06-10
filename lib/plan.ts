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

// Mobility-Rotation über die Woche (Tag 5 = Pivot-Fokus, 2× pro Woche).
const MOBILITY_BY_DOW: Record<number, [string, string]> = {
  0: ["Mobility · Rotation & Wirbelsäule", "Tag 1 · 10 Min — Drehung freimachen"],
  1: ["Mobility · Hüfte & Gesäß", "Tag 2 · 10 Min — Basis gegen Aufrichten"],
  2: ["Mobility · Pivot (Fokus)", "Tag 5 · 10 Min — direkt für deinen Swing-Path-Fix"],
  3: ["Mobility · Schultern & Brust", "Tag 3 · 10 Min — freier Schulter-Turn"],
  4: ["Mobility · Pivot (Fokus)", "Tag 5 · 10 Min — direkt für deinen Swing-Path-Fix"],
  5: ["Mobility · Hüfte kurz", "Tag 2 · 5 Min — vor der Runde lockern"],
  6: ["Mobility · Recovery", "Tag 4 · 10 Min — Ganzkörper lockern"],
};

/** Konkrete Aufgaben für einen Wochentag (0 = Mo). */
export function dayTasks(dow: number): DayTask[] {
  const tasks: DayTask[] = [];

  const [mTitle, mDesc] = MOBILITY_BY_DOW[dow];
  tasks.push({ key: "mobility", title: mTitle, desc: mDesc, href: "/training" });

  if (PLAN.technik.includes(dow)) {
    tasks.push({
      key: "technik",
      title: "Range · geführtes Programm",
      desc: "Swing Path → Driver → Basics · 60 Bälle reichen",
      href: "/training",
    });
  }
  if (PLAN.kurzspiel.includes(dow)) {
    tasks.push({
      key: "kurzspiel",
      title: "Kurzspiel · 15 Min",
      desc: "Chippen & Pitchen — ruhige Hände, Landepunkt wählen",
      href: "/turnier",
    });
  }
  if (PLAN.gym.includes(dow)) {
    tasks.push({
      key: "gym",
      title: dow === 0 ? "Gym · Rumpf — Rotation" : "Gym · Beine — Squat Power",
      desc: "Plan unter Routinen → Gym",
      href: "/training",
    });
  }
  if (PLAN.platz.includes(dow)) {
    tasks.push({
      key: "platz",
      title: "Platz · Runde spielen",
      desc: "Prozess vor Score — ein Gedanke pro Schwung, Driver nur wenn sicher",
    });
  }
  return tasks;
}
