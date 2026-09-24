import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import ViewShot, { type ViewShotRef } from 'react-native-view-shot';

import { CardImageComposer, type CardImageComposerRef } from '../components/CardImageComposer';
import { ExportCardModal, type CardExportOption } from '../components/ExportCardModal';
import { MyCardFace, MY_CARD_WIDTH } from '../components/MyCardFace';
import { TabIcon } from '../components/icons/TabIcons';
import { useAppTheme } from '../context/ThemeContext';
import { useUserCards } from '../hooks/useUserCards';
import type { MainStackParamList } from '../navigation/AppNavigator';
import { exportCardAsPdf, saveCardPhotosToAlbum } from '../services/cardExport';
import { isLocalUserCardId } from '../services/offlineUserCardQueue';
import type { WalletThemeColors } from '../theme/appTheme';
import { formatCustomFieldLabel } from '../utils/formatCustomFieldLabel';
import { useAuthenticatedImageSource } from '../utils/scanImage';
import { userCardHasScanImage } from '../utils/walletDisplay';

type MyCardNavigation = NativeStackNavigationProp<MainStackParamList, 'MyCard'>;
type MyCardRoute = RouteProp<MainStackParamList, 'MyCard'>;

const CORE_ROWS: { key: 'email' | 'phone' | 'website'; label: string }[] = [
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'website', label: 'Website' },
];

export function MyCardScreen(): React.JSX.Element {
  const { wallet } = useAppTheme();
  const styles = useMemo(() => createStyles(wallet), [wallet]);
  const navigation = useNavigation<MyCardNavigation>();
  const route = useRoute<MyCardRoute>();
  const { cards, removeUserCard, editUserCard } = useUserCards();

  // Prefer the freshly fetched copy so edits made elsewhere show up on return.
  const card = cards.find(item => item._id === route.params.card._id) ?? route.params.card;

  const [exportVisible, setExportVisible] = useState(false);
  const [busyOption, setBusyOption] = useState<CardExportOption | null>(null);
  const shotRef = useRef<ViewShotRef>(null);
  const composerRef = useRef<CardImageComposerRef>(null);

  const hasScan = userCardHasScanImage(card);
  const frontSource = useAuthenticatedImageSource(
    hasScan ? card.scan_image_front_url ?? card.scan_image_url : null,
  );
  const backSource = useAuthenticatedImageSource(hasScan ? card.scan_image_back_url : null);
  const scanUris = [frontSource, backSource]
    .map(source => (source && typeof source === 'object' && 'uri' in source ? source.uri : null))
    .filter((uri): uri is string => Boolean(uri));

  const canShare = !isLocalUserCardId(card._id);

  const handleExport = useCallback(
    (option: CardExportOption) => {
      void (async () => {
        setBusyOption(option);
        try {
          let images = scanUris;
          let aspectRatioOverride: number | undefined;
          if (images.length === 0) {
            const captured = await shotRef.current?.capture?.();
            images = captured ? [captured] : [];
          } else if (images.length > 1) {
            const composed = await composerRef.current?.capture();
            if (!composed) {
              throw new Error('Unable to combine front and back for export.');
            }
            images = [composed.uri];
            aspectRatioOverride = composed.width / composed.height;
          }
          if (images.length === 0) {
            throw new Error('No card image available to export.');
          }

          const fileName = `${card.core_fields.name?.trim() || 'my-business-card'}.pdf`;
          if (option === 'pdf') {
            await exportCardAsPdf(images, fileName, aspectRatioOverride);
          } else {
            await saveCardPhotosToAlbum(images);
            Alert.alert('Saved', 'Saved to your photo library.');
          }
          setExportVisible(false);
        } catch (error) {
          Alert.alert(
            'Export failed',
            error instanceof Error ? error.message : 'Unable to export this card.',
          );
        } finally {
          setBusyOption(null);
        }
      })();
    },
    [card.core_fields.name, scanUris],
  );

  const handleDelete = () => {
    Alert.alert(
      'Delete this card?',
      `${card.core_fields.name} will be removed from your wallet on all your devices. The scan photo goes too, and this cannot be undone.`,
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await removeUserCard(card._id);
                navigation.goBack();
              } catch (error) {
                Alert.alert(
                  'Could not delete',
                  error instanceof Error ? error.message : 'Please try again.',
                );
              }
            })();
          },
        },
      ],
    );
  };

  const actions: {
    key: string;
    label: string;
    icon: 'card' | 'contacts' | 'camera' | 'keyboard' | 'sliders';
    disabled?: boolean;
    onPress: () => void;
  }[] = [
    {
      key: 'share',
      label: 'Share',
      icon: 'contacts',
      disabled: !canShare,
      onPress: () => navigation.navigate('ShareMyCard', { cardId: card._id }),
    },
    {
      key: 'export',
      label: 'Export',
      icon: 'card',
      onPress: () => setExportVisible(true),
    },
    {
      key: 'edit',
      label: 'Edit',
      icon: 'keyboard',
      onPress: () => navigation.navigate('MyCardForm', { mode: 'edit', card }),
    },
    {
      key: 'primary',
      label: card.is_primary ? 'Primary' : 'Set primary',
      icon: 'sliders',
      disabled: card.is_primary || isLocalUserCardId(card._id),
      onPress: () => {
        void (async () => {
          try {
            await editUserCard(card._id, { is_primary: true });
          } catch (error) {
            Alert.alert(
              'Could not set primary',
              error instanceof Error ? error.message : 'Please try again.',
            );
          }
        })();
      },
    },
  ];

  const customEntries = Object.entries(card.custom_fields ?? {}).filter(([, value]) =>
    Boolean(value?.trim()),
  );

  return (
    <>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.cardSlot}>
          <MyCardFace card={card} compact controlsBelow />
        </View>

        <View style={styles.actionRow}>
          {actions.map((action, index) => (
            <React.Fragment key={action.key}>
              {index > 0 ? <View style={styles.actionDivider} /> : null}
              <Pressable
                onPress={action.onPress}
                disabled={action.disabled}
                accessibilityRole="button"
                accessibilityState={action.disabled ? { disabled: true } : {}}
                style={({ pressed }) => [
                  styles.action,
                  pressed && !action.disabled && styles.pressed,
                  action.disabled && styles.actionDisabled,
                ]}
              >
                <TabIcon name={action.icon} size={22} color={wallet.title} />
                <Text style={styles.actionLabel}>{action.label}</Text>
              </Pressable>
            </React.Fragment>
          ))}
        </View>

        <View style={styles.detailCard}>
          {CORE_ROWS.map(({ key, label }) => {
            const value = card.core_fields[key];
            if (!value?.trim()) {
              return null;
            }
            return (
              <View key={key} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{label}</Text>
                <Text style={styles.detailValue}>{value}</Text>
              </View>
            );
          })}
          {customEntries.map(([key, value]) => (
            <View key={key} style={styles.detailRow}>
              <Text style={styles.detailLabel}>{formatCustomFieldLabel(key)}</Text>
              <Text style={styles.detailValue}>{value}</Text>
            </View>
          ))}
        </View>

        <Pressable
          onPress={handleDelete}
          accessibilityRole="button"
          style={({ pressed }) => [styles.delete, pressed && styles.pressed]}
        >
          <Text style={styles.deleteText}>Delete card</Text>
        </Pressable>
      </ScrollView>

      {/* Off-screen renderers the export needs when there is no scan to use. */}
      {!hasScan ? (
        <View style={styles.offscreen} collapsable={false}>
          <ViewShot ref={shotRef} options={{ format: 'png', result: 'data-uri' }}>
            <MyCardFace card={card} />
          </ViewShot>
        </View>
      ) : null}
      <View style={styles.offscreen}>
        <CardImageComposer
          ref={composerRef}
          frontUri={scanUris[0] ?? null}
          backUri={scanUris[1] ?? null}
        />
      </View>

      <ExportCardModal
        visible={exportVisible}
        busyOption={busyOption}
        onSelect={handleExport}
        onCancel={() => {
          if (!busyOption) {
            setExportVisible(false);
          }
        }}
      />
    </>
  );
}

const createStyles = (wallet: WalletThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: wallet.background,
    },
    content: {
      padding: 20,
      gap: 14,
    },
    cardSlot: {
      width: '100%',
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
      backgroundColor: wallet.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: wallet.border,
    },
    action: {
      flex: 1,
      alignItems: 'center',
      gap: 6,
      paddingVertical: 13,
    },
    actionDisabled: {
      opacity: 0.4,
    },
    actionDivider: {
      width: StyleSheet.hairlineWidth,
      marginVertical: 12,
      backgroundColor: wallet.border,
    },
    actionLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: wallet.title,
    },
    pressed: {
      opacity: 0.85,
    },
    detailCard: {
      backgroundColor: wallet.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: wallet.border,
      overflow: 'hidden',
    },
    detailRow: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 13,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: wallet.border,
    },
    detailLabel: {
      width: 92,
      fontSize: 13,
      color: wallet.subtitle,
    },
    detailValue: {
      flex: 1,
      fontSize: 14,
      color: wallet.title,
    },
    delete: {
      alignSelf: 'center',
      paddingVertical: 12,
      paddingHorizontal: 20,
    },
    deleteText: {
      fontSize: 15,
      fontWeight: '600',
      color: wallet.error,
    },
    offscreen: {
      position: 'absolute',
      top: -10000,
      left: 0,
      width: MY_CARD_WIDTH,
    },
  });
