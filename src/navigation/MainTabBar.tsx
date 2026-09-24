import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '../context/ThemeContext';
import type { WalletThemeColors } from '../theme/appTheme';
import { TabIcon, type TabIconName } from '../components/icons/TabIcons';

/** Route name of the raised centre button; it opens the scan sheet instead of a screen. */
export const SCAN_TAB_ROUTE = 'ScanTab';

const TAB_BAR_HEIGHT = 70;

const TAB_ICONS: Record<string, TabIconName> = {
  MyCardsTab: 'card',
  CollectedTab: 'contacts',
  AddTab: 'keyboard',
  SettingsTab: 'sliders',
};

interface MainTabBarProps extends BottomTabBarProps {
  onScanPress: () => void;
}

export function MainTabBar({
  state,
  descriptors,
  navigation,
  onScanPress,
}: MainTabBarProps): React.JSX.Element {
  const { wallet } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(wallet), [wallet]);

  return (
    <View style={[styles.bar, { height: TAB_BAR_HEIGHT + insets.bottom }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.title ?? route.name;
        const isFocused = state.index === index;

        if (route.name === SCAN_TAB_ROUTE) {
          return (
            <View key={route.key} style={styles.item}>
              <Pressable
                onPress={onScanPress}
                accessibilityRole="button"
                accessibilityLabel="Scan a card"
                style={({ pressed }) => [styles.scanButton, pressed && styles.pressed]}
              >
                <TabIcon name="camera" size={26} color={wallet.addButtonText} />
              </Pressable>
            </View>
          );
        }

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={label}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          >
            <TabIcon
              name={TAB_ICONS[route.name] ?? 'card'}
              size={24}
              color={isFocused ? wallet.accentMuted : wallet.subtitle}
            />
            <Text
              style={[
                styles.label,
                { color: isFocused ? wallet.accentMuted : wallet.subtitle },
                isFocused && styles.labelFocused,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(wallet: WalletThemeColors) {
  return StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingTop: 8,
      backgroundColor: wallet.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: wallet.border,
    },
    item: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
    },
    pressed: {
      opacity: 0.75,
    },
    label: {
      fontSize: 12,
      fontWeight: '500',
    },
    labelFocused: {
      fontWeight: '600',
    },
    // Lifted above the bar so scanning reads as the app's primary action.
    scanButton: {
      marginTop: -22,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: wallet.addButton,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 4,
      borderColor: wallet.surface,
    },
  });
}
