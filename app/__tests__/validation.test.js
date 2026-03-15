import {
  validateAmount,
  validateDuration,
  validateFeedingDuration,
  validateWeight,
  validateMilestoneTitle,
} from "../src/utils/validation";

describe("validateAmount", () => {
  it("rejects empty string", () => {
    expect(validateAmount("").valid).toBe(false);
  });
  it("rejects non-numeric", () => {
    expect(validateAmount("abc").valid).toBe(false);
  });
  it("rejects 0", () => {
    expect(validateAmount("0").valid).toBe(false);
  });
  it("rejects negatives", () => {
    expect(validateAmount("-5").valid).toBe(false);
  });
  it("rejects > 2000", () => {
    expect(validateAmount("2001").valid).toBe(false);
  });
  it("accepts valid integer", () => {
    expect(validateAmount("150").valid).toBe(true);
  });
  it("accepts max boundary 2000", () => {
    expect(validateAmount("2000").valid).toBe(true);
  });
});

describe("validateDuration", () => {
  it("rejects empty", () => {
    expect(validateDuration("").valid).toBe(false);
  });
  it("rejects > 1440", () => {
    expect(validateDuration("1441").valid).toBe(false);
  });
  it("accepts 60", () => {
    expect(validateDuration("60").valid).toBe(true);
  });
  it("rejects 0", () => {
    expect(validateDuration("0").valid).toBe(false);
  });
  it("accepts 1440 (24h boundary)", () => {
    expect(validateDuration("1440").valid).toBe(true);
  });
});

describe("validateFeedingDuration", () => {
  it("rejects > 120", () => {
    expect(validateFeedingDuration("121").valid).toBe(false);
  });
  it("accepts 15", () => {
    expect(validateFeedingDuration("15").valid).toBe(true);
  });
  it("accepts 120 (boundary)", () => {
    expect(validateFeedingDuration("120").valid).toBe(true);
  });
  it("rejects empty", () => {
    expect(validateFeedingDuration("").valid).toBe(false);
  });
  it("rejects 0", () => {
    expect(validateFeedingDuration("0").valid).toBe(false);
  });
});

describe("validateWeight", () => {
  it("rejects < 0.5", () => {
    expect(validateWeight("0.4").valid).toBe(false);
  });
  it("rejects > 30", () => {
    expect(validateWeight("30.1").valid).toBe(false);
  });
  it("accepts 3.5", () => {
    expect(validateWeight("3.5").valid).toBe(true);
  });
  it("accepts 0.5 (boundary)", () => {
    expect(validateWeight("0.5").valid).toBe(true);
  });
  it("accepts 30 (boundary)", () => {
    expect(validateWeight("30").valid).toBe(true);
  });
  it("rejects empty", () => {
    expect(validateWeight("").valid).toBe(false);
  });
  it("rejects non-numeric", () => {
    expect(validateWeight("abc").valid).toBe(false);
  });
});

describe("validateMilestoneTitle", () => {
  it("rejects empty", () => {
    expect(validateMilestoneTitle("").valid).toBe(false);
  });
  it("rejects > 100 chars", () => {
    expect(validateMilestoneTitle("a".repeat(101)).valid).toBe(false);
  });
  it("accepts valid title", () => {
    expect(validateMilestoneTitle("First smile").valid).toBe(true);
  });
  it("accepts exactly 100 chars", () => {
    expect(validateMilestoneTitle("a".repeat(100)).valid).toBe(true);
  });
});
