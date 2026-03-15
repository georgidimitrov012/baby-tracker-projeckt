jest.mock('../../src/services/firebase', () => ({ db: {}, auth: {} }));
jest.mock('firebase/firestore', () => ({}));

jest.mock('../../src/context/BabyContext', () => ({
  useBaby: jest.fn(() => ({ activeBabyId: 'baby1' })),
}));
jest.mock('../../src/hooks/usePermissions', () => ({
  usePermissions: jest.fn(() => ({ canWriteEvents: true })),
}));

const mockEvents = [
  { id: 'e1', type: 'feeding', feedingType: 'bottle', amount: 120, duration: null, sleepType: null, time: new Date(), notes: null, loggedBy: 'u1' },
  { id: 'e2', type: 'sleep',   feedingType: null, amount: null, duration: 60, sleepType: 'nap',  time: new Date(), notes: null, loggedBy: 'u1' },
];

jest.mock('../../src/hooks/useEvents', () => ({
  useEvents: jest.fn(() => ({ events: mockEvents, loading: false, error: null })),
}));
jest.mock('../../src/hooks/useUserDisplayNames', () => ({
  useUserDisplayNames: jest.fn(() => ({ nameMap: { u1: 'Alice' } })),
}));

const mockDeleteEvent = jest.fn(() => Promise.resolve());
jest.mock('../../src/services/eventStore', () => ({ deleteEvent: mockDeleteEvent }));
jest.mock('../../src/utils/platform', () => ({
  showAlert:   jest.fn(),
  showConfirm: jest.fn(() => Promise.resolve(true)),
}));
jest.mock('../../src/components/EventItem', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  // onDelete/onEdit are null when History renders in read-only mode
  return ({ item, onDelete, onEdit }) =>
    React.createElement(TouchableOpacity, { testID: `event-${item.id}` },
      onEdit   ? React.createElement(Text, { onPress: () => onEdit(item) },   `edit-${item.id}`)   : null,
      onDelete ? React.createElement(Text, { onPress: () => onDelete(item) }, `delete-${item.id}`) : null,
    );
});

const React = require('react');
const { render, fireEvent, act, waitFor } = require('@testing-library/react-native');
const History = require('../../src/screens/app/History').default;
const { usePermissions } = require('../../src/hooks/usePermissions');
const { showConfirm }    = require('../../src/utils/platform');

const mockNav = { navigate: jest.fn(), goBack: jest.fn() };

beforeEach(() => jest.clearAllMocks());

describe('History — rendering', () => {
  it('renders without crashing', () => {
    expect(() => render(<History navigation={mockNav} />)).not.toThrow();
  });

  it('renders event items', () => {
    const { getByTestId } = render(<History navigation={mockNav} />);
    expect(getByTestId('event-e1')).toBeTruthy();
    expect(getByTestId('event-e2')).toBeTruthy();
  });
});

describe('History — delete', () => {
  it('calls deleteEvent after confirm', async () => {
    const { getByText } = render(<History navigation={mockNav} />);
    await act(async () => {
      fireEvent.press(getByText('delete-e1'));
    });
    await waitFor(() => expect(mockDeleteEvent).toHaveBeenCalledWith('baby1', 'e1'));
  });

  it('does not delete when confirm is cancelled', async () => {
    showConfirm.mockResolvedValueOnce(false);
    const { getByText } = render(<History navigation={mockNav} />);
    await act(async () => {
      fireEvent.press(getByText('delete-e1'));
    });
    expect(mockDeleteEvent).not.toHaveBeenCalled();
  });

  it('hides delete buttons and shows read-only banner for read-only users', () => {
    usePermissions.mockReturnValueOnce({ canWriteEvents: false });
    const { queryByText, getByText } = render(<History navigation={mockNav} />);
    // Delete buttons are not rendered when canWriteEvents=false
    expect(queryByText('delete-e1')).toBeNull();
    // Read-only banner is shown instead
    expect(getByText(/Read-only view/i)).toBeTruthy();
  });
});

describe('History — edit navigation', () => {
  it('navigates to EditEvent with correct params', () => {
    const { getByText } = render(<History navigation={mockNav} />);
    fireEvent.press(getByText('edit-e1'));
    expect(mockNav.navigate).toHaveBeenCalledWith('EditEvent', expect.objectContaining({
      eventId:     'e1',
      type:        'feeding',
      feedingType: 'bottle',
    }));
  });

  it('hides edit buttons for read-only users', () => {
    usePermissions.mockReturnValueOnce({ canWriteEvents: false });
    const { queryByText } = render(<History navigation={mockNav} />);
    expect(queryByText('edit-e1')).toBeNull();
  });
});
