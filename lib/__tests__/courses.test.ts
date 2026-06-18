import { describe, it, expect } from "vitest";
import { ULLERSDORF, COURSES, courseById, teeById } from "../courses";

describe("Ullersdorf-Seed", () => {
  it("hat genau 18 Löcher", () => {
    expect(ULLERSDORF.holes).toHaveLength(18);
  });

  it("Stroke-Index ist 1..18 und eindeutig", () => {
    const si = ULLERSDORF.holes.map((h) => h.si).sort((a, b) => a - b);
    expect(si).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
  });

  it("Loch-Nummern sind 1..18 und eindeutig", () => {
    const nums = ULLERSDORF.holes.map((h) => h.hole).sort((a, b) => a - b);
    expect(nums).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
  });

  it("Par-Summe der Löcher entspricht course.par (73)", () => {
    const sum = ULLERSDORF.holes.reduce((a, h) => a + h.par, 0);
    expect(sum).toBe(73);
    expect(ULLERSDORF.par).toBe(73);
  });

  it("hat einen Schwarz-Tee mit CR 70.7 / Slope 121", () => {
    const t = teeById(ULLERSDORF, "schwarz");
    expect(t).toBeDefined();
    expect(t!.cr).toBeCloseTo(70.7);
    expect(t!.slope).toBe(121);
  });

  it("courseById findet Ullersdorf in COURSES", () => {
    expect(courseById(COURSES, "ullersdorf")?.name).toContain("Ullersdorf");
    expect(courseById(COURSES, "unbekannt")).toBeUndefined();
  });
});
