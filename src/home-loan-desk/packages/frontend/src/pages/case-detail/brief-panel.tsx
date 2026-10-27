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
      description="A summary for the next officer, reviewed by you before saving."
    >
      <div className="flex flex-col gap-200">
        <h3 className="text-300 font-medium text-foreground">Missing documents</h3>
        {!checklistReady ? (
          <p className="text-300 text-muted-foreground">Loading…</p>
        ) : missing.length === 0 ? (
          <p className="text-300 text-muted-foreground">None outstanding.</p>
        ) : (
          <ul className="flex flex-col gap-100 text-300 text-foreground">
            {missing.map((item) => (
              <li key={item.id} className="flex items-center gap-200">
                <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-primary" />
                {CHECKLIST_LABELS[item.category] ?? item.category}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-300 border-t border-border pt-400">
        <p id="brief-not-connected" className="text-200 text-muted-foreground">
          Not available yet
        </p>
        <button type="button" disabled aria-describedby="brief-not-connected" className={buttonStyles.primary}>
          <Sparkles aria-hidden="true" className="icon-size-200" />
          Generate handoff brief
        </button>
      </div>
    </Panel>
  );
}
