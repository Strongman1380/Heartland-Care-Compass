import { describe, expect, it } from "vitest";
import {
  buildYouthNameVariants,
  calculateCoveragePercent,
  calculateStaleDays,
  describePeriodDelta,
  getLatestActivityAt,
  incidentMatchesYouth,
} from "@/utils/kpiDashboard";

describe("kpiDashboard helpers", () => {
  it("builds normalized name variants for youth matching", () => {
    expect(buildYouthNameVariants({ firstName: "John", lastName: "Doe" } as any)).toEqual(["john doe", "doe john"]);
  });

  it("matches incidents using legacy and involved-youth names", () => {
    const youth = { firstName: "John", lastName: "Doe" } as any;

    expect(
      incidentMatchesYouth(
        {
          youthName: "John Doe",
          firstName: "",
          lastName: "",
          youthInvolved: [],
        } as any,
        youth
      )
    ).toBe(true);

    expect(
      incidentMatchesYouth(
        {
          youthName: "",
          firstName: "John",
          lastName: "Doe",
          youthInvolved: [],
        } as any,
        youth
      )
    ).toBe(true);

    expect(
      incidentMatchesYouth(
        {
          youthName: "",
          firstName: "",
          lastName: "",
          youthInvolved: [{ name: "Doe, John" }],
        } as any,
        youth
      )
    ).toBe(true);

    expect(
      incidentMatchesYouth(
        {
          youthName: "James Smith",
          firstName: "",
          lastName: "",
          youthInvolved: [],
        } as any,
        youth
      )
    ).toBe(false);
  });

  it("calculates coverage and freshness from activity dates", () => {
    expect(
      calculateCoveragePercent(
        ["2026-04-01T10:00:00.000Z", "2026-04-01T20:00:00.000Z", "2026-04-03T10:00:00.000Z"],
        4
      )
    ).toBe(50);

    const latest = getLatestActivityAt(["2026-04-01T10:00:00.000Z", null, "2026-04-03T18:30:00.000Z"]);
    expect(latest).toBe("2026-04-03T18:30:00.000Z");
    expect(calculateStaleDays(latest, new Date("2026-04-05T09:00:00.000Z"))).toBe(2);
  });

  it("describes period deltas for KPI cards", () => {
    expect(describePeriodDelta(10, 7)).toBe("+3 vs prior");
    expect(describePeriodDelta(7, 10)).toBe("-3 vs prior");
    expect(describePeriodDelta(7, 7)).toBe("Flat vs prior");
    expect(describePeriodDelta(7, undefined)).toBe("No prior period");
  });
});
