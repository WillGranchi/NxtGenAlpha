import { useEffect, useMemo, useRef, useState } from 'react';

type PersistedEnvelope<T> = {
  v: number;
  value: T;
};

export interface UsePersistedStateOptions<T> {
  /** Schema/version for migrations */
  version?: number;
  /** Debounce writes to localStorage */
  debounceMs?: number;
  /** Optional migration from older versions */
  migrate?: (input: unknown, fromVersion: number) => T;
}

export function usePersistedState<T>(
  storageKey: string,
  defaultValue: T,
  options: UsePersistedStateOptions<T> = {}
): [T, (value: T) => void] {
  const { version = 1, debounceMs = 150, migrate } = options;

  const initial = useMemo(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return defaultValue;
      const parsed = JSON.parse(raw) as PersistedEnvelope<unknown> | unknown;

      // New format: { v, value }
      if (parsed && typeof parsed === 'object' && 'v' in (parsed as any) && 'value' in (parsed as any)) {
        const env = parsed as PersistedEnvelope<unknown>;
        if (env.v === version) return env.value as T;
        if (migrate) return migrate(env.value, env.v);
        return env.value as T;
      }

      // Old format: raw value
      if (migrate) return migrate(parsed, 0);
      return parsed as T;
    } catch {
      return defaultValue;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const [state, setState] = useState<T>(initial);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      try {
        const env: PersistedEnvelope<T> = { v: version, value: state };
        window.localStorage.setItem(storageKey, JSON.stringify(env));
      } catch {
        // Ignore quota/serialization issues
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [storageKey, state, version, debounceMs]);

  return [state, setState];
}


