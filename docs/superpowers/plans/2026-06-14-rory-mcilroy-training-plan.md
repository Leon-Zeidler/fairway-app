# Rory-McIlroy-Trainingsplan — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rory McIlroys (öffentlich berichtetes) Training als aktiver täglicher Fitness-Plan — 7 geführte Programme, Gym + Golf am selben Tag, Range/Golfball bleibt Leons eigener Plan.

**Architecture:** Rein additiv auf der bestehenden Step+Material-Infra. Neue Inhalte als `Step[]`-Konstanten in `lib/seed.ts`, daraus 7 explizite `Program`-Einträge (mit Sections) in `lib/programs.ts`. Der 7-Tage-Rhythmus wird **fest in `dayTasks` verdrahtet** (Gym fix nach Rory, Golf weiter plan-gesteuert) — so wirkt er sofort, auch mit Leons bereits gespeichertem `plan`. Neues Material `box`.

**Tech Stack:** Next.js 14, TypeScript, vitest. Reaktiver Store (`lib/store.ts`).

**Spec:** `docs/superpowers/specs/2026-06-14-rory-mcilroy-training-plan-design.md`

**Abweichung von Spec §4 (bewusst):** Statt `PLAN`-Defaults zu ändern (würde Leons gespeicherten `plan` nicht überschreiben → Plan würde nicht aktiv), wird der Rory-Fitness-Rhythmus fest in `dayTasks` gelegt. `PLAN`/`ACTIVITIES` bleiben unverändert; Golf (technik/kurzspiel/platz) bleibt plan-gesteuert und läuft am selben Tag.

**Projekt-Konventionen:** 2-Space-Indent, deutsche Inhalte. TS-Check: `npx tsc --noEmit`. Tests: `npm test`. Build: `npm run build`. ACHTUNG: beim Einfügen von Code aus diesem Plan **gerade ASCII-Anführungszeichen** verwenden — die deutschen „…"-Zeichen NUR als Inhaltstext, nie als TS-String-Begrenzer.

---

## Task 1: Material `box` ergänzen (TDD)

**Files:**
- Test: `lib/__tests__/gear.test.ts`, `lib/__tests__/seed.test.ts`
- Modify: `lib/types.ts`, `lib/gear.ts`, `lib/seed.ts`

- [ ] **Step 1: Tests anpassen (RED)**

In `lib/__tests__/gear.test.ts` den `GEAR_IDS`-Test um `"box"` erweitern — ersetze das `toEqual([...])`-Array durch:

```ts
    expect(GEAR_IDS).toEqual([
      "foam-roller", "band", "barbell", "dumbbells",
      "pull-up-bar", "bench", "cable", "kettlebell", "med-ball", "box",
    ]);
```

In `lib/__tests__/seed.test.ts` die GEAR-Längen-Assertion von 9 auf 10 ändern:

```ts
    expect(GEAR).toHaveLength(10);
```

- [ ] **Step 2: Test laufen lassen (muss fehlschlagen)**

Run: `cd /Users/zasmedia/Desktop/Projects/fairway/fairway-app && npm test`
Expected: FAIL — `GEAR_IDS` hat 9 Einträge, `GEAR` hat 9 (box fehlt noch).

- [ ] **Step 3: `box` zum `GearId`-Typ hinzufügen**

In `lib/types.ts`, in der `GearId`-Union nach `"med-ball"` ergänzen:

```ts
export type GearId =
  | "foam-roller"
  | "band"
  | "barbell"
  | "dumbbells"
  | "pull-up-bar"
  | "bench"
  | "cable"
  | "kettlebell"
  | "med-ball"
  | "box";
```

- [ ] **Step 4: `box` zu `GEAR_IDS` hinzufügen**

In `lib/gear.ts`, im `GEAR_IDS`-Array `"box"` als letzten Eintrag ergänzen:

```ts
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
  "box",
];
```

- [ ] **Step 5: `box` zum `GEAR`-Inventar hinzufügen**

In `lib/seed.ts`, im `GEAR`-Array (Gym-Gruppe) nach dem `med-ball`-Eintrag ergänzen:

```ts
  { id: "box", label: "Sprungbox / Step", group: "gym", available: true },
```

- [ ] **Step 6: Test + Typcheck (GREEN)**

Run: `npx tsc --noEmit && npm test`
Expected: alle Tests grün; tsc ohne Fehler.

- [ ] **Step 7: Commit**

```bash
git add lib/types.ts lib/gear.ts lib/seed.ts lib/__tests__/gear.test.ts lib/__tests__/seed.test.ts
git commit -m "feat: add 'box' (plyo box) to training gear inventory"
```

---

## Task 2: Rory-Inhalte + 7 Programme (TDD)

**Files:**
- Test: `lib/__tests__/rory.test.ts`
- Modify: `lib/seed.ts` (Konstanten), `lib/programs.ts` (7 Program-Einträge)

- [ ] **Step 1: Failing test schreiben** `lib/__tests__/rory.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { getProgram } from "../programs";
import { GEAR_IDS } from "../gear";
import { Step } from "../types";

const RORY_IDS = [
  "rory-strength-a",
  "rory-strength-b",
  "rory-power",
  "rory-circuit",
  "rory-conditioning",
  "rory-activation",
  "rory-recovery",
];

function steps(id: string): Step[] {
  const p = getProgram(id);
  if (!p) return [];
  return p.sections.flatMap((s) => s.steps);
}

describe("Rory-Programme", () => {
  it("alle 7 Programme existieren", () => {
    for (const id of RORY_IDS) expect(getProgram(id), id).toBeTruthy();
  });

  it("jeder Schritt hat eine Dosis", () => {
    for (const id of RORY_IDS)
      for (const s of steps(id)) expect(s.dose, `${id}: ${s.name}`).toBeTruthy();
  });

  it("jeder gear-Schritt hat ein gültiges Kürzel und eine alt-Variante", () => {
    for (const id of RORY_IDS)
      for (const s of steps(id))
        if (s.gear) {
          expect(GEAR_IDS, `${id}: ${s.name}`).toContain(s.gear);
          expect(s.alt, `${id}: ${s.name} ohne alt`).toBeTruthy();
          expect(s.alt!.dose, `${id}: ${s.name} alt ohne dose`).toBeTruthy();
        }
  });

  it("geladene Programme starten mit einem Warmup-Schritt", () => {
    for (const id of ["rory-strength-a", "rory-strength-b", "rory-power", "rory-circuit", "rory-conditioning"]) {
      const first = getProgram(id)!.sections[0].steps[0];
      expect(first.name, id).toContain("Einlaufen");
    }
  });

  it("Box Jumps nutzen das neue 'box'-Material mit Squat-Jump-Alternative", () => {
    const power = steps("rory-power");
    const box = power.find((s) => s.name === "Box Jumps");
    expect(box?.gear).toBe("box");
    expect(box?.alt?.name).toContain("Squat Jumps");
  });
});
```

- [ ] **Step 2: Test laufen lassen (muss fehlschlagen)**

Run: `npm test`
Expected: FAIL — `getProgram("rory-strength-a")` ist `undefined` (Programme fehlen noch).

- [ ] **Step 3: Rory-Konstanten in `lib/seed.ts` ergänzen**

Füge am Ende von `lib/seed.ts` an (gerade ASCII-Quotes als String-Begrenzer!):

```ts
/* ── Rory-McIlroy-Plan: Warmup + Sessions (Step[]) ──────────────── */

export const RORY_NOTE =
  "Angelehnt an oeffentlich berichtetes Training von Rory McIlroy (Stand 2025) - nicht offiziell/garantiert exakt. Echte Struktur: 6-8-Wochen-Bloecke Strength -> Active Recovery -> Power -> Conditioning.";

/** Geteilter Mobility/Activation-Warmup (erste Section der geladenen Sessions). */
export const WARMUP_RORY: Step[] = [
  { name: "Lockeres Einlaufen", dose: "3-5 Min", detail: "Puls hoch, locker werden - warm, nicht muede." },
  { name: "Hamstring Sweep", dose: "30 s", detail: "gehend gestrecktes Bein nach vorn greifen, Huefte mobil machen." },
  { name: "Quad Grab", dose: "30 s", detail: "Schritt vor, Ferse zum Po ziehen, aufrecht bleiben." },
  { name: "Lunge Tilt", dose: "30 s/Seite", detail: "90-Grad-Ausfallschritt, Arm ueber Kopf, Oberkoerper zur Seite neigen." },
  { name: "Dynamic Side Lunge", dose: "30 s/Seite", detail: "seitlich laden, Gewicht kontrolliert verlagern." },
  { name: "Schulter-Prehab + Scapula", dose: "10 Wdh.", detail: "Band-Dislocates, Schulterblaetter aktivieren.", gear: "band", alt: { name: "Schulter-Prehab ohne Band", dose: "10 Wdh.", detail: "Wall Slides + Armkreise, Schulterblaetter aktivieren." } },
  { name: "Hueftmobilitaet 90/90", dose: "8/Seite", detail: "kontrolliert wechseln, Oberkoerper aufrecht." },
];

export const RORY_STRENGTH_A: Step[] = [
  { name: "Trap-Bar-Kreuzheben", dose: "4x5 (2 schwer)", detail: "Huefte laden, neutraler Ruecken, explosiv hoch. Rory: ~2 schwere Saetze, dann Volumen.", gear: "barbell", alt: { name: "KH-/Koerpergewicht-Hip-Hinge", dose: "4x8", detail: "Huefte zurueck, Ruecken gerade, Hamstrings laden - ohne Langhantel." } },
  { name: "Neutrale Klimmzuege", dose: "4x5", detail: "voller Hang, Schulterblaetter fuehren, kontrolliert hoch.", gear: "pull-up-bar", alt: { name: "Handtuch-Rudern an der Tuer", dose: "4x10", detail: "schraeg haengend ziehen, Schulterblaetter zusammen." } },
  { name: "Reverse Lunge (KH)", dose: "3x8/Seite", detail: "Schritt zurueck, Knie sauber, Rumpf fest.", gear: "dumbbells", alt: { name: "Reverse Lunge (Koerpergewicht)", dose: "3x12/Seite", detail: "kontrolliert, Balance halten." } },
  { name: "Plank mit Beinheben", dose: "3x8/Seite", detail: "Huefte stabil, kein Durchhaengen." },
];

export const RORY_STRENGTH_B: Step[] = [
  { name: "15-Grad-Schraegbank-KH-Druecken", dose: "4x6", detail: "Schraegbank, Kurzhanteln (verhindert Dysbalancen), kontrolliert ab und auf.", gear: "dumbbells", alt: { name: "Liegestuetze (Fuesse erhoeht)", dose: "4x10", detail: "Brust-Fokus, Koerper als gerades Brett." } },
  { name: "Renegade Row", dose: "3x8/Seite", detail: "Plank-Position, KH einarmig rudern, Huefte ruhig.", gear: "dumbbells", alt: { name: "Plank + Schulter-Tap", dose: "3x12/Seite", detail: "Huefte stabil gegen Wegkippen halten." } },
  { name: "Walking Lunge (KH)", dose: "3x10", detail: "grosser Schritt, Knie ueber dem Fuss.", gear: "dumbbells", alt: { name: "Walking Lunge (Koerpergewicht)", dose: "3x14", detail: "kontrolliert, aufrecht." } },
  { name: "Med-Ball-Rotation", dose: "3x10/Seite", detail: "aus der Huefte rotieren, explosiv - uebersetzt in Schwung-Speed.", gear: "med-ball", alt: { name: "Stehende Rotation explosiv", dose: "3x10/Seite", detail: "ohne Ball, schnell drehen und abbremsen." } },
  { name: "Plank", dose: "3x45 s", detail: "Koerper als Brett, Rippen unten." },
];

export const RORY_POWER: Step[] = [
  { name: "Box Jumps", dose: "3x10", detail: "explosiv hoch, weich landen, kurz resetten.", gear: "box", alt: { name: "Squat Jumps (Koerpergewicht)", dose: "3x10", detail: "explosiv hoch, weich landen." } },
  { name: "Squat Jumps", dose: "2x max + 2x10", detail: "erst 2 Saetze max Speed, dann 2x10 betont (optional Weste)." },
  { name: "Med-Ball-Slams mit Rotation", dose: "3x8/Seite", detail: "ueber Kopf, mit Viertel-Rotation runter, maximale Power.", gear: "med-ball", alt: { name: "Explosive Chop (ohne Ball)", dose: "3x8/Seite", detail: "explosiv diagonal, kontrolliert abbremsen." } },
  { name: "Overhead-Throws (6-8 kg)", dose: "3x5", detail: "explosiv ueber Kopf abwerfen.", gear: "med-ball", alt: { name: "Explosiver Sprung-Reach", dose: "3x5", detail: "tief laden, explosiv hochstrecken." } },
  { name: "Schnelle leichte Lifts (Speed)", dose: "3x3", detail: "leichtes Gewicht, maximale Bewegungsgeschwindigkeit.", gear: "dumbbells", alt: { name: "Betont schnelle Sprung-Kniebeuge", dose: "3x3", detail: "Geschwindigkeit vor Last." } },
];

export const RORY_CIRCUIT_1: Step[] = [
  { name: "Romanian Deadlift", dose: "3 Runden - 8-10", detail: "Huefte zurueck, Hamstrings laden, Ruecken neutral. 1 Min Pause pro Runde.", gear: "barbell", alt: { name: "Single-Leg RDL (Koerpergewicht)", dose: "3x8/Seite", detail: "Balance, Huefte laden." } },
  { name: "Klimmzug", dose: "3 Runden - 5-10", detail: "voller Hang, sauber ziehen.", gear: "pull-up-bar", alt: { name: "Handtuch-Rudern an der Tuer", dose: "3x10", detail: "schraeg haengend ziehen." } },
  { name: "Plank mit Beinheben", dose: "3 Runden - 8/Seite", detail: "Huefte stabil halten." },
];

export const RORY_CIRCUIT_2: Step[] = [
  { name: "Reverse Lunge", dose: "3 Runden - 6-8/Seite", detail: "kontrolliert, Knie sauber. 1 Min Pause pro Runde." },
  { name: "Renegade Row", dose: "3 Runden - 6-8/Seite", detail: "Plank-Row, Huefte ruhig.", gear: "dumbbells", alt: { name: "Plank + Schulter-Tap", dose: "3x10/Seite", detail: "Huefte stabil." } },
  { name: "Jump Squat", dose: "3 Runden - 5", detail: "explosiv, weich landen." },
];

export const RORY_CONDITIONING: Step[] = [
  { name: "5K-Lauf", dose: "~20-25 Min", detail: "gleichmaessig (Rory-Ziel ~20 Min). Kein Radfahren - Haltung." },
  { name: "Intervalle (optional)", dose: "6x 1 Min schnell / 1 locker", detail: "wenn frisch, statt Dauerlauf. Schwimmen geht auch." },
  { name: "Pallof Press", dose: "3x12/Seite", detail: "Anti-Rotation, Rumpf bleibt stabil.", gear: "cable", alt: { name: "Plank-Anti-Rotation", dose: "3x20 s/Seite", detail: "Huefte gegen Wegkippen halten." } },
  { name: "Farmer's Carry", dose: "3x30 m", detail: "schwer, aufrecht, Rumpf fest.", gear: "dumbbells", alt: { name: "Rucksack-Carry", dose: "3x30 m", detail: "Rucksack mit Gewicht, aufrecht gehen." } },
  { name: "Hollow Hold", dose: "3x30 s", detail: "unterer Ruecken am Boden, Koerperspannung." },
];

export const RORY_ACTIVATION: Step[] = [
  { name: "Lockeres Einlaufen + Armkreisen", dose: "3 Min", detail: "warm werden, nicht ermueden." },
  { name: "World's Greatest Stretch", dose: "6/Seite", detail: "Huefte und Brust oeffnen, kontrolliert." },
  { name: "Rotations-Squat-Jumps", dose: "2x6", detail: "leicht, nur aktivieren." },
  { name: "Med-Ball-Rotation (leicht)", dose: "2x8/Seite", detail: "Speed primen, nicht ermueden.", gear: "med-ball", alt: { name: "Stehende Rotation", dose: "2x8/Seite", detail: "zuegig, ohne Ball." } },
  { name: "Band-Walks (Huefte)", dose: "2x10/Seite", detail: "Gesaess aktivieren, Spannung halten.", gear: "band", alt: { name: "Hueft-Abduktion (Koerpergewicht)", dose: "2x12/Seite", detail: "Seitenlage, Bein kontrolliert heben." } },
];

export const RORY_RECOVERY: Step[] = [
  { name: "Foam Roll Ganzkoerper", dose: "8-10 Min", detail: "langsam, empfindliche Punkte 20 s halten.", gear: "foam-roller", alt: { name: "Boden-Mobilisation / Dehn-Flow", dose: "8-10 Min", detail: "sanft mobilisieren, ohne Rolle." } },
  { name: "Lockeres Gehen/Schwimmen", dose: "20-30 Min", detail: "aktive Erholung, niedrige Intensitaet." },
  { name: "Hueftbeuger- und Hamstring-Dehnung", dose: "45 s/Seite", detail: "ruhig atmen, nicht reissen." },
  { name: "Brust-/Schulteroeffner", dose: "45 s/Seite", detail: "Tuerrahmen, sanft vorlehnen." },
  { name: "Atmung und Schlaf-Reset", dose: "5 Min", detail: "tiefe Atmung; Rory priorisiert 8 h Schlaf (WHOOP)." },
];
```

- [ ] **Step 4: 7 Program-Einträge in `lib/programs.ts`**

(a) Import erweitern — ersetze die seed-Importzeile:

```ts
import {
  DRILLS,
  PITCHING,
  ROUTINES,
  WARMUP_RORY,
  RORY_STRENGTH_A,
  RORY_STRENGTH_B,
  RORY_POWER,
  RORY_CIRCUIT_1,
  RORY_CIRCUIT_2,
  RORY_CONDITIONING,
  RORY_ACTIVATION,
  RORY_RECOVERY,
} from "./seed";
```

(b) Füge die 7 Einträge in den `PROGRAMS`-Array ein — direkt **nach** dem `kurzspiel`-Objekt und **vor** den `...ROUTINES.filter(...)`-Spreads (so erscheinen sie in Training oben in ihrer Gruppe):

```ts
  {
    id: "rory-strength-a",
    title: "Rory · Strength A (schwer)",
    group: "gym",
    groupLabel: "Rory · Fitness",
    focus: "Schwerer Kraftblock - Trap-Bar, Klimmzuege, Lunges (angelehnt an Rory McIlroy)",
    activityKey: "gym",
    sessionType: "gym",
    sections: [
      { title: "Warmup · Mobility & Activation", steps: WARMUP_RORY },
      { title: "Hauptblock", steps: RORY_STRENGTH_A },
    ],
  },
  {
    id: "rory-strength-b",
    title: "Rory · Strength B (Oberkoerper/Core)",
    group: "gym",
    groupLabel: "Rory · Fitness",
    focus: "Druck/Zug + Core - Schraegbank, Renegade Row, Rotation (angelehnt an Rory McIlroy)",
    activityKey: "gym",
    sessionType: "gym",
    sections: [
      { title: "Warmup · Mobility & Activation", steps: WARMUP_RORY },
      { title: "Hauptblock", steps: RORY_STRENGTH_B },
    ],
  },
  {
    id: "rory-power",
    title: "Rory · Power/Speed",
    group: "gym",
    groupLabel: "Rory · Fitness",
    focus: "Explosivkraft - Box Jumps, Med-Ball-Power, schnelle Lifts (angelehnt an Rory McIlroy)",
    activityKey: "gym",
    sessionType: "gym",
    sections: [
      { title: "Warmup · Mobility & Activation", steps: WARMUP_RORY },
      { title: "Hauptblock", steps: RORY_POWER },
    ],
  },
  {
    id: "rory-circuit",
    title: "Rory · Strength-Endurance-Zirkel",
    group: "gym",
    groupLabel: "Rory · Fitness",
    focus: "Kraftausdauer - zwei Zirkel je 3 Runden (angelehnt an Rory McIlroy)",
    activityKey: "gym",
    sessionType: "gym",
    sections: [
      { title: "Warmup · Mobility & Activation", steps: WARMUP_RORY },
      { title: "Zirkel 1 · 3 Runden", steps: RORY_CIRCUIT_1 },
      { title: "Zirkel 2 · 3 Runden", steps: RORY_CIRCUIT_2 },
    ],
  },
  {
    id: "rory-conditioning",
    title: "Rory · Conditioning",
    group: "gym",
    groupLabel: "Rory · Fitness",
    focus: "Ausdauer + Core - Lauf/Intervalle, Carry, Anti-Rotation (angelehnt an Rory McIlroy)",
    activityKey: "gym",
    sessionType: "gym",
    sections: [
      { title: "Warmup · Mobility & Activation", steps: WARMUP_RORY },
      { title: "Hauptblock", steps: RORY_CONDITIONING },
    ],
  },
  {
    id: "rory-activation",
    title: "Rory · Activation (vor der Runde)",
    group: "gym",
    groupLabel: "Rory · Fitness",
    focus: "Kurz aktivieren, nicht ermueden - vor der Runde (angelehnt an Rory McIlroy)",
    activityKey: "gym",
    sessionType: "gym",
    sections: [{ steps: RORY_ACTIVATION }],
  },
  {
    id: "rory-recovery",
    title: "Rory · Recovery",
    group: "mobility",
    groupLabel: "Rory · Fitness",
    focus: "Aktive Erholung - Foam Roll, Mobility, Atmung (angelehnt an Rory McIlroy)",
    activityKey: "mobility",
    sessionType: "stretch",
    sections: [{ steps: RORY_RECOVERY }],
  },
```

- [ ] **Step 5: Test + Typcheck + Build (GREEN)**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: `rory.test.ts` grün; alle Tests grün; Build kompiliert, neue `/programm/rory-*`-Routen vorhanden.

- [ ] **Step 6: Commit**

```bash
git add lib/seed.ts lib/programs.ts lib/__tests__/rory.test.ts
git commit -m "feat: add 7 guided Rory McIlroy training programs"
```

---

## Task 3: Rory-Plan aktivieren (`dayTasks`) (TDD)

**Files:**
- Test: `lib/__tests__/plan.test.ts`
- Modify: `lib/plan.ts`

- [ ] **Step 1: Failing test schreiben** `lib/__tests__/plan.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { dayTasks } from "../plan";

describe("dayTasks - Rory als aktiver Plan", () => {
  it("ordnet jedem Wochentag das richtige Rory-Programm zu", () => {
    const hrefs = [0, 1, 2, 3, 4, 5, 6].map(
      (d) => dayTasks(d).find((t) => t.title.startsWith("Rory"))?.href
    );
    expect(hrefs).toEqual([
      "/programm/rory-strength-a",
      "/programm/rory-strength-b",
      "/programm/rory-power",
      "/programm/rory-circuit",
      "/programm/rory-conditioning",
      "/programm/rory-activation",
      "/programm/rory-recovery",
    ]);
  });

  it("zeigt Golf weiterhin am selben Tag (Mi: Power + Range)", () => {
    const mi = dayTasks(2);
    expect(mi.some((t) => t.href === "/programm/rory-power")).toBe(true);
    expect(mi.some((t) => t.href === "/programm/range")).toBe(true);
  });

  it("Recovery-Tag (So) nutzt den mobility-key (fuer den Wochen-Tracker)", () => {
    expect(dayTasks(6).find((t) => t.title.startsWith("Rory"))?.key).toBe("mobility");
  });
});
```

- [ ] **Step 2: Test laufen lassen (muss fehlschlagen)**

Run: `npm test`
Expected: FAIL — aktuelles `dayTasks` liefert keine „Rory"-Tasks (es nutzt gym1/gym2 + Mobility-Rotation).

- [ ] **Step 3: `lib/plan.ts` umbauen**

(a) Ersetze den `MOBILITY_BY_DOW`-Block (das `const MOBILITY_BY_DOW: Record<...> = { ... };`) durch das Rory-Mapping:

```ts
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
```

(b) Ersetze die `dayTasks`-Funktion komplett durch:

```ts
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
```

Hinweis: `PLAN` und `ACTIVITIES` bleiben unveraendert. Die `mobility`/`gym`-Eintraege in `PLAN` steuern `dayTasks` nicht mehr (Rory ist fix); `technik`/`kurzspiel`/`platz` weiterhin schon. Falls `MOBILITY_BY_DOW` nirgends sonst referenziert wird, ist es nun entfernt — prüfe mit `grep -rn "MOBILITY_BY_DOW" lib app` (Erwartung: keine Treffer mehr).

- [ ] **Step 4: Test + Typcheck + Build (GREEN)**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: `plan.test.ts` grün; alle Tests grün; Build ok.

- [ ] **Step 5: Commit**

```bash
git add lib/plan.ts lib/__tests__/plan.test.ts
git commit -m "feat: activate Rory 7-day fitness plan in dayTasks (golf same-day)"
```

---

## Task 4: Quellen-Hinweis (Training) + Woche-Anzeige korrigieren + Verifikation

**Files:**
- Modify: `app/training/page.tsx`, `app/woche/page.tsx`

- [ ] **Step 1: `RORY_NOTE` importieren (Training)**

In `app/training/page.tsx` die bestehende `@/lib/seed`-Importzeile um `RORY_NOTE` erweitern (z.B. `import { FOCUS, GEAR, RORY_NOTE } from "@/lib/seed";`).

- [ ] **Step 2: Hinweis-Box rendern (Training)**

Füge in `app/training/page.tsx` direkt **vor** der `{GROUPS.map((g) => {` -Schleife (also nach der „Mein Material"-Card) ein:

```tsx
        <div className="note-box">{RORY_NOTE}</div>
```

- [ ] **Step 3: Woche — Fortschritts-Ziele aus dem aktiven Plan ableiten**

In `app/woche/page.tsx` rechnet der Tracker das Wochen-Ziel je Aktivität aktuell aus `PLAN[key].length` — das passt nach der Rory-Aktivierung nicht mehr (Gym läuft jetzt Mo–Sa über `dayTasks`, nicht über `PLAN.gym`). Leite das Ziel stattdessen aus `dayTasks` ab. Ersetze den `counts`-Block:

```tsx
  // Wochensumme pro Aktivität (für die Fortschrittsbalken).
  const counts = ACTIVITIES.map((a) => ({
    ...a,
    done: days.filter((d) => done(isoLocal(d), a.key)).length,
    plan: (plan.value[a.key] ?? PLAN[a.key])?.length ?? 0,
  }));
```

durch:

```tsx
  // Geplante Einheiten/Woche je Aktivität aus dem aktiven Tagesplan ableiten
  // (Rory-Fitness ist fest, Golf kommt aus dem Plan) — so passen die Ziele zur Realität.
  const plannedCount = (key: string) =>
    [0, 1, 2, 3, 4, 5, 6].filter((dow) =>
      dayTasks(dow, plan.value).some((t) => t.key === key)
    ).length;
  const counts = ACTIVITIES.map((a) => ({
    ...a,
    done: days.filter((d) => done(isoLocal(d), a.key)).length,
    plan: plannedCount(a.key),
  }));
```

(`PLAN` bleibt importiert — es wird weiterhin als Seed für `useObject("plan", PLAN)` genutzt.)

- [ ] **Step 4: Woche — Hinweistext aktualisieren**

In `app/woche/page.tsx` die untere `note-box` (beschreibt noch den alten Plan) ersetzen:

```tsx
        <div className="note-box">
          Der Plan: Mobility jeden Tag (rotiert automatisch durch die Bereiche),
          Range Mo/Mi/Fr, Kurzspiel Mi/Sa, Gym Mo/Do, Platz am Wochenende.
          Verpasst ist egal — einfach beim nächsten Tag weitermachen.
        </div>
```

durch:

```tsx
        <div className="note-box">
          Dein Plan folgt jetzt Rory McIlroys Rhythmus: Mo Strength A, Di Strength
          B, Mi Power, Do Zirkel, Fr Conditioning, Sa Activation, So Recovery —
          plus dein Golf am selben Tag. Verpasst ist egal — einfach beim nächsten
          Tag weitermachen.
        </div>
```

- [ ] **Step 5: Typcheck + Build**

Run: `cd /Users/zasmedia/Desktop/Projects/fairway/fairway-app && npx tsc --noEmit && npm run build`
Expected: grün.

- [ ] **Step 6: Commit**

```bash
git add app/training/page.tsx app/woche/page.tsx
git commit -m "feat: Rory sourcing note + week tracker reflects active plan"
```

- [ ] **Step 7: End-to-End-Verifikation**

Run (Tests + Build):
```bash
cd /Users/zasmedia/Desktop/Projects/fairway/fairway-app && npm test && npm run build
```
Expected: alle Tests grün (smoke, gear, seed, coach, rory, plan); Build ok.

Run (Routen-Smoke; in einem Terminal `npm run start -- -p 3100`, dann):
```bash
for r in / /training /woche /programm/rory-strength-a /programm/rory-strength-b /programm/rory-power /programm/rory-circuit /programm/rory-conditioning /programm/rory-activation /programm/rory-recovery; do
  printf "%-34s -> " "$r"; curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3100$r";
done
```
Expected: jede Zeile endet mit `200`.

Manueller Check (kurz): „Heute"/„Woche" zeigen die Rory-Session des Tages + Golf am selben Tag; der Woche-Tracker zeigt sinnvolle Ziele (Gym 6, Mobility 1 + Golf); ein Rory-Programm öffnen → Warmup-Section + Hauptblock mit Dosis-Tags; Material in „Training" toggeln (z.B. Box aus) → Box Jumps werden zu „Squat Jumps / angepasst".

---

## Notizen

- **Material-Synergie:** Da die Rory-Schritte `gear` + `alt` tragen, passen sie sich automatisch an Leons Material-Inventar an (kein Box → Squat Jumps usw.) und der Coach kann sie (wie alle Programme) per `set_program`/`edit_program_step` umbauen.
- **Alt-Programme:** gym1-4 / mob1-5 bleiben in der Bibliothek; nur der aktive Tagesplan zeigt jetzt Rory.
- **Ehrlichkeit:** Inhalte aus den in der Spec gelisteten Quellen; Dichte (6 Gym-Tage) extrapoliert; transparent via `RORY_NOTE`.
