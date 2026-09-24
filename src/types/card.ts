/** Mirrors e-business-card-api openapi.yaml / Pydantic models */

/** Latin-script name parts. Either half may be missing on a real card. */
export interface NamePartsEn {
  first: string | null;
  last: string | null;
}

/**
 * Which value the server's sort key was built from, so the UI can tell a real
 * family name from a fallback and offer to fix it.
 */
export type NameSortBasis =
  | 'last_en'
  | 'first_en'
  /** Split guessed from the printed name, for cards scanned before the API captured it. */
  | 'guessed_en'
  | 'romanized_cn'
  | 'company'
  | 'none';

export interface CoreFields {
  /**
   * The name exactly as the card prints it. Display uses this and only this —
   * the parts below exist for sorting and search, never for recomposition.
   */
  name: string;
  /**
   * Split of the Latin name, flat because every other consumer treats
   * core_fields as a map of strings — the edit form, the suggestion diff and
   * the offline patch builder all iterate it.
   */
  first_name?: string | null;
  last_name?: string | null;
  /** The Chinese name as printed, if the card carries one. */
  name_cn?: string | null;
  company_name?: string | null;
  job_title?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
}

export type WalletDisplay = 'photo' | 'classic';
export type PhotoFace = 'front' | 'back';
export type ParseStatus = 'pending' | 'parsed' | 'failed' | 'fallback';
export type ParseSource = 'llm' | 'offline' | 'manual';
export type EnhancementStatus = 'none' | 'queued' | 'processing' | 'pending_review' | 'applied' | 'failed';
export type ScanImageEnhancementStatus =
  | 'none'
  | 'processing'
  | 'preview_ready'
  | 'applied'
  | 'discarded'
  | 'failed';

export interface CapturedCard {
  _id: string;
  owner_user_id: string;
  scanned_at: string;
  core_fields: CoreFields;
  custom_fields: Record<string, string>;
  scan_image_url?: string | null;
  scan_image_front_url?: string | null;
  scan_image_back_url?: string | null;
  scan_image_front_pending_url?: string | null;
  scan_image_back_pending_url?: string | null;
  scan_image_enhancement_status?: ScanImageEnhancementStatus;
  scan_image_enhancement_error?: string | null;
  wallet_display?: WalletDisplay;
  photo_face?: PhotoFace;
  parse_status?: ParseStatus;
  parse_source?: ParseSource;
  enhancement_status?: EnhancementStatus;
  enhanced_suggestions?: Record<string, string>;
  parse_error?: string | null;
  parsed_at?: string | null;
  /** Lowercase Latin key the list sorts and sections on. Computed server-side. */
  sort_key?: string | null;
  sort_basis?: NameSortBasis | null;
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
  | { status: 'success'; cards: CapturedCard[]; isOfflineSnapshot?: boolean }
  | { status: 'error'; message: string; cards?: CapturedCard[] };

export type CardCaptureSource = 'scan' | 'nfc';
