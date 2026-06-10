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
