jest.mock('../../src/services/firebase', () => ({ db: {}, auth: {} }));
jest.mock('firebase/firestore', () => ({}));
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

jest.mock('../../src/context/AuthContext', () => ({
  useAuth: jest.fn(() => ({ user: { uid: 'u1', displayName: 'Alice' } })),
}));
jest.mock('../../src/context/BabyContext', () => ({
  useBaby: jest.fn(() => ({
    activeBaby:   { name: 'Luna', settings: { feedingReminderHours: 3 }, members: { u1: 'owner' } },
    activeBabyId: 'baby1',
  })),
}));
jest.mock('../../src/hooks/usePermissions', () => ({
  usePermissions: jest.fn(() => ({ canWriteEvents: true })),
}));

const mockAddEvent = jest.fn(() => Promise.resolve('event-id'));
jest.mock('../../src/services/eventStore', () => ({ addEvent: mockAddEvent }));
jest.mock('../../src/services/notificationService', () => ({
  notifyCoParents:         jest.fn(),
  rescheduleAfterFeeding:  jest.fn(),
}));
jest.mock('../../src/utils/platform', () => ({
  showAlert:   jest.fn(),
  showConfirm: jest.fn(() => Promise.resolve(true)),
}));
jest.mock('../../src/components/FormInput', () => {
  const React = require('react');
  const { TextInput } = require('react-native');
  return ({ label, value, onChangeText, placeholder, error, ...rest }) =>
    React.createElement(TextInput, { testID: label, value, onChangeText, placeholder, accessibilityLabel: label, ...rest });
});

const React = require('react');
const { render, fireEvent, act, waitFor } = require('@testing-library/react-native');
const Feeding = require('../../src/screens/app/Feeding').default;
const { usePermissions } = require('../../src/hooks/usePermissions');

const mockNav = { navigate: jest.fn(), goBack: jest.fn() };

beforeEach(() => jest.clearAllMocks());

describe('Feeding — rendering', () => {
  it('renders without crashing', () => {
    expect(() => render(<Feeding navigation={mockNav} />)).not.toThrow();
  });

  it('shows Bottle type button by default', () => {
    const { getByText } = render(<Feeding navigation={mockNav} />);
    expect(getByText(/Bottle/i)).toBeTruthy();
  });

  it('shows Breast type button', () => {
    const { getByText } = render(<Feeding navigation={mockNav} />);
    expect(getByText(/Breast/i)).toBeTruthy();
  });

  it('shows Formula type button', () => {
    const { getByText } = render(<Feeding navigation={mockNav} />);
    expect(getByText(/Formula/i)).toBeTruthy();
  });

  it('shows read-only note when canWriteEvents is false', () => {
    usePermissions.mockReturnValueOnce({ canWriteEvents: false });
    const { getByText } = render(<Feeding navigation={mockNav} />);
    expect(getByText(/read-only access/i)).toBeTruthy();
  });
});

describe('Feeding — bottle save', () => {
  it('calls addEvent with feedingType=bottle and amount', async () => {
    const { getByLabelText, getByText } = render(<Feeding navigation={mockNav} />);
    fireEvent.changeText(getByLabelText('Amount'), '150');
    await act(async () => {
      fireEvent.press(getByText('Save'));
    });
    await waitFor(() => {
      expect(mockAddEvent).toHaveBeenCalledWith(
        'baby1', 'u1', 'feeding',
        expect.objectContaining({ feedingType: 'bottle', amount: 150 })
      );
    });
  });

  it('does not save with invalid amount', async () => {
    const { getByLabelText, getByText } = render(<Feeding navigation={mockNav} />);
    fireEvent.changeText(getByLabelText('Amount'), '');
    await act(async () => {
      fireEvent.press(getByText('Save'));
    });
    expect(mockAddEvent).not.toHaveBeenCalled();
  });

  it('navigates back after successful save', async () => {
    const { getByLabelText, getByText } = render(<Feeding navigation={mockNav} />);
    fireEvent.changeText(getByLabelText('Amount'), '120');
    await act(async () => {
      fireEvent.press(getByText('Save'));
    });
    await waitFor(() => expect(mockNav.goBack).toHaveBeenCalled());
  });
});

describe('Feeding — breast save', () => {
  it('shows Duration field when Breast is selected', () => {
    const { getByLabelText, getByText } = render(<Feeding navigation={mockNav} />);
    fireEvent.press(getByText(/Breast/i));
    expect(getByLabelText('Duration')).toBeTruthy();
  });

  it('calls addEvent with feedingType=breast and duration', async () => {
    const { getByLabelText, getByText } = render(<Feeding navigation={mockNav} />);
    fireEvent.press(getByText(/Breast/i));
    fireEvent.changeText(getByLabelText('Duration'), '20');
    await act(async () => {
      fireEvent.press(getByText('Save'));
    });
    await waitFor(() => {
      expect(mockAddEvent).toHaveBeenCalledWith(
        'baby1', 'u1', 'feeding',
        expect.objectContaining({ feedingType: 'breast', duration: 20 })
      );
    });
  });

  it('does not save breast feeding with empty duration', async () => {
    const { getByLabelText, getByText } = render(<Feeding navigation={mockNav} />);
    fireEvent.press(getByText(/Breast/i));
    await act(async () => {
      fireEvent.press(getByText('Save'));
    });
    expect(mockAddEvent).not.toHaveBeenCalled();
  });
});
