import type { CaseWorkspaceRecord, ChecklistItemRecord } from '@rayfin-app/shared';
import { Link } from 'react-router';

import { ChecklistSummary, ReviewStatusBadge, StageAgeBadge } from '@/components/badges';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { useAsyncData } from '@/hooks/use-async-data';
import { useOfficerEmail } from '@/hooks/use-officer-email';
import { formatDateOnly, formatUsd, PRODUCT_LABELS, STAGE_LABELS, stageAge } from '@/lib/format';
import { listChecklist, listMyCases, listTasks } from '@/services/cases';

async function loadWorkload() {
  const [cases, checklist, tasks] = await Promise.all([listMyCases(), listChecklist(), listTasks()]);
  return { cases, checklist, tasks };
}

/** Stalled cases first, longest-waiting at the top, then by case number. */
function byUrgency(a: CaseWorkspaceRecord, b: CaseWorkspaceRecord) {
  const ageA = stageAge(a.stage, a.stage_started_on, a.snapshot_date);
  const ageB = stageAge(b.stage, b.stage_started_on, b.snapshot_date);
  const stalledA = ageA?.stalled ? 1 : 0;
  const stalledB = ageB?.stalled ? 1 : 0;
  if (stalledA !== stalledB) return stalledB - stalledA;
  if (stalledA && ageA && ageB && ageA.days !== ageB.days) return ageB.days - ageA.days;
  return a.case_number.localeCompare(b.case_number);
}

export function CasesPage() {
  const email = useOfficerEmail();
  const state = useAsyncData(loadWorkload, []);

  return (
    <section aria-labelledby="cases-heading" className="flex flex-col gap-500">
      <div className="flex flex-col gap-100">
        <h1 id="cases-heading" className="text-hero-700 font-semibold text-foreground">
          My cases
        </h1>
        <p className="max-w-3xl text-300 text-muted-foreground">
          Private case workspaces assigned to {email ?? 'you'}. Stage and time in stage come from the
          portfolio snapshot; notes, tasks, and checklists are live.
        </p>
      </div>

      {state.status === 'loading' ? <LoadingState rows={6} label="Loading your cases" /> : null}
      {state.status === 'error' ? (
        <ErrorState title="Couldn't load your cases" message={state.error} onRetry={state.reload} />
      ) : null}
      {state.status === 'ready' ? <CaseTable {...state.data} /> : null}
    </section>
  );
}

function CaseTable({
  cases,
  checklist,
  tasks,
}: {
  cases: CaseWorkspaceRecord[];
  checklist: ChecklistItemRecord[];
  tasks: { case_id: string; status: string }[];
}) {
  if (cases.length === 0) {
    return (
      <EmptyState
        title="No cases are assigned to you"
        hint={
          <>
            Lab cases are created on first sign-in. Open{' '}
            <Link to="/seed" className="text-primary underline underline-offset-2">
              Lab data
            </Link>{' '}
            to restore them.
          </>
        }
      />
    );
  }

  const snapshot = cases[0]?.snapshot_date;
  const sorted = [...cases].sort(byUrgency);

  return (
    <div className="flex flex-col gap-200">
      <p className="text-200 text-muted-foreground">
        Portfolio snapshot as of {formatDateOnly(snapshot)} · {cases.length}{' '}
        {cases.length === 1 ? 'case' : 'cases'}
      </p>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[56rem] border-collapse text-left text-300">
          <caption className="sr-only">Cases assigned to you, stalled cases first</caption>
          <thead className="border-b border-border bg-muted/50 text-200 uppercase tracking-wider text-muted-foreground">
            <tr>
              <th scope="col" className="px-400 py-300 font-semibold">Case</th>
              <th scope="col" className="px-400 py-300 font-semibold">Applicant</th>
              <th scope="col" className="px-400 py-300 font-semibold">Product</th>
              <th scope="col" className="px-400 py-300 font-semibold">Stage</th>
              <th scope="col" className="px-400 py-300 font-semibold">In stage</th>
              <th scope="col" className="px-400 py-300 font-semibold">Checklist</th>
              <th scope="col" className="px-400 py-300 font-semibold">Open tasks</th>
              <th scope="col" className="px-400 py-300 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => {
              const items = checklist.filter((item) => item.case_id === c.id);
              const openTasks = tasks.filter((t) => t.case_id === c.id && t.status === 'open').length;
              return (
                <tr key={c.id} className="border-b border-border last:border-b-0 hover:bg-accent/60">
                  <td className="px-400 py-300">
                    <Link
                      to={`/cases/${c.case_number}`}
                      className="font-monospace font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {c.case_number}
                    </Link>
                  </td>
                  <td className="px-400 py-300 text-foreground">
                    {c.applicant_label}
                    <span className="block text-200 text-muted-foreground">{formatUsd(c.requested_amount)}</span>
                  </td>
                  <td className="px-400 py-300 text-muted-foreground">{PRODUCT_LABELS[c.product] ?? c.product}</td>
                  <td className="px-400 py-300 text-muted-foreground">{STAGE_LABELS[c.stage] ?? c.stage}</td>
                  <td className="px-400 py-300">
                    <StageAgeBadge stage={c.stage} stageStartedOn={c.stage_started_on} snapshotDate={c.snapshot_date} />
                  </td>
                  <td className="px-400 py-300">
                    <ChecklistSummary items={items} />
                  </td>
                  <td className="px-400 py-300 font-numeric text-foreground">{openTasks}</td>
                  <td className="px-400 py-300">
                    <ReviewStatusBadge status={c.review_status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
