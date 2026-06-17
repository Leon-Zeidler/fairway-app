import { describe, it, expect } from "vitest";
import { normalizeClubName } from "../trackman";
import { parseTrackmanCsv } from "../trackman";

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
