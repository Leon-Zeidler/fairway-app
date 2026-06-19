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
    // Eine Session mit holes (nur 2 Löcher mit sehr niedrigen Schlägen) und einem
    // vorgefertigten strokes=90, coursePar=73, holesPlayed=18.
    // Ohne Guard würde deriveRoundFields die Schläge aus den 2 Löchern neu berechnen:
    //   strokes = 2+2 = 4, coursePar = 4+3 = 7, holesPlayed = 2
    //   → toPar = −3, per18(−3, 2) = −27  ← stark negativ
    // Mit Guard bleiben die gespeicherten Felder:
    //   strokes = 90, coursePar = 73, holesPlayed = 18
    //   → toPar = +17, per18(+17, 18) = +17  ← stark positiv
    // Das Vorzeichen von scoringToPar18 divergiert zwischen beiden Pfaden eindeutig.
    const shortHoles = [
      { hole: 1, strokes: 2, gir: false }, // Hole 1 par=4 → würde strokes-Beitrag = 2 liefern
      { hole: 2, strokes: 2, gir: true },  // Hole 2 par=3 → würde strokes-Beitrag = 2 liefern
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
      strokes: 90,      // bereits vorhandenes Summenfeld — darf NICHT überschrieben werden
      coursePar: 73,    // vollständige 18-Loch-Runde Ullersdorf
      holesPlayed: 18,
      holes: shortHoles,
    } as Session;

    // Runde mit Loch-Daten ohne Summenfelder (wird normal angereichert)
    const holesOnly = ULLERSDORF.holes.map((h) => ({ hole: h.hole, strokes: h.par + 1, gir: false }));
    const plainRound = courseRound("2026-06-09", holesOnly);

    const ri = roundInsightsFrom([sessionWithSummary, plainRound], [ULLERSDORF], NaN);
    expect(ri).toBeDefined();

    // windowSize = 2: beide Runden zählen (beide haben hasRoundStats)
    expect(ri!.windowSize).toBe(2);

    // Divergierender Wert: scoringToPar18 muss positiv/hoch sein (Wert aus strokes=90, Par=73 → +17).
    // Ohne Guard würden die 2 Loch-Werte (4+3=9 Schläge, Par=7, holesPlayed=2)
    // zu toPar=−3 führen → per18 = −27 → scoringToPar18 wäre negativ.
    // Mit korrekt bewahrtem strokes=90 ergibt sich scoringToPar18 ≈ +17.5 → deutlich über 10.
    expect(ri!.scoringToPar18).toBeGreaterThan(10);
  });
});
