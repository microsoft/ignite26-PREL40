import type { ChecklistItemRecord, LoanStage, ReviewStatus } from '@rayfin-app/shared';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';

import { REVIEW_STATUS_LABELS, stageAge } from '@/lib/format';
import { cn } from '@/lib/utils';

const pill =
  'inline-flex items-center gap-100 whitespace-nowrap rounded-full px-200 py-100-nudge text-200 font-medium tabular-nums';
const quiet = 'inline-flex items-center gap-100 whitespace-nowrap text-200 tabular-nums text-muted-foreground';

/** Time in the current stage at the portfolio snapshot, flagged when stalled. */
export function StageAgeBadge({
  stage,
  stageStartedOn,
  snapshotDate,
}: {
  stage: LoanStage;
  stageStartedOn: unknown;
  snapshotDate: unknown;
}) {
  const age = stageAge(stage, stageStartedOn, snapshotDate);
  if (!age) return <span className="text-200 text-muted-foreground">Unknown</span>;
  if (age.stalled) {
    return (
      <span className={cn(pill, 'bg-warning text-warning-foreground')}>
        <AlertCircle aria-hidden="true" className="icon-size-100" />
        Stalled · {age.days} days
      </span>
    );
  }
  return (
    <span className={quiet}>
      <Clock aria-hidden="true" className="icon-size-100" />
      {age.days} {age.days === 1 ? 'day' : 'days'}
    </span>
  );
}

export function ChecklistSummary({ items }: { items: readonly ChecklistItemRecord[] }) {
  if (items.length === 0) return <span className="text-200 text-muted-foreground">No checklist</span>;
  const received = items.filter((item) => item.status === 'received').length;
  const complete = received === items.length;
  return (
    <span className={complete ? cn(pill, 'bg-success text-success-foreground') : quiet}>
      {complete ? <CheckCircle2 aria-hidden="true" className="icon-size-100" /> : null}
      {received} of {items.length} received
    </span>
  );
}

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  return (
    <span
      className={cn(
        pill,
        status === 'waiting-on-applicant'
          ? 'bg-warning text-warning-foreground'
          : status === 'ready-for-review'
            ? 'bg-tint text-tint-foreground'
            : 'bg-muted text-muted-foreground'
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {REVIEW_STATUS_LABELS[status] ?? status}
    </span>
  );
}
