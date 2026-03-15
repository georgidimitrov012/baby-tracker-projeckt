jest.mock('../../src/services/firebase', () => ({ db: {}, auth: {} }));
jest.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'user1' } }),
}));

const mockAddWeightLog    = jest.fn(() => Promise.resolve('log-id'));
const mockDeleteWeightLog = jest.fn(() => Promise.resolve());
const mockSubscribe       = jest.fn(() => jest.fn()); // returns unsubscribe

jest.mock('../../src/services/growthService', () => ({
  subscribeToWeightLogs: mockSubscribe,
  addWeightLog:          mockAddWeightLog,
  deleteWeightLog:       mockDeleteWeightLog,
}));
jest.mock('firebase/firestore', () => ({}));

const React = require('react');
const { renderHook, act } = require('@testing-library/react-native');
const { useGrowth } = require('../../src/hooks/useGrowth');

beforeEach(() => jest.clearAllMocks());

describe('useGrowth', () => {
  it('starts with loading=true and empty logs', () => {
    const { result } = renderHook(() => useGrowth('baby1'));
    expect(result.current.loading).toBe(true);
    expect(result.current.logs).toEqual([]);
  });

  it('subscribes to weight logs when babyId is provided', () => {
    renderHook(() => useGrowth('baby1'));
    expect(mockSubscribe).toHaveBeenCalledWith('baby1', expect.any(Function), expect.any(Function));
  });

  it('does not subscribe when babyId is null', () => {
    renderHook(() => useGrowth(null));
    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it('sets logs when subscription fires', async () => {
    const mockLogs = [{ id: 'l1', weight: 5.5, date: new Date() }];
    mockSubscribe.mockImplementationOnce((babyId, onData) => {
      onData(mockLogs);
      return jest.fn();
    });
    const { result } = renderHook(() => useGrowth('baby1'));
    expect(result.current.logs).toEqual(mockLogs);
    expect(result.current.loading).toBe(false);
  });

  it('sets error when subscription errors', async () => {
    const err = new Error('Firestore error');
    mockSubscribe.mockImplementationOnce((babyId, onData, onError) => {
      onError(err);
      return jest.fn();
    });
    const { result } = renderHook(() => useGrowth('baby1'));
    expect(result.current.error).toBe(err);
    expect(result.current.loading).toBe(false);
  });

  it('calls addWeightLog with correct args via addLog', async () => {
    mockSubscribe.mockImplementationOnce((_, onData) => { onData([]); return jest.fn(); });
    const { result } = renderHook(() => useGrowth('baby1'));
    await act(async () => {
      await result.current.addLog(5.2, new Date(), 'healthy');
    });
    expect(mockAddWeightLog).toHaveBeenCalledWith('baby1', 'user1', 5.2, expect.any(Date), 'healthy');
  });

  it('calls deleteWeightLog with correct args via removeLog', async () => {
    mockSubscribe.mockImplementationOnce((_, onData) => { onData([]); return jest.fn(); });
    const { result } = renderHook(() => useGrowth('baby1'));
    await act(async () => {
      await result.current.removeLog('log-id-99');
    });
    expect(mockDeleteWeightLog).toHaveBeenCalledWith('baby1', 'log-id-99');
  });

  it('returns unsubscribe function on unmount', () => {
    const unsub = jest.fn();
    mockSubscribe.mockReturnValueOnce(unsub);
    const { unmount } = renderHook(() => useGrowth('baby1'));
    unmount();
    expect(unsub).toHaveBeenCalled();
  });
});
