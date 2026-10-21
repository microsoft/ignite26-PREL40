import type { ChecklistItemRecord } from '@rayfin-app/shared';

/**
 * Checklist items still required, computed by application code. The AI brief
 * must never decide what is missing; it shows these alongside its prose.
 */
export function missingItems(items: readonly ChecklistItemRecord[]): ChecklistItemRecord[] {
  return items
    .filter((item) => item.status === 'required')
    .sort((a, b) => a.sort_order - b.sort_order);
}
