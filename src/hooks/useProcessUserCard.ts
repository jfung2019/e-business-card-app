import { useCallback, useState } from 'react';

import { processUserCard } from '../api/userCards';
import { ApiClientError } from '../api/client';
import type { UserCard } from '../types/userCard';

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
  submitScan: (scan: UserCardScanSubmission) => Promise<void>;
  reset: () => void;
}

function normalizeScanErrorMessage(error: unknown): string {
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

export function useProcessUserCard(): UseProcessUserCardResult {
  const [state, setState] = useState<ProcessUserCardState>({ status: 'idle' });

  const submitScan = useCallback(
    async ({ ocrText, imageBase64, backImageBase64, designId, isPrimary }: UserCardScanSubmission) => {
      const trimmed = ocrText.trim();
      if (!trimmed) {
        setState({ status: 'error', message: 'No text was detected on the card.' });
        return;
      }

      setState({ status: 'loading' });

      try {
        const card = await processUserCard(trimmed, imageBase64, {
          backImageBase64,
          designId,
          isPrimary,
        });
        setState({ status: 'success', card });
      } catch (error) {
        const message = normalizeScanErrorMessage(error);
        setState({ status: 'error', message });
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setState({ status: 'idle' });
  }, []);

  const userCard = state.status === 'success' ? state.card : null;

  return {
    state,
    userCard,
    submitScan,
    reset,
  };
}
