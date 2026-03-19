const { getBabyAge } = require("../../src/utils/babyAge");

/**
 * Helper: returns a Date that is exactly `days` days before now.
 */
function daysAgo(days) {
  return new Date(Date.now() - days * 86400000);
}

/**
 * Helper: returns a Date that is exactly `months` calendar months and
 * optionally `extraDays` days before today.
 */
function monthsAgo(months, extraDays = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  d.setDate(d.getDate() - extraDays);
  return d;
}

describe("getBabyAge — null / invalid inputs", () => {
  it("returns null for null birthDate", () => {
    expect(getBabyAge(null)).toBeNull();
  });

  it("returns null for undefined birthDate", () => {
    expect(getBabyAge(undefined)).toBeNull();
  });

  it("returns null for an invalid date string", () => {
    expect(getBabyAge("not-a-date")).toBeNull();
  });

  it("returns null for a future birthDate", () => {
    const tomorrow = new Date(Date.now() + 86400000);
    expect(getBabyAge(tomorrow)).toBeNull();
  });

  it("handles a Firestore Timestamp-like object (.toDate())", () => {
    const firestoreTs = { toDate: () => daysAgo(10) };
    const result = getBabyAge(firestoreTs);
    expect(result).toBe("1w 3d old");
  });
});

describe("getBabyAge — weeks phase (< 16 weeks)", () => {
  it("shows 0w 0d for a baby born today", () => {
    expect(getBabyAge(new Date())).toBe("0w old");
  });

  it("shows 1w 3d for a 10-day-old baby", () => {
    expect(getBabyAge(daysAgo(10))).toBe("1w 3d old");
  });

  it("shows 4w old (no days) for exactly 28 days", () => {
    expect(getBabyAge(daysAgo(28))).toBe("4w old");
  });

  it("shows 7w 6d for 55 days old", () => {
    expect(getBabyAge(daysAgo(55))).toBe("7w 6d old");
  });

  it("shows 15w 6d for 111 days (last day in week-phase)", () => {
    expect(getBabyAge(daysAgo(111))).toBe("15w 6d old");
  });

  it("still uses week format at exactly 15 weeks (105 days)", () => {
    expect(getBabyAge(daysAgo(105))).toBe("15w old");
  });
});

describe("getBabyAge — months phase (≥ 16 weeks / ~4 months)", () => {
  it("switches to months at exactly 16 weeks (112 days)", () => {
    const result = getBabyAge(daysAgo(112));
    expect(result).toMatch(/^\d+mo/);
  });

  it("shows correct months for exactly 4 calendar months ago", () => {
    const result = getBabyAge(monthsAgo(4));
    expect(result).toBe("4mo old");
  });

  it("shows months + weeks for 4 months and 2 weeks", () => {
    const result = getBabyAge(monthsAgo(4, 14)); // 4 months + 14 extra days
    expect(result).toBe("4mo 2w old");
  });

  it("shows 6mo old for exactly 6 calendar months", () => {
    expect(getBabyAge(monthsAgo(6))).toBe("6mo old");
  });

  it("shows 12mo old for exactly 12 calendar months", () => {
    expect(getBabyAge(monthsAgo(12))).toBe("12mo old");
  });

  it("shows 12mo 1w old for 12 months + 10 days", () => {
    const result = getBabyAge(monthsAgo(12, 10));
    expect(result).toBe("12mo 1w old");
  });

  it("does not show negative remaining weeks near month boundary", () => {
    // Birth on the 31st — some months don't have a 31st, which can cause
    // off-by-one errors in naive 30.44-day approximations.
    // Use 6 months ago so we're firmly in the months phase (≥ 16 weeks).
    const bd = new Date();
    bd.setMonth(bd.getMonth() - 6);
    bd.setDate(31); // clamps to last day of that month if it has < 31 days
    const result = getBabyAge(bd);
    expect(result).toMatch(/^\d+mo( \dw)? old$/);
    // Must not contain a negative number
    expect(result).not.toMatch(/-\d/);
  });

  it("shows 18mo old for 18 calendar months", () => {
    expect(getBabyAge(monthsAgo(18))).toBe("18mo old");
  });
});
