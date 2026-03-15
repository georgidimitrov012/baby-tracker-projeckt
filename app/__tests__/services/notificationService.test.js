// Mock all external deps before imports
jest.mock("../../src/services/firebase", () => ({ db: {} }));

const mockGetItem    = jest.fn();
const mockSetItem    = jest.fn(() => Promise.resolve());
const mockRemoveItem = jest.fn(() => Promise.resolve());

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem:    mockGetItem,
  setItem:    mockSetItem,
  removeItem: mockRemoveItem,
}));

const mockGetPermissions     = jest.fn();
const mockRequestPermissions = jest.fn();
const mockSchedule           = jest.fn(() => Promise.resolve("notif-id-1"));
const mockCancelScheduled    = jest.fn(() => Promise.resolve());
const mockGetExpoPushToken   = jest.fn(() => Promise.resolve({ data: "ExponentPushToken[test]" }));

jest.mock("expo-notifications", () => ({
  getPermissionsAsync:                 mockGetPermissions,
  requestPermissionsAsync:             mockRequestPermissions,
  scheduleNotificationAsync:           mockSchedule,
  cancelScheduledNotificationAsync:    mockCancelScheduled,
  getExpoPushTokenAsync:               mockGetExpoPushToken,
}));

const mockSetDoc = jest.fn(() => Promise.resolve());
const mockGetDoc = jest.fn();
const mockDoc    = jest.fn((...args) => ({ _path: args.join("/") }));

jest.mock("firebase/firestore", () => ({
  doc:             mockDoc,
  setDoc:          mockSetDoc,
  getDoc:          mockGetDoc,
}));

// Default: non-web platform
jest.mock("react-native", () => ({ Platform: { OS: "android" } }));

const {
  cancelFeedingReminder,
  scheduleFeedingReminder,
  rescheduleAfterFeeding,
  registerForPushNotifications,
} = require("../../src/services/notificationService");

beforeEach(() => {
  jest.clearAllMocks();
  mockGetItem.mockResolvedValue(null);
  mockGetPermissions.mockResolvedValue({ status: "granted" });
  mockRequestPermissions.mockResolvedValue({ status: "granted" });
});

describe("cancelFeedingReminder", () => {
  it("does nothing when no stored notification ID", async () => {
    mockGetItem.mockResolvedValueOnce(null);
    await cancelFeedingReminder();
    expect(mockCancelScheduled).not.toHaveBeenCalled();
  });

  it("cancels and removes stored ID when one exists", async () => {
    mockGetItem.mockResolvedValueOnce("notif-id-existing");
    await cancelFeedingReminder();
    expect(mockCancelScheduled).toHaveBeenCalledWith("notif-id-existing");
    expect(mockRemoveItem).toHaveBeenCalledTimes(1);
  });

  it("does not throw on web platform", async () => {
    const RN = require("react-native");
    const orig = RN.Platform.OS;
    RN.Platform.OS = "web";
    await expect(cancelFeedingReminder()).resolves.not.toThrow();
    RN.Platform.OS = orig;
  });
});

describe("scheduleFeedingReminder", () => {
  it("schedules a notification and stores the ID", async () => {
    await scheduleFeedingReminder(3, "Luna");
    expect(mockSchedule).toHaveBeenCalledTimes(1);
    expect(mockSetItem).toHaveBeenCalledWith(
      expect.any(String),
      "notif-id-1"
    );
  });

  it("uses the correct trigger interval in seconds", async () => {
    await scheduleFeedingReminder(2, "Luna");
    const [{ trigger }] = mockSchedule.mock.calls[0];
    expect(trigger.seconds).toBe(7200); // 2 * 3600
  });

  it("defaults to 3h interval", async () => {
    await scheduleFeedingReminder(undefined, "Luna");
    const [{ trigger }] = mockSchedule.mock.calls[0];
    expect(trigger.seconds).toBe(10800);
  });

  it("includes baby name in notification body", async () => {
    await scheduleFeedingReminder(3, "Oliver");
    const [{ content }] = mockSchedule.mock.calls[0];
    expect(content.body).toContain("Oliver");
  });

  it("does not schedule when permission not granted", async () => {
    mockGetPermissions.mockResolvedValueOnce({ status: "denied" });
    await scheduleFeedingReminder(3, "Luna");
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it("does nothing on web platform", async () => {
    const RN = require("react-native");
    const orig = RN.Platform.OS;
    RN.Platform.OS = "web";
    await scheduleFeedingReminder(3, "Luna");
    expect(mockSchedule).not.toHaveBeenCalled();
    RN.Platform.OS = orig;
  });

  it("cancels any existing reminder before scheduling new one", async () => {
    mockGetItem.mockResolvedValueOnce("old-notif-id");
    await scheduleFeedingReminder(3, "Luna");
    expect(mockCancelScheduled).toHaveBeenCalledWith("old-notif-id");
    expect(mockSchedule).toHaveBeenCalledTimes(1);
  });
});

describe("rescheduleAfterFeeding", () => {
  it("calls scheduleFeedingReminder with provided args", async () => {
    await rescheduleAfterFeeding(4, "Luna");
    expect(mockSchedule).toHaveBeenCalledTimes(1);
    const [{ trigger }] = mockSchedule.mock.calls[0];
    expect(trigger.seconds).toBe(14400); // 4h
  });

  it("defaults to 3h and generic name when no args", async () => {
    await rescheduleAfterFeeding();
    const [{ trigger }] = mockSchedule.mock.calls[0];
    expect(trigger.seconds).toBe(10800);
  });
});

describe("registerForPushNotifications", () => {
  it("returns null on web platform", async () => {
    const RN = require("react-native");
    const orig = RN.Platform.OS;
    RN.Platform.OS = "web";
    const result = await registerForPushNotifications("user1");
    expect(result).toBeNull();
    RN.Platform.OS = orig;
  });

  it("requests permission when not already granted", async () => {
    mockGetPermissions.mockResolvedValueOnce({ status: "undetermined" });
    mockRequestPermissions.mockResolvedValueOnce({ status: "granted" });
    await registerForPushNotifications("user1");
    expect(mockRequestPermissions).toHaveBeenCalled();
  });

  it("returns null when permission denied", async () => {
    mockGetPermissions.mockResolvedValueOnce({ status: "undetermined" });
    mockRequestPermissions.mockResolvedValueOnce({ status: "denied" });
    const result = await registerForPushNotifications("user1");
    expect(result).toBeNull();
  });

  it("saves expo push token to Firestore user doc", async () => {
    await registerForPushNotifications("user1");
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const [, data] = mockSetDoc.mock.calls[0];
    expect(data.expoPushToken).toBe("ExponentPushToken[test]");
  });

  it("returns the token on success", async () => {
    const token = await registerForPushNotifications("user1");
    expect(token).toBe("ExponentPushToken[test]");
  });
});
