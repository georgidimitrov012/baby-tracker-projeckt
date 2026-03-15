// Mock all firebase/context deps that useSleepTimer transitively imports
jest.mock('../../src/services/firebase', () => ({ db: {}, auth: {} }));
jest.mock('firebase/firestore', () => ({}));
jest.mock('../../src/context/AuthContext',  () => ({ useAuth:        jest.fn() }));
jest.mock('../../src/context/BabyContext',  () => ({ useBaby:        jest.fn() }));
jest.mock('../../src/hooks/usePermissions', () => ({ usePermissions: jest.fn() }));
jest.mock('../../src/services/sleepService', () => ({ startSleep: jest.fn(), stopSleep: jest.fn() }));
jest.mock('../../src/utils/platform', () => ({ showAlert: jest.fn(), showConfirm: jest.fn() }));

const { formatElapsed } = require('../../src/hooks/useSleepTimer');

describe('formatElapsed', () => {
  it('formats 0 seconds as 00:00', () => {
    expect(formatElapsed(0)).toBe('00:00');
  });

  it('formats 59 seconds', () => {
    expect(formatElapsed(59)).toBe('00:59');
  });

  it('formats 60 seconds as 01:00', () => {
    expect(formatElapsed(60)).toBe('01:00');
  });

  it('formats 90 seconds as 01:30', () => {
    expect(formatElapsed(90)).toBe('01:30');
  });

  it('formats 3599 seconds (59:59)', () => {
    expect(formatElapsed(3599)).toBe('59:59');
  });

  it('formats 3600 seconds as 1:00:00', () => {
    expect(formatElapsed(3600)).toBe('1:00:00');
  });

  it('formats 3661 seconds as 1:01:01', () => {
    expect(formatElapsed(3661)).toBe('1:01:01');
  });

  it('formats 7200 seconds as 2:00:00', () => {
    expect(formatElapsed(7200)).toBe('2:00:00');
  });

  it('pads minutes and seconds with leading zeros', () => {
    expect(formatElapsed(65)).toBe('01:05');
  });
});
