import type {
  CaseNoteRecord,
  CaseTaskRecord,
  CaseWorkspaceRecord,
  ChecklistItemRecord,
  ReviewStatus,
  TaskStatus,
} from '@rayfin-app/shared';

import { fromIsoDate, todayIsoDate } from '@/lib/format';
import { getRayfinClient } from '@/lib/rayfin-client';

/**
 * Data access for the case workspace. Every call runs as the signed-in officer,
 * so the entity access rules decide what comes back: another officer's case is
 * simply not returned, whether it is listed or requested by ID.
 */

const CASE_FIELDS = [
  'id',
  'case_number',
  'applicant_label',
  'product',
  'branch_name',
  'stage',
  'stage_started_on',
  'snapshot_date',
  'requested_amount',
  'review_status',
  'assigned_officer_email',
  'created_by_email',
  'created_at',
] as const satisfies readonly (keyof CaseWorkspaceRecord)[];

const NOTE_FIELDS = [
  'id',
  'case_id',
  'officer_email',
  'author_email',
  'body',
  'is_ai_generated',
  'reviewed_by_email',
  'created_at',
] as const satisfies readonly (keyof CaseNoteRecord)[];

const TASK_FIELDS = [
  'id',
  'case_id',
  'officer_email',
  'title',
  'due_on',
  'status',
  'created_at',
] as const satisfies readonly (keyof CaseTaskRecord)[];

const CHECKLIST_FIELDS = [
  'id',
  'case_id',
  'officer_email',
  'category',
  'status',
  'received_on',
  'received_via',
  'sort_order',
] as const satisfies readonly (keyof ChecklistItemRecord)[];

/** The lab has a handful of cases per officer, well under one page. */
const LIST_LIMIT = 100;

export async function listMyCases(): Promise<CaseWorkspaceRecord[]> {
  const client = await getRayfinClient();
  return client.data.CaseWorkspace.select([...CASE_FIELDS])
    .orderBy({ case_number: 'asc' })
    .first(LIST_LIMIT)
    .execute();
}

/** Returns `null` both when the case doesn't exist and when it isn't yours. */
export async function findCaseByNumber(caseNumber: string): Promise<CaseWorkspaceRecord | null> {
  const client = await getRayfinClient();
  const rows = await client.data.CaseWorkspace.select([...CASE_FIELDS])
    .where({ case_number: { eq: caseNumber } })
    .first(1)
    .execute();
  return rows[0] ?? null;
}

/** The response carries only the changed fields; merge it into the case you hold. */
export async function updateReviewStatus(
  caseId: string,
  review_status: ReviewStatus
): Promise<Partial<CaseWorkspaceRecord>> {
  const client = await getRayfinClient();
  return client.data.CaseWorkspace.update({ id: caseId }, { review_status });
}

export async function listChecklist(caseId?: string): Promise<ChecklistItemRecord[]> {
  const client = await getRayfinClient();
  const query = client.data.ChecklistItem.select([...CHECKLIST_FIELDS]);
  const filtered = caseId ? query.where({ case_id: { eq: caseId } }) : query;
  return filtered.orderBy({ sort_order: 'asc' }).first(LIST_LIMIT * 5).execute();
}

export type ChecklistPatch = Partial<
  Pick<ChecklistItemRecord, 'status' | 'received_on' | 'received_via'>
>;

/**
 * Update a checklist item's receipt status. Receipt is not verification. The
 * response carries only the changed fields, so merge it into the row you hold.
 */
export async function updateChecklistItem(
  itemId: string,
  patch: ChecklistPatch
): Promise<Partial<ChecklistItemRecord>> {
  const client = await getRayfinClient();
  return client.data.ChecklistItem.update({ id: itemId }, patch);
}

/** The patch for recording, by hand, that a document arrived today. */
export function recordedReceiptPatch(): ChecklistPatch {
  return { status: 'received', received_on: fromIsoDate(todayIsoDate()), received_via: 'recorded' };
}

export async function listNotes(caseId: string): Promise<CaseNoteRecord[]> {
  const client = await getRayfinClient();
  return client.data.CaseNote.select([...NOTE_FIELDS])
    .where({ case_id: { eq: caseId } })
    .orderBy({ created_at: 'desc' })
    .first(LIST_LIMIT)
    .execute();
}

export async function createNote(
  caseId: string,
  officerEmail: string,
  body: string
): Promise<CaseNoteRecord> {
  const client = await getRayfinClient();
  return client.data.CaseNote.create({
    case_id: caseId,
    officer_email: officerEmail,
    author_email: officerEmail,
    body,
    is_ai_generated: false,
    created_at: new Date(),
  });
}

export async function listTasks(caseId?: string): Promise<CaseTaskRecord[]> {
  const client = await getRayfinClient();
  const query = client.data.CaseTask.select([...TASK_FIELDS]);
  const filtered = caseId ? query.where({ case_id: { eq: caseId } }) : query;
  return filtered.orderBy({ created_at: 'asc' }).first(LIST_LIMIT * 5).execute();
}

export async function createTask(
  caseId: string,
  officerEmail: string,
  title: string,
  dueOn: string | null
): Promise<CaseTaskRecord> {
  const client = await getRayfinClient();
  return client.data.CaseTask.create({
    case_id: caseId,
    officer_email: officerEmail,
    title,
    ...(dueOn ? { due_on: fromIsoDate(dueOn) } : {}),
    status: 'open',
    created_at: new Date(),
  });
}

/** The response carries only the changed fields; merge it into the row you hold. */
export async function setTaskStatus(
  taskId: string,
  status: TaskStatus
): Promise<Partial<CaseTaskRecord>> {
  const client = await getRayfinClient();
  return client.data.CaseTask.update({ id: taskId }, { status });
}
