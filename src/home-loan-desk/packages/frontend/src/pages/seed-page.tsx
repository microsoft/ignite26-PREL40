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
      <div className="flex flex-col gap-100">
        <h1 id="seed-heading" className="text-hero-700 font-semibold text-foreground">
          Lab data
        </h1>
        <p className="max-w-3xl text-300 text-muted-foreground">
          Synthetic lab fixtures (generator {labFixtures.generator.version}, snapshot{' '}
          {formatDateOnly(labFixtures.generator.asOfDate)}). Records are created in your browser, as{' '}
          {email ?? 'you'}, so every access rule applies to them.
        </p>
      </div>

      <div className="grid gap-500 lg:grid-cols-2">
        <Panel title="Assigned to you" description={`${yourCases.length} cases with their notes, tasks, and checklists`}>
          <p className="font-monospace text-300 text-foreground">{yourCases.map((c) => c.caseNumber).join(' · ')}</p>
        </Panel>
        <Panel
          title={`Assigned to ${LAB_COLLEAGUE.name}`}
          description={`${LAB_COLLEAGUE.email} never signs in to this lab`}
        >
          <p className="font-monospace text-300 text-foreground">
            {colleagueCases.map((c) => c.caseNumber).join(' · ')}
          </p>
          <p className="text-200 text-muted-foreground">
            You can log this case at intake, but you can't read, change, or delete it afterwards. Reset never
            touches it, because you can't see it.
          </p>
        </Panel>
      </div>

      <Panel
        title="Restore missing lab data"
        description="Creates any lab record you're missing. Never deletes or overwrites anything."
        actions={
          <button type="button" disabled={running} onClick={() => void run('restore')} className={buttonStyles.primary}>
            <DatabaseBackup aria-hidden="true" className="icon-size-200" />
            Restore
          </button>
        }
      >
        <p className="text-300 text-muted-foreground">
          Safe to run any time, for example if a record was deleted during the lab.
        </p>
      </Panel>

      <Panel
        title="Reset my lab cases"
        description="Deletes your lab cases and everything added to them, then recreates the originals."
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
        ) : (
          <p className="text-300 text-muted-foreground">Use this to start the lab over. It asks for confirmation first.</p>
        )}
      </Panel>

      <OperationStatus operation={operation} />
    </section>
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
