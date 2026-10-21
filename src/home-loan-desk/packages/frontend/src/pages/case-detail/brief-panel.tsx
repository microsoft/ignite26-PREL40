import type { ChecklistItemRecord } from '@rayfin-app/shared';
import { Sparkles } from 'lucide-react';

import { Panel } from '@/components/panel';
import { buttonStyles } from '@/components/styles';
import { missingItems } from '@/lib/checklist';
import { CHECKLIST_LABELS } from '@/lib/format';

/**
 * Placeholder for the AI handoff brief. The AI checkpoint adds a server-side
 * function that reads this case as the signed-in officer, calls the Foundry
 * model, and returns a summary for a human to review before saving.
 */
export function BriefPanel({
  checklist,
  checklistReady,
}: {
  checklist: readonly ChecklistItemRecord[];
  checklistReady: boolean;
}) {
  const missing = missingItems(checklist);

  return (
    <Panel
      title="Handoff brief"
      description="An AI summary for the next officer, reviewed by you before it is saved."
      actions={
        <button
          type="button"
          disabled
          aria-describedby="brief-not-connected"
          className={buttonStyles.primary}
        >
          <Sparkles aria-hidden="true" className="icon-size-200" />
          Generate handoff brief
        </button>
      }
    >
      <div className="flex flex-col gap-200">
        <h3 className="text-200 font-semibold uppercase tracking-wider text-muted-foreground">
          Missing checklist items
        </h3>
        {!checklistReady ? (
          <p className="text-300 text-muted-foreground">Waiting for the checklist…</p>
        ) : missing.length === 0 ? (
          <p className="text-300 text-foreground">None. Every required item is recorded as received.</p>
        ) : (
          <ul className="list-disc pl-500 text-300 text-foreground">
            {missing.map((item) => (
              <li key={item.id}>{CHECKLIST_LABELS[item.category] ?? item.category}</li>
            ))}
          </ul>
        )}
        <p className="text-200 text-muted-foreground">Computed from the checklist, not by AI.</p>
      </div>
      <p
        id="brief-not-connected"
        className="rounded-lg border border-dashed border-border px-400 py-300 text-300 text-muted-foreground"
      >
        Not connected yet. The AI handoff checkpoint adds a server-side function, the Foundry model
        call, and its secrets. Nothing is generated or sent from this page today.
      </p>
    </Panel>
  );
}
