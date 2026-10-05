import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AddScreen } from '../screens/AddScreen';
import { CollectedScreen } from '../screens/CollectedScreen';
import { MyCardsScreen } from '../screens/MyCardsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import {
  ScanChooserSheet,
  type ScanOwner,
} from '../components/ScanChooserSheet';
import { MainTabBar, SCAN_TAB_ROUTE } from './MainTabBar';
import type { MainStackParamList } from './AppNavigator';

export type MainTabParamList = {
  MyCardsTab: undefined;
  CollectedTab: undefined;
  ScanTab: undefined;
  AddTab: undefined;
  SettingsTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

type TabsNavigation = NativeStackNavigationProp<MainStackParamList, 'Collection'>;

/** Never rendered: the centre tab opens the scan sheet and is not a destination. */
function ScanPlaceholder(): React.JSX.Element {
  return <View />;
}

export function MainTabs({
  onSignOut,
}: {
  onSignOut: () => Promise<void>;
}): React.JSX.Element {
  const navigation = useNavigation<TabsNavigation>();
  const [scanSheetVisible, setScanSheetVisible] = useState(false);

  const handleScanChoice = useCallback(
    (owner: ScanOwner) => {
      setScanSheetVisible(false);
      // The scan screens own the camera and gallery pickers, and ask which to
      // use themselves; the sheet only decides which screen to open.
      navigation.navigate(owner === 'mine' ? 'MyCardScan' : 'Scan');
    },
    [navigation],
  );

  return (
    <>
      <Tab.Navigator
        screenOptions={{ headerShown: false }}
        tabBar={props => (
          <MainTabBar {...props} onScanPress={() => setScanSheetVisible(true)} />
        )}
      >
        <Tab.Screen
          name="MyCardsTab"
          component={MyCardsScreen}
          options={{ title: 'My cards' }}
        />
        <Tab.Screen
          name="CollectedTab"
          component={CollectedScreen}
          options={{ title: 'Collected' }}
        />
        <Tab.Screen
          name={SCAN_TAB_ROUTE}
          component={ScanPlaceholder}
          options={{ title: 'Scan' }}
        />
        <Tab.Screen name="AddTab" component={AddScreen} options={{ title: 'Add' }} />
        <Tab.Screen name="SettingsTab" options={{ title: 'Settings' }}>
          {() => <ProfileScreen onSignOut={onSignOut} />}
        </Tab.Screen>
      </Tab.Navigator>

      <ScanChooserSheet
        visible={scanSheetVisible}
        onClose={() => setScanSheetVisible(false)}
        onChoose={handleScanChoice}
      />
    </>
  );
}
