// Mock platform and expo modules
jest.mock("react-native", () => ({ Platform: { OS: "android" } }));
jest.mock("expo-file-system", () => ({
  documentDirectory: "file:///documents/",
  writeAsStringAsync: jest.fn(() => Promise.resolve()),
  EncodingType: { UTF8: "utf8" },
}));
jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  shareAsync: jest.fn(() => Promise.resolve()),
}));

import { eventsToCsv, exportEventsToCsvFile } from "../../src/utils/csvExport";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

beforeEach(() => jest.clearAllMocks());

const makeEvent = (overrides = {}) => ({
  id: "e1",
  type: "feeding",
  time: new Date("2024-03-15T10:30:00.000Z"),
  feedingType: "bottle",
  sleepType: null,
  amount: 120,
  duration: null,
  notes: "test note",
  loggedBy: "uid1",
  ...overrides,
});

describe("eventsToCsv — structure", () => {
  it("returns header row as first line", () => {
    const csv = eventsToCsv([]);
    const header = csv.split("\n")[0];
    expect(header).toContain("Date");
    expect(header).toContain("Time");
    expect(header).toContain("Type");
    expect(header).toContain("Feeding Type");
    expect(header).toContain("Sleep Type");
    expect(header).toContain("Amount (ml)");
    expect(header).toContain("Duration (min)");
    expect(header).toContain("Notes");
    expect(header).toContain("Logged By");
  });

  it("produces exactly N+1 lines for N events (no trailing newline)", () => {
    const csv = eventsToCsv([makeEvent(), makeEvent()]);
    expect(csv.split("\n")).toHaveLength(3);
  });

  it("empty events list — only header", () => {
    const csv = eventsToCsv([]);
    expect(csv.split("\n")).toHaveLength(1);
  });
});

describe("eventsToCsv — field values", () => {
  it("writes amount for bottle feeding", () => {
    const csv = eventsToCsv([makeEvent({ feedingType: "bottle", amount: 150 })]);
    expect(csv).toContain("150");
  });

  it("writes duration for breast feeding", () => {
    const csv = eventsToCsv([makeEvent({ feedingType: "breast", duration: 20, amount: null })]);
    expect(csv).toContain("20");
  });

  it("writes sleepType for sleep events", () => {
    const csv = eventsToCsv([makeEvent({ type: "sleep", sleepType: "night", duration: 60 })]);
    expect(csv).toContain("night");
  });

  it("resolves loggedBy UID to name from nameMap", () => {
    const csv = eventsToCsv([makeEvent({ loggedBy: "uid1" })], { uid1: "Alice" });
    expect(csv).toContain("Alice");
  });

  it("falls back to UID when not in nameMap", () => {
    const csv = eventsToCsv([makeEvent({ loggedBy: "uid99" })], {});
    expect(csv).toContain("uid99");
  });

  it("handles null loggedBy gracefully", () => {
    const csv = eventsToCsv([makeEvent({ loggedBy: null })]);
    expect(csv).toBeDefined();
  });

  it("uses empty string for null feedingType", () => {
    const csv = eventsToCsv([makeEvent({ type: "poop", feedingType: null, sleepType: null })]);
    const row = csv.split("\n")[1].split(",");
    // feedingType column (index 3) should be empty
    expect(row[3]).toBe("");
  });

  it("uses empty string for null amount", () => {
    const csv = eventsToCsv([makeEvent({ amount: null })]);
    expect(csv).toBeDefined();
  });
});

describe("eventsToCsv — CSV escaping", () => {
  it("wraps values with commas in double quotes", () => {
    const csv = eventsToCsv([makeEvent({ notes: "hello, world" })]);
    expect(csv).toContain('"hello, world"');
  });

  it("escapes internal double quotes", () => {
    const csv = eventsToCsv([makeEvent({ notes: 'say "hi"' })]);
    expect(csv).toContain('"say ""hi"""');
  });

  it("wraps values with newlines in double quotes", () => {
    const csv = eventsToCsv([makeEvent({ notes: "line1\nline2" })]);
    expect(csv).toContain('"line1\nline2"');
  });

  it("leaves plain values unquoted", () => {
    const csv = eventsToCsv([makeEvent({ notes: "simple" })]);
    expect(csv).toContain("simple");
    expect(csv).not.toContain('"simple"');
  });
});

describe("exportEventsToCsvFile", () => {
  it("writes file to documentDirectory", async () => {
    await exportEventsToCsvFile([makeEvent()], "Luna");
    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledTimes(1);
    const [path] = FileSystem.writeAsStringAsync.mock.calls[0];
    expect(path).toContain("file:///documents/");
    expect(path).toContain("Luna");
    expect(path).toContain(".csv");
  });

  it("calls shareAsync after writing", async () => {
    await exportEventsToCsvFile([makeEvent()], "Luna");
    expect(Sharing.shareAsync).toHaveBeenCalledTimes(1);
  });

  it("throws when Sharing is unavailable", async () => {
    Sharing.isAvailableAsync.mockResolvedValueOnce(false);
    await expect(exportEventsToCsvFile([makeEvent()], "Luna")).rejects.toThrow();
  });

  it("sanitizes baby name for filename", async () => {
    await exportEventsToCsvFile([makeEvent()], "Baby O'Brien");
    const [path] = FileSystem.writeAsStringAsync.mock.calls[0];
    expect(path).not.toContain("'");
  });

  it("throws on web platform", async () => {
    const RN = require("react-native");
    const original = RN.Platform.OS;
    RN.Platform.OS = "web";
    await expect(exportEventsToCsvFile([], "test")).rejects.toThrow("web");
    RN.Platform.OS = original;
  });
});
