import { useCallback, useState } from 'react';

import { processCard } from '../api/cards';
import { ApiClientError } from '../api/client';
import type { CapturedCard, ProcessCardState } from '../types/card';

interface UseProcessCardResult {
  state: ProcessCardState;
  capturedCard: CapturedCard | null;
  submitOcrText: (rawOcrText: string) => Promise<void>;
  reset: () => void;
}

export function useProcessCard(): UseProcessCardResult {
  const [state, setState] = useState<ProcessCardState>({ status: 'idle' });

  const submitOcrText = useCallback(async (rawOcrText: string) => {
    const trimmed = rawOcrText.trim();
    if (!trimmed) {
      setState({ status: 'error', message: 'No text was detected on the card.' });
      return;
    }

    setState({ status: 'loading' });

    try {
      const card = await processCard({
        raw_ocr_text: trimmed,
      });
      setState({ status: 'success', card });
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Unable to process the business card.';
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
    submitOcrText,
    reset,
  };
}
