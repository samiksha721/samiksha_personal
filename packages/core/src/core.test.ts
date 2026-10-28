import { describe, expect, it } from "vitest";
import { addDays, eachDay, isISODate, monthGrid } from "./dates";
import { availableByDay, suggestWindows } from "./availability";
import { buildTravelLinks } from "./links";

describe("dates", () => {
  it("validates ISO dates", () => {
    expect(isISODate("2026-02-28")).toBe(true);
    expect(isISODate("2026-02-30")).toBe(false);
    expect(isISODate("2026-2-3")).toBe(false);
    expect(isISODate(42)).toBe(false);
  });

  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("lists days inclusively", () => {
    expect(eachDay("2026-10-30", "2026-11-02")).toEqual([
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
    ]);
    expect(eachDay("2026-11-02", "2026-11-01")).toEqual([]);
  });

  it("builds Monday-first month grids", () => {
    // 1 Oct 2026 is a Thursday -> 3 leading blanks.
    const grid = monthGrid(2026, 9);
    expect(grid.slice(0, 4)).toEqual([null, null, null, "2026-10-01"]);
    expect(grid.length % 7).toBe(0);
  });
});

describe("availability", () => {
  const availability = {
    ana: ["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04"],
    ben: ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05"],
    cy: ["2026-11-03", "2026-11-04"],
  };

  it("groups members by day", () => {
    const byDay = availableByDay(availability);
    expect(byDay.get("2026-11-03")?.sort()).toEqual(["ana", "ben", "cy"]);
    expect(byDay.get("2026-11-05")).toEqual(["ben"]);
  });

  it("ranks windows by members fully available", () => {
    const [best, second] = suggestWindows(
      availability,
      ["ana", "ben", "cy"],
      "2026-11-01",
      "2026-11-05",
      2,
    );
    expect(best).toMatchObject({ start: "2026-11-03", end: "2026-11-04" });
    expect(best.fullyAvailable.sort()).toEqual(["ana", "ben", "cy"]);
    expect(second.fullyAvailable).toHaveLength(2);
  });

  it("drops windows nobody can fully attend", () => {
    const windows = suggestWindows({ ana: ["2026-11-01"] }, ["ana"], "2026-11-01", "2026-11-03", 2);
    expect(windows).toEqual([]);
  });
});

describe("travel links", () => {
  it("pre-fills destination and dates", () => {
    const links = buildTravelLinks({
      destination: "Lisbon, Portugal",
      start: "2026-11-03",
      end: "2026-11-06",
      travelers: 3,
    });
    const booking = links.find((l) => l.provider === "Booking.com")!;
    expect(booking.url).toContain("ss=Lisbon%2C%20Portugal");
    expect(booking.url).toContain("checkin=2026-11-03&checkout=2026-11-06");
    expect(booking.url).toContain("group_adults=3");
    expect(links.every((l) => l.url.startsWith("https://"))).toBe(true);
  });
});
