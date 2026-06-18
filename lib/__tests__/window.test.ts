import { describe, it, expect } from "vitest";
import { Session } from "../types";
import { recentRoundsWindow } from "../golf";

function s(date: string, extra: Partial<Session> = {}): Session {
  return {
    id: date,
    date,
    type: "course",
    rating: 3,
    drills: [],
    createdAt: date + "T10:00:00Z",
    strokes: 80,
    coursePar: 73,
    ...extra,
  };
}

describe("recentRoundsWindow", () => {
  it("liefert die jüngsten n Runden, absteigend nach Datum", () => {
    const sessions = [
      s("2026-06-01"),
      s("2026-06-10"),
      s("2026-06-05"),
      s("2026-06-15"),
    ];
    const w = recentRoundsWindow(sessions, 2);
    expect(w.map((x) => x.date)).toEqual(["2026-06-15", "2026-06-10"]);
  });

  it("ignoriert Nicht-Platz-Sessions und Runden ohne Stats", () => {
    const sessions = [
      s("2026-06-10"),
      { ...s("2026-06-11"), type: "range" as const, strokes: undefined },
      { ...s("2026-06-12"), strokes: undefined, coursePar: undefined }, // course, aber keine Stats
    ];
    const w = recentRoundsWindow(sessions, 10);
    expect(w.map((x) => x.date)).toEqual(["2026-06-10"]);
  });

  it("gibt alle zurück, wenn weniger als n vorhanden", () => {
    const w = recentRoundsWindow([s("2026-06-01")], 10);
    expect(w).toHaveLength(1);
  });
});
