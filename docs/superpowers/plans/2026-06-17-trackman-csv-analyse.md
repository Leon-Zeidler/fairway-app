# Trackman-CSV-Analyse im Coach — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Leon kann im Coach-Chat eine Trackman-CSV hochladen; die KI analysiert sie und schlägt aktualisierte Carry-Distanzen (zum Bestätigen) + eine Schwung-Analyse mit Verlauf vor.

**Architecture:** CSV wird im Browser deterministisch geparst und pro Schläger getrimmt gemittelt (`lib/trackman.ts`); die kompakte Zusammenfassung geht als Kontext an die bestehende `/api/coach`-Route; die KI liefert `clubProposals` (alt → neu) + Analyse; eine Bestätigungs-Karte im Chat übernimmt nur die abgehakten Distanzen (mit Undo). Jede Session wird als Zusammenfassung für den Verlauf persistiert.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, Vitest (node env), bestehender Store (localStorage + Supabase-KV), OpenAI-Route (JSON-Mode).

**Hinweis zur Spec-Abweichung:** Der Typ `TrackmanSession` lebt in `lib/trackman.ts` (bei den übrigen Trackman-Typen), nicht in `lib/types.ts` — kohäsiver und vermeidet einen Cross-Import. Sonst folgt der Plan der Spec `docs/superpowers/specs/2026-06-17-trackman-csv-analyse-design.md`.

## Dateien

| Datei | Verantwortung |
|---|---|
| `lib/trackman.ts` (neu) | CSV parsen, Schlägername normalisieren, pro Schläger verdichten; alle Trackman-Typen |
| `lib/__tests__/trackman.test.ts` (neu) | Unit-Tests für Parser/Verdichtung |
| `lib/coach.ts` | `ClubProposal`, `TrackmanHistoryEntry`, Context/Response erweitern, `sanitizeClubProposals`, Prompt |
| `app/api/coach/route.ts` | `clubProposals` durchreichen + sanitizen |
| `app/components/Icon.tsx` | Icon `"upload"` ergänzen |
| `app/coach/page.tsx` | Datei-Upload, Trackman-Kontext, Bestätigungs-Karte, Übernahme/Undo, Verlauf-Speicherung |
| `app/globals.css` | Styles für Upload-Button & Karte |

---

### Task 1: `normalizeClubName` — Schlägernamen vereinheitlichen

**Files:**
- Create: `lib/trackman.ts`
- Test: `lib/__tests__/trackman.test.ts`

- [ ] **Step 1: Failing test schreiben**

`lib/__tests__/trackman.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { normalizeClubName } from "../trackman";

describe("normalizeClubName", () => {
  it("legt Trackman- und Bag-Namen auf denselben Schlüssel", () => {
    expect(normalizeClubName("7 Iron")).toBe(normalizeClubName("7 Eisen"));
    expect(normalizeClubName("Pitching Wedge")).toBe(normalizeClubName("PW"));
  });
  it("erkennt Driver, Hölzer, Eisen und Grad-Wedges", () => {
    expect(normalizeClubName("Driver")).toBe("driver");
    expect(normalizeClubName("5 Wood")).toBe("5w");
    expect(normalizeClubName("7 Iron")).toBe("7i");
    expect(normalizeClubName("56°")).toBe("56");
    expect(normalizeClubName("58 deg")).toBe("58");
  });
});
```

- [ ] **Step 2: Test ausführen — muss fehlschlagen**

Run: `npx vitest run lib/__tests__/trackman.test.ts`
Expected: FAIL — `Failed to resolve import "../trackman"` / `normalizeClubName is not a function`.

- [ ] **Step 3: `lib/trackman.ts` mit Implementierung anlegen**

```ts
// Trackman-CSV einlesen & pro Schläger verdichten.
// Reine Funktionen (kein React, keine Seiteneffekte) → voll unit-testbar.

const YARD_TO_M = 0.9144;

/** Bringt Trackman- und Bag-Namen auf einen kanonischen Schlüssel zusammen,
 *  damit derselbe Schläger über Sessions/Quellen hinweg zusammenfindet. */
export function normalizeClubName(name: string): string {
  const s = name.toLowerCase().replace(/\s+/g, " ").trim();
  if (/\bdriver\b|\bdr\b/.test(s)) return "driver";

  // Grad-Wedges (48–64°), wenn nicht klar Eisen/Holz/Hybrid
  const deg = s.match(/\b(4[89]|5[0-9]|6[0-4])\b/);
  if (deg && !/(iron|eisen|wood|holz|hybrid)/.test(s)) return deg[1];

  if (/pitching|(^|\s)pw(\s|$)/.test(s)) return "pw";
  if (/gap ?wedge|(^|\s)gw(\s|$)|(^|\s)aw(\s|$)/.test(s)) return "gw";
  if (/sand ?wedge|(^|\s)sw(\s|$)/.test(s)) return "sw";
  if (/lob ?wedge|(^|\s)lw(\s|$)/.test(s)) return "lw";

  const wood = s.match(/(\d+) ?(?:wood|w|holz)\b/);
  if (wood) return `${wood[1]}w`;
  const hybrid = s.match(/(\d+) ?(?:hybrid|hy)\b/);
  if (hybrid) return `${hybrid[1]}h`;
  const iron = s.match(/(\d+) ?(?:iron|eisen|i)\b/);
  if (iron) return `${iron[1]}i`;

  return s;
}
```

- [ ] **Step 4: Test ausführen — muss bestehen**

Run: `npx vitest run lib/__tests__/trackman.test.ts`
Expected: PASS (2 Tests).

- [ ] **Step 5: Commit**

```bash
git add lib/trackman.ts lib/__tests__/trackman.test.ts
git commit -m "$(cat <<'EOF'
feat(trackman): normalizeClubName für Schläger-Matching

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `parseTrackmanCsv` — CSV robust einlesen

**Files:**
- Modify: `lib/trackman.ts`
- Test: `lib/__tests__/trackman.test.ts`

- [ ] **Step 1: Failing tests schreiben** (an `trackman.test.ts` anhängen)

```ts
import { parseTrackmanCsv } from "../trackman";

describe("parseTrackmanCsv", () => {
  it("liest komma-getrennte Yards-CSV mit Metadaten-Vorzeilen", () => {
    const csv = [
      "Trackman Range Report",
      "Player: Leon",
      "Club,Club Speed,Ball Speed,Smash,Carry (yds),Total,Spin Rate,Club Path",
      "7 Iron,85,120,1.41,160,170,6500,-2.1",
      "7 Iron,86,121,1.40,162,172,6400,-1.8",
      "Driver,103,150,1.46,250,275,2600,1.2",
    ].join("\n");
    const p = parseTrackmanCsv(csv);
    expect(p.unit).toBe("yd");
    expect(p.shots).toHaveLength(3);
    expect(p.shots[0]).toMatchObject({ club: "7 Iron", carry: 160, clubSpeed: 85, spin: 6500, clubPath: -2.1 });
  });

  it("liest semikolon-getrennte CSV mit Dezimal-Komma (Meter)", () => {
    const csv = [
      "Club;Carry [m];Smash",
      "7 Eisen;146,5;1,41",
      "7 Eisen;147,5;1,40",
    ].join("\n");
    const p = parseTrackmanCsv(csv);
    expect(p.unit).toBe("m");
    expect(p.shots).toHaveLength(2);
    expect(p.shots[0].carry).toBeCloseTo(146.5);
    expect(p.shots[0].smash).toBeCloseTo(1.41);
  });

  it("überspringt Average-Zeilen und Zeilen ohne Carry", () => {
    const csv = [
      "Club,Carry (m)",
      "7 Iron,148",
      "Average,150",
      "7 Iron,",
    ].join("\n");
    const p = parseTrackmanCsv(csv);
    expect(p.shots).toHaveLength(1);
  });

  it("warnt, wenn keine Einheit erkennbar ist", () => {
    const p = parseTrackmanCsv("Club,Carry\n7 Iron,148");
    expect(p.warnings.join(" ")).toMatch(/Einheit/i);
  });

  it("gibt leeres Ergebnis bei fehlender Kopfzeile", () => {
    const p = parseTrackmanCsv("nur,irgendein,text\n1,2,3");
    expect(p.shots).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Test ausführen — muss fehlschlagen**

Run: `npx vitest run lib/__tests__/trackman.test.ts`
Expected: FAIL — `parseTrackmanCsv is not a function`.

- [ ] **Step 3: Implementierung + Typen ergänzen** (in `lib/trackman.ts`, nach `normalizeClubName`)

```ts
/* ── Typen ──────────────────────────────────────────────────────── */

export interface TrackmanShot {
  club: string; // roher Trackman-Name, z.B. "7 Iron"
  carry?: number; total?: number;
  clubSpeed?: number; ballSpeed?: number; smash?: number;
  launch?: number; spin?: number;
  attackAngle?: number; clubPath?: number; faceAngle?: number; faceToPath?: number;
}

export interface ParsedCsv {
  shots: TrackmanShot[];
  unit: "m" | "yd"; // erkannte Quell-Einheit (vor Umrechnung)
  warnings: string[];
}

/* ── CSV-Parsing ────────────────────────────────────────────────── */

/** Zerlegt eine CSV-Zeile in Felder; respektiert "..."-Quoting. */
function splitLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else q = false;
      } else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === delim) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

/** Wählt das Trennzeichen, das die meisten Spalten ergibt. */
function pickDelimiter(line: string): string {
  let best = ",";
  let bestN = 0;
  for (const d of [";", "\t", ","]) {
    const n = splitLine(line, d).length;
    if (n > bestN) { bestN = n; best = d; }
  }
  return best;
}

/** Zell-Text → Zahl. decimalComma: "," ist Dezimaltrenner, "." Tausender. */
function toNum(cell: string, decimalComma: boolean): number | undefined {
  let s = cell.replace(/[^\d.,\-]/g, "").trim();
  if (!s) return undefined;
  if (decimalComma) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : undefined;
}

function findCol(headers: string[], used: Set<number>, test: (h: string) => boolean): number {
  for (let i = 0; i < headers.length; i++) {
    if (!used.has(i) && test(headers[i])) { used.add(i); return i; }
  }
  return -1;
}

export function parseTrackmanCsv(text: string): ParsedCsv {
  const warnings: string[] = [];
  const lines = text.split(/\r\n|\r|\n/).filter((l) => l.trim() !== "");
  if (!lines.length) return { shots: [], unit: "m", warnings: ["Leere Datei"] };

  // Kopfzeile = erste Zeile mit "club" und "carry"
  let headerIdx = -1;
  let delim = ",";
  for (let i = 0; i < lines.length; i++) {
    const d = pickDelimiter(lines[i]);
    const cells = splitLine(lines[i], d).map((c) => c.toLowerCase());
    if (cells.some((c) => /club/.test(c)) && cells.some((c) => /carry/.test(c))) {
      headerIdx = i; delim = d; break;
    }
  }
  if (headerIdx < 0) return { shots: [], unit: "m", warnings: ["Keine Trackman-Kopfzeile (Club/Carry) gefunden"] };

  const headers = splitLine(lines[headerIdx], delim).map((h) => h.toLowerCase());
  const decimalComma = delim !== ","; // bei ; oder \t üblich; bei , niemals

  // Einheit aus den Headern
  const blob = headers.join(" ");
  let unit: "m" | "yd" = "m";
  if (/\byd\b|yds|yard/.test(blob)) unit = "yd";
  else if (/\[m\]|\(m\)|meter/.test(blob)) unit = "m";
  else warnings.push("Einheit nicht erkannt — Meter angenommen");

  const used = new Set<number>();
  const col = {
    clubSpeed: findCol(headers, used, (h) => /club/.test(h) && /speed/.test(h)),
    ballSpeed: findCol(headers, used, (h) => /ball/.test(h) && /speed/.test(h)),
    club: findCol(headers, used, (h) => /^club( (name|type))?$/.test(h.trim()) || (/club/.test(h) && !/speed|path|face/.test(h))),
    smash: findCol(headers, used, (h) => /smash/.test(h)),
    carry: findCol(headers, used, (h) => /carry/.test(h) && !/side|dir|dev/.test(h)),
    total: findCol(headers, used, (h) => /total/.test(h) && !/spin|side|dir|dev/.test(h)),
    spin: findCol(headers, used, (h) => /spin/.test(h)),
    launch: findCol(headers, used, (h) => /launch/.test(h) && !/dir/.test(h)),
    attackAngle: findCol(headers, used, (h) => /attack/.test(h)),
    faceToPath: findCol(headers, used, (h) => /face/.test(h) && /path/.test(h)),
    clubPath: findCol(headers, used, (h) => /path/.test(h)),
    faceAngle: findCol(headers, used, (h) => /face/.test(h)),
  };
  if (col.club < 0 || col.carry < 0) {
    return { shots: [], unit, warnings: [...warnings, "Club- oder Carry-Spalte fehlt"] };
  }

  const get = (cells: string[], idx: number) =>
    idx >= 0 && idx < cells.length ? toNum(cells[idx], decimalComma) : undefined;

  const shots: TrackmanShot[] = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cells = splitLine(lines[i], delim);
    const club = (cells[col.club] ?? "").trim();
    if (!club || /average|avg|mittel|gesamt|summary/i.test(club)) continue;
    const carry = get(cells, col.carry);
    if (carry == null) continue;
    shots.push({
      club, carry,
      total: get(cells, col.total),
      clubSpeed: get(cells, col.clubSpeed),
      ballSpeed: get(cells, col.ballSpeed),
      smash: get(cells, col.smash),
      launch: get(cells, col.launch),
      spin: get(cells, col.spin),
      attackAngle: get(cells, col.attackAngle),
      clubPath: get(cells, col.clubPath),
      faceAngle: get(cells, col.faceAngle),
      faceToPath: get(cells, col.faceToPath),
    });
  }
  return { shots, unit, warnings };
}
```

- [ ] **Step 4: Test ausführen — muss bestehen**

Run: `npx vitest run lib/__tests__/trackman.test.ts`
Expected: PASS (alle Tasks 1+2).

- [ ] **Step 5: Commit**

```bash
git add lib/trackman.ts lib/__tests__/trackman.test.ts
git commit -m "$(cat <<'EOF'
feat(trackman): robustes CSV-Parsing (Trennzeichen, Dezimal, Einheit)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `summarizeSession` — pro Schläger getrimmt mitteln

**Files:**
- Modify: `lib/trackman.ts`
- Test: `lib/__tests__/trackman.test.ts`

- [ ] **Step 1: Failing tests schreiben** (anhängen)

```ts
import { summarizeSession } from "../trackman";

describe("summarizeSession", () => {
  it("mittelt getrimmt und verwirft Ausreißer", () => {
    const s = summarizeSession({
      unit: "m",
      warnings: [],
      shots: [
        { club: "7 Iron", carry: 140 },
        { club: "7 Iron", carry: 142 },
        { club: "7 Iron", carry: 141 },
        { club: "7 Iron", carry: 80 }, // Topf → raus
      ],
    });
    const seven = s.clubs.find((c) => c.club === "7 Iron")!;
    expect(seven.carryAvg).toBe(141);
    expect(seven.shots).toBe(3);
    expect(seven.dropped).toBe(1);
  });

  it("rechnet Yards in Meter um", () => {
    const s = summarizeSession({ unit: "yd", warnings: [], shots: [{ club: "Driver", carry: 100 }] });
    expect(s.clubs[0].carryAvg).toBe(91); // 100 * 0.9144 = 91.44
    expect(s.sourceUnit).toBe("yd");
    expect(s.unit).toBe("m");
  });

  it("gruppiert nach Schläger und sortiert nach Carry absteigend", () => {
    const s = summarizeSession({
      unit: "m", warnings: [],
      shots: [{ club: "7 Iron", carry: 148 }, { club: "Driver", carry: 250 }, { club: "7 Eisen", carry: 150 }],
    });
    expect(s.clubs).toHaveLength(2); // 7 Iron + 7 Eisen = ein Schläger
    expect(s.clubs[0].club).toBe("Driver"); // höchster Carry zuerst
  });

  it("respektiert minShots", () => {
    const s = summarizeSession(
      { unit: "m", warnings: [], shots: [{ club: "Driver", carry: 250 }] },
      { minShots: 2 }
    );
    expect(s.clubs).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Test ausführen — muss fehlschlagen**

Run: `npx vitest run lib/__tests__/trackman.test.ts`
Expected: FAIL — `summarizeSession is not a function`.

- [ ] **Step 3: Implementierung + Typen ergänzen** (in `lib/trackman.ts`, am Ende)

```ts
/* ── Verdichtung ────────────────────────────────────────────────── */

export interface TrackmanClubStat {
  club: string; // repräsentativer Roh-Name
  shots: number; dropped: number;
  carryAvg: number; carryMin: number; carryMax: number; // Meter
  clubSpeed?: number; ballSpeed?: number; smash?: number;
  launch?: number; spin?: number;
  attackAngle?: number; clubPath?: number; faceAngle?: number; faceToPath?: number;
}

export interface TrackmanSummary {
  unit: "m"; sourceUnit: "m" | "yd"; warnings: string[];
  clubs: TrackmanClubStat[]; totalShots: number;
}

export interface SummarizeOpts {
  outlierBand?: number; // Schüsse außerhalb ±band×Median verwerfen (Default 0.4)
  minShots?: number;    // Mindest-Schüsse pro Schläger (Default 1)
}

/** Eine gespeicherte, hochgeladene Trackman-Session (nur Zusammenfassung). */
export interface TrackmanSession {
  id: string;
  date: string;        // ISO YYYY-MM-DD
  label?: string;
  summary: TrackmanSummary;
  createdAt: string;   // ISO timestamp
}

function mean(xs: number[]): number { return xs.reduce((a, b) => a + b, 0) / xs.length; }
function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function avgField(shots: TrackmanShot[], key: keyof TrackmanShot): number | undefined {
  const xs = shots.map((s) => s[key]).filter((v): v is number => typeof v === "number");
  return xs.length ? mean(xs) : undefined;
}
function round(v: number | undefined, digits: number): number | undefined {
  if (v == null) return undefined;
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}

export function summarizeSession(parsed: ParsedCsv, opts: SummarizeOpts = {}): TrackmanSummary {
  const band = opts.outlierBand ?? 0.4;
  const minShots = opts.minShots ?? 1;
  const toM = parsed.unit === "yd" ? YARD_TO_M : 1;

  const groups = new Map<string, TrackmanShot[]>();
  for (const sh of parsed.shots) {
    const key = normalizeClubName(sh.club);
    const arr = groups.get(key) ?? [];
    arr.push(sh);
    groups.set(key, arr);
  }

  const clubs: TrackmanClubStat[] = [];
  let totalShots = 0;

  for (const arr of groups.values()) {
    const withCarry = arr.filter((s) => typeof s.carry === "number");
    if (withCarry.length < minShots) continue;
    const med = median(withCarry.map((s) => (s.carry as number) * toM));
    const lo = med * (1 - band);
    const hi = med * (1 + band);
    const kept = withCarry.filter((s) => {
      const c = (s.carry as number) * toM;
      return c >= lo && c <= hi;
    });
    const keptShots = kept.length ? kept : withCarry;
    const carries = keptShots.map((s) => (s.carry as number) * toM);

    // Repräsentativer Roh-Name = häufigster in der Gruppe
    const nameCount = new Map<string, number>();
    for (const s of arr) nameCount.set(s.club, (nameCount.get(s.club) ?? 0) + 1);
    const club = [...nameCount.entries()].sort((a, b) => b[1] - a[1])[0][0];

    clubs.push({
      club,
      shots: keptShots.length,
      dropped: withCarry.length - keptShots.length,
      carryAvg: Math.round(mean(carries)),
      carryMin: Math.round(Math.min(...carries)),
      carryMax: Math.round(Math.max(...carries)),
      clubSpeed: round(avgField(keptShots, "clubSpeed"), 1),
      ballSpeed: round(avgField(keptShots, "ballSpeed"), 1),
      smash: round(avgField(keptShots, "smash"), 2),
      launch: round(avgField(keptShots, "launch"), 1),
      spin: round(avgField(keptShots, "spin"), 0),
      attackAngle: round(avgField(keptShots, "attackAngle"), 1),
      clubPath: round(avgField(keptShots, "clubPath"), 1),
      faceAngle: round(avgField(keptShots, "faceAngle"), 1),
      faceToPath: round(avgField(keptShots, "faceToPath"), 1),
    });
    totalShots += keptShots.length;
  }

  clubs.sort((a, b) => b.carryAvg - a.carryAvg);
  return { unit: "m", sourceUnit: parsed.unit, warnings: parsed.warnings, clubs, totalShots };
}
```

- [ ] **Step 4: Test ausführen — muss bestehen**

Run: `npx vitest run lib/__tests__/trackman.test.ts`
Expected: PASS (alle Trackman-Tests).

- [ ] **Step 5: Commit**

```bash
git add lib/trackman.ts lib/__tests__/trackman.test.ts
git commit -m "$(cat <<'EOF'
feat(trackman): summarizeSession — getrimmte Carry-Schnitte + Typen

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Coach-Typen & `sanitizeClubProposals`

**Files:**
- Modify: `lib/coach.ts`
- Test: `lib/__tests__/coach.test.ts`

- [ ] **Step 1: Failing test schreiben** (an `lib/__tests__/coach.test.ts` anhängen; den bestehenden Import-Block oben um `sanitizeClubProposals` erweitern)

Oben in der Datei den Import ändern zu:
```ts
import { sanitizeActions, sanitizeClubProposals } from "../coach";
```

Am Ende anhängen:
```ts
describe("sanitizeClubProposals", () => {
  it("behält gültige Vorschläge und füllt optionale Felder", () => {
    const out = sanitizeClubProposals([
      { name: "7 Eisen", newDistance: "148 m", carryAvg: 148, shots: 12, reason: "stabil" },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ name: "7 Eisen", newDistance: "148 m", carryAvg: 148, shots: 12 });
  });
  it("verwirft Einträge ohne name oder newDistance", () => {
    expect(sanitizeClubProposals([{ name: "7 Eisen" }])).toHaveLength(0);
    expect(sanitizeClubProposals([{ newDistance: "148 m" }])).toHaveLength(0);
    expect(sanitizeClubProposals("kaputt")).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Test ausführen — muss fehlschlagen**

Run: `npx vitest run lib/__tests__/coach.test.ts`
Expected: FAIL — `sanitizeClubProposals is not a function` / Import-Fehler.

- [ ] **Step 3: Import in `lib/coach.ts` erweitern**

Ändere die erste Import-Zeile:
```ts
import { GearId, Profile, Step } from "./types";
```
zu:
```ts
import { GearId, Profile, Step } from "./types";
import { TrackmanSummary } from "./trackman";
```

- [ ] **Step 4: `ClubProposal` + `TrackmanHistoryEntry` ergänzen** (in `lib/coach.ts`, direkt vor `export interface CoachResponse`)

```ts
/** Ein Distanz-Vorschlag aus einer Trackman-Analyse (zur Bestätigung, nicht auto-übernommen). */
export interface ClubProposal {
  name: string;          // Ziel-Bag-Schlägername, z.B. "7 Eisen"
  newDistance: string;   // Vorschlag als Freitext, z.B. "148 m"
  oldDistance?: string;  // von der KI gespiegelt; die Karte nutzt den Live-Wert aus dem clubs-Store
  carryAvg?: number;     // Meter
  shots?: number;
  reason?: string;
}

/** Kompakte Vorsession für Trends (an die KI gegeben). */
export interface TrackmanHistoryEntry {
  date: string;
  carryByClub: Record<string, number>; // kanonischer Schlüssel (normalizeClubName) → Carry-Ø (m)
  clubSpeedAvg?: number;
}
```

- [ ] **Step 5: `CoachResponse` erweitern**

```ts
export interface CoachResponse {
  reply: string;
  actions: CoachAction[];
  clubProposals?: ClubProposal[];
  notConfigured?: boolean;
  error?: string;
}
```

- [ ] **Step 6: `CoachContext` erweitern** (zwei Felder am Ende des Interface, vor der schließenden `}` von `CoachContext`, nach `today: string;`)

```ts
  trackmanUpload?: TrackmanSummary;
  trackmanHistory?: TrackmanHistoryEntry[];
```

- [ ] **Step 7: `sanitizeClubProposals` implementieren** (in `lib/coach.ts`, direkt nach `export function sanitizeActions(...) { ... }`)

```ts
/** Filtert ungültige Distanz-Vorschläge heraus. */
export function sanitizeClubProposals(raw: unknown): ClubProposal[] {
  if (!Array.isArray(raw)) return [];
  const out: ClubProposal[] = [];
  for (const p of raw) {
    if (!p || typeof p !== "object") continue;
    const o = p as Record<string, unknown>;
    const name = str(o.name);
    const newDistance = str(o.newDistance);
    if (!name || !newDistance) continue;
    out.push({
      name,
      newDistance,
      oldDistance: str(o.oldDistance),
      carryAvg: num(o.carryAvg),
      shots: num(o.shots),
      reason: str(o.reason),
    });
  }
  return out;
}
```

- [ ] **Step 8: Tests ausführen — müssen bestehen**

Run: `npx vitest run lib/__tests__/coach.test.ts`
Expected: PASS (bestehende + neue).

- [ ] **Step 9: Commit**

```bash
git add lib/coach.ts lib/__tests__/coach.test.ts
git commit -m "$(cat <<'EOF'
feat(coach): ClubProposal/Trackman-Kontext + sanitizeClubProposals

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Coach-System-Prompt um Trackman erweitern

**Files:**
- Modify: `lib/coach.ts` (Funktion `buildSystemPrompt`)

- [ ] **Step 1: Trackman-Block bauen** (in `buildSystemPrompt`, am Anfang des Funktionskörpers, vor `return`)

```ts
  const trackmanBlock = ctx.trackmanUpload
    ? `

TRACKMAN-UPLOAD: Leon hat gerade eine Trackman-Session hochgeladen (context.trackmanUpload — carryAvg pro Schläger bereits in METERN, plus clubSpeed/ballSpeed/smash/launch/spin/attackAngle/clubPath/faceAngle/faceToPath; context.trackmanHistory = frühere Sessions).
Deine Aufgaben:
1. Aktualisierte Carry-Distanzen vorschlagen → Array "clubProposals". Für jeden Schläger mit shots >= 3 und spürbarem Unterschied zur aktuellen Bag-Distanz EIN Eintrag. Mappe den Trackman-Namen auf den passenden Bag-Schläger aus context.clubs ("7 Iron"→"7 Eisen", "Pitching Wedge"→"PW", "Sand Wedge"→passender Wedge). Nutze die GELIEFERTEN carryAvg-Werte (NICHT selbst rechnen). Kein passender Bag-Schläger → weglassen.
   Format: [{"name":"7 Eisen","newDistance":"148 m","carryAvg":148,"shots":12,"reason":"kurz, warum"}]
2. Im "reply" die Schwungdaten kurz deuten (clubPath/faceAngle/attackAngle/smash/spin) und Trends aus trackmanHistory benennen (z.B. Club-Speed-Entwicklung). Bei klarem Muster (z.B. clubPath stark positiv → "over the top") darfst du zusätzlich set_focus/add_next_step in "actions" vorschlagen.
3. Falls context.trackmanUpload.warnings nicht leer ist (z.B. Einheit angenommen), im reply erwähnen.`
    : "";
```

- [ ] **Step 2: Block in den Prompt einsetzen**

Ändere im Template-String (in `buildSystemPrompt`) die Zeile mit dem Aktionskatalog von:
```ts
${ACTION_CATALOG}
```
zu:
```ts
${ACTION_CATALOG}
${trackmanBlock}
```

- [ ] **Step 3: JSON-Ausgabeformat um clubProposals erweitern**

Ändere die letzte Zeile des Template-Strings von:
```ts
Antworte AUSSCHLIESSLICH als JSON: {"reply": "<deine Antwort auf Deutsch>", "actions": [<0..n Aktionen>]}. Kein Text außerhalb des JSON.`;
```
zu:
```ts
Antworte AUSSCHLIESSLICH als JSON: {"reply": "<deine Antwort auf Deutsch>", "actions": [<0..n Aktionen>], "clubProposals": [<0..n Distanz-Vorschläge, NUR bei Trackman-Upload, sonst []>]}. Kein Text außerhalb des JSON.`;
```

- [ ] **Step 4: Bestehende Tests + Typecheck grün halten**

Run: `npx vitest run lib/__tests__/coach.test.ts && npx tsc --noEmit`
Expected: PASS, keine Typfehler.

- [ ] **Step 5: Commit**

```bash
git add lib/coach.ts
git commit -m "$(cat <<'EOF'
feat(coach): System-Prompt erklärt Trackman-Analyse + clubProposals

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: API-Route — `clubProposals` durchreichen

**Files:**
- Modify: `app/api/coach/route.ts`

- [ ] **Step 1: Import erweitern**

Ändere:
```ts
import {
  buildSystemPrompt,
  sanitizeActions,
  ChatMessage,
  CoachContext,
  CoachResponse,
} from "@/lib/coach";
```
zu:
```ts
import {
  buildSystemPrompt,
  sanitizeActions,
  sanitizeClubProposals,
  ChatMessage,
  CoachContext,
  CoachResponse,
} from "@/lib/coach";
```

- [ ] **Step 2: clubProposals aus der Antwort lesen und zurückgeben**

Ersetze diesen Block:
```ts
      const data = await res.json();
      const content: string = data?.choices?.[0]?.message?.content ?? "{}";
      let reply = "…";
      let actions = sanitizeActions([]);
      try {
        const obj = JSON.parse(content);
        if (typeof obj.reply === "string") reply = obj.reply;
        actions = sanitizeActions(obj.actions);
      } catch {
        reply = content || "…";
      }
      return NextResponse.json<CoachResponse>({ reply, actions });
```
durch:
```ts
      const data = await res.json();
      const content: string = data?.choices?.[0]?.message?.content ?? "{}";
      let reply = "…";
      let actions = sanitizeActions([]);
      let clubProposals = sanitizeClubProposals([]);
      try {
        const obj = JSON.parse(content);
        if (typeof obj.reply === "string") reply = obj.reply;
        actions = sanitizeActions(obj.actions);
        clubProposals = sanitizeClubProposals(obj.clubProposals);
      } catch {
        reply = content || "…";
      }
      return NextResponse.json<CoachResponse>({ reply, actions, clubProposals });
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: keine Fehler.

- [ ] **Step 4: Commit**

```bash
git add app/api/coach/route.ts
git commit -m "$(cat <<'EOF'
feat(api): coach-Route reicht clubProposals durch

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Chat-UI — Upload, Bestätigungs-Karte, Übernahme

**Files:**
- Modify: `app/components/Icon.tsx`
- Modify: `app/coach/page.tsx`

- [ ] **Step 1: Icon `"upload"` ergänzen** (in `app/components/Icon.tsx`)

In der `IconName`-Union `| "play"` zu `| "play"\n  | "upload"` erweitern, d.h.:
```ts
  | "coach"
  | "play"
  | "upload";
```
Und im `PATHS`-Objekt nach dem `play`-Eintrag ergänzen:
```ts
  // Upload / Anhang (Pfeil in Ablage)
  upload: (
    <>
      <path d="M12 15V4M8.5 7.5 12 4l3.5 3.5" />
      <path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
    </>
  ),
```

- [ ] **Step 2: Imports in `app/coach/page.tsx` erweitern**

Ändere `import { useEffect, useRef, useState } from "react";` zu:
```ts
import { ChangeEvent, useEffect, useRef, useState } from "react";
```
Ergänze die Coach-Imports um `ClubProposal` und `TrackmanHistoryEntry`:
```ts
import {
  ChatMessage,
  CoachAction,
  CoachContext,
  CoachResponse,
  ClubProposal,
  TrackmanHistoryEntry,
  describeAction,
} from "@/lib/coach";
```
Ergänze neue Imports (nach dem coach-Import):
```ts
import {
  parseTrackmanCsv,
  summarizeSession,
  normalizeClubName,
  TrackmanSummary,
  TrackmanSession,
} from "@/lib/trackman";
```

- [ ] **Step 3: `Msg`-Interface erweitern**

```ts
interface Msg extends ChatMessage {
  actions?: CoachAction[];
  undo?: UndoToken;
  undone?: boolean;
  clubProposals?: ClubProposal[]; // Trackman: zur Bestätigung
  trackman?: boolean;             // markiert eine Trackman-Antwort
  applied?: boolean;              // Karte bereits übernommen
}
```

- [ ] **Step 4: State für Sessions + Datei-Input** (im `Coach`-Component, bei den anderen `useCollection`-Zeilen bzw. Refs)

Nach `const gear = useCollection<GearItem>("gear", GEAR);` ergänzen:
```ts
  const trackman = useCollection<TrackmanSession>("trackmanSessions", []);
```
Nach `const bottomRef = useRef<HTMLDivElement>(null);` ergänzen:
```ts
  const fileRef = useRef<HTMLInputElement>(null);
```

- [ ] **Step 5: `snapshot()` herausziehen und `applyNow` darauf umstellen**

Ersetze die Funktion `applyNow`:
```ts
  function applyNow(actions: CoachAction[]): UndoToken {
    const snapshot = {
      focus: focus.value,
      plan: plan.value,
      profile: profile.value,
      tee: tee.value,
      nextSteps: nextSteps.items,
      clubs: clubs.items,
      equip: equip.items,
      weekLog: weekLog.value,
      overrides: overrides.value,
      gear: gear.items,
    };
    const createdSessions: string[] = [];
    actions.forEach((a) => applyOne(a, createdSessions));
    return { snapshot, createdSessions };
  }
```
durch:
```ts
  function snapshot(): UndoToken["snapshot"] {
    return {
      focus: focus.value,
      plan: plan.value,
      profile: profile.value,
      tee: tee.value,
      nextSteps: nextSteps.items,
      clubs: clubs.items,
      equip: equip.items,
      weekLog: weekLog.value,
      overrides: overrides.value,
      gear: gear.items,
    };
  }

  function applyNow(actions: CoachAction[]): UndoToken {
    const snap = snapshot();
    const createdSessions: string[] = [];
    actions.forEach((a) => applyOne(a, createdSessions));
    return { snapshot: snap, createdSessions };
  }

  /** Übernimmt die abgehakten Distanz-Vorschläge + Aktionen einer Trackman-Karte. */
  function applyProposals(index: number, picks: ClubProposal[], acts: CoachAction[]) {
    const snap = snapshot();
    const created: string[] = [];
    for (const p of picks) {
      const needle = p.name.toLowerCase();
      const club = clubs.items.find(
        (c) =>
          c.name.toLowerCase().includes(needle) ||
          needle.includes(c.name.toLowerCase())
      );
      if (club) clubs.update(club.id, { distance: p.newDistance });
    }
    acts.forEach((a) => applyOne(a, created));
    const token: UndoToken = { snapshot: snap, createdSessions: created };
    setMsgs((m) =>
      m.map((x, i) => (i === index ? { ...x, applied: true, undo: token } : x))
    );
  }
```

- [ ] **Step 6: `send` um optionalen Trackman-Kontext erweitern**

Ersetze die komplette `send`-Funktion durch:
```ts
  async function send(
    text: string,
    tm?: { upload: TrackmanSummary; history: TrackmanHistoryEntry[] }
  ) {
    const clean = text.trim();
    if ((!clean && !tm) || loading) return;
    const userContent =
      clean ||
      "📊 Trackman-Session hochgeladen — analysier sie und pass meine Distanzen an.";
    const next: Msg[] = [...msgs, { role: "user", content: userContent }];
    setMsgs(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          context: {
            ...buildContext(),
            ...(tm ? { trackmanUpload: tm.upload, trackmanHistory: tm.history } : {}),
          },
        }),
      });
      const data: CoachResponse = await res.json();
      const acts = data.actions?.length ? data.actions : undefined;
      const proposals = data.clubProposals?.length ? data.clubProposals : undefined;
      if (tm) {
        // Trackman: nichts auto-übernehmen — alles wandert in die Bestätigungs-Karte
        setMsgs((m) => [
          ...m,
          { role: "assistant", content: data.reply, clubProposals: proposals, actions: acts, trackman: true },
        ]);
      } else {
        const undo = acts ? applyNow(acts) : undefined;
        setMsgs((m) => [
          ...m,
          { role: "assistant", content: data.reply, actions: acts, undo },
        ]);
      }
    } catch {
      setMsgs((m) => [
        ...m,
        { role: "assistant", content: "Verbindung fehlgeschlagen — nochmal?" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  /** Baut die kompakte Verlauf-Historie (kanonische Schlüssel) für den KI-Kontext. */
  function buildTrackmanHistory(): TrackmanHistoryEntry[] {
    return trackman.items.slice(-6).map((s) => {
      const carryByClub: Record<string, number> = {};
      for (const c of s.summary.clubs) carryByClub[normalizeClubName(c.club)] = c.carryAvg;
      const speeds = s.summary.clubs
        .map((c) => c.clubSpeed)
        .filter((v): v is number => typeof v === "number");
      return {
        date: s.date,
        carryByClub,
        clubSpeedAvg: speeds.length
          ? Math.round((speeds.reduce((a, b) => a + b, 0) / speeds.length) * 10) / 10
          : undefined,
      };
    });
  }

  /** Datei-Upload: CSV parsen, Session speichern, Analyse anstoßen. */
  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // gleiche Datei erneut wählbar
    if (!file || loading) return;
    let summary: TrackmanSummary;
    try {
      const text = await file.text();
      summary = summarizeSession(parseTrackmanCsv(text));
    } catch {
      setMsgs((m) => [
        ...m,
        { role: "assistant", content: "Ich konnte die Datei nicht lesen — lade die Trackman-CSV nochmal hoch." },
      ]);
      return;
    }
    if (!summary.clubs.length) {
      setMsgs((m) => [
        ...m,
        { role: "assistant", content: "Aus dieser CSV konnte ich keine Schläger lesen — ist das ein Trackman-Session-Export (mit Club- und Carry-Spalte)?" },
      ]);
      return;
    }
    const history = buildTrackmanHistory(); // VOR dem Speichern → ohne die neue Session
    trackman.add({
      id: uid("tm"),
      date: isoLocal(new Date()),
      summary,
      createdAt: new Date().toISOString(),
    });
    void send(input, { upload: summary, history });
  }
```

- [ ] **Step 7: `TrackmanCard`-Komponente ergänzen** (in `app/coach/page.tsx`, oberhalb der `export default function Coach()`-Zeile)

```tsx
function TrackmanCard({
  msg,
  index,
  currentDistance,
  trendFor,
  onApply,
  onUndo,
}: {
  msg: Msg;
  index: number;
  currentDistance: (name: string) => string;
  trendFor: (name: string) => number[];
  onApply: (index: number, picks: ClubProposal[], acts: CoachAction[]) => void;
  onUndo: (index: number, token: UndoToken) => void;
}) {
  const proposals = msg.clubProposals ?? [];
  const acts = msg.actions ?? [];
  const [pick, setPick] = useState<boolean[]>(() => proposals.map(() => true));
  const [pickAct, setPickAct] = useState<boolean[]>(() => acts.map(() => true));
  if (!proposals.length && !acts.length) return null;

  if (msg.applied) {
    return (
      <div className="tm-card done">
        <div className="ca-title">✓ Übernommen</div>
        {msg.undo && (
          <button className="ca-undo" type="button" onClick={() => onUndo(index, msg.undo!)}>
            <Icon name="reset" size={14} /> Rückgängig
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="tm-card">
      <div className="ca-title">Vorschlag — du bestätigst</div>
      {proposals.map((p, i) => {
        const trend = trendFor(p.name);
        return (
          <label className="tm-row" key={i}>
            <input
              type="checkbox"
              checked={pick[i]}
              onChange={() => setPick((a) => a.map((v, j) => (j === i ? !v : v)))}
            />
            <span className="tm-club">{p.name}</span>
            <span className="tm-delta">
              {currentDistance(p.name)} → <b>{p.newDistance}</b>
            </span>
            {p.reason && <span className="tm-reason">{p.reason}</span>}
            {trend.length > 1 && (
              <span className="tm-trend">{trend.join(" → ")} m</span>
            )}
          </label>
        );
      })}
      {acts.map((a, i) => (
        <label className="tm-row" key={`a${i}`}>
          <input
            type="checkbox"
            checked={pickAct[i]}
            onChange={() => setPickAct((x) => x.map((v, j) => (j === i ? !v : v)))}
          />
          <span className="tm-act">
            <Icon name="target" size={12} /> {describeAction(a)}
          </span>
        </label>
      ))}
      <button
        className="tm-apply"
        type="button"
        onClick={() =>
          onApply(
            index,
            proposals.filter((_, i) => pick[i]),
            acts.filter((_, i) => pickAct[i])
          )
        }
      >
        Übernehmen
      </button>
    </div>
  );
}
```

- [ ] **Step 8: Auto-Apply-Karte für Trackman-Nachrichten ausblenden + TrackmanCard rendern**

Ändere im Chat-Render die Zeile:
```tsx
              {m.actions && (
```
zu:
```tsx
              {m.actions && !m.trackman && (
```
Und direkt NACH dem schließenden `)}` dieses `m.actions`-Blocks (vor dem `</div>` von `chat-block`) ergänzen:
```tsx
              {m.trackman && (
                <TrackmanCard
                  msg={m}
                  index={i}
                  currentDistance={(n) =>
                    clubs.items.find(
                      (c) =>
                        c.name.toLowerCase().includes(n.toLowerCase()) ||
                        n.toLowerCase().includes(c.name.toLowerCase())
                    )?.distance ?? "—"
                  }
                  trendFor={(n) => {
                    const key = normalizeClubName(n);
                    return trackman.items
                      .map((s) => s.summary.clubs.find((c) => normalizeClubName(c.club) === key)?.carryAvg)
                      .filter((v): v is number => typeof v === "number")
                      .slice(-4);
                  }}
                  onApply={applyProposals}
                  onUndo={undo}
                />
              )}
```

- [ ] **Step 9: Upload-Button im Composer** ergänzen

Ersetze den Composer-Block:
```tsx
      <div className="composer">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Frag deinen Coach…"
          onKeyDown={(e) => {
            if (e.key === "Enter") send(input);
          }}
        />
```
durch:
```tsx
      <div className="composer">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          hidden
          onChange={onFile}
        />
        <button
          type="button"
          className="composer-attach"
          aria-label="Trackman-CSV hochladen"
          disabled={loading}
          onClick={() => fileRef.current?.click()}
        >
          <Icon name="upload" size={20} />
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Frag deinen Coach…"
          onKeyDown={(e) => {
            if (e.key === "Enter") send(input);
          }}
        />
```

- [ ] **Step 10: Hinweis im leeren Zustand** (optional, hilfreich) — in der Intro-`sub` ergänzen

Ändere:
```tsx
              Erzähl mir, wie's läuft oder was du brauchst. Ich kenne dein Bag,
              deinen Plan und deine letzten Sessions — und passe sie auf Wunsch
              direkt an.
```
zu:
```tsx
              Erzähl mir, wie's läuft oder was du brauchst. Ich kenne dein Bag,
              deinen Plan und deine letzten Sessions — und passe sie auf Wunsch
              direkt an. Tipp: 📎 lädt deine Trackman-CSV hoch, dann passe ich
              deine Distanzen an.
```

- [ ] **Step 11: Typecheck + Build**

Run: `npx tsc --noEmit && npm run build`
Expected: keine Typfehler, Build erfolgreich.

- [ ] **Step 12: Commit**

```bash
git add app/components/Icon.tsx app/coach/page.tsx
git commit -m "$(cat <<'EOF'
feat(coach): Trackman-CSV-Upload + Bestätigungs-Karte im Chat

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Styles für Upload-Button & Karte

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Styles ans Ende von `app/globals.css` anhängen**

```css
/* ── Trackman: Upload-Button & Bestätigungs-Karte ── */
.composer-attach {
  flex: none;
  width: 46px;
  height: 46px;
  border: 1px solid var(--line-strong);
  border-radius: 50%;
  background: var(--surface);
  color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.3s var(--ease), opacity 0.2s;
}
.composer-attach:active { transform: scale(0.9); }
.composer-attach:disabled { opacity: 0.4; }

.tm-card {
  align-self: flex-start;
  max-width: 92%;
  margin-top: 6px;
  background: var(--green-soft);
  border-radius: 14px;
  padding: 12px 14px;
}
.tm-card .ca-title {
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--green-ink);
  margin-bottom: 8px;
}
.tm-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 7px 0;
  font-size: 13px;
  border-top: 1px solid rgba(14, 124, 61, 0.12);
}
.tm-row:first-of-type { border-top: none; }
.tm-row input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: var(--green);
  flex: none;
}
.tm-club { font-weight: 700; color: var(--ink); }
.tm-delta { color: var(--muted); font-weight: 600; }
.tm-delta b { color: var(--green-ink); }
.tm-reason {
  flex-basis: 100%;
  padding-left: 26px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 500;
}
.tm-trend {
  flex-basis: 100%;
  padding-left: 26px;
  color: var(--faint);
  font-size: 11.5px;
  font-weight: 600;
}
.tm-act {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: var(--ink);
}
.tm-act svg { color: var(--green); flex: none; }
.tm-apply {
  margin-top: 10px;
  padding: 10px 18px;
  border: none;
  border-radius: 999px;
  background: var(--dark);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: transform 0.3s var(--ease);
}
.tm-apply:active { transform: scale(0.96); }
.tm-card.done { background: var(--bg); opacity: 0.85; }
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: erfolgreich.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "$(cat <<'EOF'
style(coach): Trackman-Upload-Button & Bestätigungs-Karte

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Endabnahme — Tests, Build, manueller Smoke-Test

**Files:** keine Änderungen (Verifikation)

- [ ] **Step 1: Komplette Test-Suite**

Run: `npm test`
Expected: alle Tests grün (inkl. `trackman` + `coach`).

- [ ] **Step 2: Production-Build**

Run: `npm run build`
Expected: erfolgreich, keine Typfehler.

- [ ] **Step 3: Manueller Smoke-Test der Upload-Strecke**

Beispiel-CSV nach `/tmp/trackman-demo.csv` schreiben:
```bash
cat > /tmp/trackman-demo.csv <<'CSV'
Club,Club Speed,Ball Speed,Smash,Launch,Carry (m),Total,Spin Rate,Attack Angle,Club Path,Face Angle
7 Iron,86,118,1.37,18.2,146,154,6500,-2.1,3.4,1.1
7 Iron,87,120,1.38,17.9,148,156,6400,-1.8,3.1,0.9
7 Iron,85,117,1.37,18.5,147,155,6600,-2.4,3.6,1.2
Driver,103,150,1.46,12.1,250,275,2600,1.2,4.8,2.0
Driver,104,151,1.45,11.8,252,278,2550,1.5,5.1,1.8
CSV
```
Dann:
```bash
npm run dev
```
Im Browser `/coach` öffnen → 📎-Button → `/tmp/trackman-demo.csv` wählen. Prüfen:
- Eine Analyse-Antwort erscheint (Schwungdaten + Distanzen). *(Setzt einen gültigen `OPENAI_API_KEY` voraus; ohne Key kommt der „nicht eingerichtet"-Hinweis — dann nur Parsing/Karte ist nicht testbar, Upload-Pfad bis zum API-Call aber schon.)*
- Eine Bestätigungs-Karte zeigt pro Schläger `alt → neu` mit Häkchen; club-path-Hinweis (positiv → „over the top") kann als Fokus-Vorschlag erscheinen.
- „Übernehmen" ändert die Distanzen (auf `/bag` prüfen), „Rückgängig" stellt sie wieder her.
- Zweiter Upload zeigt eine Trend-Zeile (z.B. `146 → 147`).

- [ ] **Step 4: Abschluss-Notiz**

Kein Commit nötig (reine Verifikation). Falls der manuelle Test Anpassungen erfordert, als separate Fix-Commits nachziehen.

---

## Hinweise

- **Kein Push in diesem Plan.** Leons Workflow: direkt auf `main`, aber Push triggert Vercel-Deploy → erst pushen, wenn Leon es ausdrücklich will.
- **Wedge-Namen-Grenze:** Labelt Trackman Wedges als „Sand Wedge" statt „56°", findet der kanonische Schlüssel (`sw` vs `56`) sie für die Trend-Zeile nicht zusammen — die Distanz-Vorschläge mappt die KI trotzdem korrekt. Bewusst akzeptiert (siehe Spec).
- **Reihenfolge:** Tasks 1–6 sind unabhängig vom UI testbar; 7–8 bauen darauf auf; 9 verifiziert alles.
