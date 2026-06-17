# Trackman-CSV-Analyse im Coach — Design

- **Datum:** 2026-06-17
- **Status:** Genehmigt (Brainstorming abgeschlossen)
- **Betrifft:** `lib/trackman.ts` (neu), `lib/coach.ts`, `app/api/coach/route.ts`, `app/coach/page.tsx`, neuer Store `trackmanSessions`, Tests

## Ziel

Leon kann im Coach-Chat eine **Trackman-CSV** (Session-Export aus dem Performance Studio / myTrackman) hochladen. Die KI analysiert die Session, schlägt **aktualisierte Carry-Distanzen pro Schläger** vor (zum Bestätigen, nicht automatisch), gibt eine **kurze Schwung-Analyse** (Path / Face / Attack Angle / Smash / Spin) und ordnet das in den **Verlauf** früherer Uploads ein.

## Entscheidungen (vom Nutzer bestätigt)

| Frage | Entscheidung |
|---|---|
| Datenformat | **CSV / Excel-Export** (kein Foto/Vision nötig) |
| Umfang | **Distanzen + Schwung-Analyse + Verlauf** (volle Tiefe) |
| Ort | **Im Coach-Chat** (kein neuer Nav-Punkt, Navigation bleibt bei 5) |
| Übernahme | **Vorschau zum Bestätigen** (alt → neu pro Schläger, Häkchen, dann übernehmen) |
| Architektur | **Coach erweitern** (Ansatz A), keine zweite API-Pipeline |

## Leitprinzip

**Rechnen macht der Code, urteilen macht die KI.** Durchschnitte, Ausreißer-Trimmen und Einheiten-Umrechnung passieren deterministisch im Browser (`lib/trackman.ts`). Die KI bekommt nur die fertige Zusammenfassung und entscheidet: welche Distanz wirklich anpassen, was die Schwungdaten bedeuten, Schläger-Namen mappen. LLMs mitteln 80 Zahlen unzuverlässig — deshalb diese Trennung.

## Architektur-Überblick

```
CSV-Datei
  │  (Datei-Anhang im Chat-Composer)
  ▼
lib/trackman.ts  ── parseTrackmanCsv → summarizeSession
  │  (kompakte Zusammenfassung: pro Schläger Carry-Ø, Schüsse, Schwung-Kennzahlen)
  ├──────────────► Store "trackmanSessions"  (Verlauf, persistiert)
  ▼
app/coach/page.tsx  ── baut CoachContext + trackmanUpload + trackmanHistory
  │  POST /api/coach
  ▼
app/api/coach/route.ts  ── OpenAI (bestehend) → { reply, actions, clubProposals }
  │  sanitizeActions (bestehend) + sanitizeClubProposals (neu)
  ▼
app/coach/page.tsx  ── Bestätigungs-Karte (alt → neu, Häkchen)
  │  "Übernehmen"
  ▼
clubs.update(...)  (bestehender Store) + Undo-Snapshot
```

Wiederverwendet vollständig: Chat-Loop, `applyOne`/Undo, KV-Cloud-Sync (`lib/store.ts`, `lib/cloud.ts`), OpenAI-Route mit JSON-Mode + Modell-Fallback.

## Komponenten

### 1 · `lib/trackman.ts` (neu) — Parsing & Verdichtung

Reine Funktionen, kein React, keine Seiteneffekte → voll unit-testbar (wie `golf.ts`/`gear.ts`).

**Aufgabe:** Rohe Trackman-CSV → robuste, kompakte Session-Zusammenfassung in Metern.

**Öffentliche API:**

```ts
/** Parst eine Trackman-CSV (Roh-Text) in Schüsse, gruppiert nach Schläger. */
export function parseTrackmanCsv(text: string): ParsedCsv;

/** Verdichtet geparste Schüsse zu einer Session-Zusammenfassung (getrimmt, in Metern). */
export function summarizeSession(parsed: ParsedCsv, opts?: SummarizeOpts): TrackmanSummary;

/** Normalisiert Schlägernamen auf einen kanonischen Schlüssel, damit Trackman-Namen
 *  ("7 Iron", "Pitching Wedge") und Bag-Namen ("7 Eisen", "PW") über Sessions hinweg
 *  zusammenfinden. Beispiele: "7 Iron"/"7 Eisen" → "7i"; "Pitching Wedge"/"PW" → "pw";
 *  "3 Wood" → "3w"; "56°"/"Sand Wedge" → "56". Unbekannt → kleingeschriebener Originaltext. */
export function normalizeClubName(name: string): string;
```

**Parsing-Details (Robustheit):**
- **Trennzeichen** automatisch erkennen: `,` vs. `;` (deutsches Excel nutzt oft `;`) — über die Häufigkeit in der Kopfzeile.
- **Dezimaltrennzeichen** erkennen (`.` vs `,`) und normalisieren.
- **Kopfzeile finden:** Metadaten-Zeilen am Anfang überspringen; erste Zeile nehmen, die sowohl eine Schläger- als auch eine Carry-Spalte enthält.
- **Spalten-Mapping** tolerant (case-insensitiv, Varianten): `Club`; `Carry`/`Carry Distance`; `Total`; `Club Speed`/`Clubhead Speed`; `Ball Speed`; `Smash`/`Smash Factor`; `Launch`/`Launch Angle`; `Spin`/`Spin Rate`/`Total Spin`; `Attack Angle`; `Club Path`; `Face Angle`; `Face to Path`/`Face-to-Path`. Fehlende Spalten sind ok (Feld bleibt `undefined`).
- **Einheit:** Yards vs. Meter aus dem Header-Token (`yd`/`yds`/`yard` bzw. `m`/`meter`) erkennen; auf **Meter** umrechnen (App ist metrisch). Annahme im Ergebnis vermerken (`unit`), damit die KI sie nennen kann.

**Verdichtung (`summarizeSession`):**
- Pro Schläger **Median-Carry** bilden, Schüsse außerhalb ~±40 % verwerfen (Topfs/Schäufler raus), dann **getrimmter Mittelwert**.
- Zurück: pro Schläger `carryAvg`, `shots` (genutzt), `dropped` (verworfen), `carryMin`/`carryMax` + Mittel der Schwung-Kennzahlen.
- Schwellwert via `SummarizeOpts` überschreibbar (Default ±40 %) — für Tests.

**Datenmodelle:**

```ts
export interface TrackmanShot {
  club: string;            // roher Trackman-Name, z.B. "7 Iron"
  carry?: number; total?: number;
  clubSpeed?: number; ballSpeed?: number; smash?: number;
  launch?: number; spin?: number;
  attackAngle?: number; clubPath?: number; faceAngle?: number; faceToPath?: number;
}

export interface ParsedCsv {
  shots: TrackmanShot[];
  unit: "m" | "yd";        // erkannte Quell-Einheit (vor Umrechnung)
  warnings: string[];      // z.B. "Einheit nicht erkannt — Meter angenommen"
}

export interface TrackmanClubStat {
  club: string;            // roher Trackman-Name
  shots: number; dropped: number;
  carryAvg: number;        // Meter, getrimmt
  carryMin: number; carryMax: number;
  clubSpeed?: number; ballSpeed?: number; smash?: number;
  launch?: number; spin?: number;
  attackAngle?: number; clubPath?: number; faceAngle?: number; faceToPath?: number;
}

export interface TrackmanSummary {
  unit: "m";               // immer Meter nach Umrechnung
  sourceUnit: "m" | "yd";
  warnings: string[];
  clubs: TrackmanClubStat[];
  totalShots: number;
}
```

### 2 · Verlauf — Store `trackmanSessions`

- Neuer Typ `TrackmanSession` in `lib/types.ts`:

```ts
export interface TrackmanSession {
  id: string;
  date: string;            // ISO YYYY-MM-DD
  label?: string;          // optionaler Name, sonst Datum
  summary: TrackmanSummary;// nur die Zusammenfassung, NICHT die rohen Schüsse
  createdAt: string;       // ISO timestamp
}
```

- Persistenz über bestehendes `useCollection<TrackmanSession>("trackmanSessions", [])` → localStorage + KV-Cloud. Klein, weil nur Zusammenfassungen gespeichert werden (typ. ~10 Schläger pro Session).

### 3 · `lib/coach.ts` — KI-Anbindung erweitern

**`CoachContext` erweitern (beide optional, nur bei Upload gesetzt):**

```ts
trackmanUpload?: TrackmanSummary;          // die gerade hochgeladene Session
trackmanHistory?: {                         // kompakte Vorsessions für Trends
  date: string;
  carryByClub: Record<string, number>;      // kanonischer Schlüssel (normalizeClubName) → Carry-Ø (m)
  clubSpeedAvg?: number;
}[];
```

> Kanonische Schlüssel (statt roher Trackman- oder Bag-Namen) sorgen dafür, dass derselbe Schläger über Sessions hinweg zusammenfindet — unabhängig davon, ob der Export "7 Iron" oder "7i" schreibt.

**`CoachResponse` erweitern:**

```ts
clubProposals?: ClubProposal[];

export interface ClubProposal {
  name: string;            // ziel-Bag-Schlägername, z.B. "7 Eisen"
  oldDistance?: string;    // von der KI gespiegelt; die Karte zeigt aber den LIVE-Wert aus dem clubs-Store
  newDistance: string;     // Vorschlag, z.B. "148 m"
  carryAvg?: number;       // Meter (aus der Zusammenfassung)
  shots?: number;
  reason?: string;         // kurze Begründung
}
```

> Die „alt"-Distanz in der Bestätigungs-Karte wird **clientseitig** aus dem aktuellen `clubs`-Store gelesen (Match über `name`), nicht aus `oldDistance` der KI — so stimmt sie auch, wenn Leon zwischendurch im Bag editiert hat. `oldDistance` ist nur informativ.

**System-Prompt (Ergänzung, nur wenn `trackmanUpload` vorhanden):**
- Erkläre den Trackman-Block; weise an, die **gelieferten Durchschnitte zu nutzen** (nicht neu rechnen).
- Trackman-Schlägernamen → Bag-Namen mappen (aus `context.clubs`): "7 Iron"→"7 Eisen", "Pitching Wedge"→"PW", "3 Wood"→"5 Wood" nur bei klarer Entsprechung, sonst auslassen.
- `clubProposals` füllen: nur Schläger mit genug Schüssen (z.B. ≥ 3) und spürbarer Abweichung von der Bag-Distanz vorschlagen; `oldDistance` aus `context.clubs` übernehmen.
- Schwung-Analyse in `reply`: Path/Face/Attack/Smash/Spin deuten, Trend aus `trackmanHistory` benennen. Bei klarem Muster (z.B. Path stark positiv → „over the top") **darf** zusätzlich `set_focus`/`add_next_step` in `actions` vorgeschlagen werden.
- Einheit erwähnen, falls `warnings` nicht leer (z.B. Yards angenommen).

**Sanitizing:** `sanitizeClubProposals(raw): ClubProposal[]` analog zu `sanitizeActions` — nur Einträge mit `name` + `newDistance` (beide nicht-leere Strings), Zahlenfelder validiert, Rest verworfen.

### 4 · `app/api/coach/route.ts`

- `clubProposals` aus der OpenAI-Antwort lesen, durch `sanitizeClubProposals` schicken, in der Response mitschicken.
- Sonst unverändert (gleiche Modell-Kandidaten, JSON-Mode, Fallback).

### 5 · `app/coach/page.tsx` — Upload-UI & Bestätigungs-Karte

**Composer:** Büroklammer-Button neben dem Eingabefeld, `<input type="file" accept=".csv,text/csv">` (versteckt). Bei Auswahl:
1. Datei als Text lesen → `parseTrackmanCsv` + `summarizeSession`.
2. Bei Parse-Fehler/0 Schläger: freundliche Chat-Meldung („Konnte die CSV nicht lesen — ist das ein Trackman-Session-Export?"), **kein** API-Call.
3. Erfolg: Session in `trackmanSessions` speichern, dann `send()` mit
   - Nachricht: getippter Text falls vorhanden, sonst Default („📊 Trackman-Session hochgeladen — analysier sie und pass meine Distanzen an.").
   - Kontext inkl. `trackmanUpload` (frische Zusammenfassung) + `trackmanHistory` (aus `trackmanSessions`, Carry pro Schläger über `normalizeClubName` auf kanonische Schlüssel gelegt, letzte ~6 Sessions).

**Bestätigungs-Karte** (gerendert, wenn `clubProposals` in der Antwort):
- Pro Vorschlag eine Zeile: `7 Eisen 150 m → 148 m`, Häkchen (vorausgewählt), darunter `grund` + Mini-Trend aus History (`146 → 148 → 148`).
- Button **Übernehmen**: schreibt nur abgehakte Distanzen via `clubs.update` (Match über Name, wie `set_club`); Undo-Snapshot wie bei `applyNow`; danach „✓ Übernommen" + **Rückgängig**.
- Begleitende `actions` (Fokus/Nächste Schritte) erscheinen in derselben Karte als mitbestätigbare Punkte (kein Auto-Apply in diesem Flow).

### 6 · Verlauf-Realisierung (bewusste Einschränkung)

Charts passen schlecht in einen Chat — und die App bleibt bewusst clean/bildlos. Verlauf wird daher umgesetzt als:
- (a) **Gespeicherte** Sessions, die als `trackmanHistory` in den KI-Kontext fließen → die KI benennt Fortschritt in Worten („Club Speed 101 → 103 mph", „7-Eisen-Carry 146 → 148 → 148").
- (b) **Kompakte Zahlen-Trendzeile** in der Bestätigungs-Karte pro geändertem Schläger.

Eine echte Trend-Grafik (z.B. auf der Bag-Seite) ist bewusst **out of scope** für jetzt — später leicht ergänzbar, da die Daten bereits persistiert sind.

## Fehlerbehandlung

- **Unlesbare/leere CSV:** Chat-Hinweis, kein API-Call (siehe 5.2).
- **Einheit unklar:** Meter annehmen, Warnung in `summary.warnings`, KI nennt die Annahme.
- **Unbekannte Schläger-Namen:** KI lässt sie aus den Vorschlägen weg (kein Raten); in der Analyse erwähnbar.
- **Match beim Übernehmen schlägt fehl** (Name passt zu keinem Bag-Schläger): Zeile wird übersprungen, Rest wird übernommen.
- **Cloud aus / offline:** wie heute — localStorage-Fallback (bestehende `store.ts`-Logik).

## Tests — `lib/__tests__/trackman.test.ts`

- Trennzeichen `,` und `;`; Dezimal-Komma.
- Yards → Meter Umrechnung; Einheit nicht erkannt → Warnung + Meter.
- Ausreißer-Trimmen (ein Topf-Schuss verfälscht den Schnitt nicht).
- Gruppierung mehrerer Schläger; Schuss-/Dropped-Zählung.
- Fehlende optionale Spalten (nur Club + Carry vorhanden).
- Metadaten-Zeilen vor der Kopfzeile werden übersprungen.
- `normalizeClubName`: "7 Iron"/"7 Eisen" → gleicher Schlüssel; "Pitching Wedge"/"PW" → gleicher Schlüssel.
- (Optional) `sanitizeClubProposals`: verwirft Einträge ohne `name`/`newDistance`.

## Out of Scope (YAGNI)

- Foto-/PDF-Upload (Vision) — bewusst nicht, CSV gewählt.
- Visuelle Trend-Grafiken / eigene Trackman-Seite.
- Roh-Schuss-Speicherung (nur Zusammenfassungen).
- Bearbeiten/Löschen einzelner History-Sessions (später, falls nötig).

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| `lib/trackman.ts` | **neu** — Parsing + Verdichtung |
| `lib/types.ts` | `TrackmanSession` + (Re-Export der Trackman-Typen) |
| `lib/coach.ts` | `CoachContext`/`CoachResponse`/Prompt erweitern, `sanitizeClubProposals` |
| `app/api/coach/route.ts` | `clubProposals` durchreichen + sanitizen |
| `app/coach/page.tsx` | Datei-Upload, Bestätigungs-Karte, History-Speicherung |
| `lib/__tests__/trackman.test.ts` | **neu** — Parser-Tests |
