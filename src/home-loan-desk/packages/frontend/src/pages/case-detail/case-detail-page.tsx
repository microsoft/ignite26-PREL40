import type {
  CaseNoteRecord,
  CaseTaskRecord,
  CaseWorkspaceRecord,
  ChecklistItemRecord,
  ReviewStatus,
} from '@rayfin-app/shared';
import { REVIEW_STATUSES } from '@rayfin-app/shared';
import { ChevronDown, ChevronRight, ShieldOff } from 'lucide-react';
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
    <div className="flex flex-col gap-400">
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-100 text-300 text-muted-foreground">
          <li>
            <Link
              to="/cases"
              className="rounded-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              My cases
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="icon-size-200" />
          </li>
          <li aria-current="page" className="tabular-nums">
            {normalized}
          </li>
        </ol>
      </nav>
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
  return (
    <EmptyState
      title={`Case ${caseNumber} isn't available to you`}
      hint={
        <div className="flex flex-col items-center gap-300">
          <ShieldOff aria-hidden="true" className="icon-size-500 text-muted-foreground" />
          <p>It doesn't exist, or it's assigned to another officer.</p>
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
    <div className="flex flex-col gap-400">
      <CaseHeader caseRecord={caseRecord} onChange={setCaseRecord} />
      <div className="grid gap-400 lg:grid-cols-5">
        <div className="flex flex-col gap-400 lg:col-span-3">
          <ChecklistPanel checklist={checklist} />
          <NotesPanel
            notes={notes}
            onAdd={async (body) => {
              await createNote(caseId, requireEmail(), body);
              await notes.refresh();
            }}
          />
        </div>
        <div className="flex flex-col gap-400 lg:col-span-2">
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

  const facts = [
    { label: 'Stage', value: STAGE_LABELS[caseRecord.stage] ?? caseRecord.stage },
    {
      label: 'Time in stage',
      value: (
        <StageAgeBadge
          stage={caseRecord.stage}
          stageStartedOn={caseRecord.stage_started_on}
          snapshotDate={caseRecord.snapshot_date}
        />
      ),
    },
    { label: 'Snapshot', value: formatDateOnly(caseRecord.snapshot_date) },
    { label: 'Assigned to', value: caseRecord.assigned_officer_email },
  ];

  return (
    <header className="flex flex-col gap-400">
      <div className="flex flex-wrap items-end justify-between gap-x-800 gap-y-300">
        <div className="flex min-w-0 flex-col gap-200">
          <h1 className="font-heading text-hero-700 font-semibold tracking-[-0.02em] text-foreground">
            {caseRecord.applicant_label}
          </h1>
          <p className="flex flex-wrap items-center gap-x-200 gap-y-100 text-300 text-muted-foreground">
            <span className="rounded-md bg-muted px-200 py-100-nudge font-medium tabular-nums text-foreground">{caseRecord.case_number}</span>
            <span aria-hidden="true">·</span>
            <span>{PRODUCT_LABELS[caseRecord.product] ?? caseRecord.product}</span>
            <span aria-hidden="true">·</span>
            <span>{caseRecord.branch_name}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums text-foreground">{formatUsd(caseRecord.requested_amount)} requested</span>
          </p>
        </div>
        <div className="flex w-full flex-col gap-100 sm:w-56">
          <label htmlFor="review-status" className="text-200 font-medium text-muted-foreground">
            Review status
          </label>
          <div className="relative">
            <select
              id="review-status"
              value={caseRecord.review_status}
              disabled={saving}
              onChange={(e) => void changeStatus(e.target.value as ReviewStatus)}
              className={buttonStyles.select}
            >
              {REVIEW_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {REVIEW_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 right-300 icon-size-100 -translate-y-1/2 text-muted-foreground"
            />
          </div>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-600 gap-y-400 rounded-xl border border-border bg-card px-500 py-400 text-300 md:grid-cols-4">
        {facts.map((fact) => (
          <div key={fact.label} className="flex min-w-0 flex-col gap-100">
            <dt className="text-200 text-muted-foreground">{fact.label}</dt>
            <dd className="truncate font-medium tabular-nums text-foreground">{fact.value}</dd>
          </div>
        ))}
      </dl>
      {error ? <ErrorState title="Couldn't update the review status" message={error} /> : null}
    </header>
  );
}
