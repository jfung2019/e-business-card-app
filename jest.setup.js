/* global jest */

require('react-native-gesture-handler/jestSetup');

jest.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View },
    cancelAnimation: jest.fn(),
    useAnimatedStyle: callback => callback(),
    useSharedValue: value => ({ value }),
    withSpring: value => value,
  };
});

jest.mock('react-native-qr-kit', () => ({
  __esModule: true,
  default: {
    decodeMultiple: jest.fn(() => Promise.resolve({ success: true, results: [] })),
  },
}));

jest.mock('@react-native-ml-kit/barcode-scanning', () => ({
  __esModule: true,
  default: { scan: jest.fn(() => Promise.resolve([])) },
  BarcodeFormat: { QR_CODE: 256, CODE_128: 1, UNKNOWN: -1, ALL_FORMATS: 0 },
}));

jest.mock('@react-native-clipboard/clipboard', () => ({
  __esModule: true,
  default: {
    setString: jest.fn(),
    getString: jest.fn(() => Promise.resolve('')),
  },
}));

jest.mock('@react-native-firebase/app', () => ({
  __esModule: true,
  default: jest.fn(() => ({})),
}));

jest.mock('@react-native-firebase/auth', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    onAuthStateChanged: jest.fn((callback) => {
      callback(null);
      return jest.fn();
    }),
    currentUser: null,
    signInWithEmailAndPassword: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
    signOut: jest.fn(),
  })),
}));
