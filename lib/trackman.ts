// Trackman-CSV einlesen & pro Schläger verdichten.
// Reine Funktionen (kein React, keine Seiteneffekte) → voll unit-testbar.

const YARD_TO_M = 0.9144; // wird ab Task 2/3 für Yard→Meter genutzt

/** Bringt Trackman- und Bag-Namen auf einen kanonischen Schlüssel zusammen,
 *  damit derselbe Schläger über Sessions/Quellen hinweg zusammenfindet. */
export function normalizeClubName(name: string): string {
  const s = name.toLowerCase().replace(/[-\s]+/g, " ").trim();
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

  // Dezimaltrenner per Daten-Stichprobe bestimmen — Tab-Dateien können Punkt
  // ODER Komma als Dezimaltrenner haben, das Trennzeichen allein reicht nicht.
  const sample = lines
    .slice(headerIdx + 1, headerIdx + 11)
    .flatMap((l) => splitLine(l, delim));
  const hasCommaDecimal = sample.some((c) => /^-?\d+,\d+$/.test(c));
  const hasDotDecimal = sample.some((c) => /^-?\d+\.\d+$/.test(c));
  const decimalComma = delim !== "," && hasCommaDecimal && !hasDotDecimal;

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
    club: findCol(headers, used, (h) => /club/.test(h) && !/speed|path|face|attack/.test(h)),
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

/* ── KI-Extraktion (Bild/PDF/CSV-Text) ──────────────────────────── */

/** Roh-Daten, die die KI aus Bild/PDF/Text liefert (vor Validierung). */
export interface ExtractedClub {
  club: string;
  carry?: number;
  shots?: number;
  clubSpeed?: number; ballSpeed?: number; smash?: number;
  launch?: number; spin?: number;
  attackAngle?: number; clubPath?: number; faceAngle?: number; faceToPath?: number;
}

function numOrUndef(v: unknown): number | undefined {
  return typeof v === "number" && isFinite(v) ? v : undefined;
}

/** Validiert/koerziert KI-extrahierte Clubs zu einer TrackmanSummary (Carry → Meter). */
export function buildExtractedSummary(
  clubs: ExtractedClub[],
  sourceUnit: "m" | "yd",
  warnings: string[] = []
): TrackmanSummary {
  const toM = sourceUnit === "yd" ? YARD_TO_M : 1;
  const out: TrackmanClubStat[] = [];
  for (const c of clubs) {
    if (!c || typeof c.club !== "string" || !c.club.trim()) continue;
    if (typeof c.carry !== "number" || !isFinite(c.carry) || c.carry <= 0) continue;
    const carry = Math.round(c.carry * toM);
    out.push({
      club: c.club.trim(),
      shots: typeof c.shots === "number" && c.shots > 0 ? Math.round(c.shots) : 0,
      dropped: 0,
      carryAvg: carry,
      carryMin: carry,
      carryMax: carry,
      clubSpeed: numOrUndef(c.clubSpeed),
      ballSpeed: numOrUndef(c.ballSpeed),
      smash: numOrUndef(c.smash),
      launch: numOrUndef(c.launch),
      spin: numOrUndef(c.spin),
      attackAngle: numOrUndef(c.attackAngle),
      clubPath: numOrUndef(c.clubPath),
      faceAngle: numOrUndef(c.faceAngle),
      faceToPath: numOrUndef(c.faceToPath),
    });
  }
  out.sort((a, b) => b.carryAvg - a.carryAvg);
  return { unit: "m", sourceUnit, warnings, clubs: out, totalShots: out.reduce((s, c) => s + c.shots, 0) };
}
