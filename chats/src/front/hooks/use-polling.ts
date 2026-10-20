import { useEffect, useRef } from 'react';

// Реальное время приложения — опрос: подписки на записи бесед людям закрыты.
// Скрытая вкладка не опрашивает.
export const usePolling = (poll: () => void, intervalMs: number) => {
  const pollRef = useRef(poll);

  pollRef.current = poll;

  useEffect(() => {
    const interval = setInterval(() => {
      if (
        typeof document === 'undefined' ||
        document.visibilityState !== 'hidden'
      ) {
        pollRef.current();
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs]);
};
