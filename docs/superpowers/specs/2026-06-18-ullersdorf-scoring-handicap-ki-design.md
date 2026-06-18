# Ullersdorf-Scoring, Handicap-Schätzung & KI-Plananpassung — Design

**Datum:** 2026-06-18
**Status:** Entwurf zur Freigabe
**Projekt:** Fairway (Next.js 14 PWA, Supabase-KV-Store, KI-Coach via OpenAI)

## Ziel

Loch-für-Loch-Scoring für den Golfplatz **Dresden Ullersdorf** (auch Teilrunden ab
1 Loch), eine daraus abgeleitete **Handicap-Schätzung**, und eine **vollautomatische
KI-Anpassung** des Trainingsplans (Fokus + Wochenplan) anhand eines gleitenden
Fensters der letzten Runden.

## Nicht-Ziele / Future Scope

Bewusst **nicht** Teil dieses Specs (eigener Spec→Plan-Zyklus später):

- **In-Range Rangefinder** (Distanzmessung auf der Range)
- **Shot Planner** (Schlag-/Linienplanung)

Diese werden nur als geplante Erweiterungen vermerkt, nicht gebaut.

## Kontext: Was es schon gibt (Wiederverwendung)

- `Session` (`lib/types.ts`) erfasst Platz-Runden inkl. Summenstatistik
  (`strokes`, `coursePar`, `fairwaysHit/Possible`, `girHit`, `putts`,
  `scramblingMade/Tries`, `penalties`).
- `lib/golf.ts`: `roundStats`, `aggregate` (normalisiert auf 18), `benchmarkRows`
  (Scratch-Richtwerte), `topFocus` (größter Hebel).
- `lib/store.ts`: reaktiver, Supabase-gestützter Key-Value-Store
  (`useCollection`, `useObject`); Sessions, Fokus, Plan liegen hier.
- `lib/coach.ts` + `app/api/coach/route.ts`: KI-Coach mit Auto-Apply-Actions
  (`set_focus`, `set_plan`, `set_program`) inkl. Undo. Bekommt aktuell **nur**
  `recentSessions` (Datum/Typ/Score/Notiz) — **nicht** die Rundenstatistik.
- `app/journal/page.tsx`: Eingabe + Stats-Tabs.

**Architektur-Entscheidung:** Auf diesem Modell aufbauen, nicht parallel. Die
bestehende Summenstatistik bleibt die Quelle für Aggregat/Benchmarks/Coach; die
neue Loch-für-Loch-Erfassung **leitet** diese Summen ab. So läuft die gesamte
vorhandene Auswertung unverändert weiter.

## Datenmodell

### Platz-Definition — `lib/courses.ts` (neu)

```ts
export interface CourseTee {
  id: string;        // "schwarz" | "gelb" | …
  label: string;     // "Schwarz"
  cr: number;        // Course Rating, z.B. 70.7
  slope: number;     // Slope, z.B. 121
}

export interface CourseHole {
  hole: number;      // 1..18
  par: number;       // 3 | 4 | 5
  si: number;        // Stroke-Index 1..18 (eindeutig)
}

export interface Course {
  id: string;        // "ullersdorf"
  name: string;      // "Golf Dresden Ullersdorf"
  par: number;       // 73 (= Summe der Loch-Pars)
  holes: CourseHole[]; // genau 18
  tees: CourseTee[];
}
```

**Ullersdorf-Seed** (beim Spec-Review vom Nutzer zu verifizieren — Quelle ist eine
Scorecard-DB, nicht der offizielle Club):

| Loch | Par | SI | | Loch | Par | SI |
|---|---|---|---|---|---|---|
| 1 | 4 | 9  | | 10 | 4 | 6  |
| 2 | 3 | 13 | | 11 | 4 | 10 |
| 3 | 4 | 17 | | 12 | 3 | 18 |
| 4 | 4 | 15 | | 13 | 5 | 8  |
| 5 | 5 | 1  | | 14 | 4 | 16 |
| 6 | 4 | 3  | | 15 | 4 | 2  |
| 7 | 3 | 5  | | 16 | 4 | 4  |
| 8 | 4 | 7  | | 17 | 4 | 14 |
| 9 | 5 | 11 | | 18 | 5 | 12 |

Out 36 / In 37 = **Par 73**. Tee „Schwarz": CR 70.7, Slope 121.

Courses liegen als `useCollection<Course>("courses", [ULLERSDORF])` im Store →
in der App editierbar/erweiterbar.

### Runde — Erweiterung von `Session` (`lib/types.ts`)

Neue **optionale** Felder (abwärtskompatibel):

```ts
courseId?: string;   // "ullersdorf"
teeId?: string;      // "schwarz"
holes?: HoleScore[]; // nur ausgefüllte Löcher

export interface HoleScore {
  hole: number;       // 1..18
  strokes: number;    // Pflicht je erfasstem Loch
  putts?: number;
  fairway?: boolean;  // nur Par 4/5 sinnvoll
  gir?: boolean;
  penalties?: number;
}
```

`holesPlayed` darf künftig eine beliebige Zahl 1..18 sein (Typ lockern von
`9 | 18` auf `number`), damit Teilrunden (z.B. 3 Löcher) sauber funktionieren.

## Ableitung: Löcher → Summen (`lib/golf.ts`)

`deriveRoundFields(course, tee, holes)` berechnet aus den erfassten Löchern die
bestehenden Session-Summenfelder:

- `strokes` = Σ strokes
- `coursePar` = Σ par der **gespielten** Löcher
- `fairwaysPossible` = Anzahl gespielter Par-4/5-Löcher; `fairwaysHit` = Σ fairway
- `girHit` = Σ gir; `putts` = Σ putts
- `scramblingTries` = verfehlte Grüns; `scramblingMade` = davon mit ≤ Par
- `penalties` = Σ penalties
- `holesPlayed` = Anzahl erfasster Löcher

Dadurch funktionieren `roundStats`, `aggregate`, `benchmarkRows`, `topFocus`
unverändert — sie sehen weiterhin nur die Summenfelder.

## Handicap-Schätzung (`lib/handicap.ts`, neu)

WHS-orientiert, pragmatisch:

- **Adjustierter Brutto** je Loch via **Net Double Bogey**:
  `min(strokes, par + 2 + erhaltene Vorgabeschläge)`. Vorgabeschläge =
  Course-Handicap verteilt nach SI. Das Course-Handicap wird aus dem **bereits
  gespeicherten `profile.hcp`** abgeleitet (vermeidet die Zirkularität „Index ←
  Differential ← Index"); ist kein `profile.hcp` gesetzt, entfällt der Cap.
- **Score Differential** = `(113 / slope) × (adjGross − cr)`.
  - **18-Loch-Runde:** Standardformel mit CR/Slope des Abschlags.
  - **9-Loch-Runde:** 9-Loch-Differential mit `cr/2` und gleichem Slope, dann
    nach WHS zu einem 18-Differential kombiniert (bzw. als 9-Loch-Differential
    markiert). Keine separaten 9-Loch-CR/Slope-Daten nötig.
- **Nur Runden ≥ 9 Löcher** sind handicap-wirksam; < 9 Löcher fließen nur in die
  Statistik.
- **Geschätzter Index** = Ø der **besten 8 der letzten 20** Differentials
  (WHS-Reduktionstabelle für < 20 Runden: z.B. 3 Runden → bestes 1, usw.).
- Ausgabe: aktueller geschätzter Index + Trend über Zeit. Klar als **Schätzung**
  gelabelt (keine offizielle Stammvorgabe).

## Eingabe-UI (`app/journal`)

Neuer Erfassungsmodus **„Ullersdorf-Scorecard"** neben der bestehenden Eingabe:

- Platz/Abschlag wählen (Default Ullersdorf / Schwarz).
- Lochreihe 1..18; pro Loch: Schläge (Pflicht), optional Putts/Fairway/GIR/Strafen.
  Par + SI je Loch werden angezeigt; **zu Par** läuft live mit.
- Nur ausgefüllte Löcher zählen → Teilrunden ab 1 Loch.
- Beim Speichern: `deriveRoundFields` füllt die Summen, Session wird wie gewohnt
  über `addSession` persistiert → erscheint im Journal & in den Stats.

## Auswertung / Ansichten

- Bestehende Stats-/Benchmark-Ansicht bleibt (profitiert automatisch von
  präziseren Daten).
- **Ullersdorf-Trend:** gefilterte Verlaufsansicht nur für `courseId === "ullersdorf"`
  — Score, zu Par, geschätzter Index über Zeit.

## KI-Plananpassung (Kern)

### Gleitendes Fenster

Aggregat & Benchmarks über die **letzten ~10 Platz-Runden** (auf 18 normalisiert),
statt über alle. Neue Hilfsfunktion `recentRoundsWindow(sessions, n = 10)` →
gefilterte Liste für `aggregate`.

### CoachContext erweitern (`lib/coach.ts`)

Neues Kontextfeld, das der Coach bisher nicht hatte:

```ts
roundInsights?: {
  windowSize: number;            // einbezogene Runden
  aggregate: Aggregate;          // gleitendes Fenster, auf 18
  benchmarks: BenchmarkRow[];    // vs. Scratch
  topFocus: { key, label, valueText, targetText } | null;
  handicapEstimate: number | null;
  handicapTrend: "fällt" | "steigt" | "stabil" | null;
  lastRound?: { courseName, holesPlayed, toPar, putts, ... };
}
```

`buildSystemPrompt` bekommt eine Sektion, die diese Daten erklärt und den Coach
anweist, den **größten Hebel** in Fokus/Wochenplan zu übersetzen.

### Auto-Trigger (vollautomatisch)

Nach erfolgreichem Speichern einer Platz-Runde im Journal:

1. App ruft `/api/coach` im Hintergrund mit einer synthetischen „Post-Runde"-
   Nachricht auf (z.B. *„Runde gespeichert — passe Fokus und Wochenplan an meine
   letzten Runden an."*) + dem erweiterten Kontext.
2. Zurückgegebene `actions` (beschränkt auf `set_focus` / `set_plan`) werden
   **automatisch angewendet** (gleiche Apply-Logik wie im Coach-Chat).
3. Nicht-blockierender Hinweis **„Plan angepasst — rückgängig?"** mit Undo
   (bestehender Undo-Mechanismus).
4. Fehlertoleranz: Kein Key / Offline / Fehler → still überspringen, Runde bleibt
   gespeichert. Keine Endlosschleife (Auto-Call nur bei manuellem Speichern, nicht
   bei Coach-eigenen Plan-Änderungen).

## Tests (vitest, bereits im Projekt)

Reine Funktionen mit Unit-Tests in `lib/__tests__/`:

- `deriveRoundFields` — Voll- & Teilrunden, Par-3-Fairway-Ausschluss, Scrambling.
- Handicap: Net-Double-Bogey-Cap, Score Differential, beste-8-von-20 inkl.
  Reduktionstabelle, 9-Loch-Behandlung, < 9 Löcher = nicht handicap-wirksam.
- `recentRoundsWindow` — korrektes Fenster, Sortierung, < n Runden.
- Ullersdorf-Seed-Integrität: 18 Löcher, SI 1..18 eindeutig, Par-Summe = 73.

## Offene Punkte für Spec-Review

1. **Ullersdorf-Scorecard verifizieren** (Par/SI je Loch, CR/Slope der Abschläge,
   die du tatsächlich spielst — vermutlich nicht Schwarz).
2. Geschätzter Index als reine **Schätzung** ok (keine offizielle Vorgabe)?
3. Auto-Anpassung wirklich **ohne** Rückfrage (nur Undo-Hinweis) — bestätigt.
