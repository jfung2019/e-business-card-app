/** Mirrors e-business-card-api openapi.yaml / Pydantic models */

export interface CoreFields {
  name: string;
  company_name?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
}

export interface CapturedCard {
  _id: string;
  owner_user_id: string;
  scanned_at: string;
  core_fields: CoreFields;
  custom_fields: Record<string, string>;
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
