import { useState, useCallback } from "react";

export function useTauriCommand<T, A extends unknown[]>(
  fn: (...args: A) => Promise<T>,
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);

  const execute = useCallback(
    async (...args: A) => {
      setLoading(true);
      setError(null);
      try {
        const result = await fn(...args);
        setData(result);
        return result;
      } catch (e) {
        setError(String(e));
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [fn],
  );

  return { execute, loading, error, data };
}
