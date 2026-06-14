# Trainings-Präzision, Material-Bewusstsein & stärkerer Coach — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Übungen tragen Schläger + Dosis, Routinen passen sich an vorhandenes Material (Mobility+Gym) an, und der KI-Coach kann einzelne Schritte gezielt ändern/löschen und Material setzen.

**Architecture:** Ein strukturierter `Step`-Typ (name/detail/club/dose/gear/alt) ersetzt die `"Name — Detail"`-Strings überall (Vorbild: das bestehende `WarmupStep`). Ein `GearItem`-Inventar (Store-Key `gear`) speist einen reinen Resolver `resolveSteps`, der bei fehlendem Gerät die hinterlegte `alt`-Variante einsetzt oder den Schritt als „nicht verfügbar" markiert. Der Coach bekommt strukturierte + drei neue Aktionen.

**Tech Stack:** Next.js 14 (App Router, Client Components), TypeScript, reaktiver Modul-Store (`lib/store.ts`), vitest (neu, für reine Logik).

**Spec:** `docs/superpowers/specs/2026-06-14-training-precision-gear-coach-design.md`

**Konventionen dieses Projekts (wichtig):**
- Keine bestehenden Tests → vitest wird in Task 1 eingeführt.
- `useObject().set(patch)` macht einen **Merge** (Partial), `.replace(v)` setzt komplett. `useCollection().update(id, patch)` patcht ein Item.
- TS-Check schnell: `npx tsc --noEmit`. Voller Build: `npm run build`.
- Commit-Format wie bisher (`feat:`/`test:`/`refactor:`/`chore:`), eine Zeile.

---

## Task 1: vitest-Setup

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `lib/__tests__/smoke.test.ts`

- [ ] **Step 1: devDependency + Scripts in `package.json`**

Ändere den `scripts`- und `devDependencies`-Block so:

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    "next": "14.2.5",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "typescript": "^5",
    "vitest": "^2.1.8"
  }
```

- [ ] **Step 2: `vitest.config.ts` anlegen**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
```

- [ ] **Step 3: Smoke-Test anlegen** `lib/__tests__/smoke.test.ts`

```ts
import { describe, it, expect } from "vitest";

describe("vitest setup", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: Installieren**

Run: `npm install`
Expected: vitest landet in `node_modules`, `package-lock.json` aktualisiert.

- [ ] **Step 5: Test laufen lassen**

Run: `npm test`
Expected: PASS (1 passed).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts lib/__tests__/smoke.test.ts
git commit -m "chore: add vitest test runner"
```

---

## Task 2: Neue Typen (additiv) in `lib/types.ts`

**Files:**
- Modify: `lib/types.ts` (am Ende anfügen)

Additiv — es wird noch nichts Bestehendes geändert, der Build bleibt grün.

- [ ] **Step 1: Typen anhängen**

Füge ans Ende von `lib/types.ts` an:

```ts
/* ── Strukturierte Übungsschritte & Trainings-Material ──────────── */

/** Material-Kürzel für Mobility/Gym-Übungen. */
export type GearId =
  | "foam-roller"
  | "band"
  | "barbell"
  | "dumbbells"
  | "pull-up-bar"
  | "bench"
  | "cable"
  | "kettlebell"
  | "med-ball";

/** Ein strukturierter Übungsschritt (ersetzt das "Name — Detail"-Format). */
export interface Step {
  name: string;
  detail: string;
  club?: string; // "7 Eisen" — nur Golf/Range/Kurzspiel
  dose?: string; // "15 Bälle" | "10 Wdh." | "3×8" | "45 s/Seite"
  gear?: GearId; // benötigtes Material; fehlt → keins nötig
  alt?: Omit<Step, "alt">; // Variante, wenn `gear` nicht verfügbar ist
}

/** Ein Material-Eintrag im Trainings-Inventar. */
export interface GearItem {
  id: GearId;
  label: string;
  group: "mobility" | "gym";
  available: boolean;
}
```

- [ ] **Step 2: TS-Check**

Run: `npx tsc --noEmit`
Expected: keine Fehler.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add Step, GearId and GearItem types"
```

---

## Task 3: Reiner Helfer `lib/gear.ts` (TDD)

**Files:**
- Test: `lib/__tests__/gear.test.ts`
- Create: `lib/gear.ts`

`lib/gear.ts` enthält nur reine Funktionen (kein React) → ideal für Unit-Tests.

- [ ] **Step 1: Failing test schreiben** `lib/__tests__/gear.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { normalizeStep, gearRecord, resolveSteps, GEAR_IDS } from "../gear";
import { GearItem, Step } from "../types";

describe("normalizeStep", () => {
  it("wandelt 'Name — Detail' in einen Step", () => {
    expect(normalizeStep("Gate-Drill — von innen")).toEqual({
      name: "Gate-Drill",
      detail: "von innen",
    });
  });
  it("behandelt Strings ohne Trenner als reinen Namen", () => {
    expect(normalizeStep("Nur Name")).toEqual({ name: "Nur Name", detail: "" });
  });
  it("lässt ein bestehendes Step-Objekt unverändert (idempotent)", () => {
    const s: Step = { name: "A", detail: "B", club: "7 Eisen", dose: "10" };
    expect(normalizeStep(s)).toEqual(s);
  });
});

describe("gearRecord", () => {
  it("baut eine id→available Map", () => {
    const items: GearItem[] = [
      { id: "band", label: "Band", group: "mobility", available: false },
      { id: "barbell", label: "Langhantel", group: "gym", available: true },
    ];
    const rec = gearRecord(items);
    expect(rec.band).toBe(false);
    expect(rec.barbell).toBe(true);
  });
});

describe("resolveSteps", () => {
  const steps: Step[] = [
    { name: "Squat", detail: "tief", dose: "4×6" }, // kein gear
    {
      name: "Woodchop",
      detail: "rotieren",
      dose: "3×10",
      gear: "cable",
      alt: { name: "Standing Rotation", detail: "ohne Kabel", dose: "3×10" },
    },
    { name: "Klimmzug", detail: "ziehen", dose: "4×6", gear: "pull-up-bar" }, // kein alt
  ];

  it("zeigt Schritte ohne gear als ok", () => {
    const r = resolveSteps(steps, { cable: true, "pull-up-bar": true } as any);
    expect(r[0].status).toBe("ok");
    expect(r[0].step.name).toBe("Squat");
  });
  it("tauscht auf alt, wenn gear fehlt und alt vorhanden ist", () => {
    const r = resolveSteps(steps, { cable: false, "pull-up-bar": true } as any);
    expect(r[1].status).toBe("adapted");
    expect(r[1].step.name).toBe("Standing Rotation");
  });
  it("markiert unavailable, wenn gear fehlt und kein alt da ist", () => {
    const r = resolveSteps(steps, { cable: true, "pull-up-bar": false } as any);
    expect(r[2].status).toBe("unavailable");
    expect(r[2].step.name).toBe("Klimmzug");
  });
  it("behandelt fehlenden Eintrag (undefined) wie verfügbar", () => {
    const r = resolveSteps([steps[1]], {} as any);
    expect(r[0].status).toBe("ok");
  });
});

describe("GEAR_IDS", () => {
  it("enthält genau 9 Material-IDs", () => {
    expect(GEAR_IDS).toHaveLength(9);
  });
});
```

- [ ] **Step 2: Test laufen lassen (muss fehlschlagen)**

Run: `npm test`
Expected: FAIL — `Cannot find module '../gear'`.

- [ ] **Step 3: `lib/gear.ts` implementieren**

```ts
// Reine Helfer rund um strukturierte Steps und das Material-Inventar.
// Kein React, keine Seiteneffekte → vollständig unit-testbar.

import { GearId, GearItem, Step } from "./types";

export type StepStatus = "ok" | "adapted" | "unavailable";

/** Alle bekannten Material-IDs (für Validierung & Tests). */
export const GEAR_IDS: GearId[] = [
  "foam-roller",
  "band",
  "barbell",
  "dumbbells",
  "pull-up-bar",
  "bench",
  "cable",
  "kettlebell",
  "med-ball",
];

/** Wandelt das alte String-Format ("Name — Detail") in einen Step. Idempotent. */
export function normalizeStep(s: string | Step): Step {
  if (typeof s !== "string") return s;
  const [name, ...rest] = s.split(" — ");
  return { name: name.trim(), detail: rest.join(" — ").trim() };
}

/** Baut aus dem Inventar eine id→available-Map. */
export function gearRecord(items: GearItem[]): Record<GearId, boolean> {
  const rec = {} as Record<GearId, boolean>;
  for (const g of items) rec[g.id] = g.available;
  return rec;
}

/**
 * Löst die Material-Verfügbarkeit pro Schritt auf:
 *  - kein gear ODER verfügbar      → ok (Original)
 *  - gear fehlt UND alt vorhanden  → adapted (alt-Variante)
 *  - gear fehlt UND kein alt       → unavailable (Original, markiert)
 * Ein fehlender Eintrag in `gear` gilt als verfügbar.
 */
export function resolveSteps(
  steps: Step[],
  gear: Record<GearId, boolean>
): { step: Step; status: StepStatus }[] {
  return steps.map((step) => {
    if (!step.gear || gear[step.gear] !== false) return { step, status: "ok" as const };
    if (step.alt) return { step: { ...step.alt }, status: "adapted" as const };
    return { step, status: "unavailable" as const };
  });
}
```

- [ ] **Step 4: Test laufen lassen (muss grün sein)**

Run: `npm test`
Expected: PASS (alle gear-Tests + smoke).

- [ ] **Step 5: Commit**

```bash
git add lib/gear.ts lib/__tests__/gear.test.ts
git commit -m "feat: add gear resolver and step normalizer (lib/gear.ts)"
```

---

## Task 4: Strukturierte Inhalte — `types`, `seed`, `programs`, Rendering

Größte Aufgabe: das String-Format wird überall auf `Step[]` umgestellt. Am Ende ist `npx tsc --noEmit` grün und ein Content-Invarianten-Test sichert die neuen Daten ab.

**Files:**
- Test: `lib/__tests__/seed.test.ts`
- Modify: `lib/types.ts` (Drill→entfernen, Routine.steps)
- Modify: `lib/seed.ts` (DRILLS, ROUTINES, PITCHING → Step[]; GEAR neu; Imports)
- Modify: `lib/programs.ts` (ProgramSection.steps; Normalisierung; programsForContext; DRILLS-Mapping)
- Modify: `lib/coach.ts` (CoachContext.programs[].sections[].steps → Step[])
- Modify: `app/programm/[id]/page.tsx` (strukturiertes Rendering, noch ohne gear)
- Modify: `app/coach/page.tsx` (normalizeStep-Shim beim Anwenden der noch String-basierten Programm-Aktionen)

- [ ] **Step 1: Content-Invarianten-Test schreiben** `lib/__tests__/seed.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { DRILLS, ROUTINES, PITCHING, GEAR } from "../seed";
import { GEAR_IDS } from "../gear";
import { Step } from "../types";

function allSteps(): { step: Step; golf: boolean }[] {
  const out: { step: Step; golf: boolean }[] = [];
  DRILLS.forEach((s) => out.push({ step: s, golf: true }));
  PITCHING.forEach((s) => out.push({ step: s, golf: true }));
  ROUTINES.forEach((r) =>
    r.steps.forEach((s) => out.push({ step: s, golf: r.group === "golf" }))
  );
  return out;
}

describe("seed content invariants", () => {
  it("jeder Schritt hat einen nicht-leeren Namen", () => {
    for (const { step } of allSteps()) expect(step.name.length).toBeGreaterThan(0);
  });

  it("jeder Schritt hat eine Dosis (wie oft/viel)", () => {
    for (const { step } of allSteps()) expect(step.dose, step.name).toBeTruthy();
  });

  it("Golf-Schritte mit Ball/Schläger tragen einen club, sonst keiner", () => {
    // club ist optional, aber wenn gesetzt, nicht leer
    for (const { step } of allSteps())
      if (step.club !== undefined) expect(step.club.length).toBeGreaterThan(0);
  });

  it("jeder gear-Verweis ist gültig UND hat eine alt-Variante", () => {
    for (const { step } of allSteps())
      if (step.gear) {
        expect(GEAR_IDS, step.name).toContain(step.gear);
        expect(step.alt, `alt fehlt bei ${step.name}`).toBeTruthy();
        expect(step.alt!.dose, `alt.dose fehlt bei ${step.name}`).toBeTruthy();
      }
  });

  it("GEAR enthält 9 Einträge mit gültigen IDs", () => {
    expect(GEAR).toHaveLength(9);
    for (const g of GEAR) expect(GEAR_IDS).toContain(g.id);
  });
});
```

- [ ] **Step 2: Test laufen lassen (muss fehlschlagen)**

Run: `npm test`
Expected: FAIL — `GEAR` ist kein Export / DRILLS sind noch Strings ohne `dose`.

- [ ] **Step 3: `lib/types.ts` — `Drill` entfernen, `Routine.steps` auf `Step[]`**

Ersetze in `lib/types.ts` den Drill/Routine-Block. Lösche das `Drill`-Interface komplett:

```ts
/** Ein einzelner Drill. */
export interface Drill {
  id: string;
  name: string;
  detail: string;
}
```

Und ändere in `Routine` die `steps`-Zeile von `steps: string[];` zu `steps: Step[];`. Das Ergebnis:

```ts
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
  steps: Step[];
  current?: boolean; // aktueller Fokus (hebt die Routine hervor)
}
```

- [ ] **Step 4: `lib/seed.ts` — Imports anpassen**

Ändere den Import-Block oben (`Drill` raus, `Step`/`GearItem` rein):

```ts
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
```

- [ ] **Step 5: `lib/seed.ts` — `DRILLS` auf `Step[]` umschreiben**

Ersetze den kompletten `export const DRILLS` Block durch:

```ts
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
```

- [ ] **Step 6: `lib/seed.ts` — `ROUTINES` auf `Step[]` umschreiben**

Ersetze den kompletten `export const ROUTINES: Routine[] = [ … ];` Block durch:

```ts
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
```

- [ ] **Step 7: `lib/seed.ts` — `PITCHING` auf `Step[]` umschreiben**

Ersetze den `export const PITCHING: string[] = [ … ];` Block durch (die `PITCHING_MINUTES`-Zeile davor bleibt):

```ts
export const PITCHING: Step[] = [
  { name: "Chips ums Grün", club: "56°", dose: "0–3 Min", detail: "Hände vor dem Ball, Handgelenke ruhig. Landepunkt wählen, Ball läuft aus wie ein Putt." },
  { name: "Pitches halbe & ¾", club: "56°", dose: "3–6 Min", detail: "Brust dreht durch, kein Flippen mit den Händen (sonst weniger Spin). Durch den Ball beschleunigen." },
  { name: "30–50 m Pitches", club: "52°", dose: "6–9 Min", detail: "gleiches Tempo, Distanz über die Schwunglänge steuern. Carry-Gefühl abspeichern." },
  { name: "Hohe weiche Pitches / Bunker", club: "58°", dose: "9–12 Min", detail: "Face offen, weich landen. Im Bunker: Sand vor dem Ball nehmen, durchschwingen." },
  { name: "3 Ziel-Chips an die Fahne", club: "56°", dose: "12–15 Min · 3 Chips", detail: "volle Pre-Shot-Routine wie im Turnier. Mit einem Erfolgserlebnis aufhören." },
];
```

- [ ] **Step 8: `lib/seed.ts` — `GEAR`-Inventar ergänzen**

Füge (z.B. direkt nach dem `PITCHING`-Block oder am Dateiende) an:

```ts
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
];
```

- [ ] **Step 9: Content-Test laufen lassen (muss grün sein)**

Run: `npm test`
Expected: PASS — `seed content invariants` grün.

- [ ] **Step 10: `lib/programs.ts` — `ProgramSection.steps: Step[]`, Normalisierung, DRILLS-Mapping, Kontext**

Mehrere Änderungen in `lib/programs.ts`:

(a) Imports oben ergänzen:

```ts
import { DRILLS, PITCHING, ROUTINES } from "./seed";
import { Routine, SessionType, Step } from "./types";
import { normalizeStep } from "./gear";
```

(b) `ProgramSection.steps` auf `Step[]`:

```ts
export interface ProgramSection {
  title?: string;
  steps: Step[]; // strukturierte Schritte
}
```

(c) Die „Basics · Reverse Pivot"-Section nutzt jetzt direkt `DRILLS` (kein String-Mapping mehr). Ersetze in `PROGRAMS` die betroffene Section:

```ts
      {
        title: "Basics · Reverse Pivot (2–3 als Aufwärmen)",
        steps: DRILLS,
      },
```

(d) `applyOverride` normalisiert die Sections (alte gespeicherte Overrides können noch String-Steps enthalten):

```ts
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
```

(e) `programsForContext` gibt jetzt strukturierte Steps an den Coach (statt Strings):

```ts
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
```

Hinweis: `ProgramOverride.sections` darf weiterhin `(string | Step)[]` aufnehmen — passe den Typ an:

```ts
export interface ProgramOverride {
  title?: string;
  focus?: string;
  sections?: { title?: string; steps: (string | Step)[] }[];
}
```

- [ ] **Step 11: `lib/coach.ts` — Kontext-Steps auf `Step[]`**

In `lib/coach.ts`: Import von `Step` ergänzen und in `CoachContext` die `programs`-Steps auf `Step[]` ändern.

Import oben:

```ts
import { Profile, Step } from "./types";
```

In `CoachContext`:

```ts
  programs: {
    id: string;
    title: string;
    group: string;
    sections: { title?: string; steps: Step[] }[];
  }[];
```

- [ ] **Step 12: `app/programm/[id]/page.tsx` — strukturiertes Rendering (ohne gear)**

Ersetze den Render-Block der Steps (die `sec.steps.map(...)`-Schleife). Vorher wurde mit `step.split(" — ")` gearbeitet — jetzt sind es Objekte. Ersetze den `<div className="card" key={si}>`-Block durch:

```tsx
        {program.sections.map((sec, si) => (
          <div className="card" key={si}>
            {sec.title && <h2>{sec.title}</h2>}
            {sec.steps.map((step, i) => {
              const id = `${si}-${i}`;
              const on = checked.has(id);
              return (
                <div className={`drill ${on ? "done" : ""}`} key={id}>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(id)}
                  />
                  <span style={{ flex: 1 }}>
                    <span className="d-name">{step.name}</span>
                    {(step.club || step.dose) && (
                      <span className="step-tags">
                        {step.club && <span className="step-tag club">{step.club}</span>}
                        {step.dose && <span className="step-tag dose">{step.dose}</span>}
                      </span>
                    )}
                    {step.detail && <div className="d-detail">{step.detail}</div>}
                    <ExerciseVideo
                      query={`${step.name} ${DEMO_SUFFIX[program.group]}`}
                    />
                  </span>
                </div>
              );
            })}
          </div>
        ))}
```

Entferne den jetzt ungenutzten Import `exerciseName` aus der Importzeile `import { exerciseName } from "@/app/components/ui";` (Zeile 14) — die ganze Zeile löschen.

- [ ] **Step 13: `app/programm/[id]/page.tsx` — Tag-Styles in `app/globals.css`**

Füge in `app/globals.css` (z.B. direkt nach dem `.drill .d-detail`-Block, ~Zeile 591) ein:

```css
/* Schläger/Dosis-Tags an Übungen */
.step-tags {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}
.step-tag {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 999px;
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
}
.step-tag.club {
  color: var(--ink);
  background: var(--bg);
  border: 1px solid var(--line-strong);
}
.step-tag.dose {
  color: var(--green-ink);
  background: var(--green-soft);
}
```

- [ ] **Step 14: `app/coach/page.tsx` — Übergangs-Shim beim Anwenden**

`ProgramOverride.sections` enthält jetzt `Step`-Schritte; die Coach-Aktionen liefern in dieser Phase noch Strings. Normalisiere beim Anwenden. Import oben ergänzen:

```ts
import { normalizeStep } from "@/lib/gear";
```

Ersetze in `applyOne` die beiden Programm-Cases:

```ts
      case "set_program":
        overrides.set({
          [a.id]: {
            title: a.title,
            focus: a.focus,
            sections: a.sections.map((s) => ({
              title: s.title,
              steps: s.steps.map(normalizeStep),
            })),
          },
        });
        break;
      case "add_program_step": {
        const resolved = resolveProgram(a.id, overrides.value);
        if (resolved) {
          const sections = resolved.sections.map((s) => ({
            ...s,
            steps: [...s.steps],
          }));
          const step = normalizeStep(a.step);
          if (sections.length) sections[sections.length - 1].steps.push(step);
          else sections.push({ steps: [step] });
          overrides.set({
            [a.id]: { ...overrides.value[a.id], sections },
          });
        }
        break;
      }
```

- [ ] **Step 15: Voller Typcheck + Tests**

Run: `npx tsc --noEmit && npm test`
Expected: keine TS-Fehler, alle Tests grün.

- [ ] **Step 16: Build**

Run: `npm run build`
Expected: „Compiled successfully", alle Seiten bauen.

- [ ] **Step 17: Commit**

```bash
git add lib/types.ts lib/seed.ts lib/programs.ts lib/coach.ts app/programm app/coach app/globals.css lib/__tests__/seed.test.ts
git commit -m "feat: structured exercise steps with club + dose everywhere"
```

---

## Task 5: Material-Inventar & „Mein Material"-Panel (Training-Seite)

**Files:**
- Modify: `app/training/page.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: `app/training/page.tsx` — Inventar lesen & Panel rendern**

Ersetze den kompletten Datei-Inhalt durch:

```tsx
"use client";

import Link from "next/link";
import { Focus, GearItem } from "@/lib/types";
import { useObject, useCollection } from "@/lib/store";
import { FOCUS, GEAR } from "@/lib/seed";
import { PROGRAMS, applyOverride, ProgramOverrides } from "@/lib/programs";
import Icon from "@/app/components/Icon";

const GROUPS: { key: "golf" | "mobility" | "gym"; label: string }[] = [
  { key: "golf", label: "Range & Golf" },
  { key: "mobility", label: "Mobility" },
  { key: "gym", label: "Gym" },
];

const GEAR_GROUPS: { key: "mobility" | "gym"; label: string }[] = [
  { key: "mobility", label: "Mobility" },
  { key: "gym", label: "Gym" },
];

export default function Training() {
  const focus = useObject<Focus>("focus", FOCUS);
  const overrides = useObject<ProgramOverrides>("programOverrides", {});
  const gear = useCollection<GearItem>("gear", GEAR);

  return (
    <>
      <header className="topbar">
        <h1>Training</h1>
        <div className="tag">Wähle ein Programm — es führt dich durch</div>
      </header>

      <div className="container">
        <div className="mantra">
          <div className="small">Dein Fokus</div>
          <div className="big">{focus.value.title}</div>
          {focus.value.cues.map((c) => (
            <div className="cue" key={c}>
              {c}
            </div>
          ))}
        </div>

        <div className="card">
          <h2>Mein Material</h2>
          <div className="sub">
            Was hast du da? Fehlt etwas, zeigt dein Plan automatisch eine
            Alternative ohne Gerät.
          </div>
          {GEAR_GROUPS.map((g) => (
            <div key={g.key} style={{ marginTop: 6 }}>
              <div className="gear-group-label">{g.label}</div>
              <div className="gear-grid">
                {gear.items
                  .filter((it) => it.group === g.key)
                  .map((it) => (
                    <button
                      key={it.id}
                      type="button"
                      className={`avail-toggle ${it.available ? "on" : "off"}`}
                      onClick={() =>
                        gear.update(it.id, { available: !it.available })
                      }
                    >
                      {it.label}
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {GROUPS.map((g) => {
          const list = PROGRAMS.filter((p) => p.group === g.key);
          return (
            <div key={g.key}>
              <div className="group-label">{g.label}</div>
              <div className="card">
                {list.map((base) => {
                  const p = applyOverride(base, overrides.value[base.id]);
                  const steps = p.sections.reduce((n, s) => n + s.steps.length, 0);
                  return (
                    <Link href={`/programm/${p.id}`} className="pcard" key={p.id}>
                      <span className="pcard-info">
                        <span className="pcard-title">
                          {p.title}
                          {p.current && <span className="tag-current">Fokus</span>}
                        </span>
                        <span className="pcard-focus">{p.focus}</span>
                      </span>
                      <span className="pcard-meta">{steps} Übungen</span>
                      <Icon name="chevron" size={17} className="pcard-chev" />
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="note-box">
          Jedes Programm ist eine geführte Checkliste: durchgehen, abhaken,
          abschließen — das loggt automatisch deine Session und hakt den Tag im
          Wochenplan ab.
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: `app/globals.css` — Material-Panel-Styles**

Füge in `app/globals.css` (z.B. direkt nach dem `.group-label`-Block, ~Zeile 1090) ein:

```css
/* Material-Inventar (Training) */
.gear-group-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--faint);
  margin: 12px 0 8px;
}
.gear-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
```

(Die `.avail-toggle`-Klasse existiert bereits und liefert den grün/rot-Toggle-Look.)

- [ ] **Step 3: Typcheck + Build**

Run: `npx tsc --noEmit && npm run build`
Expected: grün.

- [ ] **Step 4: Manueller Check**

Run: `npm run dev`, öffne `http://localhost:3000/training`.
Expected: „Mein Material"-Karte mit Toggle-Chips (Mobility/Gym), Standard alle grün/an; Klick schaltet rot/aus.

- [ ] **Step 5: Commit**

```bash
git add app/training/page.tsx app/globals.css
git commit -m "feat: training material inventory panel"
```

---

## Task 6: Material-Anpassung im Programm-Rendering

**Files:**
- Modify: `app/programm/[id]/page.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: `app/programm/[id]/page.tsx` — gear lesen, Steps auflösen, Badges**

Ergänze die Imports:

```ts
import { useObject, uid, useCollection } from "@/lib/store";
import { GearItem } from "@/lib/types";
import { GEAR } from "@/lib/seed";
import { gearRecord, resolveSteps } from "@/lib/gear";
```

(Die bestehende `useObject`-Importzeile entsprechend zu `useObject, uid, useCollection` erweitern — `uid` wird schon importiert.)

Nach `const log = useObject<WeekLog>("weekLog", {});` einfügen:

```ts
  const gear = useCollection<GearItem>("gear", GEAR);
  const gearRec = gearRecord(gear.items);
```

Ersetze die `total`-Berechnung (zählt nur machbare Schritte):

```ts
  const total = program.sections.reduce(
    (n, s) =>
      n +
      resolveSteps(s.steps, gearRec).filter((r) => r.status !== "unavailable")
        .length,
    0
  );
```

Ersetze den Render-Block der Sections durch die aufgelöste Variante:

```tsx
        {program.sections.map((sec, si) => {
          const resolved = resolveSteps(sec.steps, gearRec);
          return (
            <div className="card" key={si}>
              {sec.title && <h2>{sec.title}</h2>}
              {resolved.map(({ step, status }, i) => {
                const id = `${si}-${i}`;
                const blocked = status === "unavailable";
                const on = checked.has(id);
                return (
                  <div
                    className={`drill ${on ? "done" : ""} ${blocked ? "blocked" : ""}`}
                    key={id}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={blocked}
                      onChange={() => toggle(id)}
                    />
                    <span style={{ flex: 1 }}>
                      <span className="d-name">{step.name}</span>
                      {status === "adapted" && (
                        <span className="step-badge adapted">angepasst</span>
                      )}
                      {status === "unavailable" && (
                        <span className="step-badge unavailable">
                          braucht {gearLabel(step.gear)}
                        </span>
                      )}
                      {(step.club || step.dose) && (
                        <span className="step-tags">
                          {step.club && (
                            <span className="step-tag club">{step.club}</span>
                          )}
                          {step.dose && (
                            <span className="step-tag dose">{step.dose}</span>
                          )}
                        </span>
                      )}
                      {step.detail && <div className="d-detail">{step.detail}</div>}
                      {!blocked && (
                        <ExerciseVideo
                          query={`${step.name} ${DEMO_SUFFIX[program.group]}`}
                        />
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
```

Füge oberhalb der Komponente (nach den Imports) einen kleinen Label-Helfer ein:

```ts
function gearLabel(id?: string): string {
  return GEAR.find((g) => g.id === id)?.label ?? "Material";
}
```

- [ ] **Step 2: `app/globals.css` — Badges + blockierter Schritt**

Füge nach dem in Task 4 ergänzten `.step-tag.dose`-Block ein:

```css
.step-badge {
  display: inline-block;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 3px 7px;
  border-radius: 999px;
  margin-left: 8px;
  vertical-align: middle;
  white-space: nowrap;
}
.step-badge.adapted {
  color: var(--amber);
  background: #faf3e1;
}
.step-badge.unavailable {
  color: var(--red);
  background: var(--red-soft);
}
.drill.blocked {
  opacity: 0.55;
}
.drill.blocked .d-name {
  color: var(--faint);
}
```

- [ ] **Step 3: Typcheck + Build**

Run: `npx tsc --noEmit && npm run build`
Expected: grün.

- [ ] **Step 4: Manueller Check**

Run: `npm run dev`. Auf `/training` z.B. „Langhantel" ausschalten, dann `/programm/gym1` öffnen.
Expected: „Back Squat" zeigt die Alternative „Körpergewicht-Squat" mit Badge „angepasst". Schalte ein Gerät ohne alt-Pfad testweise — der Schritt wird ausgegraut mit „braucht …". (Alle aktuellen gear-Schritte haben ein alt → Normalfall ist „angepasst".)

- [ ] **Step 5: Commit**

```bash
git add app/programm/[id]/page.tsx app/globals.css
git commit -m "feat: adapt program steps to available gear"
```

---

## Task 7a: Coach-Kontext kennt das Material

**Files:**
- Modify: `lib/coach.ts`
- Modify: `app/coach/page.tsx`

- [ ] **Step 1: `lib/coach.ts` — `gear` in `CoachContext`**

Ergänze in `CoachContext` (z.B. nach `equipment`) das Feld:

```ts
  gear: { id: string; label: string; group: string; available: boolean }[];
```

- [ ] **Step 2: `app/coach/page.tsx` — Inventar lesen & in den Kontext geben**

Imports **in die bestehenden Zeilen mergen** (keine neuen Zeilen, sonst Doppel-Import in 7b):
- `@/lib/types`-Zeile um `GearItem` ergänzen → `import { Club, EquipItem, Focus, GearItem, Profile, Session, TeeTime } from "@/lib/types";`
- `@/lib/seed`-Zeile um `GEAR` ergänzen (z.B. nach `MENTAL_CHECK`).

Nach `const overrides = useObject<ProgramOverrides>("programOverrides", {});` einfügen:

```ts
  const gear = useCollection<GearItem>("gear", GEAR);
```

In `buildContext()` im zurückgegebenen Objekt (z.B. nach `equipment: …`) ergänzen:

```ts
      gear: gear.items.map((g) => ({
        id: g.id,
        label: g.label,
        group: g.group,
        available: g.available,
      })),
```

- [ ] **Step 3: Typcheck + Build**

Run: `npx tsc --noEmit && npm run build`
Expected: grün.

- [ ] **Step 4: Commit**

```bash
git add lib/coach.ts app/coach/page.tsx
git commit -m "feat: expose training gear to coach context"
```

---

## Task 7b: Coach-Aktionen — strukturiert + edit/remove/set_gear (TDD)

**Files:**
- Test: `lib/__tests__/coach.test.ts`
- Modify: `lib/coach.ts` (Action-Union, Katalog, sanitizeActions, describeAction)
- Modify: `app/coach/page.tsx` (Anwendung der neuen Aktionen + gear-Undo)

- [ ] **Step 1: Failing tests schreiben** `lib/__tests__/coach.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { sanitizeActions } from "../coach";

describe("sanitizeActions — set_program with structured steps", () => {
  it("akzeptiert Step-Objekte und droppt steps ohne Namen", () => {
    const out = sanitizeActions([
      {
        type: "set_program",
        id: "gym1",
        sections: [
          { title: "A", steps: [{ name: "Squat", detail: "tief", dose: "4×6" }, { detail: "kein name" }] },
        ],
      },
    ]);
    expect(out).toHaveLength(1);
    const a = out[0] as any;
    expect(a.sections[0].steps).toHaveLength(1);
    expect(a.sections[0].steps[0].name).toBe("Squat");
  });

  it("verwirft ein ungültiges gear-Kürzel im Step", () => {
    const out = sanitizeActions([
      { type: "set_program", id: "gym1", sections: [{ steps: [{ name: "X", detail: "", gear: "spaceship" }] }] },
    ]);
    const a = out[0] as any;
    expect(a.sections[0].steps[0].gear).toBeUndefined();
  });
});

describe("sanitizeActions — add_program_step", () => {
  it("nimmt ein Step-Objekt an", () => {
    const out = sanitizeActions([
      { type: "add_program_step", id: "gym1", step: { name: "Hip Thrust", detail: "", dose: "3×10" } },
    ]);
    expect(out).toHaveLength(1);
    expect((out[0] as any).step.name).toBe("Hip Thrust");
  });
  it("droppt einen Step ohne Namen", () => {
    const out = sanitizeActions([
      { type: "add_program_step", id: "gym1", step: { detail: "x" } },
    ]);
    expect(out).toHaveLength(0);
  });
});

describe("sanitizeActions — edit_program_step", () => {
  it("akzeptiert gültigen Index + Felder", () => {
    const out = sanitizeActions([
      { type: "edit_program_step", id: "gym1", index: 2, dose: "4×10" },
    ]);
    expect(out).toHaveLength(1);
    expect((out[0] as any).index).toBe(2);
    expect((out[0] as any).dose).toBe("4×10");
  });
  it("verwirft negativen oder fehlenden Index", () => {
    expect(sanitizeActions([{ type: "edit_program_step", id: "gym1", index: -1 }])).toHaveLength(0);
    expect(sanitizeActions([{ type: "edit_program_step", id: "gym1" }])).toHaveLength(0);
  });
});

describe("sanitizeActions — remove_program_step", () => {
  it("akzeptiert id + Index", () => {
    const out = sanitizeActions([{ type: "remove_program_step", id: "gym1", index: 0 }]);
    expect(out).toHaveLength(1);
  });
  it("verwirft ohne gültigen Index", () => {
    expect(sanitizeActions([{ type: "remove_program_step", id: "gym1", index: "x" }])).toHaveLength(0);
  });
});

describe("sanitizeActions — set_gear", () => {
  it("akzeptiert match + boolean", () => {
    const out = sanitizeActions([{ type: "set_gear", match: "band", available: true }]);
    expect(out).toEqual([{ type: "set_gear", match: "band", available: true }]);
  });
  it("verwirft ohne boolean available", () => {
    expect(sanitizeActions([{ type: "set_gear", match: "band" }])).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Tests laufen lassen (müssen fehlschlagen)**

Run: `npm test`
Expected: FAIL — neue Aktionen werden noch nicht erkannt (z.B. `set_program` mit Step-Objekten droppt Steps; `edit_program_step` unbekannt).

- [ ] **Step 3: `lib/coach.ts` — Imports & Action-Union**

Import ergänzen (`GearId`, `GEAR_IDS`):

```ts
import { GearId, Profile, Step } from "./types";
import { GEAR_IDS } from "./gear";
```

Ersetze in der `CoachAction`-Union die beiden Programm-Aktionen und füge drei neue hinzu:

```ts
  | {
      type: "set_program";
      id: string;
      title?: string;
      focus?: string;
      sections: { title?: string; steps: Step[] }[];
    }
  | { type: "add_program_step"; id: string; step: Step }
  | {
      type: "edit_program_step";
      id: string;
      index: number;
      name?: string;
      detail?: string;
      club?: string;
      dose?: string;
      gear?: GearId;
    }
  | { type: "remove_program_step"; id: string; index: number }
  | { type: "set_gear"; match: string; available: boolean };
```

- [ ] **Step 4: `lib/coach.ts` — `ACTION_CATALOG` erweitern**

Ersetze im `ACTION_CATALOG`-Template die `set_program`/`add_program_step`-Zeilen und ergänze die neuen Aktionen + Regeln. Ersetze den Block ab `- {"type":"set_program"…` bis zum Ende von `Regeln für actions:` durch:

```ts
- {"type":"set_program","id":"range","title":"...","focus":"...","sections":[{"title":"1 · ...","steps":[{"name":"Gate-Drill","detail":"...","club":"7 Eisen","dose":"15 Bälle"}]}]}
  Schreibt ein ganzes Programm/Workout neu. Schritte sind OBJEKTE: name (Pflicht), detail, club (nur Golf), dose ("15 Bälle"/"3×8"/"45 s/Seite"), gear (eines von: ${GEAR_IDS.join(", ")}). "id" aus dem programs-Kontext (range, kurzspiel, mob1..mob5, golf1..golf3, gym1..gym4).

- {"type":"add_program_step","id":"gym1","step":{"name":"Hip Thrust","detail":"...","dose":"3×10"}}
  Hängt EINEN strukturierten Schritt an ein Programm an.

- {"type":"edit_program_step","id":"gym1","index":2,"dose":"4×10"}
  Ändert EINEN Schritt gezielt. "index" = globale Position im Programm (über alle Sections, 0-basiert, wie im Kontext gelistet). Nur die zu ändernden Felder angeben (name/detail/club/dose/gear).

- {"type":"remove_program_step","id":"gym1","index":4}
  Löscht EINEN Schritt (globaler Index wie oben).

- {"type":"set_gear","match":"band","available":true}
  Setzt Trainings-Material auf vorhanden/nicht vorhanden. "match" = Teil von id/Label (z.B. "band","langhantel","kabel").

Regeln für actions:
- Bei Golf-/Range-Übungen IMMER club + dose angeben. Bei Mobility/Gym dose angeben (kein club).
- Schlage NIE Übungen mit einem gear vor, das laut context.gear available:false ist — biete eine Variante ohne Gerät an oder, wenn der Nutzer es jetzt hat, set_gear available:true.
- Für KLEINE Änderungen nutze edit_program_step/remove_program_step (nicht das ganze Programm via set_program neu schreiben).
- Sei proaktiv: erzählt der Nutzer von einer Runde/Range-Session, biete log_session an. Sagt er "52° ist da", set_equipment available=true. Neues Problem → Fokus & Plan anpassen.
- Du darfst mehrere Aktionen in einem Schritt vorschlagen. Wenn unsicher, frage im "reply" nach. Leere "actions": [] ist ok.
- Erfinde keine Werte. Greife auf den Kontext zurück. Erhalte bestehende Plan-Tage bei kleinen Anpassungen (Mobility nicht versehentlich von täglich reduzieren).
```

(Da das Template ein Template-Literal ist, funktioniert `${GEAR_IDS.join(", ")}` direkt. Stelle sicher, dass die Backticks erhalten bleiben.)

- [ ] **Step 5: `lib/coach.ts` — `sanitizeActions` erweitern**

Füge oben bei den anderen Helfern einen Step-Sanitizer ein:

```ts
const GEAR_ID_SET = new Set<string>(GEAR_IDS);
const gearId = (v: unknown): GearId | undefined =>
  typeof v === "string" && GEAR_ID_SET.has(v) ? (v as GearId) : undefined;

/** Säubert ein einzelnes Step-Objekt; null, wenn ohne Namen. */
function sanitizeStep(v: unknown): Step | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const name = str(o.name);
  if (!name) return null;
  const step: Step = { name, detail: str(o.detail) ?? "" };
  const club = str(o.club);
  if (club) step.club = club;
  const dose = str(o.dose);
  if (dose) step.dose = dose;
  const g = gearId(o.gear);
  if (g) step.gear = g;
  return step;
}

const intIndex = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : undefined;
```

Ersetze im `switch (t)` von `sanitizeActions` den `set_program`-Case und ergänze die neuen Cases:

```ts
      case "set_program": {
        const id = str(o.id);
        if (!id || !Array.isArray(o.sections)) break;
        const sections = (o.sections as unknown[])
          .map((s) => {
            const sec = s as Record<string, unknown>;
            const steps = Array.isArray(sec.steps)
              ? sec.steps.map(sanitizeStep).filter((x): x is Step => x !== null)
              : [];
            return { title: str(sec.title), steps };
          })
          .filter((s) => s.steps.length);
        if (sections.length)
          out.push({ type: "set_program", id, title: str(o.title), focus: str(o.focus), sections });
        break;
      }
      case "add_program_step": {
        const id = str(o.id);
        const step = sanitizeStep(o.step);
        if (id && step) out.push({ type: "add_program_step", id, step });
        break;
      }
      case "edit_program_step": {
        const id = str(o.id);
        const index = intIndex(o.index);
        if (!id || index === undefined) break;
        out.push({
          type: "edit_program_step",
          id,
          index,
          name: str(o.name),
          detail: str(o.detail),
          club: str(o.club),
          dose: str(o.dose),
          gear: gearId(o.gear),
        });
        break;
      }
      case "remove_program_step": {
        const id = str(o.id);
        const index = intIndex(o.index);
        if (id && index !== undefined) out.push({ type: "remove_program_step", id, index });
        break;
      }
      case "set_gear": {
        const match = str(o.match);
        if (match && typeof o.available === "boolean")
          out.push({ type: "set_gear", match, available: o.available });
        break;
      }
```

Entferne den alten `add_program_step`-Case (der `str(o.step)` nutzte), falls er noch separat existiert — er ist jetzt oben ersetzt.

- [ ] **Step 6: `lib/coach.ts` — `describeAction` erweitern**

Ersetze den `add_program_step`-Case und ergänze die neuen in `describeAction`:

```ts
    case "add_program_step":
      return `Programm „${a.id}“: + „${a.step.name}“`;
    case "edit_program_step":
      return `Programm „${a.id}“: Schritt ${a.index + 1} ändern`;
    case "remove_program_step":
      return `Programm „${a.id}“: Schritt ${a.index + 1} entfernen`;
    case "set_gear":
      return `Material „${a.match}“ → ${a.available ? "vorhanden" : "nicht da"}`;
```

- [ ] **Step 7: Tests laufen lassen (müssen grün sein)**

Run: `npm test`
Expected: PASS — alle `coach.test.ts`-Fälle grün.

- [ ] **Step 8: `app/coach/page.tsx` — neue Aktionen anwenden + gear-Undo**

(a) Ergänze `Step` in der bestehenden `@/lib/types`-Importzeile (sie enthält nach Task 7a bereits `GearItem`) — nur `Step` hinzufügen, nicht doppelt importieren:

```ts
import { Club, EquipItem, Focus, GearItem, Profile, Session, Step, TeeTime } from "@/lib/types";
```

(b) Ergänze `gear` im `UndoToken.snapshot`:

```ts
    overrides: ProgramOverrides;
    gear: GearItem[];
  };
  createdSessions: string[];
}
```

(c) In `applyNow` den Snapshot um gear erweitern:

```ts
      overrides: overrides.value,
      gear: gear.items,
    };
```

(d) In `undo` gear zurücksetzen (nach `overrides.replace(s.overrides);`):

```ts
    gear.setAll(s.gear);
```

(e) Der Übergangs-Shim aus Task 4 ist nicht mehr nötig — die Aktionen liefern jetzt Step-Objekte. Ersetze die `set_program`/`add_program_step`-Cases und ergänze die neuen Cases. Ersetze in `applyOne` ab `case "set_program":` bis zum Ende der `add_program_step`-Klammer durch:

```ts
      case "set_program":
        overrides.set({
          [a.id]: {
            title: a.title,
            focus: a.focus,
            sections: a.sections.map((s) => ({ title: s.title, steps: s.steps })),
          },
        });
        break;
      case "add_program_step": {
        const resolved = resolveProgram(a.id, overrides.value);
        if (resolved) {
          const sections = resolved.sections.map((s) => ({
            ...s,
            steps: [...s.steps],
          }));
          if (sections.length) sections[sections.length - 1].steps.push(a.step);
          else sections.push({ steps: [a.step] });
          overrides.set({ [a.id]: { ...overrides.value[a.id], sections } });
        }
        break;
      }
      case "edit_program_step": {
        const resolved = resolveProgram(a.id, overrides.value);
        if (resolved) {
          const sections = resolved.sections.map((s) => ({
            ...s,
            steps: [...s.steps],
          }));
          const loc = locateStep(sections, a.index);
          if (loc) {
            const cur = sections[loc.si].steps[loc.i];
            const patch: Step = { ...cur };
            if (a.name !== undefined) patch.name = a.name;
            if (a.detail !== undefined) patch.detail = a.detail;
            if (a.club !== undefined) patch.club = a.club;
            if (a.dose !== undefined) patch.dose = a.dose;
            if (a.gear !== undefined) patch.gear = a.gear;
            sections[loc.si].steps[loc.i] = patch;
            overrides.set({ [a.id]: { ...overrides.value[a.id], sections } });
          }
        }
        break;
      }
      case "remove_program_step": {
        const resolved = resolveProgram(a.id, overrides.value);
        if (resolved) {
          const sections = resolved.sections.map((s) => ({
            ...s,
            steps: [...s.steps],
          }));
          const loc = locateStep(sections, a.index);
          if (loc) {
            sections[loc.si].steps.splice(loc.i, 1);
            overrides.set({ [a.id]: { ...overrides.value[a.id], sections } });
          }
        }
        break;
      }
      case "set_gear": {
        const needle = a.match.toLowerCase();
        const item = gear.items.find(
          (g) =>
            g.id.toLowerCase().includes(needle) ||
            g.label.toLowerCase().includes(needle)
        );
        if (item) gear.update(item.id, { available: a.available });
        break;
      }
```

(f) Entferne den jetzt ungenutzten Import `normalizeStep` (aus Task 4), falls er nirgends sonst gebraucht wird.

(g) Füge einen Index-Helfer oberhalb der Komponente (nach den Imports) ein:

```ts
/** Globalen (über alle Sections fortlaufenden) Step-Index lokalisieren. */
function locateStep(
  sections: { steps: unknown[] }[],
  index: number
): { si: number; i: number } | null {
  let n = index;
  for (let si = 0; si < sections.length; si++) {
    if (n < sections[si].steps.length) return { si, i: n };
    n -= sections[si].steps.length;
  }
  return null;
}
```

- [ ] **Step 9: Typcheck + Tests + Build**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: alles grün.

- [ ] **Step 10: Commit**

```bash
git add lib/coach.ts app/coach/page.tsx lib/__tests__/coach.test.ts
git commit -m "feat: granular coach actions (edit/remove step, set_gear)"
```

---

## Task 8: End-to-End-Verifikation

**Files:** keine (nur Verifikation; ggf. kleiner Fix-Commit).

- [ ] **Step 1: Alle Tests**

Run: `npm test`
Expected: PASS (smoke, gear, seed, coach).

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: „Compiled successfully", alle Routen.

- [ ] **Step 3: Routen-Smoke (Server muss laufen)**

Run (in einem Terminal `npm run dev`, dann):
```bash
for r in / /training /coach /programm/range /programm/mob5 /programm/gym1 /programm/kurzspiel; do
  printf "%s -> " "$r"; curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000$r";
done
```
Expected: jede Zeile endet mit `200`.

- [ ] **Step 4: Manuelle Klick-Verifikation**

1. `/programm/range` → Übungen zeigen Schläger- + Dosis-Tags (z.B. „7 Eisen" / „15 Bälle").
2. `/training` → „Mein Material": „Langhantel" ausschalten.
3. `/programm/gym1` → „Back Squat" zeigt „Körpergewicht-Squat" + Badge „angepasst"; Übungszähler passt sich an.
4. `/coach` → „Mach aus gym1 Schritt 1 ein 4×10." → Antwort enthält Aktion „Schritt 1 ändern", danach zeigt `/programm/gym1` die neue Dosis. „Rückgängig" stellt es zurück.
5. `/coach` → „Ich hab jetzt eine Langhantel." → `set_gear` setzt sie auf vorhanden; `/training` zeigt sie wieder grün.

Expected: alle 5 Punkte verhalten sich wie beschrieben. (Schritte 4–5 brauchen einen gesetzten `OPENAI_API_KEY`.)

- [ ] **Step 5 (falls nötig): Fix-Commit**

Nur wenn die Verifikation kleine Korrekturen erforderte:
```bash
git add -A
git commit -m "fix: verification follow-ups for training precision feature"
```

---

## Notizen für die Umsetzung

- **Alte Cloud-Daten:** Hat Leon schon vom Coach umgeschriebene Programme (`programOverrides`) mit String-Steps gespeichert, normalisiert `applyOverride`/`normalizeSections` sie beim Lesen automatisch — kein manueller Eingriff nötig.
- **Ein Gerät pro Schritt:** Bewusste Vereinfachung (`Step.gear` ist genau eine `GearId`). „Bankdrücken" ist daher an `dumbbells` gekoppelt, nicht zusätzlich an `bench`. `bench`/`kettlebell` stehen im Inventar für den Coach bereit.
- **Globaler Step-Index** (`edit_/remove_program_step`): zählt fortlaufend über alle Sections. Bei mehrteiligen Programmen (`range`) zählt der Coach so, wie der Kontext die Schritte listet.
```
