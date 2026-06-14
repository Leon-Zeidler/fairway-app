# Design: Trainings-Präzision, Material-Bewusstsein & stärkerer Coach

- **Datum:** 2026-06-14
- **Status:** Approved (Brainstorming) → bereit für Implementierungsplan
- **Projekt:** Fairway (`~/Desktop/Projects/fairway/fairway-app`)

## Kontext & Problem

Leon möchte drei verzahnte Verbesserungen am Trainingssystem:

1. **Schläger + Häufigkeit pro Übung.** Übungen sind heute reiner Freitext
   (`"Name — Detail"`). Manche nennen Schläger/Wiederholungen, die meisten nicht
   einheitlich. Es soll bei jeder Übung klar stehen, **welchen Schläger** man nutzt
   und **wie oft/viel** (Wiederholungen, Bälle, Sätze, Zeit).
2. **Material-Bewusstsein (Mobility + Gym).** Routinen setzen still Material voraus
   (mob3 = Band, mob4 = Foam Roll; Gym = Langhantel/Kabel/Klimmzugstange …). Leon
   soll angeben, **was er hat**, und das Training passt sich an.
3. **Stärkerer KI-Coach.** Der Coach kann heute nur ganze Programme neu schreiben
   (`set_program`) oder einen Schritt anhängen (`add_program_step`). Er soll
   **einzelne Schritte gezielt ändern/löschen** können und das Material kennen, um
   das Training **präzise auf Leons Wünsche** umzubauen.

## Ziele / Nicht-Ziele

**Ziele**
- Strukturierte Übungsschritte mit Schläger + Dosis, einheitlich anzeigbar.
- Material-Inventar (Mobility + Gym), das Routinen automatisch anpasst.
- Granulare Coach-Aktionen (Einzel-Schritt patchen/löschen, Material setzen).
- Bestehende, in der Cloud/localStorage gespeicherte Programm-Overrides dürfen
  nicht brechen (Migration).

**Nicht-Ziele (YAGNI, bewusst weggelassen)**
- Komplett neue Programme zur Laufzeit anlegen (PROGRAMS bleibt kuratiert).
- Schritte umsortieren (`move_program_step`).
- Material-Anpassung für Golf/Range (Schläger ≠ „Material" im Sinne dieses Features).

## Gewählter Ansatz

**A1 (voll integriert) + Anpassungs-Mechanismus als Hybrid.** Ein einheitlicher
`Step`-Typ ersetzt die String-Schritte überall (angelehnt an das bestehende
`WarmupStep`). Für **alle aktuell vorhandenen** Gerät-abhängigen Schritte wird ein
`alt` (geräteloser/improvisierter Ersatz) hinterlegt → automatischer Tausch. Der
„nur markieren"-Pfad ist der **Fallback** für künftige Schritte (z.B. vom Coach
ergänzt) ohne `alt`.

## 1 · Datenmodell (`lib/types.ts`)

```ts
/** Ein strukturierter Übungsschritt (ersetzt das "Name — Detail"-String-Format). */
export interface Step {
  name: string;            // "Gate-Drill mit 2 Tees"
  detail: string;          // Coaching-Hinweis (darf "" sein)
  club?: string;           // "7 Eisen" — nur Golf/Range/Kurzspiel
  dose?: string;           // "15 Bälle" | "10 Wdh." | "3×8" | "45 s/Seite" | "5 Min"
  gear?: GearId;           // benötigtes Material (genau eines); fehlt → kein Material nötig
  alt?: Omit<Step, "alt">; // Variante, wenn `gear` nicht verfügbar ist
}

export type GearId =
  | "foam-roller" | "band"                                   // Mobility
  | "barbell" | "dumbbells" | "pull-up-bar" | "bench"
  | "cable" | "kettlebell" | "med-ball";                     // Gym

export interface GearItem {
  id: GearId;
  label: string;                  // "Langhantel"
  group: "mobility" | "gym";
  available: boolean;             // Default true
}
```

- `club` und `dose` sind **Freitext** (wie die Bag-Distanzen), nicht erzwungen.
- `Drill`, `Routine.steps` und `ProgramSection.steps` werden zu `Step[]`.
- `gear` referenziert **genau eine** `GearId` (eine Übung = ein primäres Gerät —
  hält Modell & Coach-Schema simpel).

## 2 · Content-Rewrite (`lib/seed.ts`)

Alle kuratierten Inhalte werden zu `Step[]`:

**Regel Schläger + Dosis:**
- Jeder **Golf/Range/Kurzspiel**-Schritt (DRILLS, golf1–3, PITCHING) bekommt
  `club` **und** `dose`.
- Jeder **Mobility/Gym**-Schritt (mob1–5, gym1–4) bekommt `dose`, **kein** `club`.

Beispiele (repräsentativ, gilt für alle Schritte der jeweiligen Gruppe):

| Quelle | name | club | dose |
|---|---|---|---|
| golf2 | Gate-Drill mit 2 Tees | 7 Eisen | 15 Bälle |
| golf3 | Füße-zusammen-Schwünge | Driver | 10 Bälle |
| DRILLS rp6 | Headcover unter linkem Fuß | 7 Eisen | 10 Bälle |
| mob5 | Stehende Rumpfrotation | — | 10/Seite |
| gym1 | Back Squat | — | 4×6 |

**Material-Mapping (`gear` + `alt`) — alle aktuell betroffenen Schritte:**

| Routine | Schritt | gear | alt (gerätelos/improvisiert) |
|---|---|---|---|
| mob3 | Schulter-Dislocates mit Band | band | Schulter-Dislocates mit Handtuch/Stab — 10 Wdh. |
| mob4 | Foam Roll Rücken & Beine | foam-roller | Boden-Mobilisation / Dehn-Flow — 5 Min |
| gym1 | Back Squat | barbell | Körpergewicht-Squat — 4×12, 2 Sek unten |
| gym1 | Romanian Deadlift | barbell | Single-Leg RDL (Körpergewicht) — 3×8/Seite |
| gym2 | Kabel/Band Woodchop | cable | Stehende Rotation langsam — 3×10/Seite |
| gym2 | Pallof Press | cable | Plank-Anti-Rotation — 3×20 s/Seite |
| gym2 | Med-Ball Rotational Throw | med-ball | Explosive Standing Rotation ohne Ball — 3×8/Seite |
| gym3 | Klimmzüge | pull-up-bar | Handtuch-Rudern an der Tür — 4×10 |
| gym3 | Bankdrücken (KH) | dumbbells | Liegestütze — 3×12, Körper als Brett |
| gym3 | Rudern | dumbbells | Handtuch-Rudern an der Tür — 3×12 |
| gym3 | Schulterdrücken | dumbbells | Pike Push-ups — 3×8 |
| gym3 | Face Pulls | cable | Band/Handtuch Pull-Aparts — 3×15 |
| gym4 | Kreuzheben | barbell | Hip Hinge (Körpergewicht) — 4×8 |
| gym4 | Power Clean | barbell | Sprung-Squat + explosives Hochziehen — 4×3 |
| gym4 | Farmer's Carry | dumbbells | Schwerer Rucksack-Carry — 3×30 m |

Übrige Gym-Schritte (Bulgarian Split Squat, Jump Squats, Wadenheben, Russian
Twist, Plank, Liegestütze, Ausfallschritte) sind bereits Körpergewicht → kein
`gear`. `bench`/`kettlebell` stehen im Inventar als plausible, vom Coach
ansprechbare Geräte zur Verfügung.

## 3 · Material-Inventar & Anpassung

**Default-Inventar (`GEAR` in `lib/seed.ts`)** — alle `available: true`
(bestehendes Verhalten bleibt erhalten; Leon schaltet ab, was fehlt):

- **Mobility:** Foam Roller, Resistance-/Miniband
- **Gym:** Langhantel, Kurzhanteln, Klimmzugstange, Bank, Kabelzug, Kettlebell, Med-Ball

**Speicherung:** neuer Store-Key `gear` (`GearItem[]`).

**Eingabe-UI:** Panel **„Mein Material"** oben auf der **Training-Seite**
(`app/training/page.tsx`) — Toggle-Chips, gruppiert nach Mobility/Gym.

**Anpassungs-Resolver (`lib/gear.ts`):**

```ts
export type StepStatus = "ok" | "adapted" | "unavailable";

export function gearRecord(gear: GearItem[]): Record<GearId, boolean>;

export function resolveSteps(
  steps: Step[],
  gear: Record<GearId, boolean>
): { step: Step; status: StepStatus }[];
//  - kein step.gear ODER verfügbar      → { step, "ok" }
//  - gear fehlt UND step.alt vorhanden  → { step: step.alt, "adapted" }
//  - gear fehlt UND kein step.alt       → { step, "unavailable" }
```

**Render-Verhalten (`app/programm/[id]/page.tsx`):**
- `ok` → normal.
- `adapted` → die Alt-Variante rendern, Badge „angepasst (kein <Label>)".
- `unavailable` → Schritt ausgegraut, Badge „braucht <Label>", Checkbox `disabled`
  (zählt nicht in `total`).

## 4 · Coach-Power (`lib/coach.ts` + `app/api/coach/route.ts` + `app/coach/page.tsx`)

**Geänderte Aktionen** (Steps sind jetzt Objekte statt `"Name — Detail"`):
```ts
| { type: "set_program"; id: string; title?: string; focus?: string;
    sections: { title?: string; steps: Step[] }[] }
| { type: "add_program_step"; id: string; step: Step }
```

**Neue Aktionen:**
```ts
| { type: "edit_program_step"; id: string; index: number;
    name?: string; detail?: string; club?: string; dose?: string; gear?: GearId }
| { type: "remove_program_step"; id: string; index: number }
| { type: "set_gear"; match: string; available: boolean }
```

**Coach-Kontext (`CoachContext`)** wird erweitert:
- `gear: { id, label, group, available }[]`
- `programs[].sections[].steps` sind jetzt Objekte mit `name/detail/club/dose/gear`.

**System-Prompt-Regeln (Ergänzung im `ACTION_CATALOG`):**
- Bei Golf-Übungen **immer** `club` + `dose` angeben.
- **Nie** Übungen vorschlagen, deren `gear` laut Kontext `available:false` ist —
  stattdessen Alternative ohne Gerät oder `set_gear` anbieten, wenn Leon sagt, er
  habe es jetzt.
- Für **kleine** Änderungen `edit_program_step`/`remove_program_step` nutzen
  (nicht das ganze Programm via `set_program` neu schreiben).

**Validierung (`sanitizeActions`):**
- Step-Objekt: `name` Pflicht (sonst Schritt verwerfen); `detail` optional → `""`;
  `club`/`dose` optionale Strings; `gear` nur gültige `GearId`, sonst weglassen.
- `edit_program_step`/`remove_program_step`: `id` Pflicht, `index` Integer ≥ 0,
  sonst Aktion verwerfen (Index-Bereich wird beim Anwenden erneut geprüft).
- `set_gear`: `match` Pflicht (String), `available` Pflicht (boolean).

**Anwendung (`app/coach/page.tsx`):** die client-seitige Action-Anwendung wird um
die drei neuen Aktionen erweitert (`set_gear` schreibt den `gear`-Store;
`edit/remove_program_step` patchen den `programOverrides`-Store via Index, Bereich
wird geprüft — Out-of-range ist No-op).

**`describeAction`:** menschliche Beschreibungen für die drei neuen Aktionen.

## 5 · Migration

- **Alte Programm-Overrides** (localStorage/Supabase) haben `steps: string[]`.
  Neuer Helfer `normalizeStep(s: string | Step): Step` wandelt Strings um
  (Split auf `" — "` → `{ name, detail }`, mirror des heutigen Renderings).
- `resolveProgram`/`applyOverride` und der `programOverrides`-Lesepfad im Store
  normalisieren beim Laden, sodass gemischte Alt/Neu-Daten nie crashen.
- `weekLog`, Sessions, Profile etc. sind unberührt.

## 6 · Rendering-Änderungen

- `app/programm/[id]/page.tsx`: kein `step.split(" — ")` mehr; rendert `step.name`,
  `step.detail`, Tags für `club`/`dose`, Material-Badge; nutzt `resolveSteps`.
  `ExerciseVideo`-Query nutzt `step.name`.
- `app/training/page.tsx`: Material-Panel.
- `app/globals.css`: Stile für Schläger/Dosis-Tags + Status-Badges.
- **Zu prüfen beim Bauen:** `app/page.tsx` (Heute) und `app/woche/page.tsx`
  rendern `dayTasks` (Titel/Desc), **nicht** Step-Listen → voraussichtlich keine
  Änderung; per Grep verifizieren.

## 7 · Tests & Verifikation

- **vitest** als devDep + `"test": "vitest"`-Script + `vitest.config.ts`.
- Unit-Tests (`lib/__tests__/`):
  - `sanitizeActions`: neue/geänderte Aktionen (gültig/ungültig, Step-Objekte,
    unbekannte `gear`, Out-of-range-Index).
  - `normalizeStep`: String → Step, Step → Step (idempotent).
  - `resolveSteps`: ok / adapted / unavailable je nach Gear-Verfügbarkeit.
- `npm run build` grün + alle Routen 200 + Klick-Check (wie letzte Session).

## 8 · Betroffene Dateien

- `lib/types.ts` — `Step`, `GearId`, `GearItem`; `Drill`/`Routine.steps` → `Step[]`.
- `lib/seed.ts` — Content-Rewrite (club/dose/gear/alt), `GEAR`-Defaults.
- `lib/programs.ts` — `ProgramSection.steps: Step[]`, Override-Apply + Normalisierung,
  `programsForContext`.
- `lib/gear.ts` (neu) — `gearRecord`, `resolveSteps`, `normalizeStep`.
- `lib/coach.ts` — `CoachAction`-Union, `ACTION_CATALOG`, `CoachContext.gear` +
  Step-Objekte, `sanitizeActions`, `describeAction`, System-Prompt-Regeln.
- `app/api/coach/route.ts` — Kontext inkl. `gear` bauen.
- `app/coach/page.tsx` — Anwendung der 3 neuen Aktionen + Step-Objekte.
- `app/programm/[id]/page.tsx` — strukturiertes Rendering + `resolveSteps` + Badges.
- `app/training/page.tsx` — Material-Panel.
- `lib/store.ts` — `gear`-Key; Normalisierung beim `programOverrides`-Lesen.
- `app/components/ui.tsx` / `app/globals.css` — Tags/Badges.
- `package.json`, `vitest.config.ts`, `lib/__tests__/*` — Tests.

## 9 · Risiken

- **Content-Rewrite ist umfangreich** (alle Routinen/Drills) — größter Aufwand,
  aber genau das gewünschte „Schläger + Dosis überall".
- **Override-Migration:** alte Cloud-Daten müssen sauber normalisiert werden,
  sonst Render-Crash → durch `normalizeStep` + Tests abgesichert.
- **Gym-Alternativen** sind teils Näherungen (z.B. Power Clean) — der Coach
  verfeinert Einzelfälle auf Zuruf.
