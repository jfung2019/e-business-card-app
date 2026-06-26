import { useCallback, useState } from 'react';

import { processCard } from '../api/cards';
import { ApiClientError } from '../api/client';
import type { CapturedCard, ProcessCardState } from '../types/card';
import { scanUploadErrorMessage } from '../utils/scanUploadErrors';

export interface CardScanSubmission {
  ocrText: string;
  imageBase64: string;
  backImageBase64?: string;
}

interface UseProcessCardResult {
  state: ProcessCardState;
  capturedCard: CapturedCard | null;
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

  const submitScan = useCallback(async ({ ocrText, imageBase64, backImageBase64 }: CardScanSubmission) => {
    const trimmed = ocrText.trim();
    if (!trimmed) {
      setState({ status: 'error', message: 'No text was detected on the card.' });
      return;
    }

    setState({ status: 'loading' });

    try {
      const card = await processCard(trimmed, imageBase64, backImageBase64);
      setState({ status: 'success', card });
    } catch (error) {
      const message = normalizeScanErrorMessage(error);
      setState({ status: 'error', message });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ status: 'idle' });
  }, []);

  const capturedCard = state.status === 'success' ? state.card : null;

  return {
    state,
    capturedCard,
    submitScan,
    reset,
  };
}
