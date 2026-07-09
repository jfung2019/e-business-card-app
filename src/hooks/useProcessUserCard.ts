import { useCallback, useState } from 'react';

import { processUserCard } from '../api/userCards';
import { ApiClientError } from '../api/client';
import {
  enqueueOfflineUserScan,
  queuedUserScanToUserCard,
} from '../services/offlineUserCardQueue';
import type { UserCard } from '../types/userCard';
import { isDeviceOnline, shouldFallbackToOfflineScan } from '../utils/network';
import { parseOcrOffline } from '../utils/parseOcrOffline';
import { scanUploadErrorMessage } from '../utils/scanUploadErrors';

export interface UserCardScanSubmission {
  ocrText: string;
  imageBase64: string;
  backImageBase64?: string;
  designId?: string;
  isPrimary?: boolean;
}

type ProcessUserCardState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; card: UserCard }
  | { status: 'error'; message: string };

interface UseProcessUserCardResult {
  state: ProcessUserCardState;
  userCard: UserCard | null;
  isOfflineDraft: boolean;
  submitScan: (scan: UserCardScanSubmission) => Promise<void>;
  reset: () => void;
}

function normalizeScanErrorMessage(error: unknown): string {
  const uploadMessage = scanUploadErrorMessage(error);
  if (uploadMessage) {
    return uploadMessage;
  }

  const rawMessage =
    error instanceof ApiClientError
      ? error.message
      : error instanceof Error
        ? error.message
        : 'Unable to save your business card.';
  const lower = rawMessage.toLowerCase();
  const isTransientParserFailure =
    lower.includes('llm parsing service is unavailable') ||
    lower.includes('openrouter transient') ||
    lower.includes('openrouter returned http 429') ||
    lower.includes('openrouter returned http 500') ||
    lower.includes('openrouter returned http 502') ||
    lower.includes('openrouter returned http 503') ||
    lower.includes('openrouter returned http 504');
  if (isTransientParserFailure) {
    return 'Parsing service is busy right now. Please try again in a moment.';
  }
  return rawMessage;
}

async function saveOfflineUserScan(scan: UserCardScanSubmission): Promise<UserCard> {
  const parsed = parseOcrOffline(scan.ocrText.trim());
  const queued = await enqueueOfflineUserScan({
    rawOcrText: scan.ocrText.trim(),
    imageBase64: scan.imageBase64,
    backImageBase64: scan.backImageBase64,
    core_fields: parsed.core_fields,
    custom_fields: parsed.custom_fields,
    designId: scan.designId,
    isPrimary: scan.isPrimary,
  });
  return queuedUserScanToUserCard(queued);
}

export function useProcessUserCard(): UseProcessUserCardResult {
  const [state, setState] = useState<ProcessUserCardState>({ status: 'idle' });
  const [isOfflineDraft, setIsOfflineDraft] = useState(false);

  const submitScan = useCallback(
    async ({ ocrText, imageBase64, backImageBase64, designId, isPrimary }: UserCardScanSubmission) => {
      const trimmed = ocrText.trim();
      if (!trimmed) {
        setState({ status: 'error', message: 'No text was detected on the card.' });
        return;
      }

      setState({ status: 'loading' });
      setIsOfflineDraft(false);

      const scan: UserCardScanSubmission = {
        ocrText: trimmed,
        imageBase64,
        backImageBase64,
        designId,
        isPrimary,
      };
      const online = await isDeviceOnline();

      if (!online) {
        try {
          const card = await saveOfflineUserScan(scan);
          setIsOfflineDraft(true);
          setState({ status: 'success', card });
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : 'Unable to save this card offline. Please try again.';
          setState({ status: 'error', message });
        }
        return;
      }

      try {
        const card = await processUserCard(trimmed, imageBase64, {
          backImageBase64,
          designId,
          isPrimary,
        });
        setState({ status: 'success', card });
      } catch (error) {
        if (shouldFallbackToOfflineScan(error)) {
          try {
            const card = await saveOfflineUserScan(scan);
            setIsOfflineDraft(true);
            setState({ status: 'success', card });
            return;
          } catch (offlineError) {
            const message =
              offlineError instanceof Error
                ? offlineError.message
                : 'Network unavailable and offline save failed. Please try again.';
            setState({ status: 'error', message });
            return;
          }
        }

        const message = normalizeScanErrorMessage(error);
        setState({ status: 'error', message });
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setState({ status: 'idle' });
    setIsOfflineDraft(false);
  }, []);

  const userCard = state.status === 'success' ? state.card : null;

  return {
    state,
    userCard,
    isOfflineDraft,
    submitScan,
    reset,
  };
}
