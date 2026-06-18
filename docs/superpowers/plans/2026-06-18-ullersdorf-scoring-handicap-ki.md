# Ullersdorf-Scoring, Handicap-Schätzung & KI-Plananpassung — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Loch-für-Loch-Scoring für Golf Dresden Ullersdorf (auch Teilrunden), eine daraus abgeleitete Handicap-Schätzung, und vollautomatische KI-Anpassung von Fokus & Wochenplan über ein gleitendes Fenster der letzten Runden.

**Architecture:** Auf dem bestehenden Modell aufbauen. Eine Platz-Definition (`lib/courses.ts`) liefert Par + Stroke-Index je Loch. Die `Session` wird um eine optionale Loch-Liste erweitert; reine Funktionen leiten daraus die bestehenden Summenfelder ab, sodass `aggregate`/`benchmarkRows`/`topFocus` unverändert weiterlaufen. Der KI-Coach bekommt die Rundenstatistik neu in den Kontext; nach dem Speichern einer Runde ruft das Journal den Coach im Hintergrund auf und wendet `set_focus`/`set_plan` automatisch an (mit Undo).

**Tech Stack:** Next.js 14 (App Router, Client Components), TypeScript, Supabase-KV-Store über `lib/store.ts`, OpenAI via `app/api/coach/route.ts`, Vitest für reine Funktionen.

## Global Constraints

- **Test-Framework:** Vitest. Testdateien liegen unter `lib/__tests__/*.test.ts` (Vitest `include: ["lib/**/*.test.ts"]`). Umgebung: `node`.
- **Test-Befehl (alle):** `npm test` (= `vitest run`). **Einzeln:** `npx vitest run lib/__tests__/<datei>.test.ts`.
- **Typecheck:** `npx tsc --noEmit` muss 0 Fehler liefern.
- **Reine Funktionen** (kein React) gehören nach `lib/` und sind unit-getestet. **UI** wird nicht unit-getestet (Projektkonvention) — Verifikation per Build + manuellem App-Test.
- **Sprache:** UI-Texte & Kommentare auf Deutsch (wie im Projekt).
- **Abwärtskompatibilität:** Neue `Session`-Felder sind **optional**; bestehende Sessions ohne diese Felder müssen unverändert funktionieren.
- **Git:** direkt auf `main` committen, kein Push ohne ausdrückliche Aufforderung.
- **Datum heute:** 2026-06-18.

---

### Task 1: Platz-Definition & Ullersdorf-Seed

**Files:**
- Create: `lib/courses.ts`
- Test: `lib/__tests__/courses.test.ts`

**Interfaces:**
- Consumes: nichts.
- Produces:
  - `interface CourseTee { id: string; label: string; cr: number; slope: number }`
  - `interface CourseHole { hole: number; par: number; si: number }`
  - `interface Course { id: string; name: string; par: number; holes: CourseHole[]; tees: CourseTee[] }`
  - `export const ULLERSDORF: Course`
  - `export const COURSES: Course[]`
  - `export function courseById(courses: Course[], id?: string): Course | undefined`
  - `export function teeById(course: Course | undefined, id?: string): CourseTee | undefined`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/courses.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { ULLERSDORF, COURSES, courseById, teeById } from "../courses";

describe("Ullersdorf-Seed", () => {
  it("hat genau 18 Löcher", () => {
    expect(ULLERSDORF.holes).toHaveLength(18);
  });

  it("Stroke-Index ist 1..18 und eindeutig", () => {
    const si = ULLERSDORF.holes.map((h) => h.si).sort((a, b) => a - b);
    expect(si).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
  });

  it("Loch-Nummern sind 1..18 und eindeutig", () => {
    const nums = ULLERSDORF.holes.map((h) => h.hole).sort((a, b) => a - b);
    expect(nums).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
  });

  it("Par-Summe der Löcher entspricht course.par (73)", () => {
    const sum = ULLERSDORF.holes.reduce((a, h) => a + h.par, 0);
    expect(sum).toBe(73);
    expect(ULLERSDORF.par).toBe(73);
  });

  it("hat einen Schwarz-Tee mit CR 70.7 / Slope 121", () => {
    const t = teeById(ULLERSDORF, "schwarz");
    expect(t).toBeDefined();
    expect(t!.cr).toBeCloseTo(70.7);
    expect(t!.slope).toBe(121);
  });

  it("courseById findet Ullersdorf in COURSES", () => {
    expect(courseById(COURSES, "ullersdorf")?.name).toContain("Ullersdorf");
    expect(courseById(COURSES, "unbekannt")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/courses.test.ts`
Expected: FAIL — `Cannot find module '../courses'`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/courses.ts`:

```ts
// Platz-Definitionen (Par + Stroke-Index je Loch, Abschläge mit CR/Slope).
// Reine Daten + Helfer; im Store als Collection "courses" editierbar.

export interface CourseTee {
  id: string;
  label: string;
  cr: number; // Course Rating
  slope: number; // Slope
}

export interface CourseHole {
  hole: number; // 1..18
  par: number; // 3 | 4 | 5
  si: number; // Stroke-Index 1..18, eindeutig
}

export interface Course {
  id: string;
  name: string;
  par: number; // Summe der Loch-Pars
  holes: CourseHole[];
  tees: CourseTee[];
}

// Quelle: Scorecard-DB (golftraxx via 18birdies). Vom Nutzer zu verifizieren.
export const ULLERSDORF: Course = {
  id: "ullersdorf",
  name: "Golf Dresden Ullersdorf",
  par: 73,
  holes: [
    { hole: 1, par: 4, si: 9 },
    { hole: 2, par: 3, si: 13 },
    { hole: 3, par: 4, si: 17 },
    { hole: 4, par: 4, si: 15 },
    { hole: 5, par: 5, si: 1 },
    { hole: 6, par: 4, si: 3 },
    { hole: 7, par: 3, si: 5 },
    { hole: 8, par: 4, si: 7 },
    { hole: 9, par: 5, si: 11 },
    { hole: 10, par: 4, si: 6 },
    { hole: 11, par: 4, si: 10 },
    { hole: 12, par: 3, si: 18 },
    { hole: 13, par: 5, si: 8 },
    { hole: 14, par: 4, si: 16 },
    { hole: 15, par: 4, si: 2 },
    { hole: 16, par: 4, si: 4 },
    { hole: 17, par: 4, si: 14 },
    { hole: 18, par: 5, si: 12 },
  ],
  tees: [{ id: "schwarz", label: "Schwarz", cr: 70.7, slope: 121 }],
};

export const COURSES: Course[] = [ULLERSDORF];

export function courseById(courses: Course[], id?: string): Course | undefined {
  return id ? courses.find((c) => c.id === id) : undefined;
}

export function teeById(
  course: Course | undefined,
  id?: string
): CourseTee | undefined {
  if (!course) return undefined;
  return id
    ? course.tees.find((t) => t.id === id)
    : course.tees[0];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/courses.test.ts`
Expected: PASS (6 Tests grün). Falls „SI eindeutig" fehlschlägt → Tippfehler in den SI-Werten korrigieren.

- [ ] **Step 5: Commit**

```bash
git add lib/courses.ts lib/__tests__/courses.test.ts
git commit -m "feat: Platz-Definition + Ullersdorf-Scorecard-Seed"
```

---

### Task 2: Session-Typ erweitern & Löcher → Summen ableiten

**Files:**
- Modify: `lib/types.ts` (Session-Interface; neuer `HoleScore`-Typ; `holesPlayed` lockern)
- Modify: `lib/golf.ts` (neue Funktion `deriveRoundFields`)
- Test: `lib/__tests__/derive.test.ts`

**Interfaces:**
- Consumes: `Course`, `CourseTee`, `CourseHole` aus Task 1; `Session` aus `lib/types`.
- Produces:
  - `interface HoleScore { hole: number; strokes: number; putts?: number; fairway?: boolean; gir?: boolean; penalties?: number }`
  - Session-Felder: `courseId?: string; teeId?: string; holes?: HoleScore[]`
  - `export function deriveRoundFields(course: Course, holes: HoleScore[]): Pick<Session, "strokes" | "coursePar" | "fairwaysHit" | "fairwaysPossible" | "girHit" | "putts" | "scramblingMade" | "scramblingTries" | "penalties" | "holesPlayed">`

- [ ] **Step 1: Modify `lib/types.ts`**

In `lib/types.ts`, im `Session`-Interface `holesPlayed` lockern und neue Felder ergänzen. Ersetze die Zeile

```ts
  holesPlayed?: 9 | 18; // gespielte Löcher
```

durch

```ts
  holesPlayed?: number; // gespielte Löcher (1..18; Teilrunden erlaubt)
```

und füge **am Ende** des `Session`-Interfaces (nach `penalties?`) hinzu:

```ts

  // ── Loch-für-Loch-Erfassung (optional; z.B. Ullersdorf-Scorecard) ──
  courseId?: string; // Referenz auf Course.id
  teeId?: string; // Referenz auf CourseTee.id
  holes?: HoleScore[]; // nur tatsächlich gespielte Löcher
```

Füge direkt **über** dem `Session`-Interface den neuen Typ ein:

```ts
/** Ein einzelnes erfasstes Loch einer Runde. */
export interface HoleScore {
  hole: number; // 1..18
  strokes: number; // Schläge auf diesem Loch
  putts?: number;
  fairway?: boolean; // Fairway getroffen (nur Par 4/5 sinnvoll)
  gir?: boolean; // Grün in Regulation
  penalties?: number; // Strafschläge auf diesem Loch
}
```

- [ ] **Step 2: Write the failing test**

Create `lib/__tests__/derive.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { ULLERSDORF } from "../courses";
import { deriveRoundFields } from "../golf";
import { HoleScore } from "../types";

describe("deriveRoundFields", () => {
  it("Teilrunde 3 Löcher: summiert Schläge/Par/Putts und zählt nur gespielte Löcher", () => {
    // Löcher 1 (Par4), 2 (Par3), 3 (Par4) = Par 11
    const holes: HoleScore[] = [
      { hole: 1, strokes: 5, putts: 2, fairway: true, gir: false },
      { hole: 2, strokes: 3, putts: 1, gir: true },
      { hole: 3, strokes: 4, putts: 2, fairway: false, gir: true },
    ];
    const d = deriveRoundFields(ULLERSDORF, holes);
    expect(d.holesPlayed).toBe(3);
    expect(d.strokes).toBe(12);
    expect(d.coursePar).toBe(11);
    expect(d.putts).toBe(5);
    expect(d.girHit).toBe(2);
  });

  it("fairwaysPossible zählt nur Par 4/5 (Par 3 ausgeschlossen)", () => {
    const holes: HoleScore[] = [
      { hole: 1, strokes: 4, fairway: true }, // Par 4
      { hole: 2, strokes: 3, fairway: true }, // Par 3 → zählt nicht
      { hole: 3, strokes: 4, fairway: false }, // Par 4
    ];
    const d = deriveRoundFields(ULLERSDORF, holes);
    expect(d.fairwaysPossible).toBe(2);
    expect(d.fairwaysHit).toBe(1);
  });

  it("Scrambling: Grün verfehlt, trotzdem ≤ Par = erfolgreich", () => {
    const holes: HoleScore[] = [
      // Loch 1 Par 4: GIR verfehlt, Score 4 (= Par) → Versuch + Erfolg
      { hole: 1, strokes: 4, gir: false },
      // Loch 2 Par 3: GIR verfehlt, Score 4 (> Par) → Versuch, kein Erfolg
      { hole: 2, strokes: 4, gir: false },
      // Loch 3 Par 4: GIR getroffen → kein Scrambling-Versuch
      { hole: 3, strokes: 4, gir: true },
    ];
    const d = deriveRoundFields(ULLERSDORF, holes);
    expect(d.scramblingTries).toBe(2);
    expect(d.scramblingMade).toBe(1);
  });

  it("Strafschläge werden summiert; fehlende optionale Werte sind 0/undefined-sicher", () => {
    const holes: HoleScore[] = [
      { hole: 1, strokes: 6, penalties: 1 },
      { hole: 2, strokes: 3 },
    ];
    const d = deriveRoundFields(ULLERSDORF, holes);
    expect(d.penalties).toBe(1);
    expect(d.putts).toBeUndefined(); // keine Putts erfasst
  });

  it("ignoriert unbekannte Loch-Nummern (kein Match im Course)", () => {
    const holes: HoleScore[] = [{ hole: 99, strokes: 4 }];
    const d = deriveRoundFields(ULLERSDORF, holes);
    expect(d.holesPlayed).toBe(0);
    expect(d.coursePar).toBe(0);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/derive.test.ts`
Expected: FAIL — `deriveRoundFields is not a function` (bzw. Importfehler).

- [ ] **Step 4: Implement `deriveRoundFields` in `lib/golf.ts`**

Oben in `lib/golf.ts` den Import erweitern:

```ts
import { Session, HoleScore } from "./types";
import { Course } from "./courses";
```

(Die bestehende Zeile `import { Session } from "./types";` ersetzen.)

Am **Ende** von `lib/golf.ts` anfügen:

```ts
/* ── Loch-für-Loch → Summenfelder ableiten ──────────────────────── */

/**
 * Berechnet aus den erfassten Löchern die klassischen Session-Summenfelder.
 * Nur Löcher mit Match im Course zählen. Optionale Werte (Putts/FW/GIR/Strafen)
 * werden nur einbezogen, wenn vorhanden — fehlt z.B. jeder Putt-Wert, bleibt
 * `putts` undefined (= „nicht erfasst").
 */
export function deriveRoundFields(
  course: Course,
  holes: HoleScore[]
): Pick<
  Session,
  | "strokes"
  | "coursePar"
  | "fairwaysHit"
  | "fairwaysPossible"
  | "girHit"
  | "putts"
  | "scramblingMade"
  | "scramblingTries"
  | "penalties"
  | "holesPlayed"
> {
  const byNum = new Map(course.holes.map((h) => [h.hole, h]));
  const played = holes.filter((h) => byNum.has(h.hole));

  let strokes = 0;
  let coursePar = 0;
  let fairwaysHit = 0;
  let fairwaysPossible = 0;
  let girHit = 0;
  let putts = 0;
  let hasPutts = false;
  let scramblingMade = 0;
  let scramblingTries = 0;
  let penalties = 0;
  let hasPenalties = false;
  let hasFairway = false;
  let hasGir = false;

  for (const h of played) {
    const def = byNum.get(h.hole)!;
    strokes += h.strokes;
    coursePar += def.par;

    if (def.par >= 4 && h.fairway != null) {
      fairwaysPossible += 1;
      if (h.fairway) fairwaysHit += 1;
      hasFairway = true;
    }
    if (h.gir != null) {
      hasGir = true;
      if (h.gir) {
        girHit += 1;
      } else {
        // Grün verfehlt → Up&Down-Versuch; Erfolg wenn Score ≤ Par
        scramblingTries += 1;
        if (h.strokes <= def.par) scramblingMade += 1;
      }
    }
    if (h.putts != null) {
      putts += h.putts;
      hasPutts = true;
    }
    if (h.penalties != null) {
      penalties += h.penalties;
      hasPenalties = true;
    }
  }

  return {
    holesPlayed: played.length,
    strokes: played.length ? strokes : undefined,
    coursePar: played.length ? coursePar : 0,
    fairwaysHit: hasFairway ? fairwaysHit : undefined,
    fairwaysPossible: hasFairway ? fairwaysPossible : undefined,
    girHit: hasGir ? girHit : undefined,
    putts: hasPutts ? putts : undefined,
    scramblingMade: hasGir ? scramblingMade : undefined,
    scramblingTries: hasGir ? scramblingTries : undefined,
    penalties: hasPenalties ? penalties : undefined,
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/derive.test.ts`
Expected: PASS (5 Tests grün).

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: 0 Fehler.

- [ ] **Step 7: Commit**

```bash
git add lib/types.ts lib/golf.ts lib/__tests__/derive.test.ts
git commit -m "feat: Session um Loch-Liste erweitern + deriveRoundFields"
```

---

### Task 3: Gleitendes Fenster der letzten Runden

**Files:**
- Modify: `lib/golf.ts` (neue Funktion `recentRoundsWindow`)
- Test: `lib/__tests__/window.test.ts`

**Interfaces:**
- Consumes: `Session`, `hasRoundStats` (bereits in `lib/golf.ts`).
- Produces: `export function recentRoundsWindow(sessions: Session[], n?: number): Session[]` — die jüngsten `n` (Default 10) Platz-Runden mit Stats, absteigend nach Datum.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/window.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { Session } from "../types";
import { recentRoundsWindow } from "../golf";

function s(date: string, extra: Partial<Session> = {}): Session {
  return {
    id: date,
    date,
    type: "course",
    rating: 3,
    drills: [],
    createdAt: date + "T10:00:00Z",
    strokes: 80,
    coursePar: 73,
    ...extra,
  };
}

describe("recentRoundsWindow", () => {
  it("liefert die jüngsten n Runden, absteigend nach Datum", () => {
    const sessions = [
      s("2026-06-01"),
      s("2026-06-10"),
      s("2026-06-05"),
      s("2026-06-15"),
    ];
    const w = recentRoundsWindow(sessions, 2);
    expect(w.map((x) => x.date)).toEqual(["2026-06-15", "2026-06-10"]);
  });

  it("ignoriert Nicht-Platz-Sessions und Runden ohne Stats", () => {
    const sessions = [
      s("2026-06-10"),
      { ...s("2026-06-11"), type: "range" as const, strokes: undefined },
      { ...s("2026-06-12"), strokes: undefined, coursePar: undefined }, // course, aber keine Stats
    ];
    const w = recentRoundsWindow(sessions, 10);
    expect(w.map((x) => x.date)).toEqual(["2026-06-10"]);
  });

  it("gibt alle zurück, wenn weniger als n vorhanden", () => {
    const w = recentRoundsWindow([s("2026-06-01")], 10);
    expect(w).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/window.test.ts`
Expected: FAIL — `recentRoundsWindow is not a function`.

- [ ] **Step 3: Implement in `lib/golf.ts`**

Am Ende von `lib/golf.ts` anfügen:

```ts
/**
 * Jüngste `n` Platz-Runden mit erfassbaren Stats, absteigend nach Datum.
 * Basis für die gleitende KI-Auswertung (statt „alle Runden").
 */
export function recentRoundsWindow(sessions: Session[], n = 10): Session[] {
  return sessions
    .filter(hasRoundStats)
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, n);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/window.test.ts`
Expected: PASS (3 Tests grün).

- [ ] **Step 5: Commit**

```bash
git add lib/golf.ts lib/__tests__/window.test.ts
git commit -m "feat: recentRoundsWindow (gleitendes Fenster der letzten Runden)"
```

---

### Task 4: Handicap-Schätzung

**Files:**
- Create: `lib/handicap.ts`
- Test: `lib/__tests__/handicap.test.ts`

**Interfaces:**
- Consumes: `Course`, `CourseTee` (Task 1); `Session`, `HoleScore` (Task 2).
- Produces:
  - `export function netDoubleBogey(par: number, si: number, courseHandicap: number, strokes: number): number`
  - `export function adjustedGross(course: Course, holes: HoleScore[], courseHandicap: number): number`
  - `export function scoreDifferential(adjGross: number, tee: CourseTee, holesPlayed: number): number | null`
  - `export function estimateHandicap(differentials: number[]): number | null`
  - `export interface RoundHandicap { differential: number | null; counts: boolean }`
  - `export function roundHandicap(course: Course, tee: CourseTee, holes: HoleScore[], baseHandicap: number): RoundHandicap`

**Hintergrund (WHS, pragmatisch):**
- Net Double Bogey = `par + 2 + erhaltene Vorgabeschläge`. Erhaltene Schläge = Verteilung des Course-Handicaps nach SI: jedes Loch bekommt `floor(ch/18)` Schläge, plus 1 zusätzlich für die `ch mod 18` schwersten Löcher (SI ≤ `ch mod 18`).
- `baseHandicap` (Course-Handicap-Basis) kommt aus dem bereits gespeicherten `profile.hcp` — vermeidet die Zirkularität „Index ← Differential ← Index". Ist kein gültiger Wert gesetzt (`NaN`), wird der Cap weggelassen (Roh-Score).
- Differential = `(113 / slope) × (adjGross − CR)`. 18-Loch-Runde: volle CR. 9-Loch-Runde: `CR/2`, Ergebnis wird zur Vergleichbarkeit verdoppelt (auf 18). Runden < 9 Löcher: `null` (nicht handicap-wirksam).
- Index-Schätzung = Ø der **besten 8 der letzten 20** Differentials; Reduktionstabelle für weniger Runden.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/handicap.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { ULLERSDORF } from "../courses";
import { HoleScore } from "../types";
import {
  netDoubleBogey,
  adjustedGross,
  scoreDifferential,
  estimateHandicap,
  roundHandicap,
} from "../handicap";

const SCHWARZ = ULLERSDORF.tees[0]; // cr 70.7, slope 121

describe("netDoubleBogey", () => {
  it("Par 4, kein Vorgabeschlag → max 6", () => {
    expect(netDoubleBogey(4, 1, 0, 9)).toBe(6);
  });
  it("Par 4 mit 1 Vorgabeschlag → max 7, cappt hohen Score", () => {
    expect(netDoubleBogey(4, 1, 18, 10)).toBe(7);
  });
  it("gibt echten Score zurück, wenn unter dem Cap", () => {
    expect(netDoubleBogey(4, 1, 0, 5)).toBe(5);
  });
});

describe("scoreDifferential", () => {
  it("18 Löcher: (113/slope)*(gross-CR)", () => {
    // (113/121)*(90-70.7) = 0.9339*19.3 ≈ 18.0
    const d = scoreDifferential(90, SCHWARZ, 18)!;
    expect(d).toBeCloseTo(18.0, 1);
  });
  it("< 9 Löcher → null (nicht handicap-wirksam)", () => {
    expect(scoreDifferential(20, SCHWARZ, 3)).toBeNull();
  });
});

describe("adjustedGross", () => {
  it("cappt Ausreißer-Löcher per Net Double Bogey", () => {
    const holes: HoleScore[] = [
      { hole: 1, strokes: 12 }, // Par 4, ohne Vorgabe → cap 6
      { hole: 2, strokes: 3 }, // Par 3 → cap 5, echter Score 3
    ];
    // ch = 0 → caps 6 und 3 → 9
    expect(adjustedGross(ULLERSDORF, holes, 0)).toBe(9);
  });
});

describe("estimateHandicap", () => {
  it("beste 8 von 20", () => {
    const diffs = Array.from({ length: 20 }, (_, i) => i + 1); // 1..20
    // beste 8 = 1..8, Schnitt = 4.5
    expect(estimateHandicap(diffs)).toBeCloseTo(4.5, 5);
  });
  it("3 Runden → bestes 1 zählt", () => {
    expect(estimateHandicap([10, 20, 30])).toBeCloseTo(10, 5);
  });
  it("keine Differentials → null", () => {
    expect(estimateHandicap([])).toBeNull();
  });
});

describe("roundHandicap", () => {
  it("Teilrunde 3 Löcher zählt nicht (counts=false, differential=null)", () => {
    const holes: HoleScore[] = [
      { hole: 1, strokes: 5 },
      { hole: 2, strokes: 4 },
      { hole: 3, strokes: 5 },
    ];
    const r = roundHandicap(ULLERSDORF, SCHWARZ, holes, 20);
    expect(r.counts).toBe(false);
    expect(r.differential).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/handicap.test.ts`
Expected: FAIL — `Cannot find module '../handicap'`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/handicap.ts`:

```ts
// Handicap-Schätzung (WHS-orientiert, pragmatisch). Reine Funktionen.
import { Course, CourseTee } from "./courses";
import { HoleScore } from "./types";

/** Erhaltene Vorgabeschläge auf einem Loch bei gegebenem Course-Handicap. */
function strokesReceived(si: number, courseHandicap: number): number {
  const ch = Math.max(0, Math.round(courseHandicap));
  const base = Math.floor(ch / 18);
  const extra = ch % 18;
  return base + (si <= extra ? 1 : 0);
}

/** Net Double Bogey = Par + 2 + erhaltene Vorgabeschläge (als Score-Obergrenze). */
export function netDoubleBogey(
  par: number,
  si: number,
  courseHandicap: number,
  strokes: number
): number {
  const cap = par + 2 + strokesReceived(si, courseHandicap);
  return Math.min(strokes, cap);
}

/**
 * Adjustierter Brutto-Score: Summe der per Net Double Bogey gecappten Löcher.
 * Ist `courseHandicap` NaN, wird nicht gecappt (Roh-Summe).
 */
export function adjustedGross(
  course: Course,
  holes: HoleScore[],
  courseHandicap: number
): number {
  const byNum = new Map(course.holes.map((h) => [h.hole, h]));
  let sum = 0;
  for (const h of holes) {
    const def = byNum.get(h.hole);
    if (!def) continue;
    sum += Number.isNaN(courseHandicap)
      ? h.strokes
      : netDoubleBogey(def.par, def.si, courseHandicap, h.strokes);
  }
  return sum;
}

/**
 * Score Differential = (113/slope) × (adjGross − CR).
 * 18 Löcher: volle CR. 9 Löcher: CR/2, Ergebnis ×2 (auf 18). < 9 → null.
 */
export function scoreDifferential(
  adjGross: number,
  tee: CourseTee,
  holesPlayed: number
): number | null {
  if (holesPlayed >= 18) {
    return (113 / tee.slope) * (adjGross - tee.cr);
  }
  if (holesPlayed >= 9) {
    const nine = (113 / tee.slope) * (adjGross - tee.cr / 2);
    return nine * 2;
  }
  return null;
}

/** WHS-Reduktionstabelle: wie viele der besten Differentials zählen. */
function countBest(n: number): number {
  if (n >= 20) return 8;
  if (n >= 19) return 7;
  if (n >= 17) return 6;
  if (n >= 15) return 5;
  if (n >= 12) return 4;
  if (n >= 9) return 3;
  if (n >= 7) return 3;
  if (n >= 5) return 2;
  if (n >= 3) return 1;
  return 0; // < 3 Runden: noch keine belastbare Schätzung
}

/** Geschätzter Index = Ø der besten K der letzten 20 Differentials. */
export function estimateHandicap(differentials: number[]): number | null {
  const last20 = differentials.slice(-20);
  const k = countBest(last20.length);
  if (k === 0) return null;
  const best = last20.slice().sort((a, b) => a - b).slice(0, k);
  return best.reduce((a, b) => a + b, 0) / best.length;
}

export interface RoundHandicap {
  differential: number | null;
  counts: boolean; // handicap-wirksam (≥ 9 Löcher)?
}

/** Differential einer einzelnen Runde + ob sie handicap-wirksam ist. */
export function roundHandicap(
  course: Course,
  tee: CourseTee,
  holes: HoleScore[],
  baseHandicap: number
): RoundHandicap {
  const played = holes.filter((h) =>
    course.holes.some((c) => c.hole === h.hole)
  ).length;
  if (played < 9) return { differential: null, counts: false };
  const adj = adjustedGross(course, holes, baseHandicap);
  return { differential: scoreDifferential(adj, tee, played), counts: true };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/handicap.test.ts`
Expected: PASS. Bei Abweichung in `scoreDifferential`-Test die Rundung im Test (`toBeCloseTo(..., 1)`) gegen die Formel prüfen.

- [ ] **Step 5: Typecheck & Commit**

Run: `npx tsc --noEmit` → 0 Fehler.

```bash
git add lib/handicap.ts lib/__tests__/handicap.test.ts
git commit -m "feat: Handicap-Schätzung (Differential, Net Double Bogey, beste 8/20)"
```

---

### Task 5: Rundendaten in den KI-Kontext + wiederverwendbare Kontext-Assemblierung

**Files:**
- Modify: `lib/coach.ts` (`CoachContext` um `roundInsights` erweitern; `buildSystemPrompt` um eine Sektion; neue Funktion `roundInsightsFrom`)
- Modify: `app/coach/page.tsx` (im `buildContext` `roundInsights` mitliefern)
- Test: `lib/__tests__/coach.test.ts` (Ergänzung)

**Interfaces:**
- Consumes: `aggregate`, `benchmarkRows`, `topFocus`, `recentRoundsWindow` (`lib/golf.ts`); `estimateHandicap`, `roundHandicap` (`lib/handicap.ts`); `courseById`, `teeById`, `COURSES` (`lib/courses.ts`); `Session` (`lib/types`).
- Produces:
  - Feld an `CoachContext`: `roundInsights?: RoundInsights`
  - `export interface RoundInsights { windowSize: number; scoringToPar18: number | null; girPct: number | null; fairwayPct: number | null; puttsPer18: number | null; scramblingPct: number | null; penaltiesPer18: number | null; topFocus: { key: string; label: string; valueText: string; targetText: string } | null; handicapEstimate: number | null; }`
  - `export function roundInsightsFrom(sessions: Session[], courses: Course[], baseHandicap: number, windowN?: number): RoundInsights | undefined`

- [ ] **Step 1: Erweitere `CoachContext` und füge `RoundInsights` + `roundInsightsFrom` in `lib/coach.ts` hinzu**

Imports oben in `lib/coach.ts` ergänzen (zu den bestehenden Imports):

```ts
import { Session } from "./types";
import { Course, courseById, teeById, COURSES } from "./courses";
import { aggregate, benchmarkRows, topFocus, recentRoundsWindow } from "./golf";
import { roundHandicap, estimateHandicap } from "./handicap";
```

(Falls `Session` bereits importiert ist, nicht doppeln.)

Im `CoachContext`-Interface (nach `trackmanHistory?`) ergänzen:

```ts
  roundInsights?: RoundInsights;
```

Vor dem `CoachContext`-Interface den Typ + die Funktion einfügen:

```ts
/** Verdichtete Runden-Auswertung (gleitendes Fenster) für den Coach. */
export interface RoundInsights {
  windowSize: number;
  scoringToPar18: number | null;
  girPct: number | null;
  fairwayPct: number | null;
  puttsPer18: number | null;
  scramblingPct: number | null;
  penaltiesPer18: number | null;
  topFocus: {
    key: string;
    label: string;
    valueText: string;
    targetText: string;
  } | null;
  handicapEstimate: number | null;
}

/**
 * Baut RoundInsights aus den Sessions: Aggregat über das gleitende Fenster,
 * größter Hebel, und Handicap-Schätzung aus allen handicap-wirksamen Runden.
 */
export function roundInsightsFrom(
  sessions: Session[],
  courses: Course[] = COURSES,
  baseHandicap = NaN,
  windowN = 10
): RoundInsights | undefined {
  const window = recentRoundsWindow(sessions, windowN);
  if (window.length === 0) return undefined;

  const agg = aggregate(window);
  const tf = topFocus(agg);

  // Handicap: Differentials aus allen Runden mit Loch-Daten (jüngste zuletzt).
  const diffs: number[] = [];
  const dated = sessions
    .filter((s) => s.holes && s.holes.length && s.courseId)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));
  for (const s of dated) {
    const course = courseById(courses, s.courseId);
    const tee = teeById(course, s.teeId);
    if (!course || !tee) continue;
    const rh = roundHandicap(course, tee, s.holes!, baseHandicap);
    if (rh.counts && rh.differential != null) diffs.push(rh.differential);
  }

  return {
    windowSize: window.length,
    scoringToPar18: agg.scoringToPar18,
    girPct: agg.girPct,
    fairwayPct: agg.fairwayPct,
    puttsPer18: agg.puttsPer18,
    scramblingPct: agg.scramblingPct,
    penaltiesPer18: agg.penaltiesPer18,
    topFocus: tf
      ? {
          key: tf.key,
          label: tf.label,
          valueText: tf.valueText,
          targetText: tf.targetText,
        }
      : null,
    handicapEstimate: estimateHandicap(diffs),
  };
}
```

- [ ] **Step 2: `buildSystemPrompt` um eine Runden-Sektion erweitern**

In `lib/coach.ts`, in `buildSystemPrompt(context)`, an der Stelle, wo der Kontext in den Prompt-String eingebaut wird (dort wo bereits `context.recentSessions` o.ä. eingebettet werden), folgende Sektion ergänzen. Konkret: finde im Funktionskörper die Zusammensetzung des Prompts und füge vor dem Abschluss ein:

```ts
  const ri = context.roundInsights;
  const roundBlock = ri
    ? `

RUNDEN-AUSWERTUNG (gleitendes Fenster, letzte ${ri.windowSize} Runden, auf 18 normalisiert):
- Score zu Par: ${ri.scoringToPar18 != null ? Math.round(ri.scoringToPar18) : "—"}
- GIR: ${ri.girPct != null ? Math.round(ri.girPct * 100) + " %" : "—"}
- Fairways: ${ri.fairwayPct != null ? Math.round(ri.fairwayPct * 100) + " %" : "—"}
- Putts/Runde: ${ri.puttsPer18 != null ? ri.puttsPer18.toFixed(1) : "—"}
- Scrambling: ${ri.scramblingPct != null ? Math.round(ri.scramblingPct * 100) + " %" : "—"}
- Strafschläge/Runde: ${ri.penaltiesPer18 != null ? ri.penaltiesPer18.toFixed(1) : "—"}
- Größter Hebel Richtung Scratch: ${ri.topFocus ? `${ri.topFocus.label} (aktuell ${ri.topFocus.valueText}, Ziel ${ri.topFocus.targetText})` : "—"}
- Geschätztes Handicap: ${ri.handicapEstimate != null ? ri.handicapEstimate.toFixed(1) : "—"}

Nutze den größten Hebel, um Fokus und Wochenplan gezielt anzupassen.`
    : "";
```

und hänge `roundBlock` an den zurückgegebenen Prompt-String an (z.B. `return base + ... + roundBlock;` — an die bestehende Rückgabe anfügen, nicht ersetzen).

- [ ] **Step 3: Test ergänzen**

In `lib/__tests__/coach.test.ts` am Ende anfügen (Imports oben in der Datei ergänzen, falls nötig: `buildSystemPrompt`, `roundInsightsFrom`):

```ts
import { buildSystemPrompt, roundInsightsFrom } from "../coach";
import { ULLERSDORF } from "../courses";
import { Session } from "../types";

function courseRound(date: string, holes: { hole: number; strokes: number; gir?: boolean }[]): Session {
  return {
    id: date, date, type: "course", rating: 3, drills: [],
    createdAt: date + "T10:00:00Z",
    courseId: "ullersdorf", teeId: "schwarz",
    holes,
  } as Session;
}

describe("roundInsightsFrom + buildSystemPrompt", () => {
  it("liefert undefined ohne Runden", () => {
    expect(roundInsightsFrom([], [ULLERSDORF], NaN)).toBeUndefined();
  });

  it("baut Insights aus einer 18-Loch-Runde", () => {
    const holes = ULLERSDORF.holes.map((h) => ({
      hole: h.hole, strokes: h.par + 1, gir: false,
    }));
    const ri = roundInsightsFrom([courseRound("2026-06-10", holes)], [ULLERSDORF], NaN);
    expect(ri).toBeDefined();
    expect(ri!.windowSize).toBe(1);
    expect(ri!.scoringToPar18).not.toBeNull();
  });

  it("buildSystemPrompt bettet die Runden-Sektion ein, wenn roundInsights gesetzt ist", () => {
    const holes = ULLERSDORF.holes.map((h) => ({ hole: h.hole, strokes: h.par + 1, gir: false }));
    const ri = roundInsightsFrom([courseRound("2026-06-10", holes)], [ULLERSDORF], NaN);
    // Minimal-Kontext: nur Pflichtfelder, die buildSystemPrompt nutzt, + roundInsights.
    const prompt = buildSystemPrompt({ roundInsights: ri } as any);
    expect(prompt).toContain("RUNDEN-AUSWERTUNG");
    expect(prompt).toContain("Größter Hebel");
  });
});
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run lib/__tests__/coach.test.ts`
Expected: PASS. Falls `buildSystemPrompt` bei Minimal-Kontext auf fehlende Felder zugreift und wirft → im Prompt-Builder defensive Defaults nutzen (`context.profile?.…`) **nur** an den Stellen, die der Test berührt; keine Verhaltensänderung für echten Kontext.

- [ ] **Step 5: `app/coach/page.tsx` — `roundInsights` mitliefern**

In `app/coach/page.tsx` den Import ergänzen:

```ts
import { roundInsightsFrom } from "@/lib/coach";
import { COURSES } from "@/lib/courses";
```

Im `return {...}` von `buildContext()` (nach `today: …`) ergänzen:

```ts
      roundInsights: roundInsightsFrom(
        sessions,
        COURSES,
        parseFloat(profile.value.hcp)
      ),
```

(`sessions` und `profile` sind in der Komponente bereits vorhanden.)

- [ ] **Step 6: Typecheck & Commit**

Run: `npx tsc --noEmit` → 0 Fehler.
Run: `npm test` → alle grün.

```bash
git add lib/coach.ts app/coach/page.tsx lib/__tests__/coach.test.ts
git commit -m "feat: Rundenstatistik + Handicap in den KI-Kontext"
```

---

### Task 6: Scorecard-Eingabe im Journal

**Files:**
- Modify: `app/journal/page.tsx` (neuer Erfassungsmodus „Ullersdorf-Scorecard")

**Interfaces:**
- Consumes: `COURSES`, `courseById`, `teeById`, `Course`, `CourseHole` (`lib/courses.ts`); `deriveRoundFields` (`lib/golf.ts`); `HoleScore`, `Session` (`lib/types`); `addSession` (`lib/storage.ts`); `uid` (`lib/store`).
- Produces: speichert eine `Session` mit `type: "course"`, `courseId`, `teeId`, `holes`, plus die per `deriveRoundFields` abgeleiteten Summenfelder. (Keine neuen Exporte.)

> UI-Task: keine Unit-Tests (Projektkonvention). Verifikation per `npm run build` + manuellem Test im Browser.

- [ ] **Step 1: State + Imports ergänzen**

Oben in `app/journal/page.tsx` Imports ergänzen:

```ts
import { COURSES, courseById, teeById } from "@/lib/courses";
import { deriveRoundFields } from "@/lib/golf";
import { HoleScore } from "@/lib/types";
```

Im `Journal()`-Komponenten-State ergänzen:

```ts
  // Ullersdorf-Scorecard (Loch-für-Loch)
  const [scorecard, setScorecard] = useState(false);
  const [courseId, setCourseId] = useState("ullersdorf");
  const [teeId, setTeeId] = useState("schwarz");
  const [holeScores, setHoleScores] = useState<Record<number, HoleScore>>({});
```

- [ ] **Step 2: Eingabe-UI rendern**

Im Eingabe-Formular (im `type === "course"`-Zweig, neben dem bestehenden `showStats`-Toggle) einen Umschalter + die Lochreihe einfügen:

```tsx
{type === "course" && (
  <label className="row-toggle">
    <input
      type="checkbox"
      checked={scorecard}
      onChange={(e) => setScorecard(e.target.checked)}
    />
    Ullersdorf-Scorecard (Loch für Loch)
  </label>
)}

{type === "course" && scorecard && (() => {
  const course = courseById(COURSES, courseId)!;
  const setHole = (hole: number, patch: Partial<HoleScore>) =>
    setHoleScores((prev) => ({
      ...prev,
      [hole]: { hole, strokes: 0, ...prev[hole], ...patch },
    }));
  return (
    <div className="scorecard">
      {course.holes.map((h) => {
        const sc = holeScores[h.hole];
        const toPar =
          sc && sc.strokes ? sc.strokes - h.par : null;
        return (
          <div className="sc-row" key={h.hole}>
            <span className="sc-hole">{h.hole}</span>
            <span className="sc-par">Par {h.par} · SI {h.si}</span>
            <input
              className="sc-strokes"
              inputMode="numeric"
              placeholder="–"
              value={sc?.strokes || ""}
              onChange={(e) =>
                setHole(h.hole, { strokes: Number(e.target.value) || 0 })
              }
            />
            <input
              className="sc-putts"
              inputMode="numeric"
              placeholder="Putts"
              value={sc?.putts ?? ""}
              onChange={(e) =>
                setHole(h.hole, {
                  putts: e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
            />
            <button
              type="button"
              className={`sc-gir ${sc?.gir ? "on" : ""}`}
              onClick={() => setHole(h.hole, { gir: !sc?.gir })}
            >
              GIR
            </button>
            {h.par >= 4 && (
              <button
                type="button"
                className={`sc-fw ${sc?.fairway ? "on" : ""}`}
                onClick={() => setHole(h.hole, { fairway: !sc?.fairway })}
              >
                FW
              </button>
            )}
            <span className="sc-topar">
              {toPar == null ? "" : toPar === 0 ? "E" : toPar > 0 ? `+${toPar}` : toPar}
            </span>
          </div>
        );
      })}
    </div>
  );
})()}
```

- [ ] **Step 3: Speichern erweitern**

In der `save()`-Funktion, **wenn** `type === "course" && scorecard`, vor dem Erstellen des `Session`-Objekts die abgeleiteten Felder berechnen und nur erfasste Löcher übernehmen:

```ts
    let derived: Partial<Session> = {};
    let holesArr: HoleScore[] | undefined;
    if (type === "course" && scorecard) {
      const course = courseById(COURSES, courseId)!;
      holesArr = Object.values(holeScores).filter((h) => h.strokes > 0);
      derived = {
        courseId,
        teeId,
        holes: holesArr,
        ...deriveRoundFields(course, holesArr),
      };
    }
```

und in das gebaute `Session`-Objekt (das via `addSession` gespeichert wird) `...derived` einmischen. Beispiel — die bestehende Objekt-Literal-Konstruktion um `...derived` ergänzen:

```ts
    const session: Session = {
      id: uid(),
      date,
      type,
      rating,
      drills: [],
      createdAt: new Date().toISOString(),
      notes: notes.trim() || undefined,
      // … bestehende optionale Felder (balls/score/…) …
      ...derived,
    };
    await addSession(session);
```

(Die genaue bestehende Objekt-Struktur in `save()` beibehalten und nur `...derived` ergänzen sowie ggf. die manuellen Stats-Felder überspringen, wenn `scorecard` aktiv ist.)

- [ ] **Step 4: `resetForm` erweitern**

In `resetForm()` ergänzen:

```ts
    setScorecard(false);
    setHoleScores({});
```

- [ ] **Step 5: Styles ergänzen**

In `app/globals.css` minimalen Stil für die Scorecard-Zeilen ergänzen:

```css
.scorecard { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; }
.sc-row { display: grid; grid-template-columns: 28px 1fr 48px 56px auto auto 36px; gap: 6px; align-items: center; }
.sc-strokes, .sc-putts { width: 100%; text-align: center; }
.sc-gir.on, .sc-fw.on { background: var(--accent, #2e7d32); color: #fff; }
.sc-topar { text-align: right; font-variant-numeric: tabular-nums; }
```

- [ ] **Step 6: Build & manuelle Verifikation**

Run: `npm run build`
Expected: Build erfolgreich, keine Typfehler.

Manuell (`npm run dev`): Journal öffnen → Typ „Platz" → „Ullersdorf-Scorecard" aktivieren → 3 Löcher eintragen → speichern. Erwartung: Eintrag erscheint mit korrekter „zu Par"-Meta (`roundMeta`), nur 3 Löcher gezählt.

- [ ] **Step 7: Commit**

```bash
git add app/journal/page.tsx app/globals.css
git commit -m "feat: Ullersdorf-Scorecard-Eingabe (Loch für Loch) im Journal"
```

---

### Task 7: Vollautomatische KI-Anpassung nach dem Speichern

**Files:**
- Modify: `app/journal/page.tsx` (nach dem Speichern Coach im Hintergrund aufrufen, `set_focus`/`set_plan` automatisch anwenden, Undo-Hinweis)

**Interfaces:**
- Consumes: `useObject` (`lib/store`), `FOCUS` (`lib/seed`), `PLAN` (`lib/plan`), `Focus`, `Profile` (`lib/types`), `roundInsightsFrom`, `CoachContext`, `CoachResponse`, `CoachAction` (`lib/coach`), `COURSES` (`lib/courses`).
- Produces: kein neuer Export. Effekt: Fokus/Plan-Stores werden ggf. aktualisiert; ein Undo-Banner erscheint.

> UI/Integrations-Task: keine Unit-Tests. Verifikation per Build + manuellem Test (mit gesetztem `OPENAI_API_KEY` lokal; ohne Key still überspringen).

- [ ] **Step 1: Stores + State im Journal ergänzen**

Imports in `app/journal/page.tsx` ergänzen:

```ts
import { useObject } from "@/lib/store";
import { FOCUS } from "@/lib/seed";
import { PLAN } from "@/lib/plan";
import { Focus, Profile } from "@/lib/types";
import { roundInsightsFrom, CoachAction, CoachResponse } from "@/lib/coach";
import { COURSES } from "@/lib/courses";
import { PROFILE } from "@/lib/seed";
```

State + Stores in `Journal()`:

```ts
  const focus = useObject<Focus>("focus", FOCUS);
  const plan = useObject<Record<string, number[]>>("plan", PLAN);
  const profile = useObject<Profile>("profile", PROFILE);
  const [autoUndo, setAutoUndo] = useState<
    { focus: Focus; plan: Record<string, number[]> } | null
  >(null);
```

- [ ] **Step 2: Auto-Coach-Funktion hinzufügen**

In `Journal()` eine Funktion ergänzen, die nach dem Runden-Speichern aufgerufen wird. Sie baut einen Post-Runde-Kontext, ruft `/api/coach` und wendet nur `set_focus`/`set_plan` an:

```ts
  async function autoAdaptPlan(allSessions: Session[]) {
    const insights = roundInsightsFrom(
      allSessions,
      COURSES,
      parseFloat(profile.value.hcp)
    );
    if (!insights) return; // keine Runden → nichts zu tun

    const context: Partial<CoachContext> = {
      focus: focus.value,
      plan: plan.value,
      profile: profile.value,
      roundInsights: insights,
      today: new Date().toLocaleDateString("de-DE", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    };

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content:
                "Ich habe gerade eine Runde gespeichert. Passe meinen Fokus und Wochenplan an die Runden-Auswertung an. Antworte knapp.",
            },
          ],
          context,
        }),
      });
      const data: CoachResponse = await res.json();
      if (data.notConfigured || data.error) return; // still überspringen
      const actions = (data.actions || []).filter(
        (a): a is Extract<CoachAction, { type: "set_focus" | "set_plan" }> =>
          a.type === "set_focus" || a.type === "set_plan"
      );
      if (!actions.length) return;

      // Snapshot für Undo, dann anwenden.
      const snap = { focus: focus.value, plan: plan.value };
      for (const a of actions) {
        if (a.type === "set_focus") {
          focus.set({
            title: a.title ?? focus.value.title,
            why: a.why ?? focus.value.why,
            cues: a.cues ?? focus.value.cues,
          });
        } else if (a.type === "set_plan") {
          plan.set({ [a.activity]: a.days });
        }
      }
      setAutoUndo(snap);
    } catch {
      // offline / Fehler → Runde bleibt gespeichert, keine Anpassung
    }
  }
```

- [ ] **Step 3: Auslösen nach dem Speichern**

In `save()`, **nur** wenn eine Platz-Runde gespeichert wurde, nach `await addSession(session)` und `await refresh()` die Anpassung anstoßen (nicht blockierend für das UI-Reset):

```ts
    if (type === "course") {
      const all = await getSessions();
      autoAdaptPlan(all); // läuft im Hintergrund (kein await nötig)
    }
```

(`getSessions` ist bereits importiert.)

- [ ] **Step 4: Undo-Banner rendern**

Im JSX (z.B. oben im Journal, unter der Tab-Leiste) ein Banner ergänzen:

```tsx
{autoUndo && (
  <div className="auto-undo">
    <span>Plan an deine Runden angepasst.</span>
    <button
      type="button"
      onClick={() => {
        focus.replace(autoUndo.focus);
        plan.replace(autoUndo.plan);
        setAutoUndo(null);
      }}
    >
      Rückgängig
    </button>
  </div>
)}
```

Stil in `app/globals.css`:

```css
.auto-undo { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 10px 12px; margin: 8px 0; border-radius: 10px; background: var(--card, #14241a); font-size: 14px; }
.auto-undo button { text-decoration: underline; }
```

> Hinweis: `useObject` stellt `set`, `replace` und `.value` bereit (siehe `app/coach/page.tsx`, das dieselbe API für `focus`/`plan` nutzt). Falls `replace` nicht existiert, stattdessen `set(autoUndo.focus)` für das vollständige Objekt verwenden — in `app/coach/page.tsx` prüfen, welche Methode dort beim Undo genutzt wird, und dieselbe verwenden.

- [ ] **Step 5: Build & manuelle Verifikation**

Run: `npm run build` → erfolgreich.

Manuell (mit `OPENAI_API_KEY` in `.env.local`, `npm run dev`): Eine Platz-Runde speichern → nach kurzer Zeit erscheint das „Plan angepasst"-Banner; „Rückgängig" stellt Fokus/Plan wieder her. Ohne Key: Runde wird gespeichert, kein Banner, kein Fehler.

- [ ] **Step 6: Commit**

```bash
git add app/journal/page.tsx app/globals.css
git commit -m "feat: vollautomatische KI-Plananpassung nach Runden-Speichern (mit Undo)"
```

---

### Task 8: Ullersdorf-Trendansicht

**Files:**
- Modify: `app/journal/page.tsx` (im „stats"-Tab einen Ullersdorf-Verlauf ergänzen)

**Interfaces:**
- Consumes: `roundStats` (`lib/golf.ts`), `Session` (`lib/types`); gefiltert auf `courseId === "ullersdorf"`.
- Produces: kein neuer Export.

> UI-Task: keine Unit-Tests. Verifikation per Build + manuellem Test.

- [ ] **Step 1: Gefilterte Liste aufbauen**

Im `stats`-Tab von `app/journal/page.tsx` eine `useMemo`-Liste der Ullersdorf-Runden (aufsteigend nach Datum) erstellen:

```ts
  const ullersdorfRounds = useMemo(
    () =>
      sessions
        .filter((s) => s.courseId === "ullersdorf")
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date)),
    [sessions]
  );
```

- [ ] **Step 2: Trend rendern**

Im `stats`-Tab eine Sektion ergänzen (nur anzeigen, wenn Runden vorhanden):

```tsx
{tab === "stats" && ullersdorfRounds.length > 0 && (
  <section className="ull-trend">
    <h3>Ullersdorf — Verlauf</h3>
    <ul>
      {ullersdorfRounds.map((s) => {
        const r = roundStats(s);
        return (
          <li key={s.id}>
            <span>{s.date}</span>
            <span>
              {r.holes} Löcher ·{" "}
              {r.toPar == null
                ? "—"
                : r.toPar === 0
                ? "E"
                : r.toPar > 0
                ? `+${r.toPar}`
                : r.toPar}{" "}
              zu Par
            </span>
            <span>{r.putts != null ? `${r.putts} Putts` : ""}</span>
          </li>
        );
      })}
    </ul>
  </section>
)}
```

Stil in `app/globals.css`:

```css
.ull-trend { margin-top: 16px; }
.ull-trend ul { display: flex; flex-direction: column; gap: 4px; }
.ull-trend li { display: grid; grid-template-columns: 1fr 1fr auto; gap: 8px; font-size: 14px; font-variant-numeric: tabular-nums; }
```

- [ ] **Step 3: Build & manuelle Verifikation**

Run: `npm run build` → erfolgreich.
Manuell: Stats-Tab öffnen → Ullersdorf-Runden erscheinen chronologisch mit „zu Par" + Putts.

- [ ] **Step 4: Commit**

```bash
git add app/journal/page.tsx app/globals.css
git commit -m "feat: Ullersdorf-Trendansicht im Journal-Stats-Tab"
```

---

## Self-Review

**Spec coverage:**
- Platz-Definition + Ullersdorf-Seed → Task 1 ✅
- Session-Erweiterung (courseId/teeId/holes, holesPlayed lockern) → Task 2 ✅
- Löcher→Summen-Ableitung → Task 2 ✅
- Gleitendes Fenster → Task 3 ✅
- Handicap-Schätzung (Net Double Bogey, Differential, beste 8/20, 9-Loch, <9 = nicht wirksam) → Task 4 ✅
- Rundendaten in CoachContext + buildSystemPrompt → Task 5 ✅
- Scorecard-Eingabe (Teilrunden) → Task 6 ✅
- Vollautomatische KI-Anpassung + Undo → Task 7 ✅
- Ullersdorf-Trend → Task 8 ✅
- Future Scope (Rangefinder, Shot Planner) → bewusst nicht geplant ✅

**Offene Verifikation während der Umsetzung (aus der Spec):**
- Ullersdorf Par/SI + CR/Slope des tatsächlich gespielten Abschlags vom Nutzer gegenprüfen (Task 1 — Werte sind editierbar/anpassbar).
- In Task 5/7: `buildSystemPrompt` muss mit Teil-Kontext (`{ roundInsights }`) umgehen; falls es auf andere Pflichtfelder zugreift, dort defensiv absichern oder den Auto-Call-Kontext um die genutzten Felder ergänzen. Vor Task 7 die tatsächlich von `buildSystemPrompt` gelesenen Felder prüfen und den `context` in `autoAdaptPlan` entsprechend vervollständigen.

**Type consistency:** `HoleScore`, `Course`, `CourseTee`, `RoundInsights`, `roundInsightsFrom`, `deriveRoundFields`, `recentRoundsWindow`, `roundHandicap`, `estimateHandicap` werden in allen Tasks mit identischen Signaturen referenziert.

**Placeholder scan:** Keine TBD/TODO; alle Code-Schritte enthalten konkreten Code. UI-Tasks ohne Unit-Test sind als Projektkonvention markiert und per Build/manuell verifiziert.
