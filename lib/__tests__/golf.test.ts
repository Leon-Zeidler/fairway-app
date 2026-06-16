import { describe, it, expect } from "vitest";
import { Session } from "../types";
import {
  roundStats,
  aggregate,
  benchmarkRows,
  topFocus,
  parseDistance,
  suggestClubs,
  hasRoundStats,
} from "../golf";

function round(p: Partial<Session>): Session {
  return {
    id: "s1",
    date: "2026-06-01",
    type: "course",
    rating: 3,
    drills: [],
    createdAt: "2026-06-01T10:00:00Z",
    ...p,
  };
}

describe("roundStats", () => {
  it("berechnet to-par, Quoten und Putts", () => {
    const r = roundStats(
      round({
        holesPlayed: 18,
        strokes: 78,
        coursePar: 72,
        fairwaysHit: 7,
        fairwaysPossible: 14,
        girHit: 9,
        putts: 32,
        scramblingMade: 4,
        scramblingTries: 8,
        penalties: 2,
      })
    );
    expect(r.toPar).toBe(6);
    expect(r.fairwayPct).toBeCloseTo(0.5);
    expect(r.girPct).toBeCloseTo(0.5);
    expect(r.scramblingPct).toBeCloseTo(0.5);
    expect(r.putts).toBe(32);
    expect(r.penalties).toBe(2);
  });

  it("liefert null wenn Daten fehlen", () => {
    const r = roundStats(round({ holesPlayed: 18 }));
    expect(r.toPar).toBeNull();
    expect(r.girPct).toBeNull();
  });
});

describe("hasRoundStats", () => {
  it("erkennt Runden mit Daten", () => {
    expect(hasRoundStats(round({ girHit: 8 }))).toBe(true);
    expect(hasRoundStats(round({}))).toBe(false);
    expect(hasRoundStats(round({ type: "range", balls: 60 }))).toBe(false);
  });
});

describe("aggregate", () => {
  it("normalisiert 9- und 18-Loch-Runden auf 18", () => {
    const a = aggregate([
      round({ id: "a", holesPlayed: 18, strokes: 78, coursePar: 72, putts: 32 }),
      round({ id: "b", holesPlayed: 9, strokes: 39, coursePar: 36, putts: 16 }),
    ]);
    expect(a.rounds).toBe(2);
    // 18er: +6 ; 9er: +3 → *2 = +6 → Schnitt 6
    expect(a.scoringToPar18).toBeCloseTo(6);
    // 18er: 32 ; 9er: 16 → *2 = 32 → Schnitt 32
    expect(a.puttsPer18).toBeCloseTo(32);
  });

  it("mittelt nur über Runden mit dem jeweiligen Wert", () => {
    const a = aggregate([
      round({ id: "a", girHit: 9, holesPlayed: 18 }),
      round({ id: "b", putts: 30, holesPlayed: 18 }),
    ]);
    expect(a.girPct).toBeCloseTo(0.5);
    expect(a.puttsPer18).toBeCloseTo(30);
  });
});

describe("benchmarkRows / topFocus", () => {
  it("markiert on-track korrekt", () => {
    const a = aggregate([
      round({ id: "a", holesPlayed: 18, girHit: 13, putts: 28 }),
    ]);
    const rows = benchmarkRows(a);
    const gir = rows.find((r) => r.key === "gir")!;
    const putts = rows.find((r) => r.key === "putts")!;
    expect(gir.onTrack).toBe(true); // 13/18 = 72% ≥ 67%
    expect(putts.onTrack).toBe(true); // 28 ≤ 30
  });

  it("findet den größten Skill-Hebel (nicht Scoring)", () => {
    const a = aggregate([
      round({
        id: "a",
        holesPlayed: 18,
        strokes: 90,
        coursePar: 72,
        girHit: 3, // sehr schwach → größter Hebel
        fairwaysHit: 9,
        fairwaysPossible: 14,
        putts: 31,
      }),
    ]);
    const focus = topFocus(a);
    expect(focus).not.toBeNull();
    expect(focus!.key).toBe("gir");
    expect(focus!.isSkill).toBe(true);
  });

  it("ohne Daten kein Fokus", () => {
    expect(topFocus(aggregate([]))).toBeNull();
  });
});

describe("parseDistance / suggestClubs", () => {
  it("parst Einzel- und Bereichsangaben", () => {
    expect(parseDistance("240 m")).toBe(240);
    expect(parseDistance("150-160 m")).toBe(155);
    expect(parseDistance("— m")).toBeNull();
    expect(parseDistance("")).toBeNull();
  });

  it("empfiehlt den nächstgelegenen Schläger", () => {
    const clubs = [
      { name: "Driver", distance: "240 m" },
      { name: "7 Eisen", distance: "150 m" },
      { name: "PW", distance: "120 m" },
    ];
    const picks = suggestClubs(clubs, 145);
    expect(picks[0].name).toBe("7 Eisen");
    expect(picks[0].delta).toBe(5);
  });
});
