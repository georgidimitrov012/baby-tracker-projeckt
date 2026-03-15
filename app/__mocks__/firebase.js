// Mock firebase/firestore
jest.mock("firebase/firestore", () => ({
  addDoc:       jest.fn(() => Promise.resolve({ id: "test-doc-id" })),
  updateDoc:    jest.fn(() => Promise.resolve()),
  deleteDoc:    jest.fn(() => Promise.resolve()),
  onSnapshot:   jest.fn(() => jest.fn()),
  collection:   jest.fn(() => ({})),
  doc:          jest.fn(() => ({})),
  serverTimestamp: jest.fn(() => new Date()),
  query:        jest.fn((ref) => ref),
  orderBy:      jest.fn(),
  where:        jest.fn(),
  getDocs:      jest.fn(() => Promise.resolve({ docs: [] })),
  getDoc:       jest.fn(() => Promise.resolve({ data: () => ({ displayName: "Test User" }) })),
  Timestamp:    {
    fromDate: jest.fn((d) => d),
    now:      jest.fn(() => new Date()),
  },
  initializeFirestore: jest.fn(() => ({})),
  persistentLocalCache: jest.fn(() => ({})),
}));

// Mock the firebase module used by services
jest.mock("../src/services/firebase", () => ({
  db:   {},
  auth: {},
}));
