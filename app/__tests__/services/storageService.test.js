jest.mock("../../src/services/firebase", () => ({
  db: {},
  auth: {},
  storage: {},
}));

const mockGetDownloadURL = jest.fn();
const mockUploadString  = jest.fn();
const mockRef           = jest.fn();

jest.mock("firebase/storage", () => ({
  ref:             (...args) => mockRef(...args),
  uploadString:    (...args) => mockUploadString(...args),
  getDownloadURL:  (...args) => mockGetDownloadURL(...args),
}));

const { uploadBabyPhoto } = require("../../src/services/storageService");

beforeEach(() => {
  jest.clearAllMocks();
});

describe("uploadBabyPhoto", () => {
  it("calls ref with the correct storage path", async () => {
    const fakeRef = {};
    mockRef.mockReturnValue(fakeRef);
    mockUploadString.mockResolvedValue();
    mockGetDownloadURL.mockResolvedValue("https://example.com/photo.jpg");

    await uploadBabyPhoto("baby123", "data:image/jpeg;base64,abc");

    expect(mockRef).toHaveBeenCalledWith(
      {},                                    // storage instance (the mock)
      "babyPhotos/baby123/profile.jpg"
    );
  });

  it("calls uploadString with data_url format", async () => {
    const fakeRef = {};
    mockRef.mockReturnValue(fakeRef);
    mockUploadString.mockResolvedValue();
    mockGetDownloadURL.mockResolvedValue("https://example.com/photo.jpg");

    const base64 = "data:image/jpeg;base64,/9j/abc123";
    await uploadBabyPhoto("baby123", base64);

    expect(mockUploadString).toHaveBeenCalledWith(fakeRef, base64, "data_url");
  });

  it("returns the download URL from getDownloadURL", async () => {
    const fakeRef = {};
    mockRef.mockReturnValue(fakeRef);
    mockUploadString.mockResolvedValue();
    mockGetDownloadURL.mockResolvedValue("https://storage.example.com/photo.jpg");

    const url = await uploadBabyPhoto("baby456", "data:image/png;base64,xyz");

    expect(url).toBe("https://storage.example.com/photo.jpg");
  });

  it("calls getDownloadURL with the same ref returned by ref()", async () => {
    const fakeRef = { _path: "babyPhotos/baby789/profile.jpg" };
    mockRef.mockReturnValue(fakeRef);
    mockUploadString.mockResolvedValue();
    mockGetDownloadURL.mockResolvedValue("https://cdn.example.com/img.jpg");

    await uploadBabyPhoto("baby789", "data:image/jpeg;base64,abc");

    expect(mockGetDownloadURL).toHaveBeenCalledWith(fakeRef);
  });

  it("throws when uploadString fails", async () => {
    mockRef.mockReturnValue({});
    mockUploadString.mockRejectedValue(new Error("storage/unauthorized"));

    await expect(
      uploadBabyPhoto("baby123", "data:image/jpeg;base64,abc")
    ).rejects.toThrow("storage/unauthorized");
  });

  it("throws when getDownloadURL fails", async () => {
    mockRef.mockReturnValue({});
    mockUploadString.mockResolvedValue();
    mockGetDownloadURL.mockRejectedValue(new Error("storage/object-not-found"));

    await expect(
      uploadBabyPhoto("baby123", "data:image/jpeg;base64,abc")
    ).rejects.toThrow("storage/object-not-found");
  });
});
