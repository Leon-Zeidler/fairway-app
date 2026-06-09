// Default-Daten ("Seed") aus dem Spieler-Profil.
// Alles hier ist in der App editierbar — diese Werte sind nur der Startzustand
// und die Grundlage für "Auf Standard zurücksetzen".

import {
  Club,
  Drill,
  EquipItem,
  Profile,
  Routine,
  TeeTime,
  WarmupStep,
} from "./types";

export const MANTRA = "Kopf hoch · Schulter unter Kinn · Gewicht rechts laden";

export const TEE_TIME: TeeTime = { name: "", date: "", time: "" };

/** Bucket-Größen am Heimatplatz (Bälle pro Bucket). */
export const BALL_BUCKETS = [30, 60];

export const PROFILE: Profile = {
  hcp: "43",
  hcpGoal: "12–15",
  swingSpeed: "100–105 mph",
  level: "~1 Jahr · High 80s–Low 90s",
};

/* ── Bag: Distanzen ─────────────────────────────────────────────── */

export const CLUBS: Club[] = [
  { id: "c-driver", name: "Driver", distance: "270 m" },
  { id: "c-5wood", name: "5 Wood", distance: "200 m" },
  { id: "c-5iron", name: "5 Eisen", distance: "167 m" },
  { id: "c-6iron", name: "6 Eisen", distance: "150–155 m" },
  { id: "c-7iron", name: "7 Eisen", distance: "150 m" },
  { id: "c-8iron", name: "8 Eisen", distance: "140 m" },
  { id: "c-9iron", name: "9 Eisen", distance: "100–114 m" },
  { id: "c-pw", name: "PW", distance: "94–100 m" },
  { id: "c-56", name: "56°", distance: "70–80 m" },
  { id: "c-58", name: "58°", distance: "≤ 70 m" },
];

/* ── Bag: Equipment-Status ──────────────────────────────────────── */

export const EQUIPMENT: EquipItem[] = [
  {
    id: "e-ball",
    category: "Ball",
    name: "TaylorMade TP5x",
    status: "good",
    note: "Wahl fürs nächste Turnier (vorher Vice Pro Tracer). 5-Layer Tour-Ball, low spin Driver / high spin Wedge — passt zu 100+ mph. Genug vom gleichen Modell mitnehmen.",
  },
  {
    id: "e-driver",
    category: "Driver",
    name: "Ping G410",
    status: "issue",
    note: "Regular-Schaft viel zu weich für 100+ mph → Face geht auf → Slice. Lösung: Stiff-Schaft. Empfehlung: Project X HZRDUS Smoke Black RDX 60g Stiff oder Mitsubishi Tensei AV Blue 65g Stiff. Kopf ist gut — nur Schaft tauschen. Fitting 50–100 €. Höchste Equipment-Prio nach dem Turnier.",
  },
  {
    id: "e-5wood",
    category: "5 Wood",
    name: "5 Wood",
    status: "watch",
    note: "Funktioniert, könnte ein Fitting brauchen.",
  },
  {
    id: "e-gap",
    category: "Lücke 4i / 9 Wood",
    name: "fehlt komplett",
    status: "issue",
    note: "Lücke zwischen 5 Wood (200 m) und 5 Eisen (167 m). Plan: eher 9 Wood als 4 Eisen (einfacher spielbar). Niedrige Priorität — kommt später.",
  },
  {
    id: "e-irons",
    category: "Eisen-Set",
    name: "Takomo 101T",
    status: "good",
    note: "+0.25\" Length, 1° Upright. Neue Schäfte: Nippon NS Pro Modus 3 Tour 120 Stiff (reshaftet) → \"genial\". Heads bleiben — genau richtig. (Muscle Back, kein echter Blade.)",
  },
  {
    id: "e-52",
    category: "Wedge 52°",
    name: "Cleveland RTZ Black Satin",
    status: "good",
    note: "Gerade bestellt (in Lieferung). Mid Grind, Nippon Modus 3 Tour 120 Stiff, +0.25\" Length, 1° Upright, Tour Velvet Midsize. 186 €. Schließt die Lücke PW → 56°.",
  },
  {
    id: "e-56",
    category: "Wedge 56°",
    name: "TaylorMade Hi-Toe",
    status: "issue",
    note: "Passt nicht ins System. Plan: durch Cleveland RTZ ersetzen, wenn möglich (nach 5–10 Runden mit dem 52°).",
  },
  {
    id: "e-58",
    category: "Wedge 58°",
    name: "Cobra",
    status: "issue",
    note: "Passt nicht ins System, fast gleiche Distanz wie 56°. Plan: durch Cleveland RTZ ersetzen.",
  },
  {
    id: "e-putter",
    category: "Putter",
    name: "Ping Heppler Tomcat",
    status: "issue",
    note: "Unzufrieden, fühlt sich zu schwer an. Wunsch: leichter Mallet, schlankes Design. LAB DF3 fühlte sich super an. Optionen: LAB DF3, LAB Mezz Max, Scotty Cameron Phantom X 5, Bettinardi Inovai 6.0. Nicht priorisiert.",
  },
  {
    id: "e-grip",
    category: "Griffe",
    name: "Tour Velvet Midsize",
    status: "good",
    note: "Konsistent durchs ganze Set (passend zur Körpergröße).",
  },
];

/* ── Drills: Reverse-Pivot-Fokus ────────────────────────────────── */

export const DRILLS: Drill[] = [
  { id: "rp1", name: "Kopf höher im Setup", detail: "10× ohne Ball — Kinn weg vom Brustbein" },
  { id: "rp2", name: "Linke Schulter hinter den Ball", detail: "15× langsam" },
  { id: "rp3", name: "Gewicht in rechten Oberschenkel laden", detail: "10× am Top innehalten" },
  { id: "rp4", name: "Schulter-unter-Kinn Drill", detail: "15 Wiederholungen" },
  { id: "rp5", name: "Rechtes Bein als Anker", detail: "10 langsame Schwünge" },
  { id: "rp6", name: "Headcover unter linkem Fuß", detail: "10 Bälle 7 Eisen" },
  { id: "rp7", name: "Video-Check von vorne", detail: "5–10 Schwünge filmen" },
];

/* ── Routinen: Mobility (5 Tage), Golf, Gym (4) ─────────────────── */

export const ROUTINES: Routine[] = [
  // Mobility
  {
    id: "mob1",
    group: "mobility",
    title: "Tag 1 — Rotation & Wirbelsäule",
    focus: "Beweglichkeit für die Drehung",
    steps: [
      "Cat-Cow — 10 Wdh.",
      "Thoracic Rotations (Vierfüßler) — 8/Seite",
      "Open Book (Seitenlage) — 8/Seite",
      "Im Sitzen Wirbelsäule drehen — 30 s/Seite",
    ],
  },
  {
    id: "mob2",
    group: "mobility",
    title: "Tag 2 — Hüfte & Gesäß",
    focus: "Hüftmobilität & Stabilität",
    steps: [
      "90/90 Hip Switch — 10 Wdh.",
      "Pigeon Stretch — 45 s/Seite",
      "Hüftbeuger-Ausfallschritt — 45 s/Seite",
      "Glute Bridge — 15 Wdh.",
    ],
  },
  {
    id: "mob3",
    group: "mobility",
    title: "Tag 3 — Schultern & Brust",
    focus: "Freie Schultern für den Turn",
    steps: [
      "Türrahmen-Brustdehnung — 30 s",
      "Schulter-Dislocates mit Band — 10 Wdh.",
      "Cross-Body Shoulder Stretch — 30 s/Seite",
      "Wall Slides — 12 Wdh.",
    ],
  },
  {
    id: "mob4",
    group: "mobility",
    title: "Tag 4 — Ganzkörper Recovery",
    focus: "Lockern & regenerieren",
    steps: [
      "Foam Roll Rücken & Beine — 5 Min",
      "Child's Pose — 60 s",
      "Hamstring-Dehnung — 45 s/Seite",
      "World's Greatest Stretch — 6/Seite",
    ],
  },
  {
    id: "mob5",
    group: "mobility",
    title: "Tag 5 — Pivot Mobility",
    focus: "Aktueller Fokus für den Reverse-Pivot-Fix",
    current: true,
    steps: [
      "Stehende Rumpfrotation — 10/Seite",
      "Schulterdrehung an der Wand — 10 Wdh.",
      "Geladene Drehung mit Schritt zurück — 8/Seite",
      "Nacken/Kinn anheben (Mobilität) — 10 Wdh.",
      "Führende Schulter unter das Kinn — 10 Wdh.",
      "Rechte-Hüfte-Hinge geladen halten — 8 Wdh.",
    ],
  },
  // Golf
  {
    id: "golf1",
    group: "golf",
    title: "Reverse Pivot beheben",
    focus: "Hauptfokus — Kopf hoch, Schulter unter Kinn, Gewicht rechts laden",
    current: true,
    steps: [
      "Kopf höher im Setup — 10× ohne Ball",
      "Linke Schulter hinter den Ball — 15× langsam",
      "Gewicht in rechten Oberschenkel laden — 10× am Top halten",
      "Schulter-unter-Kinn — 15 Wdh.",
      "Rechtes Bein als Anker — 10 langsame Schwünge",
      "Headcover unter linkem Fuß — 10 Bälle 7 Eisen",
      "Video-Check von vorne — 5–10 Schwünge",
    ],
  },
  // Gym
  {
    id: "gym1",
    group: "gym",
    title: "Beine — Squat Power",
    focus: "Stabiles Fundament & Power",
    steps: [
      "Back Squat — 4×6",
      "Bulgarian Split Squat — 3×8/Seite",
      "Romanian Deadlift — 3×8",
      "Jump Squats — 3×8",
      "Wadenheben — 3×15",
    ],
  },
  {
    id: "gym2",
    group: "gym",
    title: "Rumpf — Rotation",
    focus: "Rotationskraft für den Schwung",
    steps: [
      "Kabel/Band Woodchop — 3×10/Seite",
      "Pallof Press — 3×12/Seite",
      "Russian Twist — 3×20",
      "Plank mit Rotation — 3×10",
      "Med-Ball Rotational Throw — 3×8/Seite",
    ],
  },
  {
    id: "gym3",
    group: "gym",
    title: "Oberkörper",
    focus: "Zug & Druck im Gleichgewicht",
    steps: [
      "Klimmzüge — 4×6",
      "Bankdrücken (KH) — 3×8",
      "Rudern — 3×10",
      "Schulterdrücken — 3×10",
      "Face Pulls — 3×15",
    ],
  },
  {
    id: "gym4",
    group: "gym",
    title: "Ganzkörper",
    focus: "Athletik & Kraftausdauer",
    steps: [
      "Kreuzheben — 4×5",
      "Power Clean — 4×3",
      "Liegestütze — 3×12",
      "Ausfallschritte — 3×10/Seite",
      "Farmer's Carry — 3×30 m",
    ],
  },
];

/* ── Turnier: Warmup auf genau 60 Bälle (Putten = eigener Ball) ──── */

// Gesamte Range-Bälle = 60. Aufbau kurz → lang, Peak am Driver,
// Abschluss mit Wedges. Driver & 5 Wood erst „mit Halt", dann voll.
// Mobility & Putten verbrauchen keine Range-Bälle.

export const WARMUP: WarmupStep[] = [
  { id: "w1", club: "Mobility / Aktivierung", detail: "Pivot-Mobility, locker werden", balls: 0 },
  { id: "w2", club: "Wedge 56°", detail: "halbe Schwünge – Kontakt & Tempo finden", balls: 6 },
  { id: "w3", club: "PW / 52°", detail: "Pitch-Tempo, ruhige Hände, kein Flippen", balls: 6 },
  { id: "w4", club: "9er / 8er Eisen", detail: "voller Schwung, Boden nach dem Ball", balls: 6 },
  { id: "w5", club: "7er / 6er Eisen", detail: "Mantra: Schulter unter Kinn, Gewicht rechts", balls: 8 },
  { id: "w6", club: "5er Eisen / Hybrid", detail: "ruhig beschleunigen", balls: 5 },
  { id: "w7", club: "5 Wood – mit Halt", detail: "kontrolliert, am Top kurz halten", balls: 4 },
  { id: "w8", club: "5 Wood – voll", detail: "freier Tempo-Schwung", balls: 4 },
  { id: "w9", club: "Driver – mit Halt", detail: "Pause am Top, Reverse-Pivot-Fokus", balls: 5 },
  { id: "w10", club: "Driver – voll", detail: "volle Routine, Pause zwischen den Schlägen", balls: 6 },
  { id: "w11", club: "Wedges – Abschluss", detail: "Gefühl & Tempo – nichts mehr reparieren", balls: 10 },
  { id: "w12", club: "Putten", detail: "eigener Ball: Speed-Kontrolle & kurze Putts", balls: 0 },
];

/** Range-Bälle pro 60er-Bucket (Soll-Summe des Warmups). */
export const WARMUP_BALL_TARGET = 60;

/** Ungefähres Zeitfenster des Warmups (Min vor dem Abschlag). */
export const WARMUP_MINUTES = 75;

export const WARMUP_RULE =
  "Immer mit Wedges abschließen — am Turniertag niemals etwas reparieren wollen.";

/* ── Turnier: Mental-Check & Strategie ──────────────────────────── */

export const MENTAL_CHECK: string[] = [
  "Spielform: wahrscheinlich Stableford.",
  "Mit den Stärken arbeiten — kurze Eisen, 120 m ist die Stärke.",
  "Bei Schwierigkeiten: aufnehmen und nächstes Loch.",
  "Driver konservativ; bei engen Löchern Eisen vom Tee in Erwägung ziehen.",
];

/* ── Swing-Insights ─────────────────────────────────────────────── */

export const INSIGHTS: string[] = [
  "Pausieren am Top ist ein Drill, kein Schwunggedanke — sonst Pull/Hook.",
  "Beim Pitching: ruhige Hände, kein Flippen — sonst weniger Spin.",
  "Tempo wichtiger als Power — „lass den Schläger fallen“.",
  "Brush the grass AFTER the ball für saubere Eisen-Treffer.",
  "Mantra: Kopf hoch · Schulter unter Kinn · Gewicht rechts laden.",
];

/* ── Nächste Schritte (Priorität) ───────────────────────────────── */

export const NEXT_STEPS: string[] = [
  "Reverse Pivot konsequent trainieren (jetzt aktiv, viele Bälle).",
  "Turnier mit TP5x spielen — Performance dokumentieren.",
  "Driver-Schaft-Fitting & Tausch (höchste Equipment-Prio nach Turnier).",
  "Nach 5–10 Runden mit 52° Cleveland: auch 56° als Cleveland RTZ kaufen.",
  "Mittelfristig: Putter-Entscheidung (LAB testen).",
  "Langfristig: 9 Wood / 4 Iron-Lücke schließen.",
];
