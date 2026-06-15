import { describe, it, expect } from "vitest";
import { getProgram } from "../programs";
import { GEAR_IDS } from "../gear";
import { Step } from "../types";

const RORY_IDS = [
  "rory-strength",
  "rory-power",
  "rory-circuit",
  "rory-conditioning",
  "rory-activation",
  "rory-recovery",
];

function steps(id: string): Step[] {
  const p = getProgram(id);
  if (!p) return [];
  return p.sections.flatMap((s) => s.steps);
}

describe("Rory-Programme", () => {
  it("alle Programme existieren", () => {
    for (const id of RORY_IDS) expect(getProgram(id), id).toBeTruthy();
  });

  it("jeder Schritt hat eine Dosis", () => {
    for (const id of RORY_IDS)
      for (const s of steps(id)) expect(s.dose, `${id}: ${s.name}`).toBeTruthy();
  });

  it("jeder gear-Schritt hat ein gültiges Kürzel und eine alt-Variante", () => {
    for (const id of RORY_IDS)
      for (const s of steps(id))
        if (s.gear) {
          expect(GEAR_IDS, `${id}: ${s.name}`).toContain(s.gear);
          expect(s.alt, `${id}: ${s.name} ohne alt`).toBeTruthy();
          expect(s.alt!.dose, `${id}: ${s.name} alt ohne dose`).toBeTruthy();
        }
  });

  it("geladene Programme starten mit einem Warmup-Schritt", () => {
    for (const id of ["rory-strength", "rory-power", "rory-circuit", "rory-conditioning"]) {
      const first = getProgram(id)!.sections[0].steps[0];
      expect(first.name, id).toContain("Einlaufen");
    }
  });

  it("Box Jumps nutzen das neue 'box'-Material mit Squat-Jump-Alternative", () => {
    const power = steps("rory-power");
    const box = power.find((s) => s.name === "Box Jumps");
    expect(box?.gear).toBe("box");
    expect(box?.alt?.name).toContain("Squat Jumps");
  });
});
