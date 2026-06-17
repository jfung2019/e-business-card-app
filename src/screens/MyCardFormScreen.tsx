import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { DesignPicker } from '../components/DesignPicker';
import { MyCardFace } from '../components/MyCardFace';
import { createUserCard, deleteUserCard, updateUserCard } from '../api/userCards';
import { ApiClientError } from '../api/client';
import { useAppTheme } from '../context/ThemeContext';
import type { MainStackParamList } from '../navigation/AppNavigator';
import { DEFAULT_CARD_DESIGN_ID } from '../theme/cardDesigns';
import type { WalletThemeColors } from '../theme/appTheme';
import type { CoreFields } from '../types/card';
import type { UserCard, UserCardDraft } from '../types/userCard';

type FormRoute = RouteProp<MainStackParamList, 'MyCardForm'>;
type FormNavigation = NativeStackNavigationProp<MainStackParamList, 'MyCardForm'>;

const FIELD_SECTIONS: Array<{
  title: string;
  helper: string;
  fields: Array<[keyof CoreFields, string, string]>;
}> = [
  {
    title: 'Identity',
    helper: 'This is the first thing people see when they open your card.',
    fields: [
      ['name', 'Name *', 'Your full name'],
      ['company_name', 'Company', 'Company or organization'],
      ['job_title', 'Job title', 'Role, team, or title'],
    ],
  },
  {
    title: 'Contact',
    helper: 'Add the ways you want people to reach you.',
    fields: [
      ['email', 'Email', 'name@example.com'],
      ['phone', 'Phone', '+1 555 123 4567'],
      ['website', 'Website', 'example.com'],
    ],
  },
];

function buildDraft(
  fields: CoreFields,
  designId: string,
  isPrimary: boolean,
): UserCardDraft {
  return {
    core_fields: fields,
    custom_fields: {},
    design_id: designId,
    design_type: 'preset',
    is_primary: isPrimary,
  };
}

function createStyles(wallet: WalletThemeColors) {
  return StyleSheet.create({
    container: {
      padding: 20,
      gap: 18,
      backgroundColor: wallet.background,
    },
    introCard: {
      backgroundColor: wallet.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: wallet.border,
      padding: 18,
      gap: 6,
    },
    eyebrow: {
      color: wallet.accentMuted,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    title: {
      color: wallet.title,
      fontSize: 24,
      fontWeight: '700',
      letterSpacing: -0.2,
    },
    helperText: {
      color: wallet.subtitle,
      fontSize: 14,
      lineHeight: 20,
    },
    previewWrap: {
      alignItems: 'center',
      gap: 10,
    },
    previewLabel: {
      color: wallet.subtitle,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    form: {
      gap: 14,
    },
    sectionCard: {
      backgroundColor: wallet.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: wallet.border,
      padding: 16,
      gap: 14,
    },
    sectionTitle: {
      color: wallet.title,
      fontSize: 18,
      fontWeight: '700',
    },
    field: {
      gap: 6,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: wallet.subtitle,
      textTransform: 'uppercase',
    },
    input: {
      backgroundColor: wallet.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: wallet.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      color: wallet.title,
    },
    primaryToggle: {
      backgroundColor: wallet.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: wallet.border,
      padding: 16,
      gap: 4,
    },
    primaryToggleText: {
      color: wallet.title,
      fontWeight: '700',
      fontSize: 15,
    },
    primaryToggleHint: {
      color: wallet.subtitle,
      fontSize: 13,
      lineHeight: 18,
    },
    errorText: {
      color: wallet.error,
      fontWeight: '600',
    },
    saveButton: {
      backgroundColor: wallet.addButton,
      borderRadius: 999,
      paddingVertical: 14,
      alignItems: 'center',
    },
    saveButtonDisabled: {
      opacity: 0.7,
    },
    saveButtonText: {
      color: wallet.addButtonText,
      fontWeight: '700',
      fontSize: 16,
    },
    deleteButton: {
      alignSelf: 'center',
      paddingVertical: 8,
    },
    deleteText: {
      color: wallet.error,
      fontWeight: '600',
    },
  });
}

export function MyCardFormScreen(): React.JSX.Element {
  const navigation = useNavigation<FormNavigation>();
  const route = useRoute<FormRoute>();
  const { wallet } = useAppTheme();
  const styles = useMemo(() => createStyles(wallet), [wallet]);
  const params = route.params;
  const mode = params.mode;
  const card = mode === 'edit' ? params.card : undefined;
  const parsedPreview = mode === 'create' ? params.parsedPreview : undefined;

  const initialFields = useMemo<CoreFields>(() => {
    if (card) {
      return card.core_fields;
    }
    if (parsedPreview) {
      return parsedPreview.core_fields;
    }
    return {
      name: '',
      company_name: '',
      job_title: '',
      email: '',
      phone: '',
      website: '',
    };
  }, [card, parsedPreview]);

  const [fields, setFields] = useState<CoreFields>(initialFields);
  const [designId, setDesignId] = useState(card?.design_id ?? DEFAULT_CARD_DESIGN_ID);
  const [isPrimary, setIsPrimary] = useState(card?.is_primary ?? mode === 'create');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewCard: UserCard = {
    _id: card?._id ?? 'preview',
    owner_user_id: card?.owner_user_id ?? '',
    core_fields: fields,
    custom_fields: card?.custom_fields ?? parsedPreview?.custom_fields ?? {},
    design_id: designId,
    design_type: 'preset',
    is_primary: isPrimary,
    sort_order: card?.sort_order ?? 0,
    scan_image_url: card?.scan_image_url,
    scan_image_front_url: card?.scan_image_front_url,
    scan_image_back_url: card?.scan_image_back_url,
    // In form mode, prioritize template preview so design selection is immediately visible.
    wallet_display: 'classic',
    photo_face: card?.photo_face ?? 'front',
    created_at: card?.created_at ?? '',
    updated_at: card?.updated_at ?? '',
  };

  const updateField = (key: keyof CoreFields, value: string) => {
    setFields(previous => ({ ...previous, [key]: value }));
  };

  const handleSave = async () => {
    if (!fields.name.trim()) {
      setError('Name is required.');
      return;
    }

    setSaving(true);
    setError(null);

    const normalized: CoreFields = {
      name: fields.name.trim(),
      company_name: fields.company_name?.trim() || null,
      job_title: fields.job_title?.trim() || null,
      email: fields.email?.trim() || null,
      phone: fields.phone?.trim() || null,
      website: fields.website?.trim() || null,
    };

    try {
      if (mode === 'edit' && card) {
        await updateUserCard(card._id, {
          core_fields: normalized,
          design_id: designId,
          is_primary: isPrimary,
        });
      } else {
        await createUserCard(buildDraft(normalized, designId, isPrimary));
      }
      navigation.navigate('Collection');
    } catch (saveError) {
      const message =
        saveError instanceof ApiClientError
          ? saveError.message
          : 'Unable to save your business card.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!card) {
      return;
    }

    Alert.alert('Delete card', 'Remove this business card from your profile?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setSaving(true);
            try {
              await deleteUserCard(card._id);
              navigation.navigate('Collection');
            } catch (deleteError) {
              const message =
                deleteError instanceof ApiClientError
                  ? deleteError.message
                  : 'Unable to delete this card.';
              setError(message);
            } finally {
              setSaving(false);
            }
          })();
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.introCard}>
        <Text style={styles.eyebrow}>{mode === 'edit' ? 'Edit card' : 'New card'}</Text>
        <Text style={styles.title}>
          {mode === 'edit' ? 'Keep your details current' : 'Build your shareable card'}
        </Text>
        <Text style={styles.helperText}>
          {mode === 'edit'
            ? 'Update the details, design, and primary-card setting shown in your wallet.'
            : 'Start with the essentials. You can come back later to adjust the design or details.'}
        </Text>
      </View>

      <View style={styles.previewWrap}>
        <Text style={styles.previewLabel}>Live preview</Text>
        <MyCardFace card={previewCard} compact />
      </View>

      <DesignPicker selectedDesignId={designId} onSelect={setDesignId} />

      <View style={styles.form}>
        {FIELD_SECTIONS.map(section => (
          <View key={section.title} style={styles.sectionCard}>
            <View>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.helperText}>{section.helper}</Text>
            </View>
            {section.fields.map(([key, label, placeholder]) => (
              <View key={key} style={styles.field}>
                <Text style={styles.label}>{label}</Text>
                <TextInput
                  value={fields[key] ?? ''}
                  onChangeText={value => updateField(key, value)}
                  style={styles.input}
                  placeholder={placeholder}
                  placeholderTextColor={wallet.subtitle}
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
          </View>
        ))}
      </View>

      <Pressable
        onPress={() => setIsPrimary(previous => !previous)}
        style={styles.primaryToggle}
      >
        <Text style={styles.primaryToggleText}>
          {isPrimary ? 'Primary card selected' : 'Set as primary card'}
        </Text>
        <Text style={styles.primaryToggleHint}>
          {isPrimary
            ? 'This card appears first in your wallet and profile.'
            : 'Make this the first card people see when you share your profile.'}
        </Text>
      </Pressable>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Pressable
        onPress={() => void handleSave()}
        disabled={saving}
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
      >
        {saving ? (
          <ActivityIndicator color={wallet.addButtonText} />
        ) : (
          <Text style={styles.saveButtonText}>
            {mode === 'edit' ? 'Save changes' : 'Save card'}
          </Text>
        )}
      </Pressable>

      {mode === 'edit' && card ? (
        <Pressable onPress={handleDelete} style={styles.deleteButton}>
          <Text style={styles.deleteText}>Delete card</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}
