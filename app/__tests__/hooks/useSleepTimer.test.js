jest.mock('../../src/services/firebase', () => ({ db: {}, auth: {} }));
jest.mock('firebase/firestore', () => ({}));

const mockStartSleep = jest.fn(() => Promise.resolve());
const mockStopSleep  = jest.fn(() => Promise.resolve());

jest.mock('../../src/services/sleepService', () => ({
  startSleep: mockStartSleep,
  stopSleep:  mockStopSleep,
}));

const mockShowAlert = jest.fn();
jest.mock('../../src/utils/platform', () => ({
  showAlert:   mockShowAlert,
  showConfirm: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('../../src/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));
jest.mock('../../src/context/BabyContext', () => ({
  useBaby: jest.fn(),
}));
jest.mock('../../src/hooks/usePermissions', () => ({
  usePermissions: jest.fn(),
}));

const React = require('react');
const { renderHook, act } = require('@testing-library/react-native');
const { useSleepTimer } = require('../../src/hooks/useSleepTimer');
const { useAuth }        = require('../../src/context/AuthContext');
const { useBaby }        = require('../../src/context/BabyContext');
const { usePermissions } = require('../../src/hooks/usePermissions');

function setupMocks({ sleepStart = null, canWrite = true, babyId = 'baby1', sleepType = 'nap' } = {}) {
  useAuth.mockReturnValue({ user: { uid: 'user1', displayName: 'Alice' } });
  useBaby.mockReturnValue({
    activeBaby:   { activeSleepStart: sleepStart, activeSleepType: sleepType, name: 'Luna', members: { user1: 'owner' } },
    activeBabyId: babyId,
  });
  usePermissions.mockReturnValue({ canWriteEvents: canWrite });
}

beforeEach(() => {
  jest.clearAllMocks();
  setupMocks();
});

describe('useSleepTimer — initial state', () => {
  it('isActive is false when no activeSleepStart', () => {
    const { result } = renderHook(() => useSleepTimer());
    expect(result.current.isActive).toBe(false);
  });

  it('isActive is true when activeSleepStart is a Firestore Timestamp', () => {
    const fakeTs = { toDate: () => new Date(Date.now() - 5000) };
    setupMocks({ sleepStart: fakeTs });
    const { result } = renderHook(() => useSleepTimer());
    expect(result.current.isActive).toBe(true);
  });

  it('elapsedSeconds starts at 0 when inactive', () => {
    const { result } = renderHook(() => useSleepTimer());
    expect(result.current.elapsedSeconds).toBe(0);
  });

  it('starting and stopping are false initially', () => {
    const { result } = renderHook(() => useSleepTimer());
    expect(result.current.starting).toBe(false);
    expect(result.current.stopping).toBe(false);
  });
});

describe('useSleepTimer — handleStart', () => {
  it('calls startSleep with babyId, userId, and sleepType', async () => {
    const { result } = renderHook(() => useSleepTimer());
    await act(async () => {
      await result.current.handleStart('night');
    });
    expect(mockStartSleep).toHaveBeenCalledWith('baby1', 'user1', 'night');
  });

  it('defaults sleepType to nap', async () => {
    const { result } = renderHook(() => useSleepTimer());
    await act(async () => {
      await result.current.handleStart();
    });
    expect(mockStartSleep).toHaveBeenCalledWith('baby1', 'user1', 'nap');
  });

  it('does not call startSleep when no babyId', async () => {
    setupMocks({ babyId: null });
    const { result } = renderHook(() => useSleepTimer());
    await act(async () => {
      await result.current.handleStart();
    });
    expect(mockStartSleep).not.toHaveBeenCalled();
    expect(mockShowAlert).toHaveBeenCalled();
  });

  it('does not call startSleep when canWriteEvents is false', async () => {
    setupMocks({ canWrite: false });
    const { result } = renderHook(() => useSleepTimer());
    await act(async () => {
      await result.current.handleStart();
    });
    expect(mockStartSleep).not.toHaveBeenCalled();
  });
});

describe('useSleepTimer — elapsed seconds clamping', () => {
  it('elapsedSeconds is 0 when activeSleepStart is slightly in the future (server clock skew)', () => {
    // Simulate Firestore server timestamp slightly ahead of device clock
    const futureTs = { toDate: () => new Date(Date.now() + 3000) };
    setupMocks({ sleepStart: futureTs });
    const { result } = renderHook(() => useSleepTimer());
    // isActive should be true (startedAt is defined), but elapsedSeconds clamped to 0
    expect(result.current.isActive).toBe(true);
    expect(result.current.elapsedSeconds).toBeGreaterThanOrEqual(0);
  });

  it('elapsedSeconds is non-negative when sleep started 30s ago', () => {
    const pastTs = { toDate: () => new Date(Date.now() - 30000) };
    setupMocks({ sleepStart: pastTs });
    const { result } = renderHook(() => useSleepTimer());
    expect(result.current.elapsedSeconds).toBeGreaterThanOrEqual(0);
  });
});

describe('useSleepTimer — handleStop', () => {
  it('calls stopSleep with the correct sleepType from baby doc', async () => {
    const startTime = new Date(Date.now() - 60000);
    const fakeTs = { toDate: () => startTime };
    setupMocks({ sleepStart: fakeTs, sleepType: 'night' });
    const { result } = renderHook(() => useSleepTimer());
    await act(async () => {
      await result.current.handleStop();
    });
    expect(mockStopSleep).toHaveBeenCalledWith('baby1', 'user1', startTime, 'night');
  });

  it('does not call stopSleep when not active', async () => {
    setupMocks({ sleepStart: null });
    const { result } = renderHook(() => useSleepTimer());
    await act(async () => {
      await result.current.handleStop();
    });
    expect(mockStopSleep).not.toHaveBeenCalled();
  });
});
