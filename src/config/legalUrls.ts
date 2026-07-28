import { Alert, Linking } from 'react-native';

/**
 * Public legal pages on the production host.
 * Use prod URLs in all builds so store reviewers always see the live policy.
 */
export const PRIVACY_POLICY_URL = 'https://ebc.megaannum.ai/privacy';
export const TERMS_OF_SERVICE_URL = 'https://ebc.megaannum.ai/terms';

export async function openLegalUrl(url: string): Promise<void> {
  try {
    // Skip Linking.canOpenURL for https — on Android 11+ it often returns
    // false unless <queries> declares VIEW+https, even when a browser exists.
    await Linking.openURL(url);
  } catch {
    Alert.alert('Unable to open link', 'Please try again later.');
  }
}
