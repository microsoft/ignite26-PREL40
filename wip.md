# WIP: manager role with dynamic claims (branch `custom-claims`)

> Work in progress. Delete this file before merging.

## Goal

Add the deferred RBAC section to the lab as a new **Exercise 10**. Use Rayfin's experimental dynamic claims to simulate a manager role:

- Move the lab template and checkpoint patches to the latest Rayfin alpha.
- A `deskRole` claim, minted at sign-in, unlocks the Portfolio page.
- It also grants read-only access to colleagues' cases.

## Status: blocked, waiting on the Rayfin/Fabric team

The go/no-go test on `prel40-homeloans` failed. Following the agreed rule (stop and report, no fallback), nothing beyond the test was built:

- the template still pins `1.36.2`;
- no patches were regenerated;
- no lab pages were written.

### Why it's blocked

- `rayfin up` (alpha `1.37.0-alpha.2159`) deploys the `udf.authClaims` provider and logs "Syncing dynamic claims contract". Despite that, `GET __private/projectRuntimeSettings` returns no `serviceSettings.auth.dynamicClaims` afterwards: the service drops the setting.
- Sign-in through the Entra exchange works, but the token carries no `deskRole` claim. The provider never runs.
- With the `claims.deskRole` read policy deployed, every `CaseWorkspace` read fails with "User does not possess all the claims required to perform this operation".
- The Rayfin docs (`experimental/auth/dynamic-claims.md`) say: "The BaaS feature switch must also be on for the workspace." That switch is off for this workspace and can't be turned on from the project.
- Provider SQL is a second, separate platform gate. It couldn't be tested.

### Questions for the team

1. Can dynamic claims (the BaaS feature switch) be enabled for the `prel40-homeloans` workspace (`d4008f71-4481-42c7-aedb-5d4fb99228ad`), and for the Skillable lab tenants?
2. Is provider SQL (`AuthClaimsContext & WithSql`) enabled along with it?
3. Can attendees INSERT/UPDATE rows in the app's SQL database from the Fabric SQL query editor? The docs say it's "read-only in the portal".
4. Storage on `prel40-homeloans` (see below): is `FeatureFlags:EnableStorage` off for this workspace?

## Decisions already made

- Branch `custom-claims`, from `main`.
- Pin the alpha **exactly**, because caret ranges don't match prereleases. Re-check the npm `experimental` tag before pinning; it was `1.37.0-alpha.2159`.
- **Role source:**
  - A `DeskRole` table in the app's own SQL database.
  - The app can only read a user's own row; app users can't create, update, or delete rows.
  - Attendees add their manager row directly in the Fabric SQL query editor.
  - The claims provider reads the table with provider SQL.
- **Default role:** no row means `officer`, which is least privilege and avoids failing sign-in.
- **What manager grants:**
  - UI: the Portfolio nav item and the `#/manager` route are shown only to managers.
  - Server: managers can read every case, so HL-1103 (Morgan Lee's) appears.
  - Update and delete stay assigned-officer only.
- **Test environment:** `prel40-homeloans`. Don't use `yolasors-ignite`.
- **Scope:**
  - a new page;
  - renumbering, index, and `.prep/plan.md`;
  - the conclusion and knowledge check;
  - checkpoint 10;
  - the `skillable.md` recompile and the self-guided re-export.
- The lab never runs `rayfin dev` locally (it always deploys), so "provider SQL doesn't run under `rayfin dev`" doesn't matter.

## Remaining plan

1. **Re-run the go/no-go test** once the team confirms (see [Resume the test](#resume-the-test)). Check that:
   1. sign-in works and `getClaims()` returns `deskRole: officer`;
   2. an INSERT on `DeskRoles` works in the Fabric SQL editor;
   3. after `refreshSession()`, the claim is `manager`;
   4. HL-1103 is readable, and edits to it are still denied.
2. **Template on the alpha** (`src/home-loan-desk`):
   - Pin the alpha in the root `package.json`, `packages/frontend/package.json`, and `packages/data/package.json`.
   - Pin it in the `.agents/skills/functions-capability/kit/functions/package.json` (`@microsoft/fabric-user-data-functions`).
   - Run `npm install`, then typecheck, build, and test.
   - Apply the template-level fixes from the [alpha port checklist](#alpha-port-checklist).
   - Update the pin notes in `src/README.md` (line 24) and `.prep/scenario.md` (lines 24, 299, 399, 437).
   - Set `RAYFIN_CLI` in `scripts/checkpoints/checkpoint.mjs` (line 46).
3. **Regenerate patches 06, 07, 08** (`scripts/checkpoints/app/`):
   - Start from a fresh alpha app and re-run the CLI generators (connectors, storage, `functions init`).
   - Patch 07 needs the storage path API changes. Patch 08 copies the kit's `validate-functions.mjs`, which needs the fix.
   - Capture with `npm run patch:capture <N>`, then run `npm run patch:verify`.
4. **Build the feature** on top of checkpoint 8, then capture `scripts/checkpoints/app/10-manager-role.patch`:
   - Backend: everything in [Spike code](#spike-code).
   - Frontend: a claims hook on `client.auth.getClaims()`.
   - Gate the Portfolio nav (`components/app-shell.tsx`) and the `#/manager` route (`App.tsx`), with a "managers only" state.
   - Add a "Refresh role" action that calls `client.auth.refreshSession()`.
   - Once managers can read every case, `listMyCases()` (`services/cases.ts`) must filter on `assigned_officer_email`.
   - The "Assigned to you" tag in `pages/manager-page.tsx` (around lines 287 and 335) must compare emails, not the list of visible cases.
5. **Lab instructions** (use the `lab-instructions` skill):
   - New `docs/instructions/11-manager-role.md` (Exercise 10):
     - prompt Copilot to add the role table, provider, and policy, then deploy;
     - show that Portfolio is hidden;
     - insert your role row in the Fabric SQL editor;
     - refresh the role and see Portfolio and HL-1103 (read-only);
     - try an edit and confirm it's blocked.
   - Renumber: `11-monitoring` → `12` (Exercise 11), `12-knowledge-check-app` → `13`, `13-bonus` → `14`, `14-conclusion` → `15`. Also fix the "Exercise 10:" heading in `11-monitoring.md`.
   - Fix links in `docs/README.md` (lines 18–21) and `docs/knowledge-checks.md` (line 44).
   - Update `.prep/plan.md` (the deferred `11-rbac.md` entry, lines 19–22).
   - In the conclusion, rework the "A real manager role" production gap (line 31); what remains is reassignment and role management.
   - Knowledge check: add a question on dynamic claims.
   - Update `06-explore-app.md` (line 25) if needed.
   - Recompile `docs/skillable.md`.
6. **Checkpoint 10** (`scripts/checkpoints/`):
   - a `CHECKPOINTS` entry in `checkpoint.mjs`;
   - a STEPS entry for the role row;
   - a row and section in `README.md`;
   - a row in `scripts/vm-skills/lab-checkpoint/SKILL.md`.
7. **Self-guided:** re-export `docs/self-guided/workshop.md` with the `export-self-guided` skill.

## Findings

### Confirmed

- An entity with only `@authenticated('read')` exposes no create mutation: "The field `createDeskRole` does not exist on the type `Mutation`". App users can't grant themselves a role.
- The Entra exchange, `signInWithEntraToken` from `@microsoft/rayfin-auth-provider-fabric`, works from Node with a Power BI-audience token. That's a way to test without a browser (see [Resume the test](#resume-the-test)).

### Dynamic claims notes (alpha)

- Enable it with `services.auth.dynamicClaims.enabled: true`; Functions must also be enabled. Setting `enabled: false` and redeploying is the kill switch.
- Exactly one inline `udf.authClaims` provider is allowed, with an explicit return type.
  - Claim names match `^[A-Za-z][A-Za-z0-9_]*$`; at most 8 claims.
  - Reserved names: `role`, `email`, `sub`, `name`. Refused prefixes: `dc_`, `rfn_`, `xms_`.
- `ctx.sql.query(sql, params)` returns `{ columns, rows: unknown[][] }`, with positional rows.
  - Tables use the pluralized entity name (`DeskRole` → `DeskRoles`).
  - Provider SQL bypasses entity policies.
- `npx rayfin functions init` generates:
  - `packages/auth/claims.generated.d.ts` and `packages/auth/claims.contract.json`;
  - `packages/functions/claims.contract.json`;
  - the new agent skills `rayfin-auth-claims` and `rayfin-schema-drift`.
- On the client:
  - `client.auth.getClaims()` (experimental) returns custom claims as strings.
  - `client.auth.refreshSession()` gets a new token with fresh claims.
  - Error codes: `SIGN_IN_DENIED`, `AUTH_CLAIMS_UNAVAILABLE` (cold start, 503), `AUTH_CLAIMS_FAILED`, `AUTH_CLAIMS_INVALID_OUTPUT`.
- The semantic model connector can't enforce policies, so gating the Portfolio analytics is UI-only. The server-side part of the role is manager read access to `CaseWorkspace`.

### Alpha port checklist

These breaking changes surfaced while moving the checkpoint 8 app to `1.37.0-alpha.2159`. With all of them applied, the app's typecheck, build, and tests pass.

- `packages/frontend/vite.config.ts`: import from `@microsoft/rayfin-local-dev/experimental/vite` instead of `@microsoft/rayfin-local-dev/vite`. 1.36.2 only has `./vite`, so change this together with the pin.
- `rayfin/storage/CasePhoto.ts` (from patch 07): `blob`, `StorageObject`, `mb`, and `ContentTypes` move from `@microsoft/rayfin-core/experimental` to `@microsoft/rayfin-core`. The old path fails `rayfin up` storage and connector generation.
- The storage client is now path-based, and the `prefix` option is gone:
  - `list(caseId, { limit, continuation })`;
  - `upload(`${caseId}/${name}`, file, { contentType, fields })`;
  - `download(`${caseId}/${name}`)`;
  - `delete(`${caseId}/${name}`)`.
  - List items have `path` (full) and `name` (basename).
  - Affected files: `packages/frontend/src/services/case-files.ts` and `src/lab/lab-store.ts` (`removeCaseFiles`).
- `packages/data/tsconfig.json`: `include` needs `"../auth/claims.generated.d.ts"` so policies see the typed `deskRole` claim. Delete the stale `.tsbuildinfo` after changing it, or the error persists.
- `validate-functions.mjs` crashes on the generated `packages/auth/` folder, which has no `package.json`.
  - Fixed on this branch in `src/home-loan-desk/.agents/skills/functions-capability/kit/scripts/validate-functions.mjs`: skip `packages/*` folders that have no `package.json`.
  - This is the only repo change so far, and it's uncommitted.
- `rayfin docs` subcommands are `list`, `search`, and `get`. The docs can also be read from `node_modules/@microsoft/rayfin-guide/assets/docs/`.

### Separate issue: storage on `prel40-homeloans`

- Storage apply returns 404 with both CLIs. The 1.36.2 CLI says: "Storage apply is disabled on the server … gated server-side by `FeatureFlags:EnableStorage`".
- At runtime, `list` returns 404 for every case. Both client versions call the same `api/storage/...` routes.
- **Exercise 7 (property photos) is likely broken on this workspace**, independent of the alpha. Check this separately.

## Spike code

The spike app is `.workspace/home-loan-desk`, branch `spike-claims`, built from `lab/checkpoint-8` (cfd2b07) and uncommitted. It's gitignored, so it only exists on this machine; the key pieces are copied here.

`packages/shared/src/index.ts` (also add `DeskRole: DeskRoleRecord;` to `UniversalAppSchema`):

```ts
/** Desk roles minted into the `deskRole` sign-in claim. Officer is the default. */
export const DESK_ROLES = ['officer', 'manager'] as const;
export type DeskRoleName = (typeof DESK_ROLES)[number];

export interface DeskRoleRecord {
  id: string;
  email: string;
  desk_role: DeskRoleName;
}
```

`packages/data/src/DeskRole.ts` (export it from `packages/data/src/index.ts` and add it to `schema`):

```ts
import { authenticated, entity, set, text, uuid } from '@microsoft/rayfin-core';
import { DESK_ROLES, FIELD_LIMITS, type DeskRoleName } from '@rayfin-app/shared';

/**
 * A desk member's role. The sign-in claims function reads this table to mint
 * the `deskRole` claim; anyone without a row is an officer.
 *
 * The app can only read the signed-in user's own row. Rows are managed outside
 * the app, directly in the app's SQL database.
 */
@entity()
@authenticated('read', {
  policy: (claims, item) => claims.email.eq(item.email),
})
export class DeskRole {
  @uuid() id!: string;
  @text({ min: 1, max: FIELD_LIMITS.email, unique: true }) email!: string;
  @set(...DESK_ROLES) desk_role!: DeskRoleName;
}
```

`packages/functions/src/function_app.ts`. Imports: `type WithSql` from `@microsoft/fabric-user-data-functions`, `AuthClaimsContext` from `@microsoft/fabric-user-data-functions/experimental/index`, and `DESK_ROLES` from `@rayfin-app/shared`.

```ts
udf.authClaims(
  async (ctx: AuthClaimsContext & WithSql): Promise<{ deskRole: string }> => {
    const { rows } = await ctx.sql.query(
      'SELECT TOP 2 desk_role FROM DeskRoles WHERE email = @email',
      { email: ctx.auth.email.trim().toLowerCase() },
    );
    if (rows.length === 0) return { deskRole: 'officer' };
    if (rows.length > 1) throw new Error('More than one desk role matches this identity.');
    const deskRole = String(rows[0][0]);
    if (!(DESK_ROLES as readonly string[]).includes(deskRole)) {
      throw new Error('The desk role on file is not recognized.');
    }
    return { deskRole };
  },
);
```

`packages/data/src/CaseWorkspace.ts`:

- The read policy becomes `claims.deskRole.eq('manager').or(claims.email.eq(item.assigned_officer_email))`.
- Split delete into its own officer-only rule. Update stays officer-only, excluding `created_by_email`.
- Update the class doc comment.
- This change is reverted in the spike app right now (see below).

`rayfin/rayfin.yml`, under `services.auth`:

```yaml
    dynamicClaims:
      enabled: true
```

Then run `npx rayfin functions init` to generate the claims contract and types.

## Current state

- **This repo** (`custom-claims`): only the `validate-functions.mjs` fix plus this file. The `.github/skills/` changes are separate, unrelated work. Nothing is committed or pushed.
- **`prel40-homeloans`** runs the spike build, which keeps the app usable:
  - alpha packages;
  - `dynamicClaims.enabled: false`;
  - the checkpoint 8 `CaseWorkspace` policy (verified: your own cases only);
  - an extra, empty `DeskRoles` table.

  Going back to checkpoint 8 on 1.36.2 would drop `DeskRoles`, which needs `rayfin up --force`.
- **Spike app:** in `.workspace/home-loan-desk`, set `dynamicClaims.enabled: true` and restore the manager read policy before re-testing.

## Resume the test

1. In `.workspace/home-loan-desk`: re-enable `dynamicClaims`, restore the manager-or-officer read policy, and run `npx rayfin functions init`.
2. Run `npx rayfin up --dry-run`, `npx rayfin up`, then `npx rayfin up status`.
3. Check that the server stored the setting: `GET https://api.fabric.microsoft.com/v1/workspaces/<ws>/appBackends/<item>/__private/projectRuntimeSettings` (Fabric API token) should show `serviceSettings.auth.dynamicClaims`.
4. Sign in and read the claims, either in the browser or from a throwaway Node script in the app folder:
   - Get a token with `getAuthenticatedToken(['https://analysis.windows.net/powerbi/api/.default'], { tenantId })` from `node_modules/@microsoft/rayfin-cli/dist/auth/index.js`.
   - Create `new RayfinClient({ baseUrl, publishableKey, authStorage: false })` with the values from `rayfin/.env`.
   - Call `signInWithEntraToken(client.auth, { entraToken })`, then `client.auth.getClaims()`.
   - End the script with `process.exit(0)`, or the auth refresh timer keeps Node alive.
5. In the Fabric portal, open the app's SQL database (`CaldovaHomeLoans`) and run:

   ```sql
   INSERT INTO DeskRoles (id, email, desk_role) VALUES (NEWID(), '<your email>', 'manager');
   ```

6. Refresh the session. Check that `deskRole` is `manager`, HL-1103 is readable, and updating it is denied.
