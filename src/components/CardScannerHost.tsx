import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Platform } from 'react-native';

import { CardScannerScreen } from '../screens/CardScannerScreen';
import {
  finishCardScan,
  setCardScannerListener,
  type CardScannerRequest,
} from '../services/cardScanner/cardScannerController';

/**
 * Mounts the card scanner on demand, anywhere in the app.
 *
 * `scanBusinessCard()` is a plain service call with no navigation context, so
 * the scanner is presented as a modal driven by the controller rather than as
 * a route. The camera only mounts while a scan is in flight.
 *
 * iOS only. Android keeps ML Kit's document scanner, which already limits
 * itself to a single page — see `scanWithCardScanner` in `services/ocr.ts`.
 */
export function CardScannerHost(): React.JSX.Element | null {
  const [request, setRequest] = useState<CardScannerRequest | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      return;
    }
    setCardScannerListener(setRequest);
    return () => setCardScannerListener(null);
  }, []);

  const handleComplete = useCallback((imageUri: string | null) => {
    finishCardScan(imageUri);
  }, []);

  if (Platform.OS !== 'ios') {
    return null;
  }

  return (
    <Modal
      visible={request !== null}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={() => finishCardScan(null)}>
      {request ? (
        <CardScannerScreen side={request.side} onComplete={handleComplete} />
      ) : null}
    </Modal>
  );
}
