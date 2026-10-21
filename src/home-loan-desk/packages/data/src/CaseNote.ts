import { authenticated, boolean, date, entity, text, uuid } from '@microsoft/rayfin-core';
import { FIELD_LIMITS } from '@rayfin-app/shared';

/**
 * A note on a case. Every note carries the officer it belongs to; only that
 * officer can read or write it. Updates can't move a note to another case. A saved AI brief is a note with
 * `is_ai_generated` set and the reviewing officer recorded.
 */
@entity()
@authenticated(['create', 'read', 'delete'], {
  policy: (claims, item) => claims.email.eq(item.officer_email),
})
@authenticated('update', {
  policy: (claims, item) => claims.email.eq(item.officer_email),
  exclude: ['case_id'],
})
export class CaseNote {
  @uuid() id!: string;
  @uuid() case_id!: string;
  @text({ max: FIELD_LIMITS.email }) officer_email!: string;
  @text({ max: FIELD_LIMITS.email }) author_email!: string;
  @text({ min: 1, max: FIELD_LIMITS.noteBody }) body!: string;
  @boolean({ default: false }) is_ai_generated!: boolean;
  @text({ optional: true, max: FIELD_LIMITS.email }) reviewed_by_email?: string;
  @date() created_at!: Date;
}
