import { useCallback, useState } from 'react';

import { processCard } from '../api/cards';
import { ApiClientError } from '../api/client';
import {
  enqueueOfflineScan,
  queuedScanToCapturedCard,
} from '../services/offlineCardQueue';
import type { CapturedCard, ProcessCardState } from '../types/card';
import { isDeviceOnline, isLikelyNetworkError } from '../utils/network';
import { parseOcrOffline } from '../utils/parseOcrOffline';
import { scanUploadErrorMessage } from '../utils/scanUploadErrors';

export interface CardScanSubmission {
  ocrText: string;
  imageBase64: string;
  backImageBase64?: string;
}

interface UseProcessCardResult {
  state: ProcessCardState;
  capturedCard: CapturedCard | null;
  isOfflineDraft: boolean;
  submitScan: (scan: CardScanSubmission) => Promise<void>;
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
        : 'Unable to process the business card.';
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

export function useProcessCard(): UseProcessCardResult {
  const [state, setState] = useState<ProcessCardState>({ status: 'idle' });
  const [isOfflineDraft, setIsOfflineDraft] = useState(false);

  const submitScan = useCallback(async ({ ocrText, imageBase64, backImageBase64 }: CardScanSubmission) => {
    const trimmed = ocrText.trim();
    if (!trimmed) {
      setState({ status: 'error', message: 'No text was detected on the card.' });
      return;
    }

    setState({ status: 'loading' });
    setIsOfflineDraft(false);

    const online = await isDeviceOnline();
    if (!online) {
      try {
        const parsed = parseOcrOffline(trimmed);
        const queued = await enqueueOfflineScan({
          rawOcrText: trimmed,
          imageBase64,
          backImageBase64,
          core_fields: parsed.core_fields,
          custom_fields: parsed.custom_fields,
        });
        const card = queuedScanToCapturedCard(queued);
        setIsOfflineDraft(true);
        setState({ status: 'success', card });
      } catch {
        setState({
          status: 'error',
          message: 'Unable to save this card offline. Please try again.',
        });
      }
      return;
    }

    try {
      const card = await processCard(trimmed, imageBase64, backImageBase64);
      setState({ status: 'success', card });
    } catch (error) {
      if (isLikelyNetworkError(error)) {
        try {
          const parsed = parseOcrOffline(trimmed);
          const queued = await enqueueOfflineScan({
            rawOcrText: trimmed,
            imageBase64,
            backImageBase64,
            core_fields: parsed.core_fields,
            custom_fields: parsed.custom_fields,
          });
          const card = queuedScanToCapturedCard(queued);
          setIsOfflineDraft(true);
          setState({ status: 'success', card });
          return;
        } catch {
          setState({
            status: 'error',
            message: 'Network unavailable and offline save failed. Please try again.',
          });
          return;
        }
      }

      const message = normalizeScanErrorMessage(error);
      setState({ status: 'error', message });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ status: 'idle' });
    setIsOfflineDraft(false);
  }, []);

  const capturedCard = state.status === 'success' ? state.card : null;

  return {
    state,
    capturedCard,
    isOfflineDraft,
    submitScan,
    reset,
  };
}
