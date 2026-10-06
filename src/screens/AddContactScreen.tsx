import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { createManualCard } from '../api/cards';
import { ApiClientError } from '../api/client';
import { useAppTheme } from '../context/ThemeContext';
import type { MainStackParamList } from '../navigation/AppNavigator';
import type { WalletThemeColors } from '../theme/appTheme';
import type { CoreFields } from '../types/card';
import { WECHAT_ID_KEY } from '../utils/customFieldKeys';

type AddContactNavigation = NativeStackNavigationProp<MainStackParamList, 'Collection'>;

/** Custom-field key the rest of the app already reads WhatsApp from. */
const WHATSAPP_KEY = 'WhatsApp';

type CoreKey = 'name' | 'first_name' | 'last_name' | 'name_cn' | 'company_name' | 'job_title' | 'phone' | 'email';

const IDENTITY_FIELDS: Array<[CoreKey, string, string]> = [
  ['name', 'Name *', 'As printed on the card'],
  ['first_name', 'First name', 'Used for sorting and search'],
  ['last_name', 'Last name', 'Used for sorting and search'],
  ['name_cn', 'Chinese name', '中文姓名'],
  ['company_name', 'Company', 'Company or organization'],
  ['job_title', 'Job title', 'Role, team, or title'],
];

const CONTACT_FIELDS: Array<[CoreKey, string, string]> = [
  ['phone', 'Phone', '+852 0000 0000'],
  ['email', 'Email', 'name@company.com'],
];

export function AddContactScreen(): React.JSX.Element {
  const { wallet } = useAppTheme();
  const styles = useMemo(() => createStyles(wallet), [wallet]);
  const navigation = useNavigation<AddContactNavigation>();

  const [fields, setFields] = useState<Partial<Record<CoreKey, string>>>({});
  const [whatsapp, setWhatsapp] = useState('');
  const [wechat, setWechat] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = (key: CoreKey, value: string) => {
    setFields(previous => ({ ...previous, [key]: value }));
  };

  const clean = (value: string | undefined): string | null => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  };

  const handleSave = () => {
    const name = clean(fields.name);
    if (!name) {
      setError('A name is required — everything else can come later.');
      return;
    }

    void (async () => {
      setSaving(true);
      setError(null);
      try {
        const coreFields: CoreFields = {
          name,
          first_name: clean(fields.first_name),
          last_name: clean(fields.last_name),
          name_cn: clean(fields.name_cn),
          company_name: clean(fields.company_name),
          job_title: clean(fields.job_title),
          phone: clean(fields.phone),
          email: clean(fields.email),
        };

        const customFields: Record<string, string> = {};
        const whatsappValue = clean(whatsapp);
        if (whatsappValue) {
          customFields[WHATSAPP_KEY] = whatsappValue;
        }
        const wechatValue = clean(wechat);
        if (wechatValue) {
          customFields[WECHAT_ID_KEY] = wechatValue;
        }

        const created = await createManualCard(coreFields, customFields);
        // The Add tab keeps this form mounted, so clear it — otherwise coming
        // back shows the contact that was just saved, ready to be saved again.
        setFields({});
        setWhatsapp('');
        setWechat('');
        // Straight to the card you just made, rather than back to the list
        // wondering whether it saved.
        navigation.navigate('CardDetail', { card: created });
      } catch (saveError) {
        setError(
          saveError instanceof ApiClientError
            ? saveError.message
            : 'Could not save this contact. Check your connection and try again.',
        );
      } finally {
        setSaving(false);
      }
    })();
  };

  const renderField = ([key, label, placeholder]: [CoreKey, string, string]) => (
    <View key={key} style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={fields[key] ?? ''}
        onChangeText={value => setField(key, value)}
        placeholder={placeholder}
        placeholderTextColor={wallet.subtitle}
        style={styles.input}
        autoCapitalize={key === 'email' ? 'none' : 'words'}
        keyboardType={key === 'email' ? 'email-address' : key === 'phone' ? 'phone-pad' : 'default'}
        autoCorrect={false}
      />
    </View>
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Identity</Text>
        <Text style={styles.sectionHelper}>
          The name is shown as you type it. First and last name are used for sorting and
          search, never for display.
        </Text>
        {IDENTITY_FIELDS.map(renderField)}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Contact</Text>
        {CONTACT_FIELDS.map(renderField)}
        <View style={styles.field}>
          <Text style={styles.label}>WhatsApp</Text>
          <TextInput
            value={whatsapp}
            onChangeText={setWhatsapp}
            placeholder="Same as phone"
            placeholderTextColor={wallet.subtitle}
            style={styles.input}
            keyboardType="phone-pad"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>WeChat ID</Text>
          <TextInput
            value={wechat}
            onChangeText={setWechat}
            placeholder="WeChat ID"
            placeholderTextColor={wallet.subtitle}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      <Text style={styles.note}>
        Contacts you type in sit alongside scanned ones in Collected. There is no photo, so
        the card shows a designed face.
      </Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Pressable
        onPress={handleSave}
        disabled={saving}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.saveButton,
          (pressed || saving) && styles.saveButtonPressed,
        ]}
      >
        {saving ? (
          <ActivityIndicator color={wallet.addButtonText} />
        ) : (
          <Text style={styles.saveButtonText}>Save contact</Text>
        )}
      </Pressable>
    </ScrollView>
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
      paddingBottom: 32,
    },
    sectionCard: {
      backgroundColor: wallet.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: wallet.border,
      padding: 16,
      gap: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: wallet.title,
    },
    sectionHelper: {
      fontSize: 13,
      lineHeight: 19,
      color: wallet.subtitle,
      marginTop: -6,
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
    note: {
      fontSize: 12,
      lineHeight: 18,
      color: wallet.subtitle,
      paddingHorizontal: 2,
    },
    errorText: {
      color: wallet.error,
      fontWeight: '600',
      textAlign: 'center',
    },
    saveButton: {
      backgroundColor: wallet.addButton,
      borderRadius: 999,
      paddingVertical: 14,
      alignItems: 'center',
      minHeight: 50,
      justifyContent: 'center',
    },
    saveButtonPressed: {
      opacity: 0.8,
    },
    saveButtonText: {
      color: wallet.addButtonText,
      fontWeight: '700',
      fontSize: 16,
    },
  });
