import { describe, expect, it } from "vitest";
import { countdownLabel, daysUntil, isPastTrip, tripDays } from "./trip-utils";

const today = new Date(2026, 10, 19);
describe("trip utils", () => {
  it("generates every day between start and end inclusive", () => {
    expect(tripDays("2026-12-10", "2026-12-18")).toHaveLength(9);
    expect(tripDays("2026-12-30", "2027-01-01")).toEqual(["2026-12-30", "2026-12-31", "2027-01-01"]);
  });
  it("counts days until departure", () => {
    expect(daysUntil("2026-12-10", today)).toBe(21);
    expect(countdownLabel("2026-11-20", "2026-11-25", today)).toBe("mâine");
  });
  it("separates past trips by end date", () => {
    expect(isPastTrip("2026-11-18", today)).toBe(true);
    expect(isPastTrip("2026-11-19", today)).toBe(false);
  });
});

import { packingProgress } from "./trip-utils";
describe("packing progress", () => {
  it("is the share of checked items, 0 when empty", () => {
    expect(packingProgress([{ done: true }, { done: false }, { done: false }, { done: true }]).pct).toBe(50);
    expect(packingProgress([]).pct).toBe(0);
  });
});
