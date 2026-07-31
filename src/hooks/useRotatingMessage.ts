import { useEffect, useState } from 'react';

export function useRotatingMessage(messages: string[], active: boolean, intervalMs = 3500): string {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active || messages.length === 0) {
      setIndex(0);
      return;
    }

    const timer = setInterval(() => {
      setIndex(current => (current + 1) % messages.length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [active, intervalMs, messages]);

  return messages[index] ?? messages[0] ?? '';
}
