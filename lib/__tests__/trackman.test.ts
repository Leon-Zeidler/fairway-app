import { describe, it, expect } from "vitest";
import { normalizeClubName } from "../trackman";

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
