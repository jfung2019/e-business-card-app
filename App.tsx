import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';

import { ScanScreen } from './src/screens/ScanScreen';

const OWNER_USER_ID = 'mobile-dev-user-1';

export default function App(): React.JSX.Element {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <ScanScreen ownerUserId={OWNER_USER_ID} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
