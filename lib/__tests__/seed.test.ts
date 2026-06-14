import { describe, it, expect } from "vitest";
import { DRILLS, ROUTINES, PITCHING, GEAR } from "../seed";
import { GEAR_IDS } from "../gear";
import { Step } from "../types";

function allSteps(): { step: Step; golf: boolean }[] {
  const out: { step: Step; golf: boolean }[] = [];
  DRILLS.forEach((s) => out.push({ step: s, golf: true }));
  PITCHING.forEach((s) => out.push({ step: s, golf: true }));
  ROUTINES.forEach((r) =>
    r.steps.forEach((s) => out.push({ step: s, golf: r.group === "golf" }))
  );
  return out;
}

describe("seed content invariants", () => {
  it("jeder Schritt hat einen nicht-leeren Namen", () => {
    for (const { step } of allSteps()) expect(step.name.length).toBeGreaterThan(0);
  });

  it("jeder Schritt hat eine Dosis (wie oft/viel)", () => {
    for (const { step } of allSteps()) expect(step.dose, step.name).toBeTruthy();
  });

  it("Golf-Schritte mit Ball/Schläger tragen einen club, sonst keiner", () => {
    // club ist optional, aber wenn gesetzt, nicht leer
    for (const { step } of allSteps())
      if (step.club !== undefined) expect(step.club.length).toBeGreaterThan(0);
  });

  it("jeder Schritt hat nicht-leeren Detail-Text", () => {
    for (const { step } of allSteps()) expect(step.detail.length, step.name).toBeGreaterThan(0);
  });

  it("jeder gear-Verweis ist gültig UND hat eine alt-Variante", () => {
    for (const { step } of allSteps())
      if (step.gear) {
        expect(GEAR_IDS, step.name).toContain(step.gear);
        expect(step.alt, `alt fehlt bei ${step.name}`).toBeTruthy();
        expect(step.alt!.dose, `alt.dose fehlt bei ${step.name}`).toBeTruthy();
      }
  });

  it("GEAR enthält 9 Einträge mit gültigen IDs", () => {
    expect(GEAR).toHaveLength(9);
    for (const g of GEAR) expect(GEAR_IDS).toContain(g.id);
    for (const id of GEAR_IDS) expect(GEAR.map((g) => g.id)).toContain(id);
  });
});
