import { LAB_COLLEAGUE } from '@rayfin-app/shared';
import { describe, expect, it } from 'vitest';

import { labFixtures } from './fixtures.generated';
import {
  findMissingLabRecords,
  isDuplicateKeyError,
  planLabRecords,
  resetLabData,
  restoreLabData,
  type LabEntity,
  type LabStore,
} from './seeder';

const OFFICER = 'avery.officer@caldova.example';

type Row = Record<string, unknown> & { id: string };

/**
 * In-memory stand-in for the data API that applies the same email-scoped rules
 * as the entities: officers only see their own rows, and a create the caller
 * cannot read back succeeds without returning the row.
 */
class FakeStore implements LabStore {
  readonly tables = new Map<LabEntity, Map<string, Row>>();
  failCreateWith: Error | null = null;

  constructor(private readonly caller: string) {}

  private table(entity: LabEntity) {
    if (!this.tables.has(entity)) this.tables.set(entity, new Map());
    return this.tables.get(entity)!;
  }

  private owner(entity: LabEntity, row: Row) {
    return entity === 'CaseWorkspace' ? row.assigned_officer_email : row.officer_email;
  }

  async listVisible(entity: LabEntity) {
    return [...this.table(entity).values()]
      .filter((row) => this.owner(entity, row) === this.caller)
      .map((row) => ({ id: row.id, case_id: row.case_id as string | undefined }));
  }

  async create(entity: LabEntity, record: Record<string, unknown>) {
    if (this.failCreateWith) throw this.failCreateWith;
    const row = record as Row;
    if (this.table(entity).has(row.id)) {
      throw new Error(
        `GraphQL errors: Violation of PRIMARY KEY constraint 'PK_${entity}'. Cannot insert duplicate key in object 'dbo.${entity}'.`
      );
    }
    const creator = entity === 'CaseWorkspace' ? row.created_by_email : row.officer_email;
    if (creator !== this.caller) throw new Error('GraphQL errors: Authorization failure.');
    this.table(entity).set(row.id, { ...row });
    if (this.owner(entity, row) !== this.caller) {
      throw new Error(`Failed to extract result from create${entity} mutation`);
    }
  }

  async remove(entity: LabEntity, id: string) {
    const row = this.table(entity).get(id);
    if (!row || this.owner(entity, row) !== this.caller) {
      throw new Error('GraphQL errors: item not found');
    }
    this.table(entity).delete(id);
  }

  count(entity: LabEntity) {
    return this.table(entity).size;
  }
}

const total = planLabRecords(labFixtures, OFFICER).length;
const hl1042 = labFixtures.cases.find((c) => c.caseNumber === 'HL-1042')!;

describe('planLabRecords', () => {
  const planned = planLabRecords(labFixtures, OFFICER);
  const cases = planned.filter((p) => p.entity === 'CaseWorkspace');

  it('assigns eight cases to the signed-in officer and HL-1103 to the colleague', () => {
    expect(cases).toHaveLength(9);
    const colleague = cases.filter((p) => p.record.assigned_officer_email === LAB_COLLEAGUE.email);
    expect(colleague.map((p) => p.record.case_number)).toEqual(['HL-1103']);
    expect(cases.every((p) => p.record.created_by_email === OFFICER)).toBe(true);
  });

  it("stamps every child record with the signed-in officer's email", () => {
    const children = planned.filter((p) => p.entity !== 'CaseWorkspace');
    expect(children.length).toBeGreaterThan(0);
    expect(children.every((p) => p.record.officer_email === OFFICER)).toBe(true);
  });

  it('leaves HL-1042 renovation plans required, with no receipt', () => {
    const item = planned.find(
      (p) =>
        p.entity === 'ChecklistItem' &&
        p.record.case_id === hl1042.id &&
        p.record.category === 'renovation-plans-photos'
    );
    expect(item?.record.status).toBe('required');
    expect(item?.record).not.toHaveProperty('received_on');
  });
});

describe('restoreLabData', () => {
  it('creates every lab record in an empty database', async () => {
    const store = new FakeStore(OFFICER);
    const progress: number[] = [];
    const result = await restoreLabData(store, labFixtures, OFFICER, (p) => progress.push(p.done));
    expect(result.created).toBe(total);
    expect(result.colleagueCases).toEqual({ 'HL-1103': 'created' });
    expect(store.count('CaseWorkspace')).toBe(9);
    expect(progress.at(-1)).toBe(total);
  });

  it('is idempotent and never overwrites existing records', async () => {
    const store = new FakeStore(OFFICER);
    await restoreLabData(store, labFixtures, OFFICER);
    const note = [...store.tables.get('CaseNote')!.values()][0];
    note.body = 'Edited during the lab';

    const again = await restoreLabData(store, labFixtures, OFFICER);
    expect(again.created).toBe(0);
    expect(again.alreadyPresent).toBe(total);
    expect(again.colleagueCases).toEqual({ 'HL-1103': 'already-present' });
    expect(note.body).toBe('Edited during the lab');
  });

  it('re-creates only the records that are missing', async () => {
    const store = new FakeStore(OFFICER);
    await restoreLabData(store, labFixtures, OFFICER);
    await store.remove('CaseWorkspace', hl1042.id);

    const again = await restoreLabData(store, labFixtures, OFFICER);
    expect(again.created).toBe(1);
    expect(store.count('CaseWorkspace')).toBe(9);
  });

  it('surfaces unexpected failures instead of reporting success', async () => {
    const store = new FakeStore(OFFICER);
    store.failCreateWith = new Error('GraphQL errors: Authorization failure.');
    await expect(restoreLabData(store, labFixtures, OFFICER)).rejects.toThrow(
      'Authorization failure'
    );
  });
});

describe('findMissingLabRecords', () => {
  it("lists only the officer's records that aren't visible, never the colleague's case", async () => {
    const store = new FakeStore(OFFICER);
    expect(await findMissingLabRecords(store, labFixtures, OFFICER)).toHaveLength(total - 1);

    await restoreLabData(store, labFixtures, OFFICER);
    expect(await findMissingLabRecords(store, labFixtures, OFFICER)).toEqual([]);

    const note = labFixtures.notes[0];
    await store.remove('CaseNote', note.id);
    expect(await findMissingLabRecords(store, labFixtures, OFFICER)).toEqual([
      { entity: 'CaseNote', id: note.id },
    ]);
  });
});

describe('resetLabData', () => {
  it("removes the officer's lab cases and additions, keeps the colleague's case, then restores", async () => {
    const store = new FakeStore(OFFICER);
    await restoreLabData(store, labFixtures, OFFICER);
    await store.create('CaseNote', {
      id: 'note-added-in-lab',
      case_id: hl1042.id,
      officer_email: OFFICER,
      body: 'Added during the lab',
    });

    const result = await resetLabData(store, labFixtures, OFFICER);
    expect(store.tables.get('CaseNote')!.has('note-added-in-lab')).toBe(false);
    expect(result.restore.colleagueCases).toEqual({ 'HL-1103': 'already-present' });
    expect(store.count('CaseWorkspace')).toBe(9);
    expect(result.restore.created).toBe(total - 1);
  });
});

describe('isDuplicateKeyError', () => {
  it('recognizes the deployed data API duplicate-key message', () => {
    expect(
      isDuplicateKeyError(new Error('GraphQL errors: A record with the same unique value already exists.'))
    ).toBe(true);
  });

  it('recognizes SQL Server duplicate-key messages', () => {
    expect(
      isDuplicateKeyError(
        new Error(
          "Violation of PRIMARY KEY constraint 'PK_CaseWorkspace'. Cannot insert duplicate key in object 'dbo.CaseWorkspace'."
        )
      )
    ).toBe(true);
    expect(isDuplicateKeyError(new Error('Authorization failure.'))).toBe(false);
  });
});
