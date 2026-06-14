# Design: Rory-McIlroy-Trainingsplan als aktiver Fitness-Plan

- **Datum:** 2026-06-14
- **Status:** Approved (Brainstorming) → bereit für Implementierungsplan
- **Projekt:** Fairway (`~/Desktop/Projects/fairway/fairway-app`)
- **Baut auf:** dem strukturierten `Step`-Modell + Material-Inventar (Spec `2026-06-14-training-precision-gear-coach-design.md`)

## Kontext & Ziel

Leon will Rory McIlroys Training „so genau wie möglich" als seinen **aktiven täglichen Fitness-Plan** — dicht (volle Sessions, ~6 Gym-Tage), **Gym + Golf am selben Tag** (er schafft beides), **ohne** Range/Golfball-Training (das bleibt sein bestehender Golf-Plan).

### Ehrlichkeits-Hinweis (wichtig)
Ein vollständig dokumentierter, tagesgenauer „1-zu-1"-Plan von Rory existiert öffentlich nicht. **Inhalte/Sätze** stammen aus öffentlich berichteten Quellen (Stand 2025); die **Dichte** (6 Gym-Tage + Golf täglich) ist das obere Ende der Berichte plus Leons eigene Kapazität. In der App wird das transparent gelabelt.

**Quellen:** [Coach](https://www.coachweb.com/sport/5684/how-rory-mcilroy-s-gym-workouts-improved-his-game) · [Golf Monthly](https://www.golfmonthly.com/news/tour-news/rory-mcilroy-gym-routine-117027) · [totalshape](https://totalshape.com/fitness/rory-mcilroy-workout-diet/) · [stack](https://www.stack.com/a/rory-mcilroys-4-exercise-strength-workout/) · [golf.com](https://golf.com/instruction/fitness/rory-mcilroy-insane-quarantine-workout/) · [WHOOP/Ro Sharma](https://www.whoop.com/us/en/thelocker/how-golfer-rory-mcllroy-stays-on-top-of-his-game-with-performance-coach-ro-sharma/)

## Ziele / Nicht-Ziele

**Ziele**
- 7 geführte Rory-Programme (`/programm/[id]`) mit strukturierten Steps (Dosis + Material + geräteloser Alternative).
- Rorys 7-Tage-Rhythmus wird der aktive Wochenplan für Gym/Mobility; „Heute" & „Woche" zeigen ihn.
- Golf bleibt parallel (Leons technik/kurzspiel/platz unverändert) — Gym + Golf am selben Tag.
- Material `box` (Sprungbox) ergänzen (für Box Jumps).

**Nicht-Ziele (YAGNI)**
- Keine automatisch rotierenden 6–8-Wochen-Blöcke (Periodisierung wird als Hinweis dokumentiert, nicht als Auto-Logik gebaut).
- Range/Golfball-Training wird nicht angefasst.
- Leons bestehende Programme (gym1–4, mob1–5) bleiben in der Bibliothek erhalten.

## 1 · Material-Ergänzung

- `lib/types.ts`: `GearId` um `"box"` erweitern.
- `lib/gear.ts`: `GEAR_IDS` um `"box"` erweitern (→ 10 IDs).
- `lib/seed.ts` `GEAR`: Eintrag `{ id: "box", label: "Sprungbox / Step", group: "gym", available: true }` (→ 10 Einträge).
- Box-Jump-Schritte: `gear: "box"`, `alt`: „Squat Jumps (Körpergewicht)".

Übrige genutzte Geräte (barbell, dumbbells, pull-up-bar, bench, cable, med-ball, band, foam-roller) sind bereits vorhanden.

## 2 · Geteilter Mobility/Activation-Warmup

Jede **geladene** Session beginnt mit derselben Warmup-Section (Konstante `WARMUP_RORY: Step[]` in `seed.ts`, als erste Section wiederverwendet in: `rory-strength-a`, `rory-strength-b`, `rory-power`, `rory-circuit`, `rory-conditioning`). `rory-activation` und `rory-recovery` sind selbst leicht/mobil → **kein** zusätzlicher Warmup.

- Lockeres Einlaufen — dose „3–5 Min" — Puls hoch, locker werden.
- Hamstring Sweep — dose „30 s" — gestrecktes Bein vorn greifen, Hüfte mobil.
- Quad Grab — dose „30 s" — Ferse zum Po, aufrecht.
- Lunge Tilt — dose „30 s/Seite" — 90°-Ausfallschritt, Arm über Kopf, Oberkörper neigen.
- Dynamic Side Lunge — dose „30 s/Seite" — seitlich laden, Gewicht verlagern.
- Schulter-Prehab + Scapula — dose „10 Wdh." — gear `band`, alt „ohne Band: Wall Slides + Armkreise".
- Hüftmobilität 90/90 — dose „8/Seite" — kontrolliert wechseln, aufrecht.

## 3 · Die 7 Programme (Hauptblöcke)

Alle group `gym` außer `rory-recovery` (group `mobility`). Steps tragen Dosis; Gerät-Schritte tragen `gear` + `alt`.

**`rory-strength-a` — „Rory · Strength A (schwer)" (Mo)**
- Trap-Bar-Kreuzheben — „4×5 (2 schwer)" — gear `barbell`, alt „KH-/Körpergewicht-Hip-Hinge 4×8".
- Neutrale Klimmzüge — „4×5" — gear `pull-up-bar`, alt „Handtuch-Rudern an der Tür 4×10".
- Reverse Lunge (KH) — „3×8/Seite" — gear `dumbbells`, alt „Reverse Lunge Körpergewicht 3×12/Seite".
- Plank mit Beinheben — „3×8/Seite" — (kein Gerät).

**`rory-strength-b` — „Rory · Strength B (Oberkörper/Core)" (Di)**
- 15° Schrägbank-KH-Drücken — „4×6" — gear `dumbbells` (Schrägbank im Detail), alt „Liegestütze Füße erhöht 4×10".
- Renegade Row — „3×8/Seite" — gear `dumbbells`, alt „Plank + Schulter-Tap 3×12/Seite".
- Walking Lunge (KH) — „3×10" — gear `dumbbells`, alt „Walking Lunge Körpergewicht 3×14".
- Med-Ball-Rotation — „3×10/Seite" — gear `med-ball`, alt „Stehende Rotation explosiv 3×10/Seite".
- Plank — „3×45 s" — (kein Gerät).

**`rory-power` — „Rory · Power/Speed" (Mi)**
- Box Jumps — „3×10" — gear `box`, alt „Squat Jumps Körpergewicht 3×10".
- Squat Jumps — „2× max + 2×10" — (kein Gerät; Weste optional im Detail).
- Med-Ball-Slams mit Rotation — „3×8/Seite" — gear `med-ball`, alt „Explosive Chop ohne Ball 3×8/Seite".
- Overhead-Throws (6–8 kg) — „3×5" — gear `med-ball`, alt „Explosiver Sprung-Reach 3×5".
- Schnelle leichte Lifts (Speed) — „3×3" — gear `dumbbells`, alt „Betont schnelle Sprung-Kniebeuge 3×3".

**`rory-circuit` — „Rory · Strength-Endurance-Zirkel" (Do)** — zwei Sections:
- *Zirkel 1 (3 Runden, 1 Min Pause):* Romanian Deadlift „3 Runden · 8–10" (gear `barbell`, alt „Single-Leg RDL 3×8/Seite") · Klimmzug „3 Runden · 5–10" (gear `pull-up-bar`, alt „Handtuch-Rudern 3×10") · Plank mit Beinheben „3 Runden · 8/Seite".
- *Zirkel 2 (3 Runden, 1 Min Pause):* Reverse Lunge „3 Runden · 6–8/Seite" · Renegade Row „3 Runden · 6–8/Seite" (gear `dumbbells`, alt „Plank + Schulter-Tap 3×10/Seite") · Jump Squat „3 Runden · 5".

**`rory-conditioning` — „Rory · Conditioning" (Fr)**
- 5K-Lauf — „~20–25 Min" — gleichmäßig (Rory-Ziel ~20 Min; kein Radfahren — Haltung).
- Intervalle (optional) — „6× 1 Min schnell / 1 Min locker" — wenn frisch statt Dauerlauf.
- Pallof Press — „3×12/Seite" — gear `cable`, alt „Plank-Anti-Rotation 3×20 s/Seite".
- Farmer's Carry — „3×30 m" — gear `dumbbells`, alt „Rucksack-Carry 3×30 m".
- Hollow Hold — „3×30 s" — (kein Gerät).

**`rory-activation` — „Rory · Activation (vor der Runde)" (Sa)**
- Lockeres Einlaufen + Armkreisen — „3 Min".
- World's Greatest Stretch — „6/Seite".
- Rotations-Squat-Jumps — „2×6".
- Med-Ball-Rotation (leicht) — „2×8/Seite" — gear `med-ball`, alt „Stehende Rotation 2×8/Seite".
- Band-Walks (Hüfte) — „2×10/Seite" — gear `band`, alt „Hüft-Abduktion Körpergewicht 2×12/Seite".

**`rory-recovery` — „Rory · Recovery" (So, group mobility)**
- Foam Roll Ganzkörper — „8–10 Min" — gear `foam-roller`, alt „Boden-Mobilisation/Dehn-Flow 8–10 Min".
- Lockeres Gehen/Schwimmen — „20–30 Min" — aktive Erholung.
- Hüftbeuger- & Hamstring-Dehnung — „45 s/Seite".
- Brust-/Schulteröffner — „45 s/Seite".
- Atmung & Schlaf-Reset — „5 Min" — tiefe Atmung; Rory: 8 h Schlaf priorisieren (WHOOP).

## 4 · Aktiver Wochenplan (`lib/plan.ts`)

**PLAN-Defaults ändern** (Gym/Mobility auf Rory; Golf bleibt):
- `gym: [0,1,2,3,4,5]` (Mo–Sa).
- `mobility: [6]` (So → Recovery).
- `technik`, `kurzspiel`, `platz` **unverändert** (Leons Golf — läuft parallel).

**`RORY_GYM_BY_DOW`** (neues Mapping) → welches Programm an welchem Gym-Tag:
`0→rory-strength-a, 1→rory-strength-b, 2→rory-power, 3→rory-circuit, 4→rory-conditioning, 5→rory-activation`.

**`dayTasks` umbauen:**
- Gym-Zweig: statt gym1/gym2-Hardcode → `RORY_GYM_BY_DOW[dow]` (Titel/Desc/href des jeweiligen Rory-Programms).
- Mobility-Zweig: nur So (6) aktiv → `rory-recovery` (die `MOBILITY_BY_DOW`-Rotation entfällt im aktiven Plan; mob1–5 bleiben in der Bibliothek).
- technik/kurzspiel/platz unverändert.

Ergebnis pro Tag: Rory-Session + Golf, wo Leon es geplant hat (z.B. Mi: Power + Range + Kurzspiel).

## 5 · Ehrlichkeits-/Phasen-Label

- Konstante `RORY_NOTE` in `seed.ts`: „Angelehnt an öffentlich berichtetes Training von Rory McIlroy (Stand 2025) — nicht offiziell/garantiert exakt. Echte Struktur: 6–8-Wochen-Blöcke Strength → Active Recovery → Power → Conditioning."
- Anzeige: als `focus`/Hinweis auf den Rory-Programmen und als `note-box` auf der Training-Seite über der Rory-Gruppe.

## 6 · Programme in der Bibliothek

Die neuen `ROUTINES` fließen über die bestehenden `PROGRAMS`-Filter automatisch in die Training-Bibliothek (group `gym`/`mobility`). Keine strukturelle Änderung an `programs.ts` nötig. (Folge: die Gym-Gruppe zeigt künftig die 6 Rory- + 4 Alt-Programme — bewusst akzeptiert, Alt-Programme bleiben erhalten.)

## 7 · Tests & Verifikation

- **Seed-Invarianten** (`lib/__tests__/seed.test.ts`) greifen automatisch für die neuen Steps (dose vorhanden; gear gültig + alt vorhanden). GEAR-Längen-Assertion auf **10** anheben.
- **`lib/__tests__/gear.test.ts`**: `GEAR_IDS`-Exakt-Test um `"box"` ergänzen (10 Einträge).
- **Neuer `lib/__tests__/plan.test.ts`**: `dayTasks` liefert pro Wochentag das richtige Rory-Programm (Mo→`/programm/rory-strength-a`, Mi→`/programm/rory-power`, Do→`/programm/rory-circuit`, Fr→`/programm/rory-conditioning`, Sa→`/programm/rory-activation`, So→`/programm/rory-recovery`) und dass Golf-Tasks (technik/platz) weiterhin erscheinen.
- `npx tsc --noEmit`, `npm test`, `npm run build` grün; Routen-Smoke der neuen `/programm/rory-*`-Seiten (200).

## 8 · Betroffene Dateien

- `lib/types.ts` — `GearId` + `"box"`.
- `lib/gear.ts` — `GEAR_IDS` + `"box"`.
- `lib/seed.ts` — `WARMUP_RORY`, 7 neue `ROUTINES` (`rory-*`), `GEAR` + `box`, `RORY_NOTE`.
- `lib/plan.ts` — PLAN-Defaults, `RORY_GYM_BY_DOW`, `dayTasks`-Umbau.
- `app/training/page.tsx` — `note-box` mit `RORY_NOTE` über der Programmliste (oder Gym-Gruppe).
- Tests: `lib/__tests__/seed.test.ts` (GEAR→10), `lib/__tests__/gear.test.ts` (box), `lib/__tests__/plan.test.ts` (neu).

## 9 · Risiken

- **Viel neuer Content** (7 Programme) — größter Aufwand; durch Seed-Invarianten-Test abgesichert.
- **Training-Bibliothek wird voller** (Gym-Gruppe ~10 Programme) — bewusst akzeptiert (Alt-Programme bleiben).
- **Aktiver Plan wechselt** — Leons bisherige Gym/Mobility-Tage verschwinden aus „Heute"/„Woche" (Programme bleiben in der Bibliothek). Golf unberührt.
- **Genauigkeit** — Inhalte belegt, Dichte extrapoliert; transparent via `RORY_NOTE`.
