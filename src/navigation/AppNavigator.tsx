import React, { useEffect, useMemo, useRef } from 'react';

import {
  ActivityIndicator,
  AppState,
  Linking,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';

import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import { useShareLink } from '../context/ShareLinkContext';
import { useAppTheme } from '../context/ThemeContext';
import { CardDetailScreen } from '../screens/CardDetailScreen';
import { CollectedCardsScreen } from '../screens/CollectedCardsScreen';
import { CollectionScreen } from '../screens/CollectionScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { MyCardFormScreen } from '../screens/MyCardFormScreen';
import { MyCardScanScreen } from '../screens/MyCardScanScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ReorderMyCardsScreen } from '../screens/ReorderMyCardsScreen';
import { ScanScreen } from '../screens/ScanScreen';
import { ShareMyCardScreen } from '../screens/ShareMyCardScreen';
import { SharedCardPreviewScreen } from '../screens/SharedCardPreviewScreen';
import type { CapturedCard } from '../types/card';
import type { ParsedUserCardPreview, UserCard } from '../types/userCard';

export type AuthStackParamList = {
  Login: undefined;
};

export type MainStackParamList = {
  Collection: undefined;
  CollectedCards: undefined;
  Scan: undefined;
  CardDetail: { card: CapturedCard };
  MyCardScan: undefined;
  MyCardForm:
    | { mode: 'create'; parsedPreview?: ParsedUserCardPreview }
    | { mode: 'edit'; card: UserCard };
  ReorderMyCards: { cards: UserCard[] };
  Profile: undefined;
  ShareMyCard: { cardId: string };
  SharedCardPreview: { token: string };
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();
const navigationRef = createNavigationContainerRef<MainStackParamList>();
const pendingNavTokenRef = { current: null as string | null };
const pendingIncomingUrlRef = { current: null as string | null };

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
  const { wallet } = useAppTheme();

  const screenOptions = useMemo(
    () => ({
      headerStyle: { backgroundColor: wallet.background },
      headerTintColor: wallet.title,
      headerTitleStyle: { fontWeight: '600' as const, color: wallet.title },
      headerShadowVisible: false,
      contentStyle: { backgroundColor: wallet.background },
    }),
    [wallet],
  );

  return (
    <MainStack.Navigator initialRouteName="Collection" screenOptions={screenOptions}>
      <MainStack.Screen name="Collection" options={{ headerShown: false }}>
        {() => <CollectionScreen />}
      </MainStack.Screen>
      <MainStack.Screen name="Profile" options={{ title: 'Profile' }}>
        {() => <ProfileScreen onSignOut={onSignOut} />}
      </MainStack.Screen>
      <MainStack.Screen
        name="CollectedCards"
        component={CollectedCardsScreen}
        options={{ title: 'All Collected' }}
      />
      <MainStack.Screen name="Scan" component={ScanScreen} options={{ title: 'Scan Card' }} />
      <MainStack.Screen
        name="CardDetail"
        component={CardDetailScreen}
        options={{ title: 'Card Details' }}
      />
      <MainStack.Screen
        name="MyCardScan"
        component={MyCardScanScreen}
        options={{ title: 'Scan My Card' }}
      />
      <MainStack.Screen
        name="MyCardForm"
        component={MyCardFormScreen}
        options={({ route }) => ({
          title: route.params.mode === 'edit' ? 'Edit My Card' : 'Add My Card',
        })}
      />
      <MainStack.Screen
        name="ReorderMyCards"
        component={ReorderMyCardsScreen}
        options={{ title: 'Reorder Cards' }}
      />
      <MainStack.Screen
        name="ShareMyCard"
        component={ShareMyCardScreen}
        options={{ title: 'Share My Card' }}
      />
      <MainStack.Screen
        name="SharedCardPreview"
        component={SharedCardPreviewScreen}
        options={{ title: 'Shared Card' }}
      />
    </MainStack.Navigator>
  );
}

function LoadingScreen(): React.JSX.Element {
  const { wallet } = useAppTheme();
  const styles = useMemo(() => createLoadingStyles(wallet), [wallet]);

  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={wallet.accent} />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
}

function createLoadingStyles(wallet: ReturnType<typeof useAppTheme>['wallet']) {
  return StyleSheet.create({
    loading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: wallet.background,
      gap: 12,
    },
    loadingText: {
      color: wallet.subtitle,
      fontSize: 14,
    },
  });
}

function flushPendingNavigation(): void {
  if (!pendingNavTokenRef.current || !navigationRef.isReady()) {
    return;
  }
  const token = pendingNavTokenRef.current;
  pendingNavTokenRef.current = null;
  pendingIncomingUrlRef.current = null;
  navigationRef.navigate('SharedCardPreview', { token });
}

function navigateToSharedCardPreview(token: string): void {
  if (!navigationRef.isReady()) {
    pendingNavTokenRef.current = token;
    return;
  }
  pendingNavTokenRef.current = null;
  pendingIncomingUrlRef.current = null;
  navigationRef.navigate('SharedCardPreview', { token });
}

export function AppNavigator(): React.JSX.Element {
  const { user, initializing, signOut } = useAuth();
  const { pendingToken, setPendingToken, clearPendingToken, handleIncomingUrl } = useShareLink();
  const { isDark, wallet } = useAppTheme();
  const handledInitialUrl = useRef(false);
  const lastHandledResumeUrlRef = useRef<string | null>(null);

  const navigationTheme = useMemo(
    () => ({
      ...(isDark ? DarkTheme : DefaultTheme),
      colors: {
        ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
        primary: wallet.accent,
        background: wallet.background,
        card: wallet.surface,
        text: wallet.title,
        border: wallet.border,
      },
    }),
    [isDark, wallet],
  );

  useEffect(() => {
    const openSharedCardFromUrl = (
      url: string | null,
      source: 'event' | 'resume' = 'event',
    ) => {
      if (source === 'resume') {
        if (!url || url === lastHandledResumeUrlRef.current) {
          return;
        }
      }

      const token = handleIncomingUrl(url);
      if (!token) {
        return;
      }

      if (url) {
        lastHandledResumeUrlRef.current = url;
      }

      if (user) {
        if (source === 'event' && url) {
          pendingIncomingUrlRef.current = url;
        }
        navigateToSharedCardPreview(token);
        flushPendingNavigation();
        return;
      }
      void setPendingToken(token);
    };

    const retryPendingIncomingUrl = () => {
      const pendingUrl = pendingIncomingUrlRef.current;
      if (!pendingUrl) {
        return;
      }
      openSharedCardFromUrl(pendingUrl, 'event');
    };

    if (!handledInitialUrl.current) {
      handledInitialUrl.current = true;
      void Linking.getInitialURL().then((url) => openSharedCardFromUrl(url, 'event'));
    }

    const urlSubscription = Linking.addEventListener('url', ({ url }) => {
      openSharedCardFromUrl(url, 'event');
    });

    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        return;
      }
      flushPendingNavigation();
      retryPendingIncomingUrl();
      if (Platform.OS === 'android') {
        void Linking.getInitialURL().then((url) => openSharedCardFromUrl(url, 'resume'));
      }
    });

    return () => {
      urlSubscription.remove();
      appStateSubscription.remove();
    };
  }, [user, handleIncomingUrl, setPendingToken]);

  useEffect(() => {
    if (!user || !pendingToken) {
      return;
    }

    const timer = setTimeout(() => {
      navigateToSharedCardPreview(pendingToken);
      void clearPendingToken();
    }, 0);

    return () => clearTimeout(timer);
  }, [user, pendingToken, clearPendingToken]);

  if (initializing) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navigationTheme}
      onReady={flushPendingNavigation}
    >
      {user ? <MainNavigator onSignOut={signOut} /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
