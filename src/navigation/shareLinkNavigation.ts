import type { NavigationContainerRef } from '@react-navigation/native';

import type { MainStackParamList } from './AppNavigator';

/** Token waiting for auth or navigation to become ready. */
export const pendingShareTokenRef = { current: null as string | null };

export function flushPendingShareNavigation(
  navigationRef: NavigationContainerRef<MainStackParamList>,
  isUserSignedIn: boolean,
): boolean {
  const token = pendingShareTokenRef.current;
  if (!token || !isUserSignedIn || !navigationRef.isReady()) {
    return false;
  }

  const currentRoute = navigationRef.getCurrentRoute();
  if (
    currentRoute?.name === 'SharedCardPreview' &&
    (currentRoute.params as MainStackParamList['SharedCardPreview'] | undefined)?.token === token
  ) {
    pendingShareTokenRef.current = null;
    return true;
  }

  navigationRef.navigate('SharedCardPreview', { token });
  pendingShareTokenRef.current = null;
  return true;
}

export function queueSharedCardNavigation(token: string): void {
  pendingShareTokenRef.current = token;
}
