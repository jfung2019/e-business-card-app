import { useCallback, useState } from 'react';



import { processCard } from '../api/cards';

import { ApiClientError } from '../api/client';

import type { CapturedCard, ProcessCardState } from '../types/card';



export interface CardScanSubmission {

  ocrText: string;

  imageUri: string;

  imageBase64: string;

}



interface UseProcessCardResult {

  state: ProcessCardState;

  capturedCard: CapturedCard | null;

  submitScan: (scan: CardScanSubmission) => Promise<void>;

  reset: () => void;

}



export function useProcessCard(): UseProcessCardResult {

  const [state, setState] = useState<ProcessCardState>({ status: 'idle' });



  const submitScan = useCallback(async ({ ocrText, imageBase64 }: CardScanSubmission) => {

    const trimmed = ocrText.trim();

    if (!trimmed) {

      setState({ status: 'error', message: 'No text was detected on the card.' });

      return;

    }



    setState({ status: 'loading' });



    try {

      const card = await processCard(trimmed, imageBase64);

      setState({ status: 'success', card });

    } catch (error) {

      const message =

        error instanceof ApiClientError

          ? error.message

          : error instanceof Error

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

    submitScan,

    reset,

  };

}

