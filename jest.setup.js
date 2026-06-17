/* global jest */

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
