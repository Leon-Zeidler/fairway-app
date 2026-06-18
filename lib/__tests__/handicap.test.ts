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
