import { authenticated, date, entity, set, text, uuid } from '@microsoft/rayfin-core';
import { FIELD_LIMITS, TASK_STATUSES, type TaskStatus } from '@rayfin-app/shared';

/** An administrative follow-up on a case, private to its officer. */
@entity()
@authenticated(['create', 'read', 'delete'], {
  policy: (claims, item) => claims.email.eq(item.officer_email),
})
@authenticated('update', {
  policy: (claims, item) => claims.email.eq(item.officer_email),
  exclude: ['case_id'],
})
export class CaseTask {
  @uuid() id!: string;
  @uuid() case_id!: string;
  @text({ max: FIELD_LIMITS.email }) officer_email!: string;
  @text({ min: 1, max: FIELD_LIMITS.taskTitle }) title!: string;
  @date({ optional: true }) due_on?: Date;
  @set(...TASK_STATUSES) status!: TaskStatus;
  @date() created_at!: Date;
}
