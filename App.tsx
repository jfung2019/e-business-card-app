import React from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './src/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App(): React.JSX.Element {
  return (
    <View style={styles.root}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" />
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </SafeAreaProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
