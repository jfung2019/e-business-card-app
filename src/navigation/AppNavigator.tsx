import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import { CardDetailScreen } from '../screens/CardDetailScreen';
import { CollectionScreen } from '../screens/CollectionScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { ScanScreen } from '../screens/ScanScreen';
import { luxuryColors } from '../theme/luxury';
import type { CapturedCard } from '../types/card';

export type AuthStackParamList = {
  Login: undefined;
};

export type MainStackParamList = {
  Collection: undefined;
  Scan: undefined;
  CardDetail: { card: CapturedCard };
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();

const mainScreenOptions = {
  headerStyle: { backgroundColor: luxuryColors.surface },
  headerTintColor: luxuryColors.gold,
  headerTitleStyle: { fontWeight: '600' as const, color: luxuryColors.cream },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: luxuryColors.background },
};

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
    <MainStack.Navigator initialRouteName="Collection" screenOptions={mainScreenOptions}>
      <MainStack.Screen
        name="Collection"
        component={CollectionScreen}
        options={({ navigation }) => ({
          title: 'Collection',
          headerRight: () => (
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={() => navigation.navigate('Scan')}
                style={styles.headerButton}
              >
                <Text style={styles.headerActionText}>Scan</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => void onSignOut()} style={styles.headerButton}>
                <Text style={styles.headerActionMuted}>Log out</Text>
              </TouchableOpacity>
            </View>
          ),
        })}
      />
      <MainStack.Screen
        name="Scan"
        component={ScanScreen}
        options={{ title: 'Scan Card' }}
      />
      <MainStack.Screen
        name="CardDetail"
        component={CardDetailScreen}
        options={{ title: 'Card Details' }}
      />
    </MainStack.Navigator>
  );
}

export function AppNavigator(): React.JSX.Element {
  const { user, initializing, signOut } = useAuth();

  if (initializing) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={luxuryColors.gold} />
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
    backgroundColor: luxuryColors.background,
    gap: 12,
  },
  loadingText: {
    color: luxuryColors.creamMuted,
    fontSize: 14,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerActionText: {
    color: luxuryColors.gold,
    fontWeight: '700',
    fontSize: 15,
  },
  headerActionMuted: {
    color: luxuryColors.creamMuted,
    fontWeight: '600',
    fontSize: 14,
  },
});
