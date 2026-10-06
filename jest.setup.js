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

jest.mock('react-native-worklets', () => ({
  __esModule: true,
  scheduleOnRN: (fn, ...args) => fn(...args),
  runOnJS: fn => fn,
  runOnUI: fn => fn,
}));

jest.mock('react-native-vision-camera', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    Camera: View,
    CommonResolutions: {
      HD_16_9: { width: 720, height: 1280 },
      FHD_16_9: { width: 1080, height: 1920 },
    },
    useCameraPermission: () => ({
      hasPermission: true,
      requestPermission: jest.fn(() => Promise.resolve(true)),
    }),
    useFrameOutput: jest.fn(() => ({})),
    usePhotoOutput: jest.fn(() => ({ capturePhoto: jest.fn() })),
  };
});

jest.mock('react-native-fast-opencv', () => ({
  __esModule: true,
  OpenCV: {},
  ColorConversionCodes: {},
  ContourApproximationModes: {},
  DataTypes: {},
  DecompTypes: {},
  InterpolationFlags: {},
  BorderTypes: {},
  MorphShapes: {},
  MorphTypes: {},
  RetrievalModes: {},
}));

jest.mock('react-native-blob-util', () => ({
  __esModule: true,
  default: {
    fs: {
      dirs: { CacheDir: '/tmp' },
      writeFile: jest.fn(() => Promise.resolve()),
      unlink: jest.fn(() => Promise.resolve()),
      exists: jest.fn(() => Promise.resolve(false)),
    },
  },
}));

jest.mock('@react-native-camera-roll/camera-roll', () => ({
  __esModule: true,
  CameraRoll: {
    saveAsset: jest.fn(() => Promise.resolve()),
    getPhotos: jest.fn(() => Promise.resolve({ edges: [] })),
  },
}));

jest.mock('react-native-share', () => ({
  __esModule: true,
  default: { open: jest.fn(() => Promise.resolve()) },
}));

jest.mock('react-native-html-to-pdf', () => ({
  __esModule: true,
  generatePDF: jest.fn(() => Promise.resolve({ filePath: '/tmp/out.pdf' })),
}));

jest.mock('@bam.tech/react-native-image-resizer', () => ({
  __esModule: true,
  default: {
    createResizedImage: jest.fn(() => Promise.resolve({ uri: 'file:///tmp/resized.jpg' })),
  },
}));
