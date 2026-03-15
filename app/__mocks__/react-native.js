const React = require('react');

const mockComponent = (name) => {
  const Mock = ({ children, ...props }) => React.createElement(name, props, children);
  Mock.displayName = name;
  return Mock;
};

module.exports = {
  View:                  mockComponent('View'),
  Text:                  mockComponent('Text'),
  TextInput:             mockComponent('TextInput'),
  TouchableOpacity:      mockComponent('TouchableOpacity'),
  ScrollView:            mockComponent('ScrollView'),
  FlatList: ({ data = [], renderItem, keyExtractor, ListEmptyComponent, ...rest }) => {
    const items = data.map((item, index) => {
      const key = keyExtractor ? keyExtractor(item, index) : String(index);
      return React.createElement('Item', { key }, renderItem({ item, index }));
    });
    return React.createElement('FlatList', rest, items.length ? items : (ListEmptyComponent ? React.createElement(ListEmptyComponent) : null));
  },
  ActivityIndicator:     mockComponent('ActivityIndicator'),
  Image:                 mockComponent('Image'),
  Switch:                ({ onValueChange, value, ...rest }) => React.createElement('Switch', { onValueChange, value, ...rest }),
  KeyboardAvoidingView:  mockComponent('KeyboardAvoidingView'),
  StatusBar:             mockComponent('StatusBar'),
  Pressable:             mockComponent('Pressable'),
  Modal:                 mockComponent('Modal'),
  SafeAreaView:          mockComponent('SafeAreaView'),
  StyleSheet: {
    create: (styles) => styles,
    flatten: (style) => (Array.isArray(style) ? Object.assign({}, ...style) : style),
    hairlineWidth: 0.5,
  },
  Platform: {
    OS: 'android',
    select: (options) => options.android ?? options.default ?? options.ios,
  },
  Alert: { alert: jest.fn() },
  Keyboard: { dismiss: jest.fn(), addListener: jest.fn(() => ({ remove: jest.fn() })) },
  Dimensions: { get: jest.fn(() => ({ width: 375, height: 812 })) },
  Animated: {
    Value: jest.fn(() => ({
      interpolate: jest.fn(),
      setValue: jest.fn(),
    })),
    View: mockComponent('Animated.View'),
    timing: jest.fn(() => ({ start: jest.fn() })),
    spring: jest.fn(() => ({ start: jest.fn() })),
  },
  Linking: { openURL: jest.fn() },
  AppState: { addEventListener: jest.fn(() => ({ remove: jest.fn() })), currentState: 'active' },
  PixelRatio: { get: jest.fn(() => 2) },
};
