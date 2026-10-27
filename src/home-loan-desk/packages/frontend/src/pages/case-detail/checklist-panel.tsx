import type { ChecklistItemRecord } from '@rayfin-app/shared';
import { CheckCircle2, CircleDashed, UploadCloud } from 'lucide-react';

import { Panel } from '@/components/panel';
import { buttonStyles } from '@/components/styles';
import { ErrorState, LoadingState } from '@/components/states';
import type { UseCrudResult } from '@/components/useCrud';
import { CHECKLIST_LABELS, formatDateOnly, UPLOAD_ONLY_CATEGORIES } from '@/lib/format';
import { recordedReceiptPatch } from '@/services/cases';

/**
 * Required documents for the case. Tracks receipt only: marking an item
 * received means the desk has it, not that its contents were checked.
 */
export function ChecklistPanel({ checklist }: { checklist: UseCrudResult<ChecklistItemRecord> }) {
  const items = [...checklist.items].sort((a, b) => a.sort_order - b.sort_order);
  const received = items.filter((item) => item.status === 'received').length;

  return (
    <Panel
      title="Document checklist"
      description={checklist.status === 'ready' ? `${received} of ${items.length} received` : undefined}
    >
      {checklist.status === 'loading' ? <LoadingState rows={4} label="Loading checklist" /> : null}
      {checklist.status === 'error' && checklist.error ? (
        <ErrorState message={checklist.error} onRetry={() => void checklist.refresh()} />
      ) : null}
      {checklist.status === 'ready' ? (
        <>
          {checklist.error ? <ErrorState message={checklist.error} onRetry={checklist.clearError} /> : null}
          <ul className="flex flex-col divide-y divide-border">
            {items.map((item) => (
              <ChecklistRow
                key={item.id}
                item={item}
                pending={checklist.pending}
                onRecord={() => void checklist.update(item.id, recordedReceiptPatch())}
              />
            ))}
          </ul>
        </>
      ) : null}
    </Panel>
  );
}

function ChecklistRow({
  item,
  pending,
  onRecord,
}: {
  item: ChecklistItemRecord;
  pending: boolean;
  onRecord: () => void;
}) {
  const label = CHECKLIST_LABELS[item.category] ?? item.category;
  const isReceived = item.status === 'received';
  const uploadOnly = UPLOAD_ONLY_CATEGORIES.has(item.category);

  return (
    <li className="flex flex-wrap items-center gap-300 py-300 first:pt-0 last:pb-0">
      {isReceived ? (
        <CheckCircle2 aria-hidden="true" className="icon-size-300 shrink-0 text-success-foreground" />
      ) : (
        <CircleDashed aria-hidden="true" className="icon-size-300 shrink-0 text-muted-foreground" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-300 font-medium text-foreground">{label}</p>
        <p className="text-200 text-muted-foreground">
          {isReceived
            ? `Received ${formatDateOnly(item.received_on)} · ${item.received_via === 'upload' ? 'uploaded' : 'recorded'}`
            : 'Outstanding'}
        </p>
      </div>
      {!isReceived && uploadOnly ? (
        <span
          title="File uploads aren't enabled yet"
          className="inline-flex items-center gap-100 rounded-full bg-muted px-200 py-100-nudge text-200 text-muted-foreground"
        >
          <UploadCloud aria-hidden="true" className="icon-size-100" />
          Upload only
        </span>
      ) : null}
      {!isReceived && !uploadOnly ? (
        <button type="button" onClick={onRecord} disabled={pending} className={buttonStyles.secondary}>
          Record receipt
        </button>
      ) : null}
    </li>
  );
}
