import { describe, it, expect } from "vitest";
import { normalizeClubName } from "../trackman";
import { parseTrackmanCsv } from "../trackman";
import { summarizeSession } from "../trackman";

describe("normalizeClubName", () => {
  it("legt Trackman- und Bag-Namen auf denselben Schlüssel", () => {
    expect(normalizeClubName("7 Iron")).toBe(normalizeClubName("7 Eisen"));
    expect(normalizeClubName("Pitching Wedge")).toBe(normalizeClubName("PW"));
    expect(normalizeClubName("3-Wood")).toBe("3w");
    expect(normalizeClubName("3-Iron")).toBe("3i");
  });
  it("erkennt Driver, Hölzer, Eisen und Grad-Wedges", () => {
    expect(normalizeClubName("Driver")).toBe("driver");
    expect(normalizeClubName("5 Wood")).toBe("5w");
    expect(normalizeClubName("7 Iron")).toBe("7i");
    expect(normalizeClubName("56°")).toBe("56");
    expect(normalizeClubName("58 deg")).toBe("58");
  });
});

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

  it("liest tab-getrennte CSV mit Punkt-Dezimal (yards)", () => {
    const csv = [
      "Club\tCarry (yds)\tSmash",
      "7 Iron\t160.5\t1.41",
      "7 Iron\t161.0\t1.40",
    ].join("\n");
    const p = parseTrackmanCsv(csv);
    expect(p.unit).toBe("yd");
    expect(p.shots).toHaveLength(2);
    expect(p.shots[0].carry).toBeCloseTo(160.5);
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

import { buildExtractedSummary } from "../trackman";

describe("buildExtractedSummary", () => {
  it("baut Summary aus extrahierten Clubs, rechnet Yards in Meter, sortiert", () => {
    const s = buildExtractedSummary(
      [
        { club: "7 Iron", carry: 160, clubSpeed: 85, smash: 1.4 },
        { club: "Driver", carry: 250 },
        { club: "Kaputt" }, // ohne carry → raus
      ],
      "yd"
    );
    expect(s.unit).toBe("m");
    expect(s.sourceUnit).toBe("yd");
    expect(s.clubs).toHaveLength(2);
    expect(s.clubs[0].club).toBe("Driver"); // höchster Carry zuerst
    const seven = s.clubs.find((c) => c.club === "7 Iron")!;
    expect(seven.carryAvg).toBe(146); // 160*0.9144=146.3 → 146
    expect(seven.carryMin).toBe(seven.carryAvg);
    expect(seven.clubSpeed).toBe(85);
  });
  it("liefert leere clubs bei Müll", () => {
    expect(buildExtractedSummary([], "m").clubs).toHaveLength(0);
    expect(buildExtractedSummary([{ club: "X" }], "m").clubs).toHaveLength(0);
  });
});
