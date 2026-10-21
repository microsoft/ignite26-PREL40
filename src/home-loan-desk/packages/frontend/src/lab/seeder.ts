import {
  LAB_COLLEAGUE,
  type CaseFixture,
  type FixtureOwner,
  type LabFixtures,
} from '@rayfin-app/shared';

import { fromIsoDate } from '@/lib/format';

export type LabEntity = 'CaseWorkspace' | 'CaseNote' | 'CaseTask' | 'ChecklistItem';

/** The fields the seeder needs to see on rows the signed-in officer can read. */
export interface VisibleRecord {
  id: string;
  case_id?: string;
}

/**
 * The data operations the seeder needs. The app wires it to the Rayfin client;
 * tests use an in-memory fake. Every call runs as the signed-in officer, so
 * entity access rules apply: `listVisible` returns only that officer's rows.
 */
export interface LabStore {
  listVisible(entity: LabEntity): Promise<VisibleRecord[]>;
  create(entity: LabEntity, record: Record<string, unknown>): Promise<void>;
  remove(entity: LabEntity, id: string): Promise<void>;
}

export interface SeedProgress {
  done: number;
  total: number;
  label: string;
}

export type ProgressListener = (progress: SeedProgress) => void;

/** How the colleague's case (HL-1103) ended up after a restore. */
export type ColleagueCaseOutcome = 'created' | 'already-present';

export interface RestoreResult {
  created: number;
  alreadyPresent: number;
  colleagueCases: Record<string, ColleagueCaseOutcome>;
}

export interface ResetResult {
  removed: number;
  restore: RestoreResult;
}

interface PlannedRecord {
  entity: LabEntity;
  label: string;
  owner: FixtureOwner;
  record: Record<string, unknown> & { id: string };
}

const CONCURRENCY = 4;

function ownerEmail(owner: FixtureOwner, officerEmail: string): string {
  return owner === 'attendee' ? officerEmail : LAB_COLLEAGUE.email;
}

/**
 * Turn the generated fixtures into create payloads for one officer. Officer
 * emails are resolved here, from the signed-in session, never from fixtures.
 */
export function planLabRecords(
  fixtures: LabFixtures,
  officerEmail: string,
  now: Date = new Date()
): PlannedRecord[] {
  const snapshotDate = fromIsoDate(fixtures.generator.asOfDate);
  const caseNumbers = new Map(fixtures.cases.map((c) => [c.id, c.caseNumber]));
  const caseLabel = (caseId: string) => caseNumbers.get(caseId) ?? 'case';

  const cases: PlannedRecord[] = fixtures.cases.map((c: CaseFixture) => ({
    entity: 'CaseWorkspace',
    label: `Case ${c.caseNumber}`,
    owner: c.assignedTo,
    record: {
      id: c.id,
      case_number: c.caseNumber,
      applicant_label: c.applicantLabel,
      product: c.product,
      branch_name: c.branchName,
      stage: c.stage,
      stage_started_on: fromIsoDate(c.stageStartedOn),
      snapshot_date: snapshotDate,
      requested_amount: c.requestedAmount,
      review_status: c.reviewStatus,
      assigned_officer_email: ownerEmail(c.assignedTo, officerEmail),
      created_by_email: officerEmail,
      created_at: now,
    },
  }));

  const notes: PlannedRecord[] = fixtures.notes.map((n) => ({
    entity: 'CaseNote',
    label: `Note on ${caseLabel(n.caseId)}`,
    owner: 'attendee',
    record: {
      id: n.id,
      case_id: n.caseId,
      officer_email: officerEmail,
      author_email: officerEmail,
      body: n.body,
      is_ai_generated: false,
      created_at: new Date(n.createdAt),
    },
  }));

  const tasks: PlannedRecord[] = fixtures.tasks.map((t) => ({
    entity: 'CaseTask',
    label: `Task on ${caseLabel(t.caseId)}`,
    owner: 'attendee',
    record: {
      id: t.id,
      case_id: t.caseId,
      officer_email: officerEmail,
      title: t.title,
      ...(t.dueOn ? { due_on: fromIsoDate(t.dueOn) } : {}),
      status: t.status,
      created_at: new Date(t.createdAt),
    },
  }));

  const checklist: PlannedRecord[] = fixtures.checklist.map((item) => ({
    entity: 'ChecklistItem',
    label: `Checklist on ${caseLabel(item.caseId)}`,
    owner: 'attendee',
    record: {
      id: item.id,
      case_id: item.caseId,
      officer_email: officerEmail,
      category: item.category,
      status: item.status,
      ...(item.receivedOn
        ? { received_on: fromIsoDate(item.receivedOn), received_via: 'recorded' }
        : {}),
      sort_order: item.sortOrder,
    },
  }));

  return [...cases, ...notes, ...tasks, ...checklist];
}

/**
 * True when a create failed because a row with this key already exists. The
 * data API reports it as text ("A record with the same unique value already
 * exists." on Fabric), so match that and the raw SQL Server wording.
 */
export function isDuplicateKeyError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /duplicate key|primary key constraint|unique key constraint|unique constraint|already exists|cannot insert duplicate/i.test(
    message
  );
}

/**
 * True when the row was inserted but the response could not include it,
 * because the read rule hides cases assigned to someone else.
 */
export function isInsertedButHiddenError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /failed to extract result from create/i.test(message);
}

async function runPool<T>(items: readonly T[], worker: (item: T) => Promise<void>) {
  let next = 0;
  const lanes = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next++];
      await worker(item);
    }
  });
  await Promise.all(lanes);
}

/**
 * The officer's own lab records (not the colleague's case, which they can't
 * see) that aren't currently visible to them.
 */
export async function findMissingLabRecords(
  store: LabStore,
  fixtures: LabFixtures,
  officerEmail: string
): Promise<{ entity: LabEntity; id: string }[]> {
  const expected = planLabRecords(fixtures, officerEmail).filter((p) => p.owner === 'attendee');
  const visible = new Set<string>();
  for (const entity of new Set(expected.map((p) => p.entity))) {
    for (const row of await store.listVisible(entity)) visible.add(row.id);
  }
  return expected
    .filter((p) => !visible.has(p.record.id))
    .map((p) => ({ entity: p.entity, id: p.record.id }));
}

/**
 * Create every lab record the officer is missing. Never deletes or overwrites:
 * a record that already exists is left exactly as it is.
 *
 * The colleague's case can't be read back, so it is always attempted: a
 * duplicate-key error means it already exists, which counts as success.
 */
export async function restoreLabData(
  store: LabStore,
  fixtures: LabFixtures,
  officerEmail: string,
  onProgress: ProgressListener = () => {}
): Promise<RestoreResult> {
  const planned = planLabRecords(fixtures, officerEmail);
  const total = planned.length;
  let done = 0;
  const result: RestoreResult = { created: 0, alreadyPresent: 0, colleagueCases: {} };
  const report = (label: string) => onProgress({ done, total, label });

  report('Checking which lab records you already have');
  const visible = new Set<string>();
  for (const entity of ['CaseWorkspace', 'CaseNote', 'CaseTask', 'ChecklistItem'] as const) {
    for (const row of await store.listVisible(entity)) visible.add(row.id);
  }

  const createOne = async (item: PlannedRecord) => {
    if (item.owner === 'colleague') {
      try {
        await store.create(item.entity, item.record);
        result.colleagueCases[String(item.record.case_number)] = 'created';
        result.created++;
      } catch (error) {
        if (isDuplicateKeyError(error)) {
          result.colleagueCases[String(item.record.case_number)] = 'already-present';
          result.alreadyPresent++;
        } else if (isInsertedButHiddenError(error)) {
          result.colleagueCases[String(item.record.case_number)] = 'created';
          result.created++;
        } else {
          throw error;
        }
      }
    } else if (visible.has(item.record.id)) {
      result.alreadyPresent++;
    } else {
      await store.create(item.entity, item.record);
      result.created++;
    }
    done++;
    report(item.label);
  };

  // Cases first, so child records never point at a case that isn't there yet.
  await runPool(
    planned.filter((p) => p.entity === 'CaseWorkspace'),
    createOne
  );
  await runPool(
    planned.filter((p) => p.entity !== 'CaseWorkspace'),
    createOne
  );

  report('Lab data ready');
  return result;
}

/**
 * Delete the officer's own lab cases and everything attached to them (including
 * notes and tasks added during the lab), then restore the original lab data.
 * Cases assigned to someone else are invisible to the officer and untouched.
 */
export async function resetLabData(
  store: LabStore,
  fixtures: LabFixtures,
  officerEmail: string,
  onProgress: ProgressListener = () => {}
): Promise<ResetResult> {
  const labCaseIds = new Set(
    fixtures.cases.filter((c) => c.assignedTo === 'attendee').map((c) => c.id)
  );

  onProgress({ done: 0, total: 0, label: 'Finding your lab records' });
  const doomed: { entity: LabEntity; id: string }[] = [];
  for (const entity of ['CaseNote', 'CaseTask', 'ChecklistItem'] as const) {
    for (const row of await store.listVisible(entity)) {
      if (row.case_id && labCaseIds.has(row.case_id)) doomed.push({ entity, id: row.id });
    }
  }
  const children = doomed.length;
  for (const row of await store.listVisible('CaseWorkspace')) {
    if (labCaseIds.has(row.id)) doomed.push({ entity: 'CaseWorkspace', id: row.id });
  }

  let done = 0;
  const total = doomed.length;
  const removeOne = async (item: { entity: LabEntity; id: string }) => {
    await store.remove(item.entity, item.id);
    done++;
    onProgress({ done, total, label: `Removing ${item.entity === 'CaseWorkspace' ? 'case' : 'record'}` });
  };
  // Children before cases, mirroring the order they were created in.
  await runPool(doomed.slice(0, children), removeOne);
  await runPool(doomed.slice(children), removeOne);

  const restore = await restoreLabData(store, fixtures, officerEmail, onProgress);
  return { removed: total, restore };
}
