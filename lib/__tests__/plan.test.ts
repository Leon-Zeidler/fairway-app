import { describe, it, expect } from "vitest";
import { dayTasks } from "../plan";

const mainHref = (dow: number) =>
  dayTasks(dow).find((t) => t.title.startsWith("Rory"))?.href;

describe("dayTasks - Rory als aktiver Plan", () => {
  it("ordnet jedem Wochentag die richtige Rory-Session zu (Strength 2x: Mo+Do)", () => {
    const hrefs = [0, 1, 2, 3, 4, 5, 6].map(mainHref);
    expect(hrefs).toEqual([
      "/programm/rory-strength",
      "/programm/rory-circuit",
      "/programm/rory-power",
      "/programm/rory-strength",
      "/programm/rory-conditioning",
      "/programm/rory-activation",
      "/programm/rory-recovery",
    ]);
  });

  it("hat jeden Tag eine Mobility-Einheit (Mo-Sa eigene, So via Recovery)", () => {
    for (let dow = 0; dow < 7; dow++) {
      expect(
        dayTasks(dow).some((t) => t.key === "mobility"),
        `dow ${dow}`
      ).toBe(true);
    }
  });

  it("verteilt das Range-Training: Mo Swing Path, Mi Driver, Fr Basics", () => {
    const technik = (dow: number) =>
      dayTasks(dow).find((t) => t.key === "technik")?.href;
    expect(technik(0)).toBe("/programm/range-path");
    expect(technik(2)).toBe("/programm/range-driver");
    expect(technik(4)).toBe("/programm/range-basics");
  });

  it("zeigt Golf am selben Tag wie die Rory-Session (Mi: Power + Range-Driver)", () => {
    const mi = dayTasks(2);
    expect(mi.some((t) => t.href === "/programm/rory-power")).toBe(true);
    expect(mi.some((t) => t.href === "/programm/range-driver")).toBe(true);
  });

  it("Recovery-Tag (So) nutzt den mobility-key", () => {
    expect(mainHref(6)).toBe("/programm/rory-recovery");
    expect(
      dayTasks(6).find((t) => t.title.startsWith("Rory"))?.key
    ).toBe("mobility");
  });
});
