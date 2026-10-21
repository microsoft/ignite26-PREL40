import { useCallback, useEffect, useEffectEvent, useState } from 'react';

import { describeError } from '@/lib/format';

export type AsyncState<T> =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly error: string }
  | { readonly status: 'ready'; readonly data: T };

const LOADING = { status: 'loading' } as const;

/**
 * Run an async read and expose loading, error, and ready states. `reload`
 * re-runs it. `deps` must be serializable primitives; the read re-runs when
 * they change, and a late response from a superseded run is discarded.
 */
export function useAsyncData<T>(
  load: () => Promise<T>,
  deps: readonly (string | number | boolean | null | undefined)[]
): AsyncState<T> & { reload: () => void } {
  const [version, setVersion] = useState(0);
  const key = `${JSON.stringify(deps)}#${version}`;
  const [settled, setSettled] = useState<{ key: string; state: AsyncState<T> } | null>(null);
  const runLoad = useEffectEvent(() => load());

  useEffect(() => {
    let current = true;
    runLoad().then(
      (data) => {
        if (current) setSettled({ key, state: { status: 'ready', data } });
      },
      (error: unknown) => {
        if (current) setSettled({ key, state: { status: 'error', error: describeError(error) } });
      }
    );
    return () => {
      current = false;
    };
  }, [key]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const state = settled?.key === key ? settled.state : LOADING;
  return { ...state, reload };
}
