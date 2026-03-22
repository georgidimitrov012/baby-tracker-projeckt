jest.mock("../../src/services/firebase", () => ({ db: {} }));

const mockAddDoc    = jest.fn(() => Promise.resolve({ id: "vaccine-id" }));
const mockGetDocs   = jest.fn(() => Promise.resolve({ docs: [] }));
const mockUpdateDoc = jest.fn(() => Promise.resolve());
const mockDeleteDoc = jest.fn(() => Promise.resolve());
const mockCollection = jest.fn((...args) => ({ _path: args.join("/") }));
const mockDoc        = jest.fn((...args) => ({ _path: args.join("/") }));
const mockTimestampFromDate = jest.fn((d) => ({ _type: "Timestamp", _date: d }));
const mockTimestampNow      = jest.fn(() => ({ _type: "Timestamp", _now: true }));

jest.mock("firebase/firestore", () => ({
  collection:  mockCollection,
  addDoc:      mockAddDoc,
  getDocs:     mockGetDocs,
  updateDoc:   mockUpdateDoc,
  deleteDoc:   mockDeleteDoc,
  doc:         mockDoc,
  Timestamp:   { fromDate: mockTimestampFromDate, now: mockTimestampNow },
}));

const {
  DEFAULT_VACCINE_SCHEDULE,
  getVaccines,
  addVaccine,
  updateVaccine,
  deleteVaccine,
  seedDefaultVaccines,
} = require("../../src/services/vaccineService");

beforeEach(() => {
  jest.clearAllMocks();
  mockAddDoc.mockResolvedValue({ id: "vaccine-id" });
  mockGetDocs.mockResolvedValue({ docs: [] });
});

// ── Bulgarian schedule shape ──────────────────────────────────────────────────

describe("DEFAULT_VACCINE_SCHEDULE — Bulgarian national immunization calendar", () => {
  it("contains at least 13 entries (birth through 6 years)", () => {
    expect(DEFAULT_VACCINE_SCHEDULE.length).toBeGreaterThanOrEqual(13);
  });

  it("first entry is BCG at birth (ageMonths: 0)", () => {
    const bcg = DEFAULT_VACCINE_SCHEDULE[0];
    expect(bcg.ageMonths).toBe(0);
    expect(bcg.name).toMatch(/BCG/i);
  });

  it("includes Hepatitis B at birth (dose 1)", () => {
    const hepBAtBirth = DEFAULT_VACCINE_SCHEDULE.find(
      (v) => v.ageMonths === 0 && /хепатит|hepatit|HepB/i.test(v.name)
    );
    expect(hepBAtBirth).toBeDefined();
  });

  it("includes hexavalent vaccine (DTaP-IPV-Hib-HepB) at 2 months", () => {
    const hex = DEFAULT_VACCINE_SCHEDULE.find(
      (v) => v.ageMonths === 2 && /хекса|hexavalent|DTaP/i.test(v.name)
    );
    expect(hex).toBeDefined();
    expect(hex.notes).toMatch(/1/); // 1st dose
  });

  it("includes PCV13 (pneumococcal) at 2 months", () => {
    const pcv = DEFAULT_VACCINE_SCHEDULE.find(
      (v) => v.ageMonths === 2 && /PCV|пневмо/i.test(v.name)
    );
    expect(pcv).toBeDefined();
  });

  it("includes hexavalent at 3 months (2nd dose)", () => {
    const hex = DEFAULT_VACCINE_SCHEDULE.find(
      (v) => v.ageMonths === 3 && /хекса|hexavalent|DTaP/i.test(v.name)
    );
    expect(hex).toBeDefined();
    expect(hex.notes).toMatch(/2/);
  });

  it("includes hexavalent and PCV13 at 4 months", () => {
    const atFour = DEFAULT_VACCINE_SCHEDULE.filter((v) => v.ageMonths === 4);
    expect(atFour.length).toBeGreaterThanOrEqual(2);
  });

  it("includes PCV13 booster at 11 months", () => {
    const pcvBooster = DEFAULT_VACCINE_SCHEDULE.find(
      (v) => v.ageMonths === 11 && /PCV|пневмо/i.test(v.name)
    );
    expect(pcvBooster).toBeDefined();
    expect(pcvBooster.notes).toMatch(/реваксин|booster/i);
  });

  it("includes MMR at 12 months (1st dose)", () => {
    const mmr = DEFAULT_VACCINE_SCHEDULE.find(
      (v) => v.ageMonths === 12 && /MMR|морбили|паротит/i.test(v.name)
    );
    expect(mmr).toBeDefined();
    expect(mmr.notes).toMatch(/1/);
  });

  it("includes hexavalent booster at 13 months (4th dose)", () => {
    const hex13 = DEFAULT_VACCINE_SCHEDULE.find(
      (v) => v.ageMonths === 13 && /хекса|hexavalent|DTaP/i.test(v.name)
    );
    expect(hex13).toBeDefined();
    expect(hex13.notes).toMatch(/4|реваксин/i);
  });

  it("includes pre-school boosters at 72 months (6 years)", () => {
    const atSix = DEFAULT_VACCINE_SCHEDULE.filter((v) => v.ageMonths === 72);
    expect(atSix.length).toBeGreaterThanOrEqual(2);
  });

  it("does NOT contain any UK-specific vaccines (MenB, Rotavirus, Hib/MenC)", () => {
    const ukOnly = DEFAULT_VACCINE_SCHEDULE.filter((v) =>
      /MenB|Rotavirus|Hib\/MenC|4-in-1 pre-school/i.test(v.name)
    );
    expect(ukOnly).toHaveLength(0);
  });

  it("every entry has name, ageMonths (number), and notes", () => {
    DEFAULT_VACCINE_SCHEDULE.forEach((v) => {
      expect(typeof v.name).toBe("string");
      expect(v.name.length).toBeGreaterThan(0);
      expect(typeof v.ageMonths).toBe("number");
      expect(typeof v.notes).toBe("string");
    });
  });
});

// ── seedDefaultVaccines ───────────────────────────────────────────────────────

describe("seedDefaultVaccines", () => {
  const birthDate = new Date("2024-01-15");

  it("adds one vaccine document per schedule entry", async () => {
    await seedDefaultVaccines("baby1", birthDate);
    expect(mockAddDoc).toHaveBeenCalledTimes(DEFAULT_VACCINE_SCHEDULE.length);
  });

  it("does not seed if vaccines already exist", async () => {
    mockGetDocs.mockResolvedValueOnce({
      docs: [{ id: "v1", data: () => ({ name: "BCG", isCompleted: false }) }],
    });
    await seedDefaultVaccines("baby1", birthDate);
    expect(mockAddDoc).not.toHaveBeenCalled();
  });

  it("calculates BCG scheduled date as the birth date itself", async () => {
    await seedDefaultVaccines("baby1", birthDate);
    // BCG is first entry, ageMonths: 0 — scheduled date = birth date
    const firstCall = mockAddDoc.mock.calls[0][1];
    const bcgDate = mockTimestampFromDate.mock.calls[0][0];
    expect(bcgDate.getFullYear()).toBe(2024);
    expect(bcgDate.getMonth()).toBe(0); // January
    expect(bcgDate.getDate()).toBe(15);
  });

  it("calculates hexavalent (2 months) scheduled date correctly", async () => {
    await seedDefaultVaccines("baby1", birthDate);
    // Find the 2-month hexavalent entry index in the schedule
    const hexIdx = DEFAULT_VACCINE_SCHEDULE.findIndex(
      (v) => v.ageMonths === 2 && /хекса|hexavalent|DTaP/i.test(v.name)
    );
    const hexDate = mockTimestampFromDate.mock.calls[hexIdx][0];
    expect(hexDate.getMonth()).toBe(2); // March (Jan + 2 months)
    expect(hexDate.getDate()).toBe(15);
  });

  it("accepts a Firestore Timestamp as birthDate", async () => {
    const firestoreTs = { toDate: () => birthDate };
    await seedDefaultVaccines("baby1", firestoreTs);
    expect(mockAddDoc).toHaveBeenCalledTimes(DEFAULT_VACCINE_SCHEDULE.length);
  });
});

// ── addVaccine ────────────────────────────────────────────────────────────────

describe("addVaccine", () => {
  it("stores vaccine name and isCompleted=false by default", async () => {
    await addVaccine("baby1", { name: "BCG", scheduledDate: new Date() });
    const [, fields] = mockAddDoc.mock.calls[0];
    expect(fields.name).toBe("BCG");
    expect(fields.isCompleted).toBe(false);
  });

  it("wraps scheduledDate in Timestamp.fromDate", async () => {
    const d = new Date("2024-03-01");
    await addVaccine("baby1", { name: "BCG", scheduledDate: d });
    expect(mockTimestampFromDate).toHaveBeenCalledWith(expect.any(Date));
  });

  it("stores null scheduledDate when not provided", async () => {
    await addVaccine("baby1", { name: "BCG" });
    const [, fields] = mockAddDoc.mock.calls[0];
    expect(fields.scheduledDate).toBeNull();
  });
});

// ── updateVaccine ─────────────────────────────────────────────────────────────

describe("updateVaccine", () => {
  it("calls updateDoc once", async () => {
    await updateVaccine("baby1", "v1", { isCompleted: true });
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
  });

  it("wraps completedDate in Timestamp.fromDate when provided", async () => {
    const d = new Date();
    await updateVaccine("baby1", "v1", { completedDate: d });
    expect(mockTimestampFromDate).toHaveBeenCalledWith(expect.any(Date));
  });
});

// ── deleteVaccine ─────────────────────────────────────────────────────────────

describe("deleteVaccine", () => {
  it("calls deleteDoc once", async () => {
    await deleteVaccine("baby1", "v1");
    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
  });
});
