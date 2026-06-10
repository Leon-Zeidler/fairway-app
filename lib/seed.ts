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

/** Aktueller Trainingsfokus — wird auf "Heute" und im Training angezeigt. */
export const FOCUS = {
  title: "Swing Path — von innen schwingen",
  why: "Die 114 kam von „über den Ball“: getoppte Driver, dünne Eisen, kein Vertrauen. Der Pfad von innen fixt alle drei.",
  cues: [
    "Unterkörper startet abwärts — Hüfte zuerst, Arme folgen",
    "Haltung halten — Po bleibt hinten, nicht aufrichten",
    "Committen — voller Schwung, Tempo statt Kraft",
  ],
};

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
    available: true,
    routineTag: "Driver",
    note: "Regular-Schaft viel zu weich für 100+ mph → Face geht auf → Slice. Lösung: Stiff-Schaft. Empfehlung: Project X HZRDUS Smoke Black RDX 60g Stiff oder Mitsubishi Tensei AV Blue 65g Stiff. Kopf ist gut — nur Schaft tauschen. Fitting 50–100 €. Höchste Equipment-Prio nach dem Turnier.",
  },
  {
    id: "e-5wood",
    category: "5 Wood",
    name: "5 Wood",
    status: "watch",
    available: true,
    routineTag: "5 Wood",
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
    available: false,
    routineTag: "52°",
    note: "NOCH NICHT DA (bestellt, in Lieferung). Mid Grind, Nippon Modus 3 Tour 120 Stiff, +0.25\" Length, 1° Upright, Tour Velvet Midsize. 186 €. Schließt die Lücke PW → 56°. Bis dahin im Warmup PW statt 52° nutzen.",
  },
  {
    id: "e-56",
    category: "Wedge 56°",
    name: "TaylorMade Hi-Toe",
    status: "issue",
    available: true,
    routineTag: "56°",
    note: "Passt nicht ins System. Plan: durch Cleveland RTZ ersetzen, wenn möglich (nach 5–10 Runden mit dem 52°).",
  },
  {
    id: "e-58",
    category: "Wedge 58°",
    name: "Cobra",
    status: "issue",
    available: true,
    routineTag: "58°",
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
  {
    id: "rp1",
    name: "Kopf höher im Setup",
    detail:
      "10× ohne Ball. Kinn weg vom Brustbein, Hals lang, Blick über die Nase auf den Ball. Gefühl: Brust offen, Platz zwischen Kinn und Brust. ✗ Fehler: Kopf sinkt beim Schwung wieder ein → linke Schulter blockiert sofort.",
  },
  {
    id: "rp2",
    name: "Linke Schulter hinter den Ball",
    detail:
      "15× langsam. Im Rückschwung dreht die linke Schulter unter das Kinn und HINTER den Ball — nicht nach unten zum Ball. Gefühl: Rücken zeigt Richtung Ziel. ✗ Fehler: Schulter kippt runter statt zu drehen.",
  },
  {
    id: "rp3",
    name: "Gewicht in rechten Oberschenkel laden",
    detail:
      "10× am Top 2 Sek. halten. Druck in rechte Ferse/Innenseite spüren, rechtes Knie bleibt stabil (kippt nicht weg). ✗ Fehler: Gewicht wandert ins linke Bein → genau der Reverse Pivot.",
  },
  {
    id: "rp4",
    name: "Schulter-unter-Kinn Drill",
    detail:
      "15 Wdh. Kinn bleibt OBEN — die linke Schulter kommt zum Kinn, nicht das Kinn zur Schulter. So bleibt die Wirbelsäulenneigung erhalten und die Drehung frei.",
  },
  {
    id: "rp5",
    name: "Rechtes Bein als Anker",
    detail:
      "10 langsame Schwünge. Rechtes Bein hält den Winkel vom Setup bis zum Top — wie gegen eine Wand auf der Fuß-Innenseite laden. Gibt eine stabile Achse zum Laden.",
  },
  {
    id: "rp6",
    name: "Headcover unter linkem Fuß",
    detail:
      "10 Bälle, 7 Eisen. Headcover unter den Ballen des linken Fußes — das zwingt das Gewicht im Rückschwung nach rechts. Sauberer, mittiger Treffer = der Drill sitzt.",
  },
  {
    id: "rp7",
    name: "Video-Check von vorne",
    detail:
      "5–10 Schwünge face-on filmen. Check: Bleibt der Kopf hinter dem Ball? Lädt das Gewicht rechts? Kippt nichts zum Ziel? Vergleiche langsamen Drill-Schwung mit vollem Tempo.",
  },
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
      "Cat-Cow — 10 Wdh., langsam jeden Wirbel einzeln bewegen",
      "Thoracic Rotations (Vierfüßler) — 8/Seite, Hand an den Hinterkopf, aus der Brust drehen (nicht aus der Lende)",
      "Open Book (Seitenlage) — 8/Seite, unteres Knie bleibt am Boden, Brust öffnet nach hinten",
      "Wirbelsäule im Sitzen drehen — 30 s/Seite, erst lang machen, dann sanft tiefer drehen",
    ],
  },
  {
    id: "mob2",
    group: "mobility",
    title: "Tag 2 — Hüfte & Gesäß",
    focus: "Hüftmobilität & Stabilität",
    steps: [
      "90/90 Hip Switch — 10 Wdh., Oberkörper aufrecht, kontrolliert wechseln",
      "Pigeon Stretch — 45 s/Seite, Hüfte quadratisch zum Boden, ruhig atmen",
      "Hüftbeuger-Ausfallschritt — 45 s/Seite, Becken kippen & Po anspannen (kein Hohlkreuz)",
      "Glute Bridge — 15 Wdh., oben 1 Sek. Po fest, Rippen unten lassen",
    ],
  },
  {
    id: "mob3",
    group: "mobility",
    title: "Tag 3 — Schultern & Brust",
    focus: "Freie Schultern für den Turn",
    steps: [
      "Türrahmen-Brustdehnung — 30 s, Ellbogen auf Schulterhöhe, sanft vorlehnen",
      "Schulter-Dislocates mit Band — 10 Wdh., Arme gestreckt, langsam über den Kopf",
      "Cross-Body Shoulder Stretch — 30 s/Seite, Schulter unten halten (nicht hochziehen)",
      "Wall Slides — 12 Wdh., unterer Rücken an der Wand, Handrücken bleiben an der Wand",
    ],
  },
  {
    id: "mob4",
    group: "mobility",
    title: "Tag 4 — Ganzkörper Recovery",
    focus: "Lockern & regenerieren",
    steps: [
      "Foam Roll Rücken & Beine — 5 Min, langsam, empfindliche Punkte 20 s halten",
      "Child's Pose — 60 s, Arme lang nach vorn, tief in den Rücken atmen",
      "Hamstring-Dehnung — 45 s/Seite, Rücken gerade, aus der Hüfte beugen",
      "World's Greatest Stretch — 6/Seite, kontrolliert, Brust zum Himmel öffnen",
    ],
  },
  {
    id: "mob5",
    group: "mobility",
    title: "Tag 5 — Pivot Mobility",
    focus: "Aktueller Fokus für den Reverse-Pivot-Fix",
    current: true,
    steps: [
      "Stehende Rumpfrotation — 10/Seite, Hüfte ruhig, nur der Oberkörper dreht (wie der Backswing)",
      "Schulterdrehung an der Wand — 10 Wdh., Rücken zur Wand, beim Drehen mit der Schulter berühren",
      "Geladene Drehung mit Schritt zurück — 8/Seite, bewusst aufs hintere Bein laden (Gegenmittel zum Reverse Pivot)",
      "Nacken/Kinn anheben — 10 Wdh., Kinn vom Brustbein weg, Hals lang machen (genau dein Setup-Fix)",
      "Führende Schulter unter das Kinn — 10 Wdh., Schulter kommt zum Kinn, Kinn bleibt oben",
      "Rechte-Hüfte-Hinge geladen halten — 8 Wdh., am Top 2 Sek. Druck in die rechte Hüfte halten",
    ],
  },
  // Golf
  {
    id: "golf2",
    group: "golf",
    title: "Swing Path — Driver & Eisen",
    focus: "Neuer Hauptfokus (nach Turnier 114): raus aus Over-the-top, von innen schwingen",
    current: true,
    steps: [
      "Headcover außerhalb/vor dem Ball — triff den Ball, NICHT das Headcover. Zwingt den Schläger von innen (gegen Over-the-top).",
      "Gate-Drill mit 2 Tees — schmales Tor um den Ball, Schlägerkopf läuft von innen sauber durch.",
      "Pump-Drill — 3× am Top in den Slot fallen lassen (Arme runter, Schläger flacher), dann erst schlagen.",
      "Unterkörper startet abwärts — Gewicht/linke Hüfte zuerst, Arme folgen. Nicht von oben mit den Schultern ziehen.",
      "70 % Tempo, in Sequenz — Gefühl: von innen Richtung „1 Uhr“ durch den Ball.",
      "Alignment-Stick auf der Ziellinie — nach jedem Schlag Pfad & Divot-Richtung checken.",
    ],
  },
  {
    id: "golf3",
    group: "golf",
    title: "Driver — Topping & Haltung",
    focus: "Sauberer, selbstbewusster Treffer: Haltung halten, nicht aufrichten",
    current: true,
    steps: [
      "Haltung halten — Po bleibt „an der Wand“, Brust über dem Ball bis nach dem Treffer (kein Aufrichten / Early Extension).",
      "Kopf hinter dem Ball — wie beim Reverse-Pivot-Fix; nicht zum Ziel kippen.",
      "Füße-zusammen-Schwünge — 10 Bälle, nur Balance & mittiger Kontakt. Heilt Topping schnell.",
      "Tee höher, Ball vorne, leicht AUFWÄRTS treffen — dem Driver nicht „nach oben helfen“.",
      "Committen — volle Routine, voller Schwung. Zaghaft/Decel = Topping. Tempo vor Kraft.",
      "Auf dem Platz: bei Unsicherheit 5-Holz / langes Eisen vom Tee, bis der Driver wieder sitzt.",
    ],
  },
  {
    id: "golf1",
    group: "golf",
    title: "Reverse Pivot beheben",
    focus: "Basis — Kopf hoch, Schulter unter Kinn, Gewicht rechts laden (füttert Haltung & Path)",
    steps: [
      "Kopf höher im Setup — 10× ohne Ball. Kinn weg vom Brustbein, Hals lang halten",
      "Linke Schulter hinter den Ball — 15× langsam, Schulter unter & hinter den Ball (nicht runter)",
      "Gewicht rechts laden — 10× am Top 2 Sek. halten, Druck in rechte Ferse/Innenseite",
      "Schulter unter Kinn — 15 Wdh., Kinn bleibt oben, Wirbelsäulenneigung erhalten",
      "Rechtes Bein als Anker — 10 langsame Schwünge, Winkel halten",
      "Headcover unter linkem Fuß — 10 Bälle 7 Eisen, zwingt Gewicht nach rechts",
      "Video-Check von vorne — 5–10 Schwünge: Kopf hinter Ball? Gewicht rechts?",
    ],
  },
  // Gym
  {
    id: "gym1",
    group: "gym",
    title: "Beine — Squat Power",
    focus: "Stabiles Fundament & Power",
    steps: [
      "Back Squat — 4×6, mind. parallel, Knie über die Füße, Rumpf fest",
      "Bulgarian Split Squat — 3×8/Seite, Balance & einbeinige Kraft",
      "Romanian Deadlift — 3×8, Hüfte zurück, Rücken gerade, Hamstrings spüren",
      "Jump Squats — 3×8, explosiv hoch, weich landen (Power für Schwung-Speed)",
      "Wadenheben — 3×15, volle Bewegung, oben halten",
    ],
  },
  {
    id: "gym2",
    group: "gym",
    title: "Rumpf — Rotation",
    focus: "Rotationskraft für den Schwung",
    steps: [
      "Kabel/Band Woodchop — 3×10/Seite, aus der Hüfte rotieren, Arme nur führen",
      "Pallof Press — 3×12/Seite, Anti-Rotation, Rumpf bleibt stabil (schützt den Rücken)",
      "Russian Twist — 3×20, kontrolliert, die Brust dreht (nicht nur die Arme)",
      "Plank mit Rotation — 3×10, Hüfte stabil halten",
      "Med-Ball Rotational Throw — 3×8/Seite, explosiv (übersetzt direkt in Schwung-Speed)",
    ],
  },
  {
    id: "gym3",
    group: "gym",
    title: "Oberkörper",
    focus: "Zug & Druck im Gleichgewicht",
    steps: [
      "Klimmzüge — 4×6, volle Streckung unten, Schulterblätter führen",
      "Bankdrücken (KH) — 3×8, kontrolliert ab- und auf",
      "Rudern — 3×10, Schulterblätter zusammenziehen (Haltung & Zugkraft)",
      "Schulterdrücken — 3×10, Rippen unten, kein Hohlkreuz",
      "Face Pulls — 3×15, für Schultergesundheit & gegen Rundrücken",
    ],
  },
  {
    id: "gym4",
    group: "gym",
    title: "Ganzkörper",
    focus: "Athletik & Kraftausdauer",
    steps: [
      "Kreuzheben — 4×5, neutraler Rücken, aus den Beinen drücken",
      "Power Clean — 4×3, explosiv, Technik vor Gewicht",
      "Liegestütze — 3×12, Körper als gerades Brett",
      "Ausfallschritte — 3×10/Seite, Knie über dem Fuß",
      "Farmer's Carry — 3×30 m, Griffkraft & Rumpf, aufrecht & ruhig gehen",
    ],
  },
];

/* ── Turnier: Ablauf vor dem Abschlag ───────────────────────────── */

// Reihenfolge: Aktivierung (10') → Pitching/Chipping (15') → Range-Plan
// (60 Bälle, ~65'). Gesamt ~90 Min vor dem Abschlag.

/** 10-Min-Aktivierung vor dem ersten Ball (ohne Bälle). */
export const ACTIVATION_MINUTES = 10;
export const ACTIVATION: string[] = [
  "0:00–1:30 · Locker gehen + Arme kreisen — Puls leicht hoch, Schultern lösen. Warm werden, nicht müde.",
  "1:30–3:00 · Rumpfrotationen (Hände an den Schultern) — aus der Mitte drehen, Hüfte ruhig. Bereitet die Schulterdrehung vor.",
  "3:00–4:30 · World's Greatest Stretch je Seite — tiefe Ausfallschritt-Rotation, öffnet Hüfte & Brust für den vollen Turn.",
  "4:30–6:00 · Schulter-unter-Kinn ohne Schläger — Kinn oben, bewusst Gewicht rechts laden. Spür den Reverse-Pivot-Fix.",
  "6:00–7:30 · Pivot-Schwünge, Schläger über den Schultern — langsam größer werden, Wirbelsäulenneigung halten.",
  "7:30–9:00 · Halbe Übungsschwünge Wedge — Tempo spüren, Boden NACH dem Ball touchieren. Noch kein echter Ball.",
  "9:00–10:00 · 3 tiefe Atemzüge + Mantra. Ruhig werden, EIN Gedanke: Gewicht rechts laden.",
];

/** 15-Min-Pitching/Chipping (Kurzspiel) vor dem Range-Teil. */
export const PITCHING_MINUTES = 15;
export const PITCHING: string[] = [
  "0–3 · Chips ums Grün (56°) — Hände vor dem Ball, Handgelenke ruhig. Landepunkt wählen, Ball läuft aus wie ein Putt.",
  "3–6 · Pitches 56° halbe & ¾ — Brust dreht durch, kein Flippen mit den Händen (sonst weniger Spin). Durch den Ball beschleunigen.",
  "6–9 · 52° auf 30–50 m — gleiches Tempo, Distanz über die Schwunglänge steuern. Carry-Gefühl abspeichern.",
  "9–12 · hohe weiche Pitches (58°) bzw. Bunker — Face offen, weich landen. Im Bunker: Sand vor dem Ball nehmen, durchschwingen.",
  "12–15 · 3 Ziel-Chips an die Fahne — volle Pre-Shot-Routine wie im Turnier. Mit einem Erfolgserlebnis aufhören.",
];

// Range-Plan: genau 60 Bälle. Aufbau kurz → lang, Peak am Driver,
// Abschluss mit Wedges. Driver & 5 Wood erst „mit Halt", dann voll.
// Putten verbraucht keine Range-Bälle.
export const WARMUP: WarmupStep[] = [
  {
    id: "w2",
    club: "Wedge 56°",
    detail:
      "Halbe Schwünge, nur Kontakt & Tempo wecken — nicht auf Weite. Arme fallen lassen, Hände ruhig, Boden NACH dem Ball.",
    balls: 6,
    minutes: 5,
  },
  {
    id: "w3",
    club: "PW / 52°",
    detail:
      "Gleichmäßiges Pitch-Tempo. Ruhige Hände, kein Flippen — sonst verlierst du Spin. Die Brust dreht durch.",
    balls: 6,
    minutes: 5,
  },
  {
    id: "w4",
    club: "9er / 8er Eisen",
    detail:
      "Erster voller Schwung. Brush the grass AFTER the ball — abwärts treffen, Divot nach dem Ball. Tempo vor Power.",
    balls: 6,
    minutes: 5,
  },
  {
    id: "w5",
    club: "7er / 6er Eisen",
    detail:
      "Jetzt das Mantra aktiv anwenden: Schulter unter Kinn, Gewicht rechts laden. Mittiger Treffer wichtiger als Weite.",
    balls: 8,
    minutes: 6,
  },
  {
    id: "w6",
    club: "5er Eisen / Hybrid",
    detail:
      "Flacherer Schwung, ruhig beschleunigen — nicht zuschlagen. Der Loft macht die Höhe, du machst nur das Tempo.",
    balls: 5,
    minutes: 5,
  },
  {
    id: "w7",
    club: "5 Wood – mit Halt",
    detail:
      "Am Top kurz halten (reiner Drill). Lädt das Gewicht rechts und verhindert den Reverse Pivot. Tempo ~80 %.",
    balls: 4,
    minutes: 4,
  },
  {
    id: "w8",
    club: "5 Wood – voll",
    detail:
      "Jetzt freier Tempo-Schwung mit dem Gefühl vom Halt-Drill. Vom Boden weg sweepen, nicht draufschlagen.",
    balls: 4,
    minutes: 4,
  },
  {
    id: "w9",
    club: "Driver – mit Halt",
    detail:
      "Pause am Top, Gewicht bewusst rechts spüren — genau dein Reverse-Pivot-Fix. Ball weit vorne, Schulter unter Kinn.",
    balls: 5,
    minutes: 5,
  },
  {
    id: "w10",
    club: "Driver – voll",
    detail:
      "Volle Pre-Shot-Routine + Pause zwischen den Schlägen wie auf dem Platz. Tempo so, dass das Face zugeht (nicht zu schnell). Tempo > Power.",
    balls: 6,
    minutes: 6,
  },
  {
    id: "w11",
    club: "Wedges – Abschluss",
    detail:
      "Runterkommen, Gefühl & Tempo. Nichts mehr reparieren — vertrau dem, was da ist. Mit gutem Gefühl zur Tee gehen.",
    balls: 10,
    minutes: 8,
  },
  {
    id: "w12",
    club: "Putten",
    detail:
      "Eigener Ball. Erst Speed-Kontrolle (lange Putts an den Lochrand), dann 6–8 kurze sichere Putts. Letzte Aktion: ein gelochter Putt.",
    balls: 0,
    minutes: 12,
  },
];

/** Range-Bälle pro 60er-Bucket (Soll-Summe des Range-Plans). */
export const WARMUP_BALL_TARGET = 60;

export const WARMUP_RULE =
  "Immer mit Wedges abschließen — am Turniertag niemals etwas reparieren wollen.";

/* ── Turnier: Mental-Check & Strategie ──────────────────────────── */

export const MENTAL_CHECK: string[] = [
  "Spielform wahrscheinlich Stableford: pro Loch max. Punkte holen. Ein Blow-up-Loch kostet nur 0 Punkte — nicht die ganze Runde.",
  "Mit den Stärken spielen: kurze Eisen & ~120 m sind dein Geld. Annäherungen bewusst auf diese Wohlfühl-Distanz legen.",
  "Bei Schwierigkeiten: aufnehmen, Loch abhaken, nächstes Tee frisch starten. Nachärgern macht kein Loch besser.",
  "Vom Tee clever: Driver nur, wenn Platz da ist. Bei engen Löchern Eisen/Holz für sicheres Fairway — Bogey-frei schlägt Held-oder-Null.",
  "Eine Sache pro Schwung: das Mantra. Keine Technik-Liste im Kopf — Gewicht rechts, fertig.",
];

/* ── Swing-Insights ─────────────────────────────────────────────── */

export const INSIGHTS: string[] = [
  "Pausieren am Top ist ein DRILL, kein Schwunggedanke auf dem Platz — bewusstes Pausieren im Spiel führt zu Pull/Hook.",
  "Beim Pitching ruhige Hände, kein Flippen — die Brustdrehung macht den Schlag, nicht die Handgelenke. Mehr Spin, sauberer Kontakt.",
  "Tempo schlägt Power: „lass den Schläger fallen“. Dein Speed (100+ mph) ist da — Kontrolle bringt die Schläge, nicht mehr Kraft.",
  "Brush the grass AFTER the ball — Eisen abwärts treffen, Divot nach dem Ball. Das erzeugt sauberen Kontakt und Spin.",
  "Reverse-Pivot-Wurzel: Kopf zu tief im Setup. Kinn hoch → linke Schulter rotiert frei → Gewicht lädt rechts. Daran hängt alles.",
];

/* ── Nächste Schritte (Priorität) ───────────────────────────────── */

export const NEXT_STEPS: string[] = [
  "Turnier-Auswertung 114: Hauptbaustellen = Swing Path (Driver & Eisen) + Topping/Haltung.",
  "Swing Path: Headcover- & Gate-Drill — von innen schwingen statt über den Ball.",
  "Topping: Haltung halten (kein Aufrichten), Füße-zusammen-Drill für mittigen Kontakt.",
  "Tägliche Mobility: Hüfte & Brustwirbelsäule — Basis gegen Aufrichten/Over-the-top.",
  "Auf dem Platz: Driver nur wenn sicher, sonst 5-Holz/Eisen vom Tee (Score vor Held).",
  "Path & Topping mit Coach/Video gegenchecken.",
  "Offen: Driver-Schaft-Fitting (Stiff), 52° kommt noch, später Putter & 9 Wood.",
];
