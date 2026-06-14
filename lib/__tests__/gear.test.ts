import { describe, it, expect } from "vitest";
import { normalizeStep, gearRecord, resolveSteps, GEAR_IDS } from "../gear";
import { GearItem, Step } from "../types";

describe("normalizeStep", () => {
  it("wandelt 'Name — Detail' in einen Step", () => {
    expect(normalizeStep("Gate-Drill — von innen")).toEqual({
      name: "Gate-Drill",
      detail: "von innen",
    });
  });
  it("behandelt Strings ohne Trenner als reinen Namen", () => {
    expect(normalizeStep("Nur Name")).toEqual({ name: "Nur Name", detail: "" });
  });
  it("lässt ein bestehendes Step-Objekt unverändert (idempotent)", () => {
    const s: Step = { name: "A", detail: "B", club: "7 Eisen", dose: "10" };
    expect(normalizeStep(s)).toEqual(s);
  });
});

describe("gearRecord", () => {
  it("baut eine id→available Map", () => {
    const items: GearItem[] = [
      { id: "band", label: "Band", group: "mobility", available: false },
      { id: "barbell", label: "Langhantel", group: "gym", available: true },
    ];
    const rec = gearRecord(items);
    expect(rec.band).toBe(false);
    expect(rec.barbell).toBe(true);
  });
});

describe("resolveSteps", () => {
  const steps: Step[] = [
    { name: "Squat", detail: "tief", dose: "4×6" }, // kein gear
    {
      name: "Woodchop",
      detail: "rotieren",
      dose: "3×10",
      gear: "cable",
      alt: { name: "Standing Rotation", detail: "ohne Kabel", dose: "3×10" },
    },
    { name: "Klimmzug", detail: "ziehen", dose: "4×6", gear: "pull-up-bar" }, // kein alt
  ];

  it("zeigt Schritte ohne gear als ok", () => {
    const r = resolveSteps(steps, { cable: true, "pull-up-bar": true } as any);
    expect(r[0].status).toBe("ok");
    expect(r[0].step.name).toBe("Squat");
  });
  it("tauscht auf alt, wenn gear fehlt und alt vorhanden ist", () => {
    const r = resolveSteps(steps, { cable: false, "pull-up-bar": true } as any);
    expect(r[1].status).toBe("adapted");
    expect(r[1].step.name).toBe("Standing Rotation");
  });
  it("markiert unavailable, wenn gear fehlt und kein alt da ist", () => {
    const r = resolveSteps(steps, { cable: true, "pull-up-bar": false } as any);
    expect(r[2].status).toBe("unavailable");
    expect(r[2].step.name).toBe("Klimmzug");
  });
  it("behandelt fehlenden Eintrag (undefined) wie verfügbar", () => {
    const r = resolveSteps([steps[1]], {} as any);
    expect(r[0].status).toBe("ok");
  });
});

describe("GEAR_IDS", () => {
  it("enthält genau 9 Material-IDs", () => {
    expect(GEAR_IDS).toHaveLength(9);
  });
});
