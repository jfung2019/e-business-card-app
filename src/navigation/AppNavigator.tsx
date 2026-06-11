import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { ScanScreen } from '../screens/ScanScreen';

export type AuthStackParamList = {
  Login: undefined;
};

export type MainStackParamList = {
  Scan: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();

function AuthNavigator(): React.JSX.Element {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
  );
}

function MainNavigator({
  onSignOut,
}: {
  onSignOut: () => Promise<void>;
}): React.JSX.Element {
  return (
    <MainStack.Navigator>
      <MainStack.Screen
        name="Scan"
        component={ScanScreen}
        options={{
          title: 'Scan Business Card',
          headerRight: () => (
            <TouchableOpacity onPress={() => void onSignOut()} style={styles.logoutButton}>
              <Text style={styles.logoutText}>Log out</Text>
            </TouchableOpacity>
          ),
        }}
      />
    </MainStack.Navigator>
  );
}

export function AppNavigator(): React.JSX.Element {
  const { user, initializing, signOut } = useAuth();

  if (initializing) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <MainNavigator onSignOut={signOut} /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 14,
  },
  logoutButton: {
    marginRight: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  logoutText: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 15,
  },
});
