import type { CoreFields } from './card';

export type DesignType = 'preset' | 'custom';

export interface UserCard {
  _id: string;
  owner_user_id: string;
  core_fields: CoreFields;
  custom_fields: Record<string, string>;
  design_id: string;
  design_type: DesignType;
  custom_background_url?: string | null;
  is_primary: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface UserCardDraft {
  core_fields: CoreFields;
  custom_fields: Record<string, string>;
  design_id: string;
  design_type: DesignType;
  custom_background_url?: string | null;
  is_primary?: boolean;
}

export interface ParsedUserCardPreview {
  core_fields: CoreFields;
  custom_fields: Record<string, string>;
}

export type UserCardListState =
  | { status: 'idle' }
  | { status: 'loading'; cards?: UserCard[] }
  | { status: 'success'; cards: UserCard[] }
  | { status: 'error'; message: string; cards?: UserCard[] };
