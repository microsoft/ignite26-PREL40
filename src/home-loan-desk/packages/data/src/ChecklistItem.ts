import { authenticated, date, entity, int, set, uuid, text } from '@microsoft/rayfin-core';
import {
  CHECKLIST_CATEGORIES,
  CHECKLIST_STATUSES,
  FIELD_LIMITS,
  RECEIPT_CHANNELS,
  type ChecklistCategory,
  type ChecklistStatus,
  type ReceiptChannel,
} from '@rayfin-app/shared';

/**
 * One required document category for a case. Tracks receipt only: "received"
 * means the desk has the item, not that its contents were verified.
 */
@entity()
@authenticated(['create', 'read', 'delete'], {
  policy: (claims, item) => claims.email.eq(item.officer_email),
})
@authenticated('update', {
  policy: (claims, item) => claims.email.eq(item.officer_email),
  exclude: ['case_id', 'category'],
})
export class ChecklistItem {
  @uuid() id!: string;
  @uuid() case_id!: string;
  @text({ max: FIELD_LIMITS.email }) officer_email!: string;
  @set(...CHECKLIST_CATEGORIES) category!: ChecklistCategory;
  @set(...CHECKLIST_STATUSES) status!: ChecklistStatus;
  @date({ optional: true }) received_on?: Date;
  @set({ optional: true }, ...RECEIPT_CHANNELS) received_via?: ReceiptChannel;
  @int() sort_order!: number;
}
