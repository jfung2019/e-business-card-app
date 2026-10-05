import type { NavigationProp } from '@react-navigation/native';

import type { CapturedCard } from '../types/card';
import type { UserCard } from '../types/userCard';
import type { MainStackParamList } from './AppNavigator';
import type { MainTabParamList } from './MainTabs';

type ScanNavigation = NavigationProp<MainStackParamList>;
type ListTab = Extract<keyof MainTabParamList, 'MyCardsTab' | 'CollectedTab'>;

/**
 * The tab host, opened on the list the new card landed in.
 *
 * Passing the nested state matters: navigating to `Collection` alone resumes
 * whichever tab was last active, which is rarely the list the card just joined.
 */
function listRoute(tab: ListTab) {
  return { name: 'Collection' as const, state: { routes: [{ name: tab }] } };
}

/**
 * End a scan.
 *
 * A capture walks through several screens — the scanner, the image review, the
 * confirmation form — and none of them should still be there afterwards. Going
 * back from the finished card belongs on the list it was saved to, so the stack
 * is rebuilt rather than added to.
 */
export function finishCollectedScan(
  navigation: ScanNavigation,
  card?: CapturedCard,
): void {
  navigation.reset(
    card
      ? {
          index: 1,
          routes: [listRoute('CollectedTab'), { name: 'CardDetail', params: { card } }],
        }
      : { index: 0, routes: [listRoute('CollectedTab')] },
  );
}

/** As {@link finishCollectedScan}, for a card of the user's own. */
export function finishMyCardScan(navigation: ScanNavigation, card?: UserCard): void {
  navigation.reset(
    card
      ? {
          index: 1,
          routes: [listRoute('MyCardsTab'), { name: 'MyCard', params: { card } }],
        }
      : { index: 0, routes: [listRoute('MyCardsTab')] },
  );
}
