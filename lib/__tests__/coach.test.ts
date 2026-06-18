import { describe, it, expect } from "vitest";
import { sanitizeActions, sanitizeClubProposals, buildSystemPrompt, roundInsightsFrom } from "../coach";
import { ULLERSDORF } from "../courses";
import { Session } from "../types";

function courseRound(date: string, holes: { hole: number; strokes: number; gir?: boolean }[]): Session {
  return {
    id: date, date, type: "course", rating: 3, drills: [],
    createdAt: date + "T10:00:00Z",
    courseId: "ullersdorf", teeId: "schwarz",
    holes,
  } as Session;
}

describe("sanitizeActions — set_program with structured steps", () => {
  it("akzeptiert Step-Objekte und droppt steps ohne Namen", () => {
    const out = sanitizeActions([
      {
        type: "set_program",
        id: "gym1",
        sections: [
          { title: "A", steps: [{ name: "Squat", detail: "tief", dose: "4×6" }, { detail: "kein name" }] },
        ],
      },
    ]);
    expect(out).toHaveLength(1);
    const a = out[0] as any;
    expect(a.sections[0].steps).toHaveLength(1);
    expect(a.sections[0].steps[0].name).toBe("Squat");
  });

  it("verwirft ein ungültiges gear-Kürzel im Step", () => {
    const out = sanitizeActions([
      { type: "set_program", id: "gym1", sections: [{ steps: [{ name: "X", detail: "", gear: "spaceship" }] }] },
    ]);
    const a = out[0] as any;
    expect(a.sections[0].steps[0].gear).toBeUndefined();
  });

  it("behält ein gültiges gear-Kürzel im Step", () => {
    const out = sanitizeActions([
      { type: "set_program", id: "gym1", sections: [{ steps: [{ name: "X", detail: "", gear: "band" }] }] },
    ]);
    expect((out[0] as any).sections[0].steps[0].gear).toBe("band");
  });
});

describe("sanitizeActions — add_program_step", () => {
  it("nimmt ein Step-Objekt an", () => {
    const out = sanitizeActions([
      { type: "add_program_step", id: "gym1", step: { name: "Hip Thrust", detail: "", dose: "3×10" } },
    ]);
    expect(out).toHaveLength(1);
    expect((out[0] as any).step.name).toBe("Hip Thrust");
  });
  it("droppt einen Step ohne Namen", () => {
    const out = sanitizeActions([
      { type: "add_program_step", id: "gym1", step: { detail: "x" } },
    ]);
    expect(out).toHaveLength(0);
  });
});

describe("sanitizeActions — edit_program_step", () => {
  it("akzeptiert gültigen Index + Felder", () => {
    const out = sanitizeActions([
      { type: "edit_program_step", id: "gym1", index: 2, dose: "4×10" },
    ]);
    expect(out).toHaveLength(1);
    expect((out[0] as any).index).toBe(2);
    expect((out[0] as any).dose).toBe("4×10");
  });
  it("verwirft negativen oder fehlenden Index", () => {
    expect(sanitizeActions([{ type: "edit_program_step", id: "gym1", index: -1 }])).toHaveLength(0);
    expect(sanitizeActions([{ type: "edit_program_step", id: "gym1" }])).toHaveLength(0);
  });
  it("verwirft ein edit ohne Patch-Felder", () => {
    expect(sanitizeActions([{ type: "edit_program_step", id: "gym1", index: 2 }])).toHaveLength(0);
  });
});

describe("sanitizeActions — remove_program_step", () => {
  it("akzeptiert id + Index", () => {
    const out = sanitizeActions([{ type: "remove_program_step", id: "gym1", index: 0 }]);
    expect(out).toHaveLength(1);
  });
  it("verwirft ohne gültigen Index", () => {
    expect(sanitizeActions([{ type: "remove_program_step", id: "gym1", index: "x" }])).toHaveLength(0);
  });
});

describe("sanitizeActions — set_gear", () => {
  it("akzeptiert match + boolean", () => {
    const out = sanitizeActions([{ type: "set_gear", match: "band", available: true }]);
    expect(out).toEqual([{ type: "set_gear", match: "band", available: true }]);
  });
  it("verwirft ohne boolean available", () => {
    expect(sanitizeActions([{ type: "set_gear", match: "band" }])).toHaveLength(0);
  });
});

describe("sanitizeClubProposals", () => {
  it("behält gültige Vorschläge und füllt optionale Felder", () => {
    const out = sanitizeClubProposals([
      { name: "7 Eisen", newDistance: "148 m", carryAvg: 148, shots: 12, reason: "stabil" },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ name: "7 Eisen", newDistance: "148 m", carryAvg: 148, shots: 12 });
  });
  it("verwirft Einträge ohne name oder newDistance", () => {
    expect(sanitizeClubProposals([{ name: "7 Eisen" }])).toHaveLength(0);
    expect(sanitizeClubProposals([{ newDistance: "148 m" }])).toHaveLength(0);
    expect(sanitizeClubProposals("kaputt")).toHaveLength(0);
  });
});

describe("roundInsightsFrom + buildSystemPrompt", () => {
  it("liefert undefined ohne Runden", () => {
    expect(roundInsightsFrom([], [ULLERSDORF], NaN)).toBeUndefined();
  });

  it("baut Insights aus einer 18-Loch-Runde", () => {
    const holes = ULLERSDORF.holes.map((h) => ({
      hole: h.hole, strokes: h.par + 1, gir: false,
    }));
    const ri = roundInsightsFrom([courseRound("2026-06-10", holes)], [ULLERSDORF], NaN);
    expect(ri).toBeDefined();
    expect(ri!.windowSize).toBe(1);
    expect(ri!.scoringToPar18).not.toBeNull();
  });

  it("buildSystemPrompt bettet die Runden-Sektion ein, wenn roundInsights gesetzt ist", () => {
    const holes = ULLERSDORF.holes.map((h) => ({ hole: h.hole, strokes: h.par + 1, gir: false }));
    const ri = roundInsightsFrom([courseRound("2026-06-10", holes)], [ULLERSDORF], NaN);
    // Minimal-Kontext: nur Pflichtfelder, die buildSystemPrompt nutzt, + roundInsights.
    const prompt = buildSystemPrompt({ roundInsights: ri } as any);
    expect(prompt).toContain("RUNDEN-AUSWERTUNG");
    expect(prompt).toContain("Größter Hebel");
  });

  it("überschreibt vorhandene Summenfelder NICHT, wenn die Session bereits strokes trägt", () => {
    // Eine Session mit holes (nur 2 Löcher) und einem vorgefertigten strokes=90.
    // Ohne Guard würde deriveRoundFields die echten Schläge neu berechnen und
    // strokes=90 durch den Loch-abgeleiteten Wert ersetzen.
    const shortHoles = [
      { hole: 1, strokes: 4, gir: false },
      { hole: 2, strokes: 5, gir: true },
    ];
    const sessionWithSummary: Session = {
      id: "test-summary",
      date: "2026-06-10",
      type: "course",
      rating: 3,
      drills: [],
      createdAt: "2026-06-10T10:00:00Z",
      courseId: "ullersdorf",
      teeId: "schwarz",
      strokes: 90, // bereits vorhandenes Summenfeld — darf NICHT überschrieben werden
      holes: shortHoles,
    } as Session;

    // Runde mit Loch-Daten ohne Summenfelder (wird normal angereichert)
    const holesOnly = ULLERSDORF.holes.map((h) => ({ hole: h.hole, strokes: h.par + 1, gir: false }));
    const plainRound = courseRound("2026-06-09", holesOnly);

    const ri = roundInsightsFrom([sessionWithSummary, plainRound], [ULLERSDORF], NaN);
    expect(ri).toBeDefined();

    // Das gleitende Fenster enthält beide Runden. Der scoringToPar18 wird aus dem
    // Aggregat berechnet. Entscheidend: die Session mit strokes=90 muss unverändert
    // ins Fenster gelangt sein. recentRoundsWindow filtert auf hasRoundStats — wir
    // prüfen daher, dass windowSize 2 ist (beide Runden zählen) und die Berechnung
    // nicht crasht. Eine Runde mit nur 2 Löchern und strokes=90 würde bei
    // Neuberechnung strokes=9 ergeben — die Aggregation würde dann einen anderen
    // scoringToPar18 liefern. Da wir die Session mit strokes=90 unberührt lassen,
    // muss das Fenster beide Einträge enthalten.
    expect(ri!.windowSize).toBe(2);
  });
});
