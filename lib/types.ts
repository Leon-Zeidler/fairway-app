// Datenmodelle für Fairway

/* ── Journal / Sessions ─────────────────────────────────────────── */

export type SessionType = "range" | "course" | "gym" | "stretch";

export interface Session {
  id: string;
  date: string; // ISO YYYY-MM-DD
  type: SessionType;
  durationMin?: number;
  balls?: number; // wie viele Bälle (für Range)
  score?: number; // Stableford-Punkte / Schläge (für Course)
  rating: number; // Selbstbewertung 1–5
  drills: string[]; // IDs der abgehakten Drills
  notes?: string;
  createdAt: string; // ISO timestamp
  user_id?: string | null; // für späteren Multi-User-Support
}

export const SESSION_LABELS: Record<SessionType, string> = {
  range: "Range",
  course: "Platz",
  gym: "Gym",
  stretch: "Mobility",
};

/* ── Editierbare Referenzdaten ──────────────────────────────────── */

export type EquipStatus = "good" | "watch" | "issue";

export const STATUS_LABELS: Record<EquipStatus, string> = {
  good: "Passt",
  watch: "Beobachten",
  issue: "Handlungsbedarf",
};

/** Ein Schläger mit Distanz (Distanz als Freitext, erlaubt "150–155 m"). */
export interface Club {
  id: string;
  name: string;
  distance: string;
}

/** Ein Equipment-Eintrag mit Ampel-Status und Notiz. */
export interface EquipItem {
  id: string;
  category: string; // z.B. "Driver", "Ball", "Putter"
  name: string; // konkretes Modell
  status: EquipStatus;
  note: string;
}

/** Ein einzelner Drill. */
export interface Drill {
  id: string;
  name: string;
  detail: string;
}

export type RoutineGroup = "mobility" | "golf" | "gym";

export const ROUTINE_GROUP_LABELS: Record<RoutineGroup, string> = {
  mobility: "Mobility",
  golf: "Golf",
  gym: "Gym",
};

/** Eine Routine / ein Workout mit Schritten. */
export interface Routine {
  id: string;
  group: RoutineGroup;
  title: string;
  focus: string; // kurze Beschreibung des Fokus
  steps: string[];
  current?: boolean; // aktueller Fokus (hebt die Routine hervor)
}

/** Ein Schritt im Turnier-Warmup (ball-basiert, 60er-Bucket). */
export interface WarmupStep {
  id: string;
  club: string; // Schläger / Phase, z.B. "Driver", "5 Wood", "Putten"
  detail: string; // Hinweis, z.B. "mit Halt – Pause am Top", "voll", "eigener Ball"
  balls: number; // Range-Bälle (0 = keine, z.B. Putten)
  minutes: number; // veranschlagte Dauer – für die Ziel-Uhrzeiten
}

/** Nächste Turnier-Tee-Time. */
export interface TeeTime {
  name: string;
  date: string; // ISO YYYY-MM-DD
  time: string; // HH:MM
}

/* ── Spieler-Profil (kompakt) ───────────────────────────────────── */

export interface Profile {
  hcp: string;
  hcpGoal: string;
  swingSpeed: string;
  level: string;
}
