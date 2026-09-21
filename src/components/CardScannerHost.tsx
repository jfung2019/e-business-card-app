import React, { useCallback, useEffect, useState } from 'react';
import { Modal } from 'react-native';

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
 */
export function CardScannerHost(): React.JSX.Element {
  const [request, setRequest] = useState<CardScannerRequest | null>(null);

  useEffect(() => {
    setCardScannerListener(setRequest);
    return () => setCardScannerListener(null);
  }, []);

  const handleComplete = useCallback((imageUri: string | null) => {
    finishCardScan(imageUri);
  }, []);

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
