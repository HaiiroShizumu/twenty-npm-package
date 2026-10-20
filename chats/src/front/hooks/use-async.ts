import { useCallback, useEffect, useRef, useState } from 'react';

// Loads data for the current inputs; a slower answer for old inputs never
// overwrites the answer for new ones.
export const useAsync = <TData>(
  load: () => Promise<TData>,
  dependencies: unknown[],
) => {
  const [data, setData] = useState<TData | undefined>();
  const [error, setError] = useState<unknown>();
  const [loading, setLoading] = useState(true);
  const requestRef = useRef(0);

  const run = useCallback(async () => {
    const requestId = ++requestRef.current;

    setLoading(true);
    setError(undefined);

    try {
      const result = await load();

      if (requestId === requestRef.current) {
        setData(result);
      }
    } catch (loadError) {
      if (requestId === requestRef.current) {
        setError(loadError);
      }
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
      }
    }
  }, dependencies);

  useEffect(() => {
    void run();
  }, [run]);

  return { data, setData, error, loading, reload: run };
};

export const useDebouncedValue = <TValue>(value: TValue, delayMs: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedValue(value), delayMs);

    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debouncedValue;
};
