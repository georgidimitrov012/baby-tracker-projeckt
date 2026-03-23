jest.mock('../../src/services/firebase', () => ({ db: {}, auth: {} }));
jest.mock('../../src/context/LanguageContext', () => {
  const en = jest.requireActual('../../src/i18n/en').default;
  return {
    useLanguage: jest.fn(() => ({
      t: (k, vars = {}) => {
        let str = en[k] ?? k;
        Object.entries(vars).forEach(([key, val]) => {
          str = str.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(val ?? ''));
        });
        return str;
      },
      language: 'en',
      changeLanguage: jest.fn(),
    })),
  };
});
jest.mock('firebase/firestore', () => ({
  updateDoc: jest.fn(() => Promise.resolve()),
  doc: jest.fn(),
}));

// Context mocks
jest.mock('../../src/context/AuthContext', () => ({
  useAuth: jest.fn(() => ({ user: { uid: 'u1', displayName: 'Alice' } })),
}));
jest.mock('../../src/context/BabyContext', () => ({
  useBaby: jest.fn(() => ({
    activeBaby:   { name: 'Luna', members: { u1: 'owner' } },
    activeBabyId: 'baby1',
    loadingBabies: false,
  })),
}));
jest.mock('../../src/hooks/usePermissions', () => ({
  usePermissions: jest.fn(() => ({ canWriteEvents: true })),
}));
jest.mock('../../src/hooks/useSleepTimer', () => ({
  useSleepTimer: jest.fn(() => ({ isActive: false, elapsedSeconds: 0, starting: false, stopping: false, handleStart: jest.fn(), handleStop: jest.fn() })),
}));
jest.mock('../../src/hooks/useEvents', () => ({
  useEvents: jest.fn(() => ({ events: [], loading: false, error: null })),
}));
jest.mock('../../src/hooks/useReminders', () => ({
  useReminders: jest.fn(),
}));
jest.mock('../../src/hooks/useNapPredictor', () => ({
  useNapPredictor: jest.fn(() => ({ nextNapIn: null, wakeWindowMinutes: null, recommendation: null, overdue: false })),
}));
jest.mock('../../src/utils/babyAge', () => ({
  getBabyAge: jest.fn(() => '10w 3d old'),
}));

// Service mocks
const mockAddEvent = jest.fn(() => Promise.resolve('event-id'));
jest.mock('../../src/services/eventStore', () => ({ addEvent: mockAddEvent }));
jest.mock('../../src/services/authService', () => ({ logoutUser: jest.fn(() => Promise.resolve()) }));
jest.mock('../../src/services/notificationService', () => ({ notifyCoParents: jest.fn(), scheduleDailyDigest: jest.fn(() => Promise.resolve()) }));

// UI mocks
jest.mock('../../src/components/RoleBadge', () => () => null);
jest.mock('../../src/components/SleepTimerCard', () => () => null);
jest.mock('../../src/components/OfflineBanner', () => () => null);
jest.mock('../../src/utils/platform', () => ({
  showAlert:   jest.fn(),
  showConfirm: jest.fn(() => Promise.resolve(true)),
}));

const React = require('react');
const { render, fireEvent, act, waitFor } = require('@testing-library/react-native');
const Dashboard = require('../../src/screens/app/Dashboard').default;
const { usePermissions } = require('../../src/hooks/usePermissions');
const { useBaby }        = require('../../src/context/BabyContext');

const mockNav = { navigate: jest.fn(), goBack: jest.fn() };

beforeEach(() => jest.clearAllMocks());

describe('Dashboard — rendering', () => {
  it('renders without crashing', () => {
    expect(() => render(<Dashboard navigation={mockNav} />)).not.toThrow();
  });

  it('shows the user greeting', () => {
    const { getByText } = render(<Dashboard navigation={mockNav} />);
    // Greeting is now split: time-aware line + display name on separate lines
    expect(getByText('Alice')).toBeTruthy();
  });

  it('shows baby name when a baby is active', () => {
    const { getByText } = render(<Dashboard navigation={mockNav} />);
    expect(getByText('Luna')).toBeTruthy();
  });

  it('shows "No baby" warning when no active baby', () => {
    useBaby.mockReturnValueOnce({ activeBaby: null, activeBabyId: null, loadingBabies: false });
    const { getByText } = render(<Dashboard navigation={mockNav} />);
    expect(getByText(/No baby/)).toBeTruthy();
  });
});

describe('Dashboard — permissions', () => {
  it('shows Feed quick-log button when user can write', () => {
    const { getByLabelText } = render(<Dashboard navigation={mockNav} />);
    expect(getByLabelText('Log feeding')).toBeTruthy();
  });

  it('hides quick-log buttons for read-only users', () => {
    usePermissions.mockReturnValueOnce({ canWriteEvents: false });
    const { queryByLabelText } = render(<Dashboard navigation={mockNav} />);
    expect(queryByLabelText('Log feeding')).toBeNull();
  });

  it('shows read-only banner for viewers', () => {
    usePermissions.mockReturnValueOnce({ canWriteEvents: false });
    const { getByText } = render(<Dashboard navigation={mockNav} />);
    expect(getByText(/read-only access/i)).toBeTruthy();
  });

  it('always shows Analytics button regardless of role', () => {
    usePermissions.mockReturnValueOnce({ canWriteEvents: false });
    const { getByText } = render(<Dashboard navigation={mockNav} />);
    expect(getByText('Analytics')).toBeTruthy();
  });
});

describe('Dashboard — navigation', () => {
  it('navigates to Settings on settings button press', () => {
    const { getByLabelText } = render(<Dashboard navigation={mockNav} />);
    fireEvent.press(getByLabelText('Settings'));
    expect(mockNav.navigate).toHaveBeenCalledWith('Settings');
  });

  it('navigates to Feeding on Feed button press', () => {
    const { getByLabelText } = render(<Dashboard navigation={mockNav} />);
    fireEvent.press(getByLabelText('Log feeding'));
    expect(mockNav.navigate).toHaveBeenCalledWith('Feeding');
  });
});

describe('Dashboard — quick log', () => {
  it('calls addEvent with poop type on quick log poop', async () => {
    const { getByLabelText } = render(<Dashboard navigation={mockNav} />);
    await act(async () => {
      fireEvent.press(getByLabelText('Quick log poop'));
    });
    expect(mockAddEvent).toHaveBeenCalledWith('baby1', 'u1', 'poop');
  });

  it('calls addEvent with pee type on quick log pee', async () => {
    const { getByLabelText } = render(<Dashboard navigation={mockNav} />);
    await act(async () => {
      fireEvent.press(getByLabelText('Quick log pee'));
    });
    expect(mockAddEvent).toHaveBeenCalledWith('baby1', 'u1', 'pee');
  });
});
