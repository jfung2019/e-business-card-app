import React from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CardScannerHost } from './src/components/CardScannerHost';
import { AuthProvider } from './src/context/AuthContext';
import { CardPrefsProvider } from './src/context/CardPrefsContext';
import { ShareLinkProvider } from './src/context/ShareLinkContext';
import { ThemeProvider, useAppTheme } from './src/context/ThemeContext';
import { AppNavigator } from './src/navigation/AppNavigator';

function ThemedStatusBar(): React.JSX.Element {
  const { colors } = useAppTheme();
  return <StatusBar barStyle={colors.statusBarStyle} />;
}

export default function App(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ThemedStatusBar />
          <CardPrefsProvider>
            <AuthProvider>
              <ShareLinkProvider>
                <AppNavigator />
                <CardScannerHost />
              </ShareLinkProvider>
            </AuthProvider>
          </CardPrefsProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
