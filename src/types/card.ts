/** Mirrors e-business-card-api openapi.yaml / Pydantic models */

export interface CoreFields {
  name: string;
  company_name?: string | null;
  job_title?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
}

export type WalletDisplay = 'photo' | 'classic';
export type PhotoFace = 'front' | 'back';

export interface CapturedCard {
  _id: string;
  owner_user_id: string;
  scanned_at: string;
  core_fields: CoreFields;
  custom_fields: Record<string, string>;
  scan_image_url?: string | null;
  scan_image_front_url?: string | null;
  scan_image_back_url?: string | null;
  wallet_display?: WalletDisplay;
  photo_face?: PhotoFace;
}

export interface ProcessCardRequest {
  raw_ocr_text: string;
}

export type ProcessCardState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; card: CapturedCard }
  | { status: 'error'; message: string };

export type CardListState =
  | { status: 'idle' }
  | { status: 'loading'; cards?: CapturedCard[] }
  | { status: 'success'; cards: CapturedCard[] }
  | { status: 'error'; message: string; cards?: CapturedCard[] };

export type CardCaptureSource = 'scan' | 'nfc';
