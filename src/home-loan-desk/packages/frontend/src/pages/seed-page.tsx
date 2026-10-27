import { LAB_COLLEAGUE } from '@rayfin-app/shared';
import { DatabaseBackup, RotateCcw } from 'lucide-react';
import { useState } from 'react';

import { Panel } from '@/components/panel';
import { buttonStyles } from '@/components/styles';
import { ConfirmAction, ErrorState } from '@/components/states';
import { useOfficerEmail } from '@/hooks/use-officer-email';
import { describeError, formatDateOnly } from '@/lib/format';
import { getRayfinClient } from '@/lib/rayfin-client';
import { labFixtures } from '@/lab/fixtures.generated';
import { createRayfinLabStore } from '@/lab/lab-store';
import {
  resetLabData,
  restoreLabData,
  type RestoreResult,
  type SeedProgress,
} from '@/lab/seeder';

type Operation =
  | { kind: 'idle' }
  | { kind: 'running'; action: 'restore' | 'reset'; progress: SeedProgress | null }
  | { kind: 'done'; action: 'restore' | 'reset'; restore: RestoreResult; removed: number }
  | { kind: 'error'; message: string };

const yourCases = labFixtures.cases.filter((c) => c.assignedTo === 'attendee');
const colleagueCases = labFixtures.cases.filter((c) => c.assignedTo === 'colleague');

export function SeedPage() {
  const email = useOfficerEmail();
  const [operation, setOperation] = useState<Operation>({ kind: 'idle' });
  const [confirming, setConfirming] = useState(false);
  const running = operation.kind === 'running';

  const run = async (action: 'restore' | 'reset') => {
    setConfirming(false);
    if (!email) {
      setOperation({ kind: 'error', message: 'Your session has no email address, so lab data cannot be saved.' });
      return;
    }
    setOperation({ kind: 'running', action, progress: null });
    const onProgress = (progress: SeedProgress) => setOperation({ kind: 'running', action, progress });
    try {
      const store = createRayfinLabStore(await getRayfinClient());
      if (action === 'restore') {
        const restore = await restoreLabData(store, labFixtures, email, onProgress);
        setOperation({ kind: 'done', action, restore, removed: 0 });
      } else {
        const result = await resetLabData(store, labFixtures, email, onProgress);
        setOperation({ kind: 'done', action, restore: result.restore, removed: result.removed });
      }
    } catch (error) {
      setOperation({ kind: 'error', message: describeError(error) });
    }
  };

  return (
    <section aria-labelledby="seed-heading" className="flex flex-col gap-500">
      <div className="flex flex-wrap items-end justify-between gap-x-800 gap-y-300">
        <h1 id="seed-heading" className="font-heading text-hero-700 font-semibold tracking-[-0.02em] text-foreground">
          Lab data
        </h1>
        <p className="text-300 tabular-nums text-muted-foreground">
          Snapshot {formatDateOnly(labFixtures.generator.asOfDate)} · generator {labFixtures.generator.version}
        </p>
      </div>

      <div className="grid gap-400 lg:grid-cols-2">
        <Panel title="Assigned to you" description={`${yourCases.length} cases`}>
          <CaseNumbers cases={yourCases} />
        </Panel>
        <Panel title={`Assigned to ${LAB_COLLEAGUE.name}`} description={LAB_COLLEAGUE.email}>
          <CaseNumbers cases={colleagueCases} />
        </Panel>
      </div>

      <Panel
        title="Restore missing records"
        description="Creates any lab record you're missing. Nothing is overwritten."
        actions={
          <button type="button" disabled={running} onClick={() => void run('restore')} className={buttonStyles.primary}>
            <DatabaseBackup aria-hidden="true" className="icon-size-200" />
            Restore
          </button>
        }
      />

      <Panel
        title="Reset my lab cases"
        description="Deletes your lab cases and their changes, then recreates the originals."
        actions={
          <button
            type="button"
            disabled={running || confirming}
            onClick={() => setConfirming(true)}
            className={buttonStyles.secondary}
          >
            <RotateCcw aria-hidden="true" className="icon-size-200" />
            Reset
          </button>
        }
      >
        {confirming ? (
          <ConfirmAction
            message={
              <>
                Delete your {yourCases.length} lab cases and every note, task, and checklist change on them, then
                recreate the originals? {colleagueCases.map((c) => c.caseNumber).join(', ')} is not touched.
              </>
            }
            confirmLabel="Reset my lab cases"
            pendingLabel="Resetting…"
            onCancel={() => setConfirming(false)}
            onConfirm={() => void run('reset')}
          />
        ) : null}
      </Panel>

      <OperationStatus operation={operation} />
    </section>
  );
}

function CaseNumbers({ cases }: { cases: readonly { caseNumber: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-200">
      {cases.map((c) => (
        <li
          key={c.caseNumber}
          className="rounded-full bg-muted px-300 py-100 text-300 font-medium tabular-nums text-foreground"
        >
          {c.caseNumber}
        </li>
      ))}
    </ul>
  );
}

function OperationStatus({ operation }: { operation: Operation }) {
  if (operation.kind === 'idle') return null;
  if (operation.kind === 'error') {
    return <ErrorState title="Lab data operation failed" message={operation.message} />;
  }
  if (operation.kind === 'running') {
    const p = operation.progress;
    return (
      <p role="status" aria-live="polite" className="text-300 text-muted-foreground">
        {operation.action === 'reset' ? 'Resetting' : 'Restoring'}…{' '}
        {p ? `${p.label}${p.total ? ` (${p.done} of ${p.total})` : ''}` : ''}
      </p>
    );
  }
  const colleague = Object.entries(operation.restore.colleagueCases)
    .map(([caseNumber, outcome]) => `${caseNumber} ${outcome === 'created' ? 'created' : 'already present'}`)
    .join(', ');
  return (
    <p role="status" className="rounded-lg bg-success px-400 py-300 text-300 text-success-foreground">
      {operation.action === 'reset' ? `Removed ${operation.removed} records. ` : ''}
      Created {operation.restore.created}, already present {operation.restore.alreadyPresent}.
      {colleague ? ` ${colleague}.` : ''}
    </p>
  );
}
