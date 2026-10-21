import type { UniversalAppSchema } from '@rayfin-app/shared';

import { CaseNote } from './CaseNote.js';
import { CaseTask } from './CaseTask.js';
import { CaseWorkspace } from './CaseWorkspace.js';
import { ChecklistItem } from './ChecklistItem.js';

/**
 * The app's Rayfin data schema.
 *
 * `UniversalAppSchema` in `@rayfin-app/shared` is what makes
 * `(await getRayfinClient()).data.<Entity>` typed, so keep it in step with
 * `schema` below: a class registered in `schema` but missing from the shared
 * type is reachable at runtime and invisible to the compiler.
 *
 * Every entity carries explicit access rules scoped to the signed-in officer's
 * email. See each entity file and the `data-modeling` skill.
 */
export type { UniversalAppSchema };
export { CaseNote, CaseTask, CaseWorkspace, ChecklistItem };

export const schema = [CaseWorkspace, CaseNote, CaseTask, ChecklistItem];
