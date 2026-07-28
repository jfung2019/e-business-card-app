import type { CapturedCard } from '../types/card';
import type { ParsedUserCardPreview, UserCard } from '../types/userCard';

export type AuthStackParamList = {
  Login: undefined;
};

export type MainStackParamList = {
  Collection: undefined;
  CollectedCards: undefined;
  Scan: undefined;
  CardScanner: undefined;
  CardDetail: { card: CapturedCard };
  MyCardScan: undefined;
  MyCardForm:
    | { mode: 'create'; parsedPreview?: ParsedUserCardPreview }
    | { mode: 'edit'; card: UserCard };
  ReorderMyCards: { cards: UserCard[] };
  Profile: undefined;
  ChangePassword: undefined;
  ManageAccount: undefined;
  ShareMyCard: { cardId: string };
  SharedCardPreview: { token: string };
};
