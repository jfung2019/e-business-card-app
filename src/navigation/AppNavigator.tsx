import React from 'react';

import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { NavigationContainer } from '@react-navigation/native';

import { createNativeStackNavigator } from '@react-navigation/native-stack';



import { useAuth } from '../context/AuthContext';

import { CardDetailScreen } from '../screens/CardDetailScreen';

import { CollectionScreen } from '../screens/CollectionScreen';

import { LoginScreen } from '../screens/LoginScreen';

import { MyCardFormScreen } from '../screens/MyCardFormScreen';

import { MyCardScanScreen } from '../screens/MyCardScanScreen';

import { ProfileScreen } from '../screens/ProfileScreen';

import { ReorderMyCardsScreen } from '../screens/ReorderMyCardsScreen';

import { ScanScreen } from '../screens/ScanScreen';

import { luxuryColors } from '../theme/luxury';

import { walletColors } from '../theme/wallet';

import type { CapturedCard } from '../types/card';

import type { ParsedUserCardPreview, UserCard } from '../types/userCard';



export type AuthStackParamList = {

  Login: undefined;

};



export type MainStackParamList = {

  Collection: undefined;

  Scan: undefined;

  CardDetail: { card: CapturedCard };

  MyCardScan: undefined;

  MyCardForm:

    | { mode: 'create'; parsedPreview?: ParsedUserCardPreview }

    | { mode: 'edit'; card: UserCard };

  ReorderMyCards: { cards: UserCard[] };

  Profile: undefined;

};



const AuthStack = createNativeStackNavigator<AuthStackParamList>();

const MainStack = createNativeStackNavigator<MainStackParamList>();



const mainScreenOptions = {

  headerStyle: { backgroundColor: walletColors.background },

  headerTintColor: walletColors.title,

  headerTitleStyle: { fontWeight: '600' as const, color: walletColors.title },

  headerShadowVisible: false,

  contentStyle: { backgroundColor: walletColors.background },

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

      <MainStack.Screen name="Collection" options={{ headerShown: false }}>

        {() => <CollectionScreen />}

      </MainStack.Screen>

      <MainStack.Screen

        name="Profile"

        options={{ title: 'Profile' }}

      >

        {() => <ProfileScreen onSignOut={onSignOut} />}

      </MainStack.Screen>

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

});


