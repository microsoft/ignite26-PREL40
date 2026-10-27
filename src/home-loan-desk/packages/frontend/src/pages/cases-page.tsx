import type { CaseWorkspaceRecord, ChecklistItemRecord } from '@rayfin-app/shared';
import { Link } from 'react-router';

import { ChecklistSummary, ReviewStatusBadge, StageAgeBadge } from '@/components/badges';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { useAsyncData } from '@/hooks/use-async-data';
import { formatDateOnly, formatUsd, PRODUCT_LABELS, STAGE_LABELS, stageAge } from '@/lib/format';
import { cn } from '@/lib/utils';
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
  const state = useAsyncData(loadWorkload, []);

  return (
    <section aria-labelledby="cases-heading" className="flex flex-col gap-500">
      <div className="flex flex-wrap items-end justify-between gap-x-800 gap-y-300">
        <h1 id="cases-heading" className="font-heading text-hero-700 font-semibold tracking-[-0.02em] text-foreground">
          My cases
        </h1>
        {state.status === 'ready' && state.data.cases.length > 0 ? <CaseSummary cases={state.data.cases} /> : null}
      </div>

      {state.status === 'loading' ? <LoadingState rows={6} label="Loading your cases" /> : null}
      {state.status === 'error' ? (
        <ErrorState title="Couldn't load your cases" message={state.error} onRetry={state.reload} />
      ) : null}
      {state.status === 'ready' ? <CaseTable {...state.data} /> : null}
    </section>
  );
}

function CaseSummary({ cases }: { cases: CaseWorkspaceRecord[] }) {
  const stalled = cases.filter((c) => stageAge(c.stage, c.stage_started_on, c.snapshot_date)?.stalled).length;
  const facts = [
    { label: 'Assigned', value: String(cases.length) },
    { label: 'Stalled', value: String(stalled) },
    { label: 'Snapshot', value: formatDateOnly(cases[0]?.snapshot_date) },
  ];
  return (
    <dl className="flex divide-x divide-border text-300">
      {facts.map((fact) => (
        <div key={fact.label} className="flex flex-col gap-100-nudge px-500 first:pl-0 last:pr-0">
          <dt className="text-200 text-muted-foreground">{fact.label}</dt>
          <dd
            className={cn(
              'font-medium tabular-nums text-foreground',
              fact.label === 'Stalled' && stalled > 0 && 'text-warning-foreground'
            )}
          >
            {fact.value}
          </dd>
        </div>
      ))}
    </dl>
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
        title="No cases assigned to you"
        hint={
          <>
            Restore the lab cases from{' '}
            <Link to="/seed" className="text-primary underline underline-offset-2">
              Lab data
            </Link>
            .
          </>
        }
      />
    );
  }

  const sorted = [...cases].sort(byUrgency);
  const th = 'whitespace-nowrap px-300 py-200 font-medium first:pl-500 last:pr-500';
  const td = 'px-300 py-300 align-middle first:pl-500 last:pr-500';

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-[0_1px_2px_rgb(16_24_40/0.04)]">
      <table className="w-full border-collapse text-left text-300">
        <caption className="sr-only">Cases assigned to you, stalled cases first</caption>
        <thead className="border-b border-border bg-muted/60 text-200 text-muted-foreground">
          <tr>
            <th scope="col" className={th}>Case</th>
            <th scope="col" className={th}>Applicant</th>
            <th scope="col" className={cn(th, 'text-right')}>Requested</th>
            <th scope="col" className={th}>Stage</th>
            <th scope="col" className={th}>Checklist</th>
            <th scope="col" className={cn(th, 'text-right')}>Open tasks</th>
            <th scope="col" className={th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((c) => {
            const items = checklist.filter((item) => item.case_id === c.id);
            const openTasks = tasks.filter((t) => t.case_id === c.id && t.status === 'open').length;
            return (
              <tr key={c.id} className="border-b border-border transition-colors last:border-b-0 hover:bg-accent/60">
                <td className={cn(td, 'whitespace-nowrap')}>
                  <Link
                    to={`/cases/${c.case_number}`}
                    className="rounded-sm font-medium tabular-nums text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {c.case_number}
                  </Link>
                </td>
                <td className={cn(td, 'whitespace-nowrap')}>
                  <div className="font-medium text-foreground">{c.applicant_label}</div>
                  <div className="text-200 text-muted-foreground">{PRODUCT_LABELS[c.product] ?? c.product}</div>
                </td>
                <td className={cn(td, 'whitespace-nowrap text-right tabular-nums text-foreground')}>{formatUsd(c.requested_amount)}</td>
                <td className={cn(td, 'whitespace-nowrap')}>
                  <div className="flex flex-col items-start gap-100">
                    <span className="text-foreground">{STAGE_LABELS[c.stage] ?? c.stage}</span>
                    <StageAgeBadge stage={c.stage} stageStartedOn={c.stage_started_on} snapshotDate={c.snapshot_date} />
                  </div>
                </td>
                <td className={td}>
                  <ChecklistSummary items={items} />
                </td>
                <td className={cn(td, 'text-right tabular-nums', openTasks ? 'text-foreground' : 'text-muted-foreground')}>
                  {openTasks}
                </td>
                <td className={td}>
                  <ReviewStatusBadge status={c.review_status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
