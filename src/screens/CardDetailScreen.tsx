import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ApiClientError } from '../api/client';
import { applyCardEnhancement, deleteCard, updateCard } from '../api/cards';
import { CustomFieldsList } from '../components/CustomFieldsList';
import { ScanImage } from '../components/ScanImage';
import type { MainStackParamList } from '../navigation/AppNavigator';
import { useAppTheme } from '../context/ThemeContext';
import { upsertCachedCard } from '../services/cardCollectionCache';
import type { WalletThemeColors } from '../theme/appTheme';
import type { CapturedCard, CoreFields } from '../types/card';
import {
  getQueuedScan,
  isLocalCardId,
  localCardIdToQueueId,
  removeQueuedScan,
  updateQueuedScanFields,
} from '../services/offlineCardQueue';
import type { QueuedCardScan } from '../types/offlineQueue';
import { formatScannedDate } from '../utils/formatDate';
import { buildEditedFieldKeys } from '../utils/offlineFieldEdits';
import {
  normalizeCustomFields,
  sortCustomFieldKeys,
} from '../utils/customFieldKeys';
import { formatCustomFieldLabel } from '../utils/formatCustomFieldLabel';

type CardDetailProps = NativeStackScreenProps<MainStackParamList, 'CardDetail'>;
type CardDetailNavigation = NativeStackNavigationProp<MainStackParamList, 'CardDetail'>;

const CORE_FIELD_LABELS: Array<{ key: keyof CoreFields; label: string }> = [
  { key: 'name', label: 'Name' },
  { key: 'company_name', label: 'Company' },
  { key: 'job_title', label: 'Job title' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'website', label: 'Website' },
];

const CONTACT_FIELD_LABELS = CORE_FIELD_LABELS.filter(({ key }) =>
  (['email', 'phone', 'website'] as const).includes(key as 'email' | 'phone' | 'website'),
);

type QuickAction = {
  key: string;
  label: string;
  onPress: () => void;
};

function buildSubtitle(coreFields: CoreFields): string {
  return [coreFields.job_title, coreFields.company_name]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(' · ');
}

function normalizeWebsite(url: string): string {
  return url.startsWith('http') ? url : `https://${url}`;
}

function suggestionLabel(fieldKey: string): string {
  if (fieldKey.startsWith('core.')) {
    const coreKey = fieldKey.replace('core.', '') as keyof CoreFields;
    return CORE_FIELD_LABELS.find(item => item.key === coreKey)?.label ?? coreKey;
  }
  if (fieldKey.startsWith('custom.')) {
    return fieldKey.replace('custom.', '').replace(/_/g, ' ');
  }
  return fieldKey;
}

function currentSuggestionValue(card: CapturedCard, fieldKey: string): string {
  if (fieldKey.startsWith('core.')) {
    const coreKey = fieldKey.replace('core.', '') as keyof CoreFields;
    return card.core_fields[coreKey]?.trim() ?? '';
  }
  if (fieldKey.startsWith('custom.')) {
    const customKey = fieldKey.replace('custom.', '');
    return card.custom_fields[customKey]?.trim() ?? '';
  }
  return '';
}

function toDataUri(base64: string): string {
  return base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
}

function normalizeCoreFields(fields: CoreFields): CoreFields {
  return {
    name: fields.name.trim(),
    company_name: fields.company_name?.trim() || null,
    job_title: fields.job_title?.trim() || null,
    email: fields.email?.trim() || null,
    phone: fields.phone?.trim() || null,
    website: fields.website?.trim() || null,
  };
}

export function CardDetailScreen({ route }: CardDetailProps): React.JSX.Element {
  const navigation = useNavigation<CardDetailNavigation>();
  const { wallet } = useAppTheme();
  const styles = useMemo(() => createStyles(wallet), [wallet]);
  const [card, setCard] = useState(route.params.card);
  const [queuedScan, setQueuedScan] = useState<QueuedCardScan | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftCoreFields, setDraftCoreFields] = useState<CoreFields>(route.params.card.core_fields);
  const [draftCustomFields, setDraftCustomFields] = useState<Record<string, string>>(
    route.params.card.custom_fields,
  );
  const [deleting, setDeleting] = useState(false);
  const [applyingEnhancement, setApplyingEnhancement] = useState(false);
  const [acceptedFieldKeys, setAcceptedFieldKeys] = useState<Set<string>>(new Set());
  const [suggestionDrafts, setSuggestionDrafts] = useState<Record<string, string>>({});
  const [savingEdits, setSavingEdits] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLocalCard = isLocalCardId(card._id);
  const {
    core_fields,
    custom_fields,
    scanned_at,
    scan_image_url,
    scan_image_front_url,
    scan_image_back_url,
    parse_source,
    parse_status,
    enhancement_status,
    enhanced_suggestions,
  } = card;

  useEffect(() => {
    setEditing(false);
    setDraftCoreFields(card.core_fields);
    setDraftCustomFields(card.custom_fields);
  }, [card._id]);

  useEffect(() => {
    if (!editing) {
      setDraftCoreFields(card.core_fields);
      setDraftCustomFields(card.custom_fields);
    }
  }, [card.core_fields, card.custom_fields, editing]);

  useEffect(() => {
    if (!isLocalCard) {
      setQueuedScan(null);
      return;
    }
    void (async () => {
      const item = await getQueuedScan(localCardIdToQueueId(card._id));
      setQueuedScan(item);
    })();
  }, [card._id, isLocalCard]);

  useEffect(() => {
    setAcceptedFieldKeys(new Set(Object.keys(enhanced_suggestions ?? {})));
    setSuggestionDrafts(enhanced_suggestions ?? {});
  }, [card._id, enhanced_suggestions]);

  const subtitle = buildSubtitle(editing ? draftCoreFields : core_fields);
  const displayName = (editing ? draftCoreFields.name : core_fields.name)?.trim() || 'Unknown contact';
  const customFieldKeys = sortCustomFieldKeys(
    Object.keys(editing ? draftCustomFields : custom_fields),
  );
  const localScanImages = queuedScan
    ? [
        { label: queuedScan.backImageBase64 ? 'Front scan' : 'Original scan', uri: toDataUri(queuedScan.imageBase64) },
        queuedScan.backImageBase64
          ? { label: 'Back scan', uri: toDataUri(queuedScan.backImageBase64) }
          : null,
      ].filter((image): image is { label: string; uri: string } => Boolean(image))
    : [];
  const scanImages = localScanImages.length
    ? []
    : [
        { label: scan_image_back_url ? 'Front scan' : 'Original scan', url: scan_image_front_url ?? scan_image_url },
        { label: 'Back scan', url: scan_image_back_url },
      ].filter((image): image is { label: string; url: string } => Boolean(image.url));

  const quickActions: QuickAction[] = [];
  const showOfflineBanner =
    isLocalCard || parse_source === 'offline' || parse_status === 'fallback';
  const showEnhancementBanner = enhancement_status === 'queued' || enhancement_status === 'processing';
  const showReviewBanner =
    enhancement_status === 'pending_review' &&
    enhanced_suggestions &&
    Object.keys(enhanced_suggestions).length > 0;
  const suggestionEntries = Object.entries(enhanced_suggestions ?? {});
  if (core_fields.phone?.trim()) {
    const phone = core_fields.phone.trim();
    quickActions.push({
      key: 'phone',
      label: 'Call',
      onPress: () => void Linking.openURL(`tel:${phone.replace(/\s/g, '')}`),
    });
  }
  if (core_fields.email?.trim()) {
    const email = core_fields.email.trim();
    quickActions.push({
      key: 'email',
      label: 'Email',
      onPress: () => void Linking.openURL(`mailto:${email}`),
    });
  }
  if (core_fields.website?.trim()) {
    const website = core_fields.website.trim();
    quickActions.push({
      key: 'website',
      label: 'Website',
      onPress: () => void Linking.openURL(normalizeWebsite(website)),
    });
  }

  const handleDelete = () => {
    Alert.alert(
      'Delete card',
      `Remove ${core_fields.name} from your collection? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setDeleting(true);
              setError(null);
              try {
                if (isLocalCard) {
                  await removeQueuedScan(localCardIdToQueueId(card._id));
                } else {
                  await deleteCard(card._id);
                }
                navigation.navigate('Collection');
              } catch (deleteError) {
                const message =
                  deleteError instanceof ApiClientError
                    ? deleteError.message
                    : 'Unable to delete this card.';
                setError(message);
              } finally {
                setDeleting(false);
              }
            })();
          },
        },
      ],
    );
  };

  const handleApplyEnhancement = (options: {
    acceptAll?: boolean;
    acceptedFields?: string[];
    acceptedOverrides?: Record<string, string>;
  }) => {
    void (async () => {
      setApplyingEnhancement(true);
      setError(null);
      try {
        const updated = await applyCardEnhancement(card._id, options);
        setCard(updated);
      } catch (applyError) {
        const message =
          applyError instanceof ApiClientError
            ? applyError.message
            : 'Unable to apply enhancement suggestions.';
        setError(message);
      } finally {
        setApplyingEnhancement(false);
      }
    })();
  };

  const toggleAcceptedField = (fieldKey: string) => {
    setAcceptedFieldKeys(previous => {
      const next = new Set(previous);
      if (next.has(fieldKey)) {
        next.delete(fieldKey);
      } else {
        next.add(fieldKey);
      }
      return next;
    });
  };

  const acceptedFieldCount = suggestionEntries.filter(([fieldKey]) =>
    acceptedFieldKeys.has(fieldKey),
  ).length;

  const updateSuggestionDraft = (fieldKey: string, value: string) => {
    setSuggestionDrafts(previous => ({ ...previous, [fieldKey]: value }));
  };

  const handleSaveEdits = () => {
    void (async () => {
      const normalizedCore = normalizeCoreFields(draftCoreFields);
      if (!normalizedCore.name) {
        setError('Name is required.');
        return;
      }

      const normalizedCustom = normalizeCustomFields(draftCustomFields);
      setSavingEdits(true);
      setError(null);
      try {
        if (isLocalCard) {
          if (!queuedScan) {
            throw new Error('Offline draft is no longer available.');
          }
          const editedFields = buildEditedFieldKeys(
            card.core_fields,
            normalizedCore,
            card.custom_fields,
            normalizedCustom,
            queuedScan.editedFields,
          );
          const updatedQueueItem = await updateQueuedScanFields(
            queuedScan.localId,
            normalizedCore,
            normalizedCustom,
            editedFields,
          );
          if (!updatedQueueItem) {
            throw new Error('Offline draft is no longer available.');
          }
          setQueuedScan(updatedQueueItem);
          setCard(previous => ({
            ...previous,
            core_fields: normalizedCore,
            custom_fields: normalizedCustom,
          }));
        } else {
          const updated = await updateCard(card._id, {
            core_fields: normalizedCore,
            custom_fields: normalizedCustom,
          });
          setCard(updated);
          await upsertCachedCard(updated);
        }
        setDraftCoreFields(normalizedCore);
        setDraftCustomFields(normalizedCustom);
        setEditing(false);
      } catch (saveError) {
        const message =
          saveError instanceof ApiClientError
            ? saveError.message
            : saveError instanceof Error
              ? saveError.message
              : 'Unable to save changes.';
        setError(message);
      } finally {
        setSavingEdits(false);
      }
    })();
  };

  const cancelEditing = () => {
    setDraftCoreFields(card.core_fields);
    setDraftCustomFields(card.custom_fields);
    setEditing(false);
    setError(null);
  };

  const openField = (key: keyof CoreFields, value: string) => {
    if (key === 'phone') {
      void Linking.openURL(`tel:${value.replace(/\s/g, '')}`);
      return;
    }
    if (key === 'email') {
      void Linking.openURL(`mailto:${value}`);
      return;
    }
    if (key === 'website') {
      void Linking.openURL(normalizeWebsite(value));
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {localScanImages.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Original scans</Text>
          {localScanImages.map(image => (
            <View key={image.label} style={styles.scanCard}>
              <Text style={styles.scanLabel}>{image.label}</Text>
              <Image source={{ uri: image.uri }} style={styles.scanImage} resizeMode="contain" />
            </View>
          ))}
        </View>
      ) : null}

      {scanImages.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Original scans</Text>
          {scanImages.map(image => (
            <View key={image.label} style={styles.scanCard}>
              <Text style={styles.scanLabel}>{image.label}</Text>
              <ScanImage
                scanImageUrl={image.url}
                style={styles.scanImage}
                resizeMode="contain"
              />
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Contact</Text>
        <Text style={styles.name}>{displayName}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        <Text style={styles.meta}>Added {formatScannedDate(scanned_at)}</Text>
      </View>

      {showOfflineBanner ? (
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerText}>
            Offline draft: quick preview from on-device OCR. When you are back online, AI will
            suggest field updates for you to review. Your manual edits are kept.
          </Text>
        </View>
      ) : null}

      {showEnhancementBanner ? (
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerText}>
            Enhancing your card details in the background. Updates will appear shortly.
          </Text>
        </View>
      ) : null}

      {showReviewBanner ? (
        <View style={styles.reviewCard}>
          <Text style={styles.sectionTitle}>Suggested updates</Text>
          <Text style={styles.reviewIntro}>
            Tap each suggestion to include or exclude it, then apply your selection.
          </Text>
          {suggestionEntries.map(([fieldKey, suggestedValue]) => {
            const isAccepted = acceptedFieldKeys.has(fieldKey);
            const draftValue = suggestionDrafts[fieldKey] ?? suggestedValue;
            return (
              <Pressable
                key={fieldKey}
                onPress={() => toggleAcceptedField(fieldKey)}
                style={({ pressed }) => [
                  styles.suggestionRow,
                  isAccepted && styles.suggestionRowSelected,
                  pressed && styles.rowPressed,
                ]}
              >
                <View style={styles.suggestionHeader}>
                  <View style={[styles.suggestionCheck, isAccepted && styles.suggestionCheckOn]}>
                    {isAccepted ? <Text style={styles.suggestionCheckMark}>✓</Text> : null}
                  </View>
                  <Text style={styles.label}>{suggestionLabel(fieldKey)}</Text>
                </View>
                <Text style={styles.suggestionCurrent}>
                  Current: {currentSuggestionValue(card, fieldKey) || '—'}
                </Text>
                <Text style={styles.suggestionNext}>Suggested value</Text>
                <TextInput
                  value={draftValue}
                  onChangeText={value => updateSuggestionDraft(fieldKey, value)}
                  placeholder="Edit suggested value"
                  placeholderTextColor={wallet.subtitle}
                  style={styles.suggestionInput}
                />
              </Pressable>
            );
          })}
          <View style={styles.reviewActions}>
            <Pressable
              onPress={() =>
                handleApplyEnhancement({
                  acceptedFields: suggestionEntries
                    .map(([fieldKey]) => fieldKey)
                    .filter(fieldKey => acceptedFieldKeys.has(fieldKey)),
                  acceptedOverrides: suggestionEntries
                    .map(([fieldKey]) => fieldKey)
                    .filter(fieldKey => acceptedFieldKeys.has(fieldKey))
                    .reduce<Record<string, string>>((acc, fieldKey) => {
                      const suggestionValue = enhanced_suggestions?.[fieldKey] ?? '';
                      const draftValue = suggestionDrafts[fieldKey] ?? suggestionValue;
                      if (draftValue !== suggestionValue) {
                        acc[fieldKey] = draftValue;
                      }
                      return acc;
                    }, {}),
                })
              }
              disabled={applyingEnhancement || acceptedFieldCount === 0}
              style={({ pressed }) => [
                styles.reviewPrimaryButton,
                pressed && styles.actionButtonPressed,
                (applyingEnhancement || acceptedFieldCount === 0) && styles.buttonDisabled,
              ]}
            >
              {applyingEnhancement ? (
                <ActivityIndicator color={wallet.addButtonText} />
              ) : (
                <Text style={styles.reviewPrimaryText}>
                  Apply selected{acceptedFieldCount > 0 ? ` (${acceptedFieldCount})` : ''}
                </Text>
              )}
            </Pressable>
            <Pressable
              onPress={() =>
                handleApplyEnhancement({
                  acceptAll: true,
                  acceptedOverrides: suggestionEntries.reduce<Record<string, string>>(
                    (acc, [fieldKey, suggestedValue]) => {
                      const draftValue = suggestionDrafts[fieldKey] ?? suggestedValue;
                      if (draftValue !== suggestedValue) {
                        acc[fieldKey] = draftValue;
                      }
                      return acc;
                    },
                    {},
                  ),
                })
              }
              disabled={applyingEnhancement}
              style={({ pressed }) => [
                styles.reviewSecondaryButton,
                pressed && styles.actionButtonPressed,
                applyingEnhancement && styles.buttonDisabled,
              ]}
            >
              <Text style={styles.reviewSecondaryText}>Accept all</Text>
            </Pressable>
          </View>
          <Pressable
            onPress={() => handleApplyEnhancement({ acceptAll: false })}
            disabled={applyingEnhancement}
            style={({ pressed }) => [
              styles.reviewTertiaryButton,
              pressed && styles.actionButtonPressed,
              applyingEnhancement && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.reviewTertiaryText}>Keep all current values</Text>
          </Pressable>
        </View>
      ) : null}

      {isLocalCard && !editing ? (
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerText}>
            This card is stored on your device and will sync when internet is available.
            {queuedScan?.lastError ? ` Last sync error: ${queuedScan.lastError}` : ''}
          </Text>
        </View>
      ) : null}

      {editing ? (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              {isLocalCard ? 'Edit offline draft' : 'Edit card details'}
            </Text>
            <Pressable
              onPress={cancelEditing}
              style={({ pressed }) => [styles.editToggle, pressed && styles.rowPressed]}
            >
              <Text style={styles.editToggleText}>Cancel</Text>
            </Pressable>
          </View>
          <View style={styles.editForm}>
            {CORE_FIELD_LABELS.map(({ key, label }) => (
              <View key={key} style={styles.editField}>
                <Text style={styles.label}>{label}</Text>
                <TextInput
                  value={draftCoreFields[key] ?? ''}
                  onChangeText={value =>
                    setDraftCoreFields(previous => ({ ...previous, [key]: value }))
                  }
                  placeholder={label}
                  placeholderTextColor={wallet.subtitle}
                  style={styles.editInput}
                  autoCapitalize={key === 'email' || key === 'website' ? 'none' : 'words'}
                  keyboardType={
                    key === 'email'
                      ? 'email-address'
                      : key === 'phone'
                        ? 'phone-pad'
                        : key === 'website'
                          ? 'url'
                          : 'default'
                  }
                />
              </View>
            ))}
            {customFieldKeys.length > 0 ? (
              <View style={styles.editCustomSection}>
                <Text style={styles.editCustomTitle}>Additional details</Text>
                {customFieldKeys.map(key => (
                  <View key={key} style={styles.editField}>
                    <Text style={styles.label}>{formatCustomFieldLabel(key)}:</Text>
                    <TextInput
                      value={draftCustomFields[key] ?? ''}
                      onChangeText={value =>
                        setDraftCustomFields(previous => ({ ...previous, [key]: value }))
                      }
                      placeholder={formatCustomFieldLabel(key)}
                      placeholderTextColor={wallet.subtitle}
                      style={[styles.editInput, styles.editInputMultiline]}
                      multiline
                    />
                  </View>
                ))}
              </View>
            ) : null}
            <Pressable
              onPress={handleSaveEdits}
              disabled={savingEdits}
              style={({ pressed }) => [
                styles.reviewPrimaryButton,
                pressed && styles.actionButtonPressed,
                savingEdits && styles.buttonDisabled,
              ]}
            >
              {savingEdits ? (
                <ActivityIndicator color={wallet.addButtonText} />
              ) : (
                <Text style={styles.reviewPrimaryText}>Save changes</Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : null}

      {!editing && !showEnhancementBanner ? (
        <Pressable
          onPress={() => setEditing(true)}
          style={({ pressed }) => [styles.editEntryButton, pressed && styles.rowPressed]}
        >
          <Text style={styles.editEntryButtonText}>Edit card details</Text>
        </Pressable>
      ) : null}

      {!editing && quickActions.length > 0 ? (
        <View style={styles.actionsRow}>
          {quickActions.map(action => (
            <Pressable
              key={action.key}
              onPress={action.onPress}
              style={({ pressed }) => [
                styles.actionButton,
                pressed && styles.actionButtonPressed,
              ]}
            >
              <Text style={styles.actionButtonText}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {!editing && CONTACT_FIELD_LABELS.some(({ key }) => core_fields[key]) ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact details</Text>
          {CONTACT_FIELD_LABELS.map(({ key, label }) => {
            const value = core_fields[key];
            if (!value) {
              return null;
            }
            return (
              <Pressable
                key={key}
                onPress={() => openField(key, value)}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <Text style={styles.label}>{label}</Text>
                <Text style={[styles.value, styles.valueLink]}>{value}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {!editing && Object.keys(custom_fields).length > 0 ? (
        <CustomFieldsList customFields={custom_fields} />
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Pressable
        onPress={handleDelete}
        disabled={deleting}
        style={styles.deleteButton}
      >
        {deleting ? (
          <ActivityIndicator color={wallet.error} />
        ) : (
          <Text style={styles.deleteText}>Delete card</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
const cardShadow = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
} as const;

const createStyles = (wallet: WalletThemeColors) =>
  StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: wallet.background,
  },
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 32,
  },
  scanCard: {
    backgroundColor: wallet.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: wallet.border,
    overflow: 'hidden',
  },
  scanLabel: {
    color: wallet.subtitle,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    textTransform: 'uppercase',
  },
  scanImage: {
    width: '100%',
    aspectRatio: 1.586,
    backgroundColor: wallet.background,
  },
  heroCard: {
    backgroundColor: wallet.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: wallet.border,
    padding: 22,
    gap: 6,
    borderTopWidth: 3,
    borderTopColor: wallet.accent,
    ...cardShadow,
  },
  eyebrow: {
    color: wallet.accentMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  name: {
    color: wallet.title,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: wallet.subtitle,
    fontSize: 16,
    lineHeight: 22,
  },
  meta: {
    marginTop: 6,
    color: wallet.subtitle,
    fontSize: 13,
  },
  infoBanner: {
    backgroundColor: wallet.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: wallet.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  infoBannerText: {
    color: wallet.subtitle,
    fontSize: 13,
    lineHeight: 18,
  },
  reviewCard: {
    backgroundColor: wallet.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: wallet.border,
    padding: 18,
    gap: 12,
    ...cardShadow,
  },
  reviewIntro: {
    color: wallet.subtitle,
    fontSize: 13,
    lineHeight: 18,
  },
  suggestionRow: {
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: wallet.border,
    borderRadius: 10,
  },
  suggestionRowSelected: {
    backgroundColor: wallet.background,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  suggestionCheck: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: wallet.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: wallet.surface,
  },
  suggestionCheckOn: {
    backgroundColor: wallet.addButton,
    borderColor: wallet.addButton,
  },
  suggestionCheckMark: {
    color: wallet.addButtonText,
    fontSize: 14,
    fontWeight: '700',
  },
  suggestionCurrent: {
    color: wallet.subtitle,
    fontSize: 13,
  },
  suggestionNext: {
    color: wallet.title,
    fontSize: 13,
    fontWeight: '600',
  },
  suggestionInput: {
    borderWidth: 1,
    borderColor: wallet.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: wallet.title,
    fontSize: 14,
    backgroundColor: wallet.surface,
  },
  reviewActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  reviewPrimaryButton: {
    flex: 1,
    backgroundColor: wallet.addButton,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  reviewPrimaryText: {
    color: wallet.addButtonText,
    fontSize: 14,
    fontWeight: '700',
  },
  reviewSecondaryButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: wallet.border,
    minHeight: 44,
  },
  reviewSecondaryText: {
    color: wallet.title,
    fontSize: 14,
    fontWeight: '600',
  },
  reviewTertiaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    minHeight: 40,
  },
  reviewTertiaryText: {
    color: wallet.subtitle,
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editToggle: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  editToggleText: {
    color: wallet.accentMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  editForm: {
    gap: 12,
  },
  editField: {
    gap: 6,
  },
  editInput: {
    borderWidth: 1,
    borderColor: wallet.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: wallet.title,
    fontSize: 15,
    backgroundColor: wallet.background,
  },
  editInputMultiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  editCustomSection: {
    gap: 12,
    marginTop: 4,
  },
  editCustomTitle: {
    color: wallet.title,
    fontSize: 15,
    fontWeight: '700',
  },
  editEntryButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: wallet.border,
    backgroundColor: wallet.surface,
  },
  editEntryButtonText: {
    color: wallet.accentMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionButton: {
    backgroundColor: wallet.addButton,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  actionButtonPressed: {
    opacity: 0.88,
  },
  actionButtonText: {
    color: wallet.addButtonText,
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    backgroundColor: wallet.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: wallet.border,
    padding: 18,
    gap: 14,
    ...cardShadow,
  },
  sectionTitle: {
    color: wallet.accentMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  row: {
    gap: 4,
    borderRadius: 8,
    paddingVertical: 2,
  },
  rowPressed: {
    opacity: 0.7,
  },
  label: {
    color: wallet.subtitle,
    fontSize: 12,
    fontWeight: '600',
  },
  value: {
    color: wallet.title,
    fontSize: 16,
    lineHeight: 22,
  },
  valueLink: {
    color: wallet.accentMuted,
  },
  errorText: {
    color: wallet.error,
    textAlign: 'center',
    fontSize: 14,
  },
  deleteButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  deleteText: {
    color: wallet.error,
    fontWeight: '600',
    fontSize: 16,
  },
});

