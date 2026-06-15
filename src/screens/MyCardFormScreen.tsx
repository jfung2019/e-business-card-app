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
import type { MainStackParamList } from '../navigation/AppNavigator';
import { DEFAULT_CARD_DESIGN_ID } from '../theme/cardDesigns';
import { walletColors } from '../theme/wallet';
import type { CoreFields } from '../types/card';
import type { UserCard, UserCardDraft } from '../types/userCard';

type FormRoute = RouteProp<MainStackParamList, 'MyCardForm'>;
type FormNavigation = NativeStackNavigationProp<MainStackParamList, 'MyCardForm'>;

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

export function MyCardFormScreen(): React.JSX.Element {
  const navigation = useNavigation<FormNavigation>();
  const route = useRoute<FormRoute>();
  const { mode, card, parsedPreview } = route.params;

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
    wallet_display: card?.wallet_display,
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
      <View style={styles.previewWrap}>
        <MyCardFace card={previewCard} compact />
      </View>

      <DesignPicker selectedDesignId={designId} onSelect={setDesignId} />

      <View style={styles.form}>
        {(
          [
            ['name', 'Name *'],
            ['company_name', 'Company'],
            ['job_title', 'Job title'],
            ['email', 'Email'],
            ['phone', 'Phone'],
            ['website', 'Website'],
          ] as Array<[keyof CoreFields, string]>
        ).map(([key, label]) => (
          <View key={key} style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
              value={fields[key] ?? ''}
              onChangeText={value => updateField(key, value)}
              style={styles.input}
              placeholder={label}
              placeholderTextColor="#9CA3AF"
              autoCapitalize={key === 'email' ? 'none' : 'words'}
              keyboardType={
                key === 'email' ? 'email-address' : key === 'phone' ? 'phone-pad' : 'default'
              }
            />
          </View>
        ))}
      </View>

      <Pressable
        onPress={() => setIsPrimary(previous => !previous)}
        style={styles.primaryToggle}
      >
        <Text style={styles.primaryToggleText}>
          {isPrimary ? '★ Primary card' : 'Set as primary card'}
        </Text>
      </Pressable>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Pressable
        onPress={() => void handleSave()}
        disabled={saving}
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
      >
        {saving ? (
          <ActivityIndicator color={walletColors.addButtonText} />
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

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 20,
    backgroundColor: walletColors.background,
  },
  previewWrap: {
    alignItems: 'center',
  },
  form: {
    gap: 14,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: walletColors.subtitle,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: walletColors.title,
  },
  primaryToggle: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
  primaryToggleText: {
    color: walletColors.title,
    fontWeight: '700',
    fontSize: 15,
  },
  errorText: {
    color: '#B91C1C',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: walletColors.addButton,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: walletColors.addButtonText,
    fontWeight: '700',
    fontSize: 16,
  },
  deleteButton: {
    alignSelf: 'center',
    paddingVertical: 8,
  },
  deleteText: {
    color: '#B91C1C',
    fontWeight: '600',
  },
});
