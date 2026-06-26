import type { CoreFields, PhotoFace, WalletDisplay } from './card';

export interface SharedUserCard {
  share_token: string;
  core_fields: CoreFields;
  custom_fields: Record<string, string>;
  design_id: string;
  wallet_display: WalletDisplay;
  photo_face: PhotoFace;
  scan_image_front_url?: string | null;
  scan_image_back_url?: string | null;
  updated_at: string;
}
