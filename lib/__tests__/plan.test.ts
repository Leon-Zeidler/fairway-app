import { describe, it, expect } from "vitest";
import { dayTasks } from "../plan";

describe("dayTasks - Rory als aktiver Plan", () => {
  it("ordnet jedem Wochentag das richtige Rory-Programm zu", () => {
    const hrefs = [0, 1, 2, 3, 4, 5, 6].map(
      (d) => dayTasks(d).find((t) => t.title.startsWith("Rory"))?.href
    );
    expect(hrefs).toEqual([
      "/programm/rory-strength-a",
      "/programm/rory-strength-b",
      "/programm/rory-power",
      "/programm/rory-circuit",
      "/programm/rory-conditioning",
      "/programm/rory-activation",
      "/programm/rory-recovery",
    ]);
  });

  it("zeigt Golf weiterhin am selben Tag (Mi: Power + Range)", () => {
    const mi = dayTasks(2);
    expect(mi.some((t) => t.href === "/programm/rory-power")).toBe(true);
    expect(mi.some((t) => t.href === "/programm/range")).toBe(true);
  });

  it("Recovery-Tag (So) nutzt den mobility-key (fuer den Wochen-Tracker)", () => {
    expect(dayTasks(6).find((t) => t.title.startsWith("Rory"))?.key).toBe("mobility");
  });
});
