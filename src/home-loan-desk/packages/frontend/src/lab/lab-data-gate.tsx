import { useEffect, useState, type ReactNode } from 'react';
import { DatabaseZap } from 'lucide-react';

import { ErrorState } from '@/components/states';
import { useOfficerEmail } from '@/hooks/use-officer-email';
import { describeError } from '@/lib/format';
import { getRayfinClient } from '@/lib/rayfin-client';

import { labFixtures } from './fixtures.generated';
import { createRayfinLabStore } from './lab-store';
import {
  findMissingLabRecords,
  restoreLabData,
  type ProgressListener,
  type SeedProgress,
} from './seeder';

type GateState =
  | { kind: 'checking' }
  | { kind: 'seeding'; progress: SeedProgress | null }
  | { kind: 'ready' }
  | { kind: 'error'; message: string };

interface InFlightSeed {
  email: string;
  promise: Promise<void>;
  listeners: Set<ProgressListener>;
  last: SeedProgress | null;
}

let inFlight: InFlightSeed | null = null;

/**
 * Make sure every lab record the officer should have is visible, creating any
 * that are missing (all of them, on first sign-in). Shared across mounts so
 * React's development double-render never seeds twice.
 */
function ensureLabData(email: string, onSeeding: () => void, listener: ProgressListener) {
  if (!inFlight || inFlight.email !== email) {
    const entry: InFlightSeed = {
      email,
      listeners: new Set(),
      last: null,
      promise: Promise.resolve(),
    };
    entry.promise = (async () => {
      const store = createRayfinLabStore(await getRayfinClient());
      const missing = await findMissingLabRecords(store, labFixtures, email);
      if (missing.length === 0) return;

      onSeeding();
      await restoreLabData(store, labFixtures, email, (progress) => {
        entry.last = progress;
        entry.listeners.forEach((notify) => notify(progress));
      });

      const stillMissing = await findMissingLabRecords(store, labFixtures, email);
      if (stillMissing.length > 0) {
        throw new Error(
          `${stillMissing.length} lab records for ${email} were saved but aren't visible to you. ` +
            "The access rules compare each record to your sign-in email claim, so check that it matches this address."
        );
      }
    })().finally(() => {
      if (inFlight === entry) inFlight = null;
    });
    inFlight = entry;
  }
  const entry = inFlight;
  entry.listeners.add(listener);
  const last = entry.last;
  if (last) queueMicrotask(() => listener(last));
  return { promise: entry.promise, unsubscribe: () => entry.listeners.delete(listener) };
}

/**
 * Makes sure the signed-in officer has lab data before showing the app. On
 * first sign-in, or after a partial failure, it creates the missing records in
 * the browser, as the officer, behind a "Preparing data" screen. Otherwise it
 * only checks and continues.
 */
export function LabDataGate({ children }: { children: ReactNode }) {
  const email = useOfficerEmail();
  const [attempt, setAttempt] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const runKey = `${email ?? ''}#${attempt}`;
  const [run, setRun] = useState<{ key: string; state: GateState } | null>(null);

  useEffect(() => {
    if (!email) return;
    let current = true;
    const update = (state: GateState) => {
      if (current) setRun({ key: runKey, state });
    };
    const { promise, unsubscribe } = ensureLabData(
      email,
      () => update({ kind: 'seeding', progress: null }),
      (progress) => update({ kind: 'seeding', progress })
    );
    promise.then(
      () => update({ kind: 'ready' }),
      (error: unknown) => update({ kind: 'error', message: describeError(error) })
    );
    return () => {
      current = false;
      unsubscribe();
    };
  }, [email, runKey]);

  const state: GateState = skipped
    ? { kind: 'ready' }
    : !email
      ? {
          kind: 'error',
          message:
            'Your session has no email address. The lab access rules use your sign-in email, so the app cannot load your cases.',
        }
      : run?.key === runKey
        ? run.state
        : { kind: 'checking' };

  if (state.kind === 'ready') return <>{children}</>;

  if (state.kind === 'error') {
    return (
      <GateFrame>
        <h1 className="text-500 font-semibold text-foreground">Lab data isn't ready</h1>
        <ErrorState
          title="Preparing your lab cases failed"
          message={state.message}
          onRetry={() => setAttempt((n) => n + 1)}
        />
        <button
          type="button"
          onClick={() => setSkipped(true)}
          className="self-start text-300 text-primary underline underline-offset-2"
        >
          Continue to the app without lab data
        </button>
      </GateFrame>
    );
  }

  if (state.kind === 'checking') {
    return (
      <GateFrame>
        <p role="status" className="text-300 text-muted-foreground">
          Opening your case desk…
        </p>
      </GateFrame>
    );
  }

  const progress = state.progress;
  const percent = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  return (
    <GateFrame>
      <div className="flex items-center gap-300">
        <DatabaseZap aria-hidden="true" className="icon-size-400 text-primary" />
        <h1 className="text-500 font-semibold text-foreground">Preparing data</h1>
      </div>
      <p className="text-300 text-muted-foreground">
        Creating your synthetic lab cases, notes, tasks, and checklists. Every record is saved as
        you, so the app's access rules apply from the start.
      </p>
      <div
        role="progressbar"
        aria-label="Lab data progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-200 w-full overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
      </div>
      <p aria-live="polite" className="text-200 text-muted-foreground">
        {progress ? `${progress.label} (${progress.done} of ${progress.total})` : 'Starting…'}
      </p>
    </GateFrame>
  );
}

function GateFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-400">
      <div className="flex w-full max-w-lg flex-col gap-400 rounded-2xl border border-border bg-card p-600 shadow-sm">
        {children}
      </div>
    </div>
  );
}
