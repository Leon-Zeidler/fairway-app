// Default-Daten ("Seed") aus dem Spieler-Profil.
// Alles hier ist in der App editierbar — diese Werte sind nur der Startzustand
// und die Grundlage für "Auf Standard zurücksetzen".

import {
  Club,
  EquipItem,
  Focus,
  GearItem,
  Profile,
  Routine,
  Step,
  TeeTime,
  WarmupStep,
} from "./types";

export const MANTRA = "Kopf hoch · Schulter unter Kinn · Gewicht rechts laden";

/** Aktueller Trainingsfokus — wird auf "Heute" und im Training angezeigt. */
export const FOCUS: Focus = {
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

export const DRILLS: Step[] = [
  {
    name: "Kopf höher im Setup",
    dose: "10× ohne Ball",
    detail:
      "Kinn weg vom Brustbein, Hals lang, Blick über die Nase auf den Ball. Gefühl: Brust offen, Platz zwischen Kinn und Brust. ✗ Fehler: Kopf sinkt beim Schwung wieder ein → linke Schulter blockiert sofort.",
  },
  {
    name: "Linke Schulter hinter den Ball",
    dose: "15× langsam",
    detail:
      "Im Rückschwung dreht die linke Schulter unter das Kinn und HINTER den Ball — nicht nach unten zum Ball. Gefühl: Rücken zeigt Richtung Ziel. ✗ Fehler: Schulter kippt runter statt zu drehen.",
  },
  {
    name: "Gewicht in rechten Oberschenkel laden",
    dose: "10× · 2 Sek halten",
    detail:
      "Am Top 2 Sek. halten. Druck in rechte Ferse/Innenseite spüren, rechtes Knie bleibt stabil (kippt nicht weg). ✗ Fehler: Gewicht wandert ins linke Bein → genau der Reverse Pivot.",
  },
  {
    name: "Schulter-unter-Kinn Drill",
    dose: "15 Wdh.",
    detail:
      "Kinn bleibt OBEN — die linke Schulter kommt zum Kinn, nicht das Kinn zur Schulter. So bleibt die Wirbelsäulenneigung erhalten und die Drehung frei.",
  },
  {
    name: "Rechtes Bein als Anker",
    dose: "10 langsame Schwünge",
    detail:
      "Rechtes Bein hält den Winkel vom Setup bis zum Top — wie gegen eine Wand auf der Fuß-Innenseite laden. Gibt eine stabile Achse zum Laden.",
  },
  {
    name: "Headcover unter linkem Fuß",
    club: "7 Eisen",
    dose: "10 Bälle",
    detail:
      "Headcover unter den Ballen des linken Fußes — das zwingt das Gewicht im Rückschwung nach rechts. Sauberer, mittiger Treffer = der Drill sitzt.",
  },
  {
    name: "Video-Check von vorne",
    club: "7 Eisen",
    dose: "5–10 Schwünge",
    detail:
      "Face-on filmen. Check: Bleibt der Kopf hinter dem Ball? Lädt das Gewicht rechts? Kippt nichts zum Ziel? Vergleiche langsamen Drill-Schwung mit vollem Tempo.",
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
      { name: "Cat-Cow", dose: "10 Wdh.", detail: "langsam jeden Wirbel einzeln bewegen" },
      { name: "Thoracic Rotations (Vierfüßler)", dose: "8/Seite", detail: "Hand an den Hinterkopf, aus der Brust drehen (nicht aus der Lende)" },
      { name: "Open Book (Seitenlage)", dose: "8/Seite", detail: "unteres Knie bleibt am Boden, Brust öffnet nach hinten" },
      { name: "Wirbelsäule im Sitzen drehen", dose: "30 s/Seite", detail: "erst lang machen, dann sanft tiefer drehen" },
    ],
  },
  {
    id: "mob2",
    group: "mobility",
    title: "Tag 2 — Hüfte & Gesäß",
    focus: "Hüftmobilität & Stabilität",
    steps: [
      { name: "90/90 Hip Switch", dose: "10 Wdh.", detail: "Oberkörper aufrecht, kontrolliert wechseln" },
      { name: "Pigeon Stretch", dose: "45 s/Seite", detail: "Hüfte quadratisch zum Boden, ruhig atmen" },
      { name: "Hüftbeuger-Ausfallschritt", dose: "45 s/Seite", detail: "Becken kippen & Po anspannen (kein Hohlkreuz)" },
      { name: "Glute Bridge", dose: "15 Wdh.", detail: "oben 1 Sek. Po fest, Rippen unten lassen" },
    ],
  },
  {
    id: "mob3",
    group: "mobility",
    title: "Tag 3 — Schultern & Brust",
    focus: "Freie Schultern für den Turn",
    steps: [
      { name: "Türrahmen-Brustdehnung", dose: "30 s", detail: "Ellbogen auf Schulterhöhe, sanft vorlehnen" },
      {
        name: "Schulter-Dislocates mit Band",
        dose: "10 Wdh.",
        detail: "Arme gestreckt, langsam über den Kopf",
        gear: "band",
        alt: { name: "Schulter-Dislocates mit Handtuch/Stab", dose: "10 Wdh.", detail: "Arme gestreckt, langsam über den Kopf — ohne Band" },
      },
      { name: "Cross-Body Shoulder Stretch", dose: "30 s/Seite", detail: "Schulter unten halten (nicht hochziehen)" },
      { name: "Wall Slides", dose: "12 Wdh.", detail: "unterer Rücken an der Wand, Handrücken bleiben an der Wand" },
    ],
  },
  {
    id: "mob4",
    group: "mobility",
    title: "Tag 4 — Ganzkörper Recovery",
    focus: "Lockern & regenerieren",
    steps: [
      {
        name: "Foam Roll Rücken & Beine",
        dose: "5 Min",
        detail: "langsam, empfindliche Punkte 20 s halten",
        gear: "foam-roller",
        alt: { name: "Boden-Mobilisation / Dehn-Flow", dose: "5 Min", detail: "langsame Mobilisation am Boden, empfindliche Stellen sanft dehnen — ohne Rolle" },
      },
      { name: "Child's Pose", dose: "60 s", detail: "Arme lang nach vorn, tief in den Rücken atmen" },
      { name: "Hamstring-Dehnung", dose: "45 s/Seite", detail: "Rücken gerade, aus der Hüfte beugen" },
      { name: "World's Greatest Stretch", dose: "6/Seite", detail: "kontrolliert, Brust zum Himmel öffnen" },
    ],
  },
  {
    id: "mob5",
    group: "mobility",
    title: "Tag 5 — Pivot Mobility",
    focus: "Aktueller Fokus für den Reverse-Pivot-Fix",
    current: true,
    steps: [
      { name: "Stehende Rumpfrotation", dose: "10/Seite", detail: "Hüfte ruhig, nur der Oberkörper dreht (wie der Backswing)" },
      { name: "Schulterdrehung an der Wand", dose: "10 Wdh.", detail: "Rücken zur Wand, beim Drehen mit der Schulter berühren" },
      { name: "Geladene Drehung mit Schritt zurück", dose: "8/Seite", detail: "bewusst aufs hintere Bein laden (Gegenmittel zum Reverse Pivot)" },
      { name: "Nacken/Kinn anheben", dose: "10 Wdh.", detail: "Kinn vom Brustbein weg, Hals lang machen (genau dein Setup-Fix)" },
      { name: "Führende Schulter unter das Kinn", dose: "10 Wdh.", detail: "Schulter kommt zum Kinn, Kinn bleibt oben" },
      { name: "Rechte-Hüfte-Hinge geladen halten", dose: "8 Wdh. · 2 Sek", detail: "am Top 2 Sek. Druck in die rechte Hüfte halten" },
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
      { name: "Headcover außerhalb/vor dem Ball", club: "7 Eisen", dose: "15 Bälle", detail: "triff den Ball, NICHT das Headcover. Zwingt den Schläger von innen (gegen Over-the-top)." },
      { name: "Gate-Drill mit 2 Tees", club: "7 Eisen", dose: "15 Bälle", detail: "schmales Tor um den Ball, Schlägerkopf läuft von innen sauber durch." },
      { name: "Pump-Drill", club: "7 Eisen", dose: "10 Bälle", detail: "3× am Top in den Slot fallen lassen (Arme runter, Schläger flacher), dann erst schlagen." },
      { name: "Unterkörper startet abwärts", club: "7 Eisen", dose: "10 Bälle", detail: "Gewicht/linke Hüfte zuerst, Arme folgen. Nicht von oben mit den Schultern ziehen." },
      { name: "70 % Tempo, in Sequenz", club: "7 Eisen", dose: "15 Bälle", detail: "Gefühl: von innen Richtung „1 Uhr“ durch den Ball." },
      { name: "Alignment-Stick auf der Ziellinie", club: "7 Eisen", dose: "laufend", detail: "nach jedem Schlag Pfad & Divot-Richtung checken." },
    ],
  },
  {
    id: "golf3",
    group: "golf",
    title: "Driver — Topping & Haltung",
    focus: "Sauberer, selbstbewusster Treffer: Haltung halten, nicht aufrichten",
    current: true,
    steps: [
      { name: "Haltung halten", club: "Driver", dose: "10 Bälle", detail: "Po bleibt „an der Wand“, Brust über dem Ball bis nach dem Treffer (kein Aufrichten / Early Extension)." },
      { name: "Kopf hinter dem Ball", club: "Driver", dose: "10 Bälle", detail: "wie beim Reverse-Pivot-Fix; nicht zum Ziel kippen." },
      { name: "Füße-zusammen-Schwünge", club: "Driver", dose: "10 Bälle", detail: "nur Balance & mittiger Kontakt. Heilt Topping schnell." },
      { name: "Tee höher, Ball vorne, leicht AUFWÄRTS treffen", club: "Driver", dose: "10 Bälle", detail: "dem Driver nicht „nach oben helfen“." },
      { name: "Committen", club: "Driver", dose: "10 Bälle", detail: "volle Routine, voller Schwung. Zaghaft/Decel = Topping. Tempo vor Kraft." },
      { name: "Sicheres Tee-Holz bei Unsicherheit", club: "5 Wood", dose: "auf dem Platz", detail: "bei Unsicherheit 5-Holz / langes Eisen vom Tee, bis der Driver wieder sitzt." },
    ],
  },
  {
    id: "golf1",
    group: "golf",
    title: "Reverse Pivot beheben",
    focus: "Basis — Kopf hoch, Schulter unter Kinn, Gewicht rechts laden (füttert Haltung & Path)",
    steps: [
      { name: "Kopf höher im Setup", dose: "10× ohne Ball", detail: "Kinn weg vom Brustbein, Hals lang halten" },
      { name: "Linke Schulter hinter den Ball", dose: "15× langsam", detail: "Schulter unter & hinter den Ball (nicht runter)" },
      { name: "Gewicht rechts laden", dose: "10× · 2 Sek", detail: "am Top 2 Sek. halten, Druck in rechte Ferse/Innenseite" },
      { name: "Schulter unter Kinn", dose: "15 Wdh.", detail: "Kinn bleibt oben, Wirbelsäulenneigung erhalten" },
      { name: "Rechtes Bein als Anker", dose: "10 langsame Schwünge", detail: "Winkel halten" },
      { name: "Headcover unter linkem Fuß", club: "7 Eisen", dose: "10 Bälle", detail: "zwingt Gewicht nach rechts" },
      { name: "Video-Check von vorne", club: "7 Eisen", dose: "5–10 Schwünge", detail: "Kopf hinter Ball? Gewicht rechts?" },
    ],
  },
  // Gym
  {
    id: "gym1",
    group: "gym",
    title: "Beine — Squat Power",
    focus: "Stabiles Fundament & Power",
    steps: [
      { name: "Back Squat", dose: "4×6", detail: "mind. parallel, Knie über die Füße, Rumpf fest", gear: "barbell", alt: { name: "Körpergewicht-Squat", dose: "4×12", detail: "mind. parallel, 2 Sek unten, Rumpf fest" } },
      { name: "Bulgarian Split Squat", dose: "3×8/Seite", detail: "Balance & einbeinige Kraft" },
      { name: "Romanian Deadlift", dose: "3×8", detail: "Hüfte zurück, Rücken gerade, Hamstrings spüren", gear: "barbell", alt: { name: "Single-Leg RDL (Körpergewicht)", dose: "3×8/Seite", detail: "Hüfte zurück, Rücken gerade, Hamstrings spüren" } },
      { name: "Jump Squats", dose: "3×8", detail: "explosiv hoch, weich landen (Power für Schwung-Speed)" },
      { name: "Wadenheben", dose: "3×15", detail: "volle Bewegung, oben halten" },
    ],
  },
  {
    id: "gym2",
    group: "gym",
    title: "Rumpf — Rotation",
    focus: "Rotationskraft für den Schwung",
    steps: [
      { name: "Kabel/Band Woodchop", dose: "3×10/Seite", detail: "aus der Hüfte rotieren, Arme nur führen", gear: "cable", alt: { name: "Stehende Rotation langsam", dose: "3×10/Seite", detail: "aus der Hüfte rotieren, Arme nur führen — ohne Kabel" } },
      { name: "Pallof Press", dose: "3×12/Seite", detail: "Anti-Rotation, Rumpf bleibt stabil (schützt den Rücken)", gear: "cable", alt: { name: "Plank-Anti-Rotation", dose: "3×20 s/Seite", detail: "Unterarmstütz, Hüfte stabil gegen Wegkippen halten" } },
      { name: "Russian Twist", dose: "3×20", detail: "kontrolliert, die Brust dreht (nicht nur die Arme)" },
      { name: "Plank mit Rotation", dose: "3×10", detail: "Hüfte stabil halten" },
      { name: "Med-Ball Rotational Throw", dose: "3×8/Seite", detail: "explosiv (übersetzt direkt in Schwung-Speed)", gear: "med-ball", alt: { name: "Explosive Standing Rotation ohne Ball", dose: "3×8/Seite", detail: "explosiv aus der Hüfte drehen, kontrolliert abbremsen" } },
    ],
  },
  {
    id: "gym3",
    group: "gym",
    title: "Oberkörper",
    focus: "Zug & Druck im Gleichgewicht",
    steps: [
      { name: "Klimmzüge", dose: "4×6", detail: "volle Streckung unten, Schulterblätter führen", gear: "pull-up-bar", alt: { name: "Handtuch-Rudern an der Tür", dose: "4×10", detail: "Handtuch um stabilen Pfosten, Körper schräg, ziehen" } },
      { name: "Bankdrücken (KH)", dose: "3×8", detail: "kontrolliert ab- und auf", gear: "dumbbells", alt: { name: "Liegestütze", dose: "3×12", detail: "Körper als gerades Brett, kontrolliert ab und auf" } },
      { name: "Rudern", dose: "3×10", detail: "Schulterblätter zusammenziehen (Haltung & Zugkraft)", gear: "dumbbells", alt: { name: "Handtuch-Rudern an der Tür", dose: "3×12", detail: "schräg hängend ziehen, Schulterblätter zusammen" } },
      { name: "Schulterdrücken", dose: "3×10", detail: "Rippen unten, kein Hohlkreuz", gear: "dumbbells", alt: { name: "Pike Push-ups", dose: "3×8", detail: "Hüfte hoch, Kopf Richtung Boden drücken" } },
      { name: "Face Pulls", dose: "3×15", detail: "für Schultergesundheit & gegen Rundrücken", gear: "cable", alt: { name: "Band/Handtuch Pull-Aparts", dose: "3×15", detail: "Arme auf Schulterhöhe auseinanderziehen, Schulterblätter zusammen" } },
    ],
  },
  {
    id: "gym4",
    group: "gym",
    title: "Ganzkörper",
    focus: "Athletik & Kraftausdauer",
    steps: [
      { name: "Kreuzheben", dose: "4×5", detail: "neutraler Rücken, aus den Beinen drücken", gear: "barbell", alt: { name: "Hip Hinge (Körpergewicht)", dose: "4×8", detail: "Hüfte zurück, neutraler Rücken, Hamstrings laden" } },
      { name: "Power Clean", dose: "4×3", detail: "explosiv, Technik vor Gewicht", gear: "barbell", alt: { name: "Sprung-Squat + explosives Hochziehen", dose: "4×3", detail: "explosiv aus den Beinen, Technik vor Tempo" } },
      { name: "Liegestütze", dose: "3×12", detail: "Körper als gerades Brett" },
      { name: "Ausfallschritte", dose: "3×10/Seite", detail: "Knie über dem Fuß" },
      { name: "Farmer's Carry", dose: "3×30 m", detail: "Griffkraft & Rumpf, aufrecht & ruhig gehen", gear: "dumbbells", alt: { name: "Schwerer Rucksack-Carry", dose: "3×30 m", detail: "Rucksack mit Gewicht/Wasser, aufrecht & ruhig gehen" } },
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
export const PITCHING: Step[] = [
  { name: "Chips ums Grün", club: "56°", dose: "0–3 Min", detail: "Hände vor dem Ball, Handgelenke ruhig. Landepunkt wählen, Ball läuft aus wie ein Putt." },
  { name: "Pitches halbe & ¾", club: "56°", dose: "3–6 Min", detail: "Brust dreht durch, kein Flippen mit den Händen (sonst weniger Spin). Durch den Ball beschleunigen." },
  { name: "30–50 m Pitches", club: "52°", dose: "6–9 Min", detail: "gleiches Tempo, Distanz über die Schwunglänge steuern. Carry-Gefühl abspeichern." },
  { name: "Hohe weiche Pitches / Bunker", club: "58°", dose: "9–12 Min", detail: "Face offen, weich landen. Im Bunker: Sand vor dem Ball nehmen, durchschwingen." },
  { name: "3 Ziel-Chips an die Fahne", club: "56°", dose: "12–15 Min · 3 Chips", detail: "volle Pre-Shot-Routine wie im Turnier. Mit einem Erfolgserlebnis aufhören." },
];

// Range-Plan: genau 60 Bälle. Aufbau kurz → lang, Peak am Driver,
// Abschluss mit Wedges. Driver & 5 Wood erst „mit Halt“, dann voll.
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

/* ── Trainings-Material (Default-Inventar, alles vorhanden) ─────── */

export const GEAR: GearItem[] = [
  // Mobility
  { id: "foam-roller", label: "Foam Roller", group: "mobility", available: true },
  { id: "band", label: "Band", group: "mobility", available: true },
  // Gym
  { id: "barbell", label: "Langhantel", group: "gym", available: true },
  { id: "dumbbells", label: "Kurzhanteln", group: "gym", available: true },
  { id: "pull-up-bar", label: "Klimmzugstange", group: "gym", available: true },
  { id: "bench", label: "Bank", group: "gym", available: true },
  { id: "cable", label: "Kabelzug", group: "gym", available: true },
  { id: "kettlebell", label: "Kettlebell", group: "gym", available: true },
  { id: "med-ball", label: "Med-Ball", group: "gym", available: true },
  { id: "box", label: "Sprungbox / Step", group: "gym", available: true },
];

/* ── Rory-McIlroy-Plan: Warmup + Sessions (Step[]) ──────────────── */

export const RORY_NOTE =
  "Angelehnt an öffentlich berichtetes Training von Rory McIlroy (Stand 2025) – nicht offiziell/garantiert exakt. Echte Struktur: 6–8-Wochen-Blöcke Strength → Active Recovery → Power → Conditioning.";

/** Geteilter Mobility/Activation-Warmup (erste Section der geladenen Sessions). */
export const WARMUP_RORY: Step[] = [
  { name: "Lockeres Einlaufen", dose: "3–5 Min", detail: "Puls hoch, locker werden – warm, nicht müde." },
  { name: "Hamstring Sweep", dose: "30 s", detail: "gehend gestrecktes Bein nach vorn greifen, Hüfte mobil machen." },
  { name: "Quad Grab", dose: "30 s", detail: "Schritt vor, Ferse zum Po ziehen, aufrecht bleiben." },
  { name: "Lunge Tilt", dose: "30 s/Seite", detail: "90°-Ausfallschritt, Arm über Kopf, Oberkörper zur Seite neigen." },
  { name: "Dynamic Side Lunge", dose: "30 s/Seite", detail: "seitlich laden, Gewicht kontrolliert verlagern." },
  { name: "Schulter-Prehab + Scapula", dose: "10 Wdh.", detail: "Band-Dislocates, Schulterblätter aktivieren.", gear: "band", alt: { name: "Schulter-Prehab ohne Band", dose: "10 Wdh.", detail: "Wall Slides + Armkreise, Schulterblätter aktivieren." } },
  { name: "Hüftmobilität 90/90", dose: "8/Seite", detail: "kontrolliert wechseln, Oberkörper aufrecht." },
];

export const RORY_STRENGTH: Step[] = [
  { name: "Trap-Bar-Kreuzheben", dose: "4×5 (2 schwer)", detail: "Hüfte laden, neutraler Rücken, explosiv hoch. Rory: ~2 schwere Sätze, dann Volumen.", gear: "barbell", alt: { name: "KH-/Körpergewicht-Hip-Hinge", dose: "4×8", detail: "Hüfte zurück, Rücken gerade, Hamstrings laden – ohne Langhantel." } },
  { name: "Neutrale Klimmzüge", dose: "4×5", detail: "voller Hang, Schulterblätter führen, kontrolliert hoch.", gear: "pull-up-bar", alt: { name: "Handtuch-Rudern an der Tür", dose: "4×10", detail: "schräg hängend ziehen, Schulterblätter zusammen." } },
  { name: "15°-Schrägbank-KH-Drücken", dose: "4×6", detail: "Schrägbank, Kurzhanteln (verhindert Dysbalancen), kontrolliert ab und auf.", gear: "dumbbells", alt: { name: "Liegestütze (Füße erhöht)", dose: "4×10", detail: "Brust-Fokus, Körper als gerades Brett." } },
  { name: "Reverse Lunge (KH)", dose: "3×8/Seite", detail: "Schritt zurück, Knie sauber, Rumpf fest.", gear: "dumbbells", alt: { name: "Reverse Lunge (Körpergewicht)", dose: "3×12/Seite", detail: "kontrolliert, Balance halten." } },
  { name: "Renegade Row", dose: "3×8/Seite", detail: "Plank-Position, KH einarmig rudern, Hüfte ruhig.", gear: "dumbbells", alt: { name: "Plank + Schulter-Tap", dose: "3×12/Seite", detail: "Hüfte stabil gegen Wegkippen halten." } },
  { name: "Plank mit Beinheben", dose: "3×8/Seite", detail: "Hüfte stabil, kein Durchhängen." },
];

export const RORY_POWER: Step[] = [
  { name: "Box Jumps", dose: "3×10", detail: "explosiv hoch, weich landen, kurz resetten.", gear: "box", alt: { name: "Squat Jumps (Körpergewicht)", dose: "3×10", detail: "explosiv hoch, weich landen." } },
  { name: "Squat Jumps", dose: "2× max + 2×10", detail: "erst 2 Sätze max Speed, dann 2×10 betont (optional Weste)." },
  { name: "Med-Ball-Slams mit Rotation", dose: "3×8/Seite", detail: "über Kopf, mit Viertel-Rotation runter, maximale Power.", gear: "med-ball", alt: { name: "Explosive Chop (ohne Ball)", dose: "3×8/Seite", detail: "explosiv diagonal, kontrolliert abbremsen." } },
  { name: "Overhead-Throws (6–8 kg)", dose: "3×5", detail: "explosiv über Kopf abwerfen.", gear: "med-ball", alt: { name: "Explosiver Sprung-Reach", dose: "3×5", detail: "tief laden, explosiv hochstrecken." } },
  { name: "Schnelle leichte Lifts (Speed)", dose: "3×3", detail: "leichtes Gewicht, maximale Bewegungsgeschwindigkeit.", gear: "dumbbells", alt: { name: "Betont schnelle Sprung-Kniebeuge", dose: "3×3", detail: "Geschwindigkeit vor Last." } },
];

export const RORY_CIRCUIT_1: Step[] = [
  { name: "Romanian Deadlift", dose: "3 Runden – 8–10", detail: "Hüfte zurück, Hamstrings laden, Rücken neutral. 1 Min Pause pro Runde.", gear: "barbell", alt: { name: "Single-Leg RDL (Körpergewicht)", dose: "3×8/Seite", detail: "Balance, Hüfte laden." } },
  { name: "Klimmzug", dose: "3 Runden – 5–10", detail: "voller Hang, sauber ziehen.", gear: "pull-up-bar", alt: { name: "Handtuch-Rudern an der Tür", dose: "3×10", detail: "schräg hängend ziehen." } },
  { name: "Plank mit Beinheben", dose: "3 Runden – 8/Seite", detail: "Hüfte stabil halten." },
];

export const RORY_CIRCUIT_2: Step[] = [
  { name: "Reverse Lunge", dose: "3 Runden – 6–8/Seite", detail: "kontrolliert, Knie sauber. 1 Min Pause pro Runde." },
  { name: "Renegade Row", dose: "3 Runden – 6–8/Seite", detail: "Plank-Row, Hüfte ruhig.", gear: "dumbbells", alt: { name: "Plank + Schulter-Tap", dose: "3×10/Seite", detail: "Hüfte stabil." } },
  { name: "Jump Squat", dose: "3 Runden – 5", detail: "explosiv, weich landen." },
];

export const RORY_CONDITIONING: Step[] = [
  { name: "Schwimmen", dose: "20–30 Min", detail: "gleichmäßige Bahnen, ruhiger Atemrhythmus – gelenkschonende Ausdauer." },
  { name: "Schwimm-Intervalle (optional)", dose: "6× 1 Bahn zügig / 1 locker", detail: "wenn frisch, statt Dauerschwimmen – kurze schnelle Bahnen." },
  { name: "Pallof Press", dose: "3×12/Seite", detail: "Anti-Rotation, Rumpf bleibt stabil.", gear: "cable", alt: { name: "Plank-Anti-Rotation", dose: "3×20 s/Seite", detail: "Hüfte gegen Wegkippen halten." } },
  { name: "Farmer's Carry", dose: "3×30 m", detail: "schwer, aufrecht, Rumpf fest.", gear: "dumbbells", alt: { name: "Rucksack-Carry", dose: "3×30 m", detail: "Rucksack mit Gewicht, aufrecht gehen." } },
  { name: "Hollow Hold", dose: "3×30 s", detail: "unterer Rücken am Boden, Körperspannung." },
];

export const RORY_ACTIVATION: Step[] = [
  { name: "Lockeres Einlaufen + Armkreisen", dose: "3 Min", detail: "warm werden, nicht ermüden." },
  { name: "World's Greatest Stretch", dose: "6/Seite", detail: "Hüfte und Brust öffnen, kontrolliert." },
  { name: "Rotations-Squat-Jumps", dose: "2×6", detail: "leicht, nur aktivieren." },
  { name: "Med-Ball-Rotation (leicht)", dose: "2×8/Seite", detail: "Speed primen, nicht ermüden.", gear: "med-ball", alt: { name: "Stehende Rotation", dose: "2×8/Seite", detail: "zügig, ohne Ball." } },
  { name: "Band-Walks (Hüfte)", dose: "2×10/Seite", detail: "Gesäß aktivieren, Spannung halten.", gear: "band", alt: { name: "Hüft-Abduktion (Körpergewicht)", dose: "2×12/Seite", detail: "Seitenlage, Bein kontrolliert heben." } },
];

export const RORY_RECOVERY: Step[] = [
  { name: "Foam Roll Ganzkörper", dose: "8–10 Min", detail: "langsam, empfindliche Punkte 20 s halten.", gear: "foam-roller", alt: { name: "Boden-Mobilisation / Dehn-Flow", dose: "8–10 Min", detail: "sanft mobilisieren, ohne Rolle." } },
  { name: "Lockeres Gehen/Schwimmen", dose: "20–30 Min", detail: "aktive Erholung, niedrige Intensität." },
  { name: "Hüftbeuger- und Hamstring-Dehnung", dose: "45 s/Seite", detail: "ruhig atmen, nicht reißen." },
  { name: "Brust-/Schulteröffner", dose: "45 s/Seite", detail: "Türrahmen, sanft vorlehnen." },
  { name: "Atmung und Schlaf-Reset", dose: "5 Min", detail: "tiefe Atmung; Rory priorisiert 8 h Schlaf (WHOOP)." },
];
