import type { CoreFields } from './card';

export type OfflineQueueStatus = 'pending' | 'uploading' | 'failed';

export interface QueuedCardScan {
  localId: string;
  createdAt: string;
  rawOcrText: string;
  imageBase64: string;
  backImageBase64?: string;
  core_fields: CoreFields;
  custom_fields: Record<string, string>;
  editedFields: string[];
  syncStatus: OfflineQueueStatus;
  serverCardId?: string;
  lastError?: string;
}
