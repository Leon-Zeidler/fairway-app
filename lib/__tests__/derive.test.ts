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
