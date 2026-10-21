import type {
  CaseNoteRecord,
  CaseTaskRecord,
  CaseWorkspaceRecord,
  ChecklistItemRecord,
  ReviewStatus,
} from '@rayfin-app/shared';
import { REVIEW_STATUSES } from '@rayfin-app/shared';
import { ArrowLeft, ShieldOff } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';

import { StageAgeBadge } from '@/components/badges';
import { buttonStyles } from '@/components/styles';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { useCrud } from '@/components/useCrud';
import { useAsyncData } from '@/hooks/use-async-data';
import { useOfficerEmail } from '@/hooks/use-officer-email';
import {
  describeError,
  formatDateOnly,
  formatUsd,
  PRODUCT_LABELS,
  REVIEW_STATUS_LABELS,
  STAGE_LABELS,
} from '@/lib/format';
import {
  createNote,
  createTask,
  findCaseByNumber,
  listChecklist,
  listNotes,
  listTasks,
  setTaskStatus,
  updateChecklistItem,
  updateReviewStatus,
} from '@/services/cases';

import { BriefPanel } from './brief-panel';
import { ChecklistPanel } from './checklist-panel';
import { NotesPanel } from './notes-panel';
import { TasksPanel } from './tasks-panel';

const unsupported = () => Promise.reject(new Error('Not supported in this view.'));

export function CaseDetailPage() {
  const { caseNumber = '' } = useParams();
  const normalized = caseNumber.trim().toUpperCase();
  const state = useAsyncData(() => findCaseByNumber(normalized), [normalized]);

  return (
    <div className="flex flex-col gap-500">
      <Link
        to="/cases"
        className="inline-flex items-center gap-100 self-start text-300 text-primary underline-offset-2 hover:underline"
      >
        <ArrowLeft aria-hidden="true" className="icon-size-200" />
        My cases
      </Link>
      {state.status === 'loading' ? <LoadingState rows={5} label={`Loading case ${normalized}`} /> : null}
      {state.status === 'error' ? (
        <ErrorState title={`Couldn't load case ${normalized}`} message={state.error} onRetry={state.reload} />
      ) : null}
      {state.status === 'ready' && state.data === null ? <CaseNotAvailable caseNumber={normalized} /> : null}
      {state.status === 'ready' && state.data ? <CaseWorkspaceView initialCase={state.data} /> : null}
    </div>
  );
}

function CaseNotAvailable({ caseNumber }: { caseNumber: string }) {
  const email = useOfficerEmail();
  return (
    <EmptyState
      title={`Case ${caseNumber} isn't available to you`}
      hint={
        <div className="flex flex-col items-center gap-200">
          <ShieldOff aria-hidden="true" className="icon-size-500 text-muted-foreground" />
          <p>
            The data API only returns cases assigned to {email ?? 'you'}. A case that belongs to another
            officer looks exactly like one that doesn't exist: nothing comes back for either.
          </p>
        </div>
      }
      action={
        <Link to="/cases" className={buttonStyles.secondary}>
          Back to my cases
        </Link>
      }
    />
  );
}

function CaseWorkspaceView({ initialCase }: { initialCase: CaseWorkspaceRecord }) {
  const email = useOfficerEmail();
  const [caseRecord, setCaseRecord] = useState(initialCase);
  const caseId = caseRecord.id;

  const checklist = useCrud<ChecklistItemRecord>({
    list: () => listChecklist(caseId),
    create: unsupported,
    update: (id, patch) => updateChecklistItem(id, patch),
    remove: unsupported,
  });

  const notes = useCrud<CaseNoteRecord>({
    list: () => listNotes(caseId),
    create: unsupported,
    update: unsupported,
    remove: unsupported,
  });

  const tasks = useCrud<CaseTaskRecord>({
    list: () => listTasks(caseId),
    create: unsupported,
    update: (id, patch) => setTaskStatus(id, patch.status ?? 'open'),
    remove: unsupported,
  });

  const requireEmail = () => {
    if (!email) throw new Error('Your session has no email address, so the record cannot be saved.');
    return email;
  };

  return (
    <div className="flex flex-col gap-500">
      <CaseHeader caseRecord={caseRecord} onChange={setCaseRecord} />
      <div className="grid gap-500 lg:grid-cols-5">
        <div className="flex flex-col gap-500 lg:col-span-3">
          <ChecklistPanel checklist={checklist} />
          <NotesPanel
            notes={notes}
            onAdd={async (body) => {
              await createNote(caseId, requireEmail(), body);
              await notes.refresh();
            }}
          />
        </div>
        <div className="flex flex-col gap-500 lg:col-span-2">
          <BriefPanel checklist={checklist.items} checklistReady={checklist.status === 'ready'} />
          <TasksPanel
            tasks={tasks}
            onAdd={async (title, dueOn) => {
              await createTask(caseId, requireEmail(), title, dueOn);
              await tasks.refresh();
            }}
          />
        </div>
      </div>
    </div>
  );
}

function CaseHeader({
  caseRecord,
  onChange,
}: {
  caseRecord: CaseWorkspaceRecord;
  onChange: (next: CaseWorkspaceRecord) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changeStatus = async (review_status: ReviewStatus) => {
    setSaving(true);
    setError(null);
    try {
      const saved = await updateReviewStatus(caseRecord.id, review_status);
      onChange({ ...caseRecord, review_status, ...saved });
    } catch (e) {
      setError(describeError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <header className="flex flex-col gap-400 rounded-xl border border-border bg-card p-500">
      <div className="flex flex-wrap items-start justify-between gap-400">
        <div className="flex flex-col gap-100">
          <p className="font-monospace text-300 font-semibold text-primary">{caseRecord.case_number}</p>
          <h1 className="text-hero-700 font-semibold text-card-foreground">{caseRecord.applicant_label}</h1>
          <p className="text-300 text-muted-foreground">
            {PRODUCT_LABELS[caseRecord.product] ?? caseRecord.product} · {caseRecord.branch_name} ·{' '}
            {formatUsd(caseRecord.requested_amount)} requested
          </p>
        </div>
        <div className="flex flex-col gap-100">
          <label htmlFor="review-status" className="text-200 font-medium text-muted-foreground">
            Review status
          </label>
          <select
            id="review-status"
            value={caseRecord.review_status}
            disabled={saving}
            onChange={(e) => void changeStatus(e.target.value as ReviewStatus)}
            className={buttonStyles.input}
          >
            {REVIEW_STATUSES.map((status) => (
              <option key={status} value={status}>
                {REVIEW_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <dl className="flex flex-wrap gap-x-800 gap-y-300 border-t border-border pt-400 text-300">
        <div>
          <dt className="text-200 text-muted-foreground">Stage at snapshot</dt>
          <dd className="font-medium text-foreground">{STAGE_LABELS[caseRecord.stage] ?? caseRecord.stage}</dd>
        </div>
        <div>
          <dt className="text-200 text-muted-foreground">Time in stage</dt>
          <dd>
            <StageAgeBadge
              stage={caseRecord.stage}
              stageStartedOn={caseRecord.stage_started_on}
              snapshotDate={caseRecord.snapshot_date}
            />
          </dd>
        </div>
        <div>
          <dt className="text-200 text-muted-foreground">Portfolio snapshot</dt>
          <dd className="font-medium text-foreground">As of {formatDateOnly(caseRecord.snapshot_date)}</dd>
        </div>
        <div>
          <dt className="text-200 text-muted-foreground">Assigned to</dt>
          <dd className="font-medium text-foreground">{caseRecord.assigned_officer_email}</dd>
        </div>
      </dl>
      {error ? <ErrorState title="Couldn't update the review status" message={error} /> : null}
    </header>
  );
}
