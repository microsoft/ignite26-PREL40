import type { RayfinClient } from '@microsoft/rayfin-client';
import type { UniversalAppSchema } from '@rayfin-app/shared';

import type { LabEntity, LabStore, VisibleRecord } from './seeder';

const PAGE_SIZE = 100;

interface Page {
  items: VisibleRecord[];
  hasNextPage: boolean;
  endCursor?: string;
}

interface PagedQuery {
  first(count: number): PagedQuery;
  after(cursor: string): PagedQuery;
  orderBy(order: Record<string, 'asc' | 'desc'>): PagedQuery;
  executePaginated(): Promise<Page>;
}

/**
 * The slice of a Rayfin entity client the seeder uses. The entity names are
 * only known at runtime here, so this narrows `client.data.<Entity>` to the
 * calls that are the same for every entity.
 */
interface SeedableEntityClient {
  select(fields: string[]): PagedQuery;
  create(input: Record<string, unknown>): Promise<unknown>;
  delete(where: { id: string }): Promise<unknown>;
}

const VISIBLE_FIELDS: Record<LabEntity, string[]> = {
  CaseWorkspace: ['id'],
  CaseNote: ['id', 'case_id'],
  CaseTask: ['id', 'case_id'],
  ChecklistItem: ['id', 'case_id'],
};

/** A {@link LabStore} backed by the signed-in officer's Rayfin client. */
export function createRayfinLabStore(client: RayfinClient<UniversalAppSchema>): LabStore {
  const entityClient = (entity: LabEntity) =>
    client.data[entity] as unknown as SeedableEntityClient;

  return {
    async listVisible(entity) {
      const rows: VisibleRecord[] = [];
      let cursor: string | undefined;
      do {
        let query = entityClient(entity)
          .select(VISIBLE_FIELDS[entity])
          .orderBy({ id: 'asc' })
          .first(PAGE_SIZE);
        if (cursor) query = query.after(cursor);
        const page = await query.executePaginated();
        rows.push(...page.items);
        cursor = page.hasNextPage ? page.endCursor : undefined;
      } while (cursor);
      return rows;
    },
    async create(entity, record) {
      await entityClient(entity).create(record);
    },
    async remove(entity, id) {
      await entityClient(entity).delete({ id });
    },
  };
}
