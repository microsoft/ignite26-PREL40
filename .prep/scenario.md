# PREL40 scenario: Home Loan Operations Desk

**Session:** PREL40 - Build data-rich apps in Microsoft Fabric  
**Event:** Microsoft Ignite 2026  
**Audience:** Developers and data professionals building internal business applications.  
**Status:** Agreed lab scenario (reviewed 2026-10-16). The starter template, data generator, SQL seed, and samples are built (`src/home-loan-desk`, `data/`). The starter is deployed and its backend is validated on Fabric (see Preparation gates). Browser checks and the checkpoint snapshots are still pending.

## The story

Contoso Home Loans has enough data to report on its application pipeline, but its staff still move between reports, shared folders, and case notes to get work done. The operations desk can see a backlog without knowing which administrative steps are holding it up. Loan officers have to reconstruct a case before handing it to a colleague.

Attendees grow a working, secure Rayfin starter into **Home Loan Operations Desk**: an app that connects shared portfolio metrics from a semantic model to private case work, property photos, and an AI-assisted handoff brief.

**The central question:** Which applications are stalled, and what does the officer need to move them forward?

**The takeaway:** A semantic model gives an app consistent business metrics; Rayfin supplies the secure application behavior that lets people act on them.

This is not a loan underwriting system. It does not calculate creditworthiness, recommend approval or rejection, set interest rates, or offer financial advice. All applicants, files, and amounts are synthetic. AI summarizes authorized case material for a human; it never makes or executes a lending decision.

## Lab constraints

- **One identity per attendee.** Each attendee gets one Microsoft Entra identity from the lab environment and owns their own Fabric lab workspace. In the app, that identity is the **loan officer**. There is no second signed-in persona.
- **Copilot-only development.** All app code is created, changed, and explained through the GitHub Copilot app with the Rayfin plugin. Attendees don't hand-write code. They type commands only where a secret value must stay out of chat (`rayfin secret set`), and they work in the Fabric portal for the part 1 data modeling.
- **Pinned platform.** Every `@microsoft/rayfin-*` package and the Rayfin CLI are pinned to exactly **1.36.2**, with the lockfile committed. Upgrade only for a needed fix, and freeze about three weeks before the event.
- **Preview features.** Rayfin storage is experimental in 1.36, and Functions isn't available in every Fabric region or tenant. Both are hard preparation gates, not optional extras.

## The running example

Use the same cases throughout the lab instead of inventing new examples for each feature.

| Case | Planted situation | What it demonstrates |
| --- | --- | --- |
| **HL-1042: Alex Rivera** | Home-improvement loan of USD 85,000 for a kitchen renovation and rear extension. It has spent 11 calendar days in Document collection. Contractor quote and proof of income are Received; **Renovation plans / current-state photos** is Required. The case notes contain a planted contradiction: one note says the applicant emailed the plans on a given date, while a later note records that nothing arrived. Assigned to the attendee. | Find it in the stalled list, open it, upload the supplied plan and photo, see the checklist turn to Received, generate a brief that flags the contradiction, and save a human-reviewed task. |
| **HL-1088: Jordan Chen** | Home-purchase application with every checklist item Received, waiting for Internal review. Assigned to the attendee. | Optional AI contrast: the brief must report no missing items and suggest the internal review, never an approval. A complete checklist isn't a lending decision. |
| **HL-1103: Casey Brooks** | Stalled for 9 days in Document collection. Assigned to a fictional colleague, Morgan Lee (`morgan.lee@contoso.example`), who never signs in. | Access proof: the row exists in the app database, but the attendee can't retrieve it through the app or the API, even by ID. |

The seed also creates **six more cases assigned to the attendee**, spread across stages and including two more stalled cases, so My Cases looks like a real workload.

On `#/manager`, the officer sees that Document collection holds an unusually large share of stalled applications. HL-1042 is tagged **Assigned to you**. After uploading the missing plan and photo, the officer generates a brief and creates a task to review the newly received files.

**The final action is a saved administrative task, not an approved loan.** Uploading a file means it was received, not that its contents were verified.

## What attendees start with and finish with

The starter is a useful, secure, running application, not an empty project and not the finished lab hidden behind switches.

| Surface | Prepared in the starter template | Added during the lab with the GitHub Copilot app |
| --- | --- | --- |
| App shell | Universal-app base (React 19 + Vite) with Fabric sign-in, routing, responsive layout, loading/empty/error states, and protected static hosting. | Optional bonus customization. |
| Cases | `#/cases` (My Cases) and `#/cases/:caseNumber` detail: case summary, notes, tasks, and a checklist that records status only (Required/Received, no files). | Nothing; this is the baseline the other features build on. |
| Access control | Explicit row policies on every entity, scoped by the signed-in user's email. HL-1103 is seeded for Morgan. | Prove it: unauthenticated and cross-officer access are refused (checkpoint 3). |
| Portfolio (`#/manager`) | `connectors`, `analytics`, and `visuals` packs pre-applied (semantic-model query hook, Vega-Lite `VegaVisual`, `DataGrid`), with measure definitions and a visible **Connect your semantic model** state. No fake live charts, and no measures calculated in frontend code. | Semantic model connector, the four shared measures, branch/product filters, stage distribution, and a stalled list tagged **Assigned to you**. |
| Property photos | A checklist category marked "upload coming soon". No storage folder, upload UI, or sample files in the app. | Private Rayfin storage folder with an access rule, upload/list/download for the case, and the checklist turning to Received on a successful upload. |
| AI brief | A disabled **Generate handoff brief** panel. No Functions project and no secrets. | Server function, two secrets, Foundry model call, validated brief, and "Save as note" / "Create task". |
| Seeding | Auto-seed on first sign-in with a **Preparing data** progress screen, plus a `#/seed` page. | Nothing; the storage step adds no seeded files. |
| Monitoring | Nothing to build. | Tour the deployed app's App Metrics in Fabric. |

Routes use `HashRouter` (`#/cases/HL-1042`): static hosting documents no deep-link fallback, and hash routes work standalone and embedded in the Fabric portal. The header's **Open case** box reaches any case number from inside the portal.

Prepare the schema, components, seeder, and integration seams before the event. Attendees should not spend the 90-minute block inventing authentication, data schemas, or a design system.

## Data story

### Two data responsibilities

1. **Portfolio data (analytics):** a standalone SQL database in Fabric, populated in part 1. Its data replicates to OneLake, and a Direct Lake semantic model defines the shared measures. The app reads it through the semantic model connector.
2. **Application state (operations):** the Rayfin app's managed SQL database holds case workspaces, notes, tasks, and checklist items. Rayfin storage holds photo and plan files.

These are two databases with two jobs. Don't point Rayfin's managed schema at the source database. They're joined logically by the stable **case number** (for example `HL-1042`) and the source application UUID. No synchronization or distributed transaction is needed.

The portfolio is a dated, pseudonymous snapshot. Case work changes immediately in the app but does **not** update the snapshot or its model. Show the snapshot's as-of date on `#/manager`, separate from live case state. Feeding operational changes back into analytics is a production extension, not part of this lab.

### Source SQL database and semantic model

About **200 applications across 5 branches, 3 products (home purchase, refinance, home improvement), and 90 days**, in USD with calendar-day durations. Stages: Submitted, Document collection, Property assessment, Internal review, Offer issued, Closed, Withdrawn.

| Table | Grain and useful fields |
| --- | --- |
| `LoanApplication` | One row per application at the snapshot date: UUID, case number, branch/product IDs, submission date, current stage, stage-start date, requested amount, snapshot date. No applicant names, documents, or officer identities. |
| `Branch` | UUID, display name, region. |
| `LoanProduct` | UUID, category. |
| `Date` | One row per calendar date. |

A star model: Branch, LoanProduct, and Date filter LoanApplication one-to-many. Submission date is the active date relationship. Duration measures use the stored stage-start and snapshot dates.

| Required measure | Definition |
| --- | --- |
| **Open applications** | Count of applications not in Closed or Withdrawn. |
| **Requested amount in pipeline** | Sum of requested amounts of open applications. Requested volume, not revenue or a commitment. |
| **Average days in current stage** | Average calendar days between stage-start and snapshot dates, for open applications. |
| **Stalled applications** | Open applications with more than 7 days in their current stage. Seven days is a fictional operations threshold, not a lending rule. |

Define measures, names, and format strings once, in the model. The app queries them; it never recalculates them in JavaScript or asks the AI to.

**Part 1 path:**

- The attendee creates the SQL database `ContosoHomeLoans` in their workspace from the Fabric portal.
- They run one committed script, `data/portfolio-seed.sql`, in the query editor. It creates the four tables and inserts the deterministic rows.
- From the SQL database they choose **New semantic model**, which creates the default Direct Lake model over the SQL analytics endpoint.
- In web modeling they create the three relationships, mark `Date` as the date table, and add the four measures from DAX snippets in the instructions.
- They check the published reference values in the model's explore view.

Power BI Desktop and local tooling aren't required.

### Deterministic generator

One generator in `data/generator/` (fixed seed, stable UUIDs, explicit as-of date recorded in a manifest) produces both outputs:

- `data/portfolio-seed.sql`, committed and static. Attendees never run the generator.
- `src/home-loan-desk/packages/frontend/src/lab/fixtures.generated.ts`: the app fixtures (cases, notes, tasks, and checklist items for the attendee's cases; the HL-1103 case row only), using the same case numbers and UUIDs.
- `data/generator/manifest.json`: seed (4040), as-of date (2026-10-30), counts, and reference values.

**Reference values** at the snapshot date: **172** open applications, **USD 52,776,000** requested in the pipeline, **5.95** average days in current stage, **48** stalled applications. Document collection holds 31 of the 48 stalled applications. Branches: Seattle Downtown, Portland Pearl District, Denver Union Station, Chicago Loop, Boston Back Bay.

`node --test data/generator/*.test.mjs` checks determinism, the planted cases, and that committed outputs match the generator.

Never generate substitute data because a query, connector call, access check, or Foundry call failed. Show the real error.

### App-owned records

| Entity | Fields (indicative) | Access rule |
| --- | --- | --- |
| `CaseWorkspace` | `id` (source UUID), `case_number` (unique), `applicant_label`, `product`, `branch_name`, `stage`, `stage_started_on`, `snapshot_date`, `requested_amount` (snapshot attributes of this one case, labeled as such in the UI), `review_status`, `assigned_officer_email`, `created_by_email`, `created_at` | **Create:** `created_by_email` equals the caller's email (intake: anyone on the desk can log a case for a colleague). **Read/update/delete:** the stored `assigned_officer_email` equals the caller's email, so no one can take over a colleague's case. Update excludes `created_by_email`. |
| `CaseNote` | `id`, `case_id`, `officer_email`, `author_email`, `body`, `is_ai_generated`, `reviewed_by_email`, `created_at` | All actions: the stored `officer_email` equals the caller's email. Update excludes `case_id`. |
| `CaseTask` | `id`, `case_id`, `officer_email`, `title`, `due_date`, `status` (Open/Done) | Same as `CaseNote`. |
| `ChecklistItem` | `id`, `case_id`, `officer_email`, `category`, `status` (required/received), `received_on`, `received_via` (recorded/upload), `sort_order` | Same as `CaseNote`. |

Entities live in `packages/data/src/` (universal-app workspace layout), with browser-safe contracts in `packages/shared/src/index.ts`. Enumerations use kebab-case codes (for example `document-collection`, `renovation-plans-photos`) with display labels in the frontend. All rules use documented Rayfin policies: `@authenticated` with `claims.email.eq(item.<field>)`. Email is used rather than `claims.sub` because Morgan never signs in, so only Morgan's email is known.

**Data API constraint:** fields a policy reads must stay writable for that action (the data API rejects the configuration otherwise), so an officer could hand their own case or child record to someone else. Takeover is impossible because the policy checks the stored row, and the app never offers reassignment. Name this in the wrap-up together with the limit below.

**Known limit, named in the wrap-up:** a Rayfin rule checks one record at a time and can't look up a second record. It can confirm a new note carries the caller's email, but not that the note's case belongs to the caller. An attendee could therefore create a note stamped with their own email that points at HL-1103's ID. Nothing leaks, because Morgan sees nothing and HL-1103 stays hidden; it's a stray record only its author sees. The production fix is to create child records through a server function that checks case ownership first.

### Seeding

Rayfin has no supported scripted path to seed `@authenticated` entities, so seeding runs **in the browser, as the signed-in attendee**:

- **Auto-seed on first sign-in.** If the attendee has no visible cases, a **Preparing data** screen shows progress while the fixtures are created with deterministic UUIDs. HL-1042 and HL-1088 plus the six other cases are assigned to the attendee's email; HL-1103 is assigned to Morgan.
- **`#/seed` page:**
  - **Restore missing lab data** (default, never deletes): re-creates any missing fixture by ID. A primary-key conflict means the record already exists and counts as success. This covers HL-1103, which the attendee can't see.
  - **Reset my lab cases** (asks for confirmation first): deletes the attendee's own cases, notes, tasks, checklist items, and, once storage is connected, uploaded files, then re-seeds. The page states that HL-1103 isn't touched, because the attendee can't see it.
- The seed never marks HL-1042's photo/plan item as Received and never creates files.

## Feature demonstrations

### Access control and protected content (checkpoint 3)

The starter is secure by default; this checkpoint **proves** it with four observable checks, run through Copilot:

1. **Unauthenticated access is refused:** a request to the app's `/api/graphql` without a session is rejected.
2. **Protected hosting:** opening the hosted app URL in a private browser window requires Fabric sign-in (`staticHosting.assetAccess: protected`).
3. **The wrong officer is refused:**
   - In the Fabric portal, the attendee opens the app's managed SQL database and sees the HL-1103 row. As workspace owner, they manage the platform.
   - Through the app, both `#/cases/HL-1103` (or the **Open case** box) and a direct API query by its ID return no record.
   - The difference is the point: managing the platform isn't the same as being authorized in the app.
4. **No impersonation:** trying to save a note on the attendee's own case stamped with Morgan's email is rejected.

Copilot explains the existing policies, and the attendee reads them. Attendees write an access rule themselves in checkpoint 4, for the storage folder.

Keep the layers distinct in the narrative:

- Fabric item permission controls who can run the app.
- Protected static hosting controls who can fetch the frontend.
- Rayfin policies control private records.
- Semantic model permissions control the analytics (the connector is delegated-only, so queries run as the signed-in user).

**`#/manager` is a view, not a role.** It's a portfolio page for the same user, showing shared pseudonymous data. Real manager access (all cases, reassignment) is a production next step, not part of the lab.

### Portfolio analytics (checkpoint 2)

- Copilot adds a `fabric-semanticmodel` connector for the attendee's model and inspects its metadata before writing DAX.
- `#/manager` queries the four existing measures through the pre-installed `useSemanticModelQuery` hook, adds branch and product filters, shows a stage distribution with the visuals pack (`VegaVisual`, `DataGrid`), and lists stalled applications.
- The stalled list compares its case numbers with the attendee's visible cases:
  - Matches are tagged **Assigned to you** and link to the case.
  - Others show **Not assigned to you**, with no link.
- Values must match the part 1 reference values. Label the snapshot as-of date.
- Don't call the REST API directly, recalculate measures in JavaScript, or fall back to mock results.

### Property photos (checkpoint 4)

- Copilot enables storage (`services.storage.enabled: true`), runs `npx rayfin init ai-files` to install the version-matched storage skill, and declares a `case-photos` folder:
  - Allowed types: JPEG, PNG, and PDF; maximum 5 MB.
  - Typed fields: `case_id`, `officer_email`, `category`.
  - The attendee asks Copilot for the folder's access rule (`officer_email` equals the caller's email) and reviews it.
- The case detail page gets an upload panel and a list of the case's files with authorized download.
- The attendee uploads the supplied samples, `data/samples/HL-1042-floor-plan.pdf` and `data/samples/HL-1042-kitchen-current.jpg` (currently a stamped illustration; replace it with an AI-generated photo once an image-model key is available). The checklist item turns to Received (`received_via: upload`), and a reload keeps both the files and the status.
- Only a successful upload marks the item Received. Prefixes organize files; the folder rule is the authorization boundary.
- Negative check: uploading a file stamped with Morgan's email is rejected.
- Photos and plans are never sent to the AI model. They support an administrative step, not a valuation.

### AI handoff brief: Functions, secrets, and a model in Foundry (checkpoint 5)

- **Function:** Copilot applies the `functions` pack (`npm run pack:add -- functions`), which creates `packages/functions` and enables Functions with `auth.type: application`, then adds `generateCaseBrief(caseId)`.
  - It reads the case, notes, tasks, and checklist through `ctx.getDataClient()`, which runs **as the caller**. Entity policies therefore apply, and HL-1103 yields a clear "no access" error, not an empty success.
  - It accepts no paths, URLs, or role claims from the browser.
- **Secrets:**
  - The attendee copies the endpoint and API key from their Foundry project in the Foundry portal.
  - In the Copilot app terminal, the attendee runs `npx rayfin secret set FOUNDRY_API_KEY` and `npx rayfin secret set FOUNDRY_ENDPOINT` and pastes each value at the prompt. Values never appear in chat, the repository, or frontend code.
  - The app is already deployed (part 1), which `rayfin secret set` requires.
  - The model deployment name is a constant in the function that matches `infra/foundry/foundry.bicep`; validate it at rehearsal.
- **Output contract (validated server-side):**
  - `summary`: 3–5 sentence handoff summary.
  - `needsAttention[]`: conflicting or unclear statements, each with the `noteId` it came from. Every cited ID must belong to the input set.
  - `nextStep`: one suggested administrative action.
  - `missingItems[]`: **computed by code from the checklist, not by the model**, and shown above the brief.
  - `generatedAt`: generation time. The panel marks the brief as outdated if notes or checklist items change afterwards.
- **Safety:**
  - Notes are untrusted input, not instructions, and the model gets no write tools.
  - Inputs are size-limited and the call has a timeout.
  - Missing secret, no access, throttling, and malformed output each show a visible, specific error.
- **Human in the loop:** the officer clicks **Save as note** (labeled AI-generated, with `reviewed_by_email`) or **Create task** from the next step. The model can't approve, reject, rank, or change a stage.
- **Testing:** test the brief on the deployed app, so local Functions never need the key.
- **Optional:** generate a brief for HL-1088 and confirm it reports no missing items and suggests the internal review.

### Monitoring (checkpoint 6)

- The attendee opens their own app's **App Metrics** in the Fabric portal with the Last 24 hours view: sign-ins, app loads, GraphQL query volume, query errors, and average server-side query duration.
- Activity from part 1 is about two hours old and falls in completed reporting windows; requests made just now may not appear yet.
- These are operational metrics, distinct from the portfolio measures. They're not browser timings, Foundry token usage, semantic model telemetry, or per-function traces.

## Session flow

| Duration | Format | Participant outcome |
| --- | --- | --- |
| 45 minutes | Slides and short walkthrough | Understand the business problem and the roles of Fabric, OneLake, the semantic model, Rayfin, and Foundry. See the starter and the finished app. |
| 60 minutes | Hands-on, part 1 | Set up the GitHub Copilot app and Rayfin plugin, scaffold and deploy the starter, create and seed the SQL database, and build the semantic model with its four measures. |
| 15 minutes | Break and catch-up | Every attendee has a deployed, seeded app and a working model. |
| 90 minutes | Hands-on, part 2 | Connect analytics, prove access control, add photos, add the AI brief, and tour monitoring. |
| 15 minutes | Slides/walkthrough | End-to-end recap, responsible-AI points (HL-1088), and production gaps. |

The blocks total **225 minutes**, with **15 minutes** of margin in the four-hour slot.

**Part 1 split:**

| Minutes | Step |
| --- | --- |
| 15 | Copilot app and Rayfin plugin, `rayfin login`, scaffold from the pinned tag, and start `npm run rayfin:up`. The deploy runs while the attendee moves on. |
| 15 | Create `ContosoHomeLoans`, run `data/portfolio-seed.sql`, and look at the OneLake/SQL analytics endpoint. |
| 25 | New semantic model, relationships, date table, four measures, and reference values. |
| 5 | Checkpoint: open the hosted app, watch **Preparing data**, and see My Cases. |

Capacity, tenant settings, the lab identity, and the per-attendee Foundry resource are prepared by the lab environment; attendees don't administer a tenant.

**Part 2 checkpoints** (each ends with a redeploy):

| Minutes | Checkpoint | Visible proof |
| --- | --- | --- |
| 5 | 1. Orientation | Copilot tours the starter; HL-1042 opens from My Cases. |
| 20 | 2. Portfolio on `#/manager` | Four measures match part 1; filters work; HL-1042 is tagged **Assigned to you** in the stalled list. |
| 10 | 3. Access proof | All four checks behave as described. |
| 20 | 4. Property photos | Upload for HL-1042, checklist turns to Received, a reload keeps it, and the Morgan-stamped upload is rejected. |
| 25 | 5. AI handoff brief | A real Foundry call returns a validated brief flagging the planted contradiction; a reviewed task is saved. |
| 5 | 6. Monitoring | App Metrics show the attendee's earlier activity. |
| Bonus | Customize | One small UI change and a redeploy, for attendees with spare time. |

The checkpoints total 85 minutes, leaving 5 minutes of buffer, plus the bonus step. Functions deployment is the slowest step, so checkpoint 5 has the most time.

**Catch-up.** The repo holds code snapshots after checkpoints 2, 4, and 5. Checkpoints 3 and 6 change no code. Each instruction page ends with a **Catch up** prompt:

- Copilot replaces the project's code with the snapshot.
- It keeps `rayfin/.deployments.json`, `rayfin/.env`, the project name, and the attendee's semantic model connector settings.
- It then redeploys.

Redeploying to the same app item keeps the app's data. At checkpoint 5, the attendee sets the two secrets if they haven't already. Rehearse every catch-up path.

## Repository layout

| Path | Contents |
| --- | --- |
| `rayfin-template.yml` | Root catalog with one entry pointing to `src/home-loan-desk`. |
| `src/home-loan-desk/` | The starter template (npm workspace: `packages/shared`, `packages/data`, `packages/frontend`), with its own `rayfin-template.yml`. CLI-managed files (`.agents/skills/rayfin*`, `.mcp.json`, `rayfin/.lockfile.json`) are excluded by the root `.gitignore`; `rayfin init` reinstalls them. |
| `src/checkpoints/cp2-portfolio/`, `cp4-photos/`, `cp5-brief/` | Code snapshots used for catch-up and as the instructor solution. Not template entries. |
| `data/generator/` | `generate.mjs` (SQL, manifest, fixtures), `samples.mjs` (floor-plan PDF), `kitchen_illustration.py` (interim kitchen image), and their tests. |
| `data/portfolio-seed.sql` | Generated, committed source dataset. |
| `data/samples/` | HL-1042 floor plan (PDF) and current-state photo (JPEG), plainly labeled synthetic. |
| `infra/foundry/` | Per-attendee Foundry deployment for the lab environment. |
| `instructions/` | Attendee guidance, one page per part/checkpoint. |

Attendees scaffold with Copilot running:

```bash
npx rayfin init home-loan-desk -t https://github.com/microsoft/ignite26-PREL40.git#v1.0.0 --yes
```

The CLI installs the version-matched Rayfin skill and MCP configuration and preserves the template's `AGENTS.md`.

## Prompt A: build the starter template

**For the lab authors, in this repository.** Used to build the starter on 2026-10-16, except the checkpoint snapshots. Actual implementation notes: the base is the bundled `blankapp` (universal-app workspace) from `@microsoft/create-rayfin@1.36.2`; packs applied are `data-modeling`, `connectors`, `analytics`, and `visuals` (the 1.36.2 analytics pack ships no demo); routes are hash routes.

```text
Build the PREL40 starter template, "Home Loan Operations Desk", in
src/home-loan-desk, using .prep/scenario.md as the contract. It is an internal
app for loan officers at the fictional Contoso Home Loans that assists
administrative case processing, not lending decisions.

Start from the Rayfin universal-app template and apply the data-modeling,
connectors, analytics, and visuals packs, one at a time. Pin every
@microsoft/rayfin-* package and the Rayfin CLI to exactly 1.36.2 and commit the
lockfile. Use the installed, version-matched Rayfin skill and docs for every
API; do not guess. Report unsupported requirements instead of building
workarounds.

Build a working, secure, deliberately incomplete starter:
- Fabric sign-in, protected static hosting (assetAccess: protected), and
  hash routes #/cases, #/cases/:caseNumber, #/manager, and #/seed.
- Entities CaseWorkspace, CaseNote, CaseTask, and ChecklistItem with the exact
  access rules from scenario.md: case create when created_by_email equals the
  caller's email; case read/update/delete only for assigned_officer_email;
  update excludes created_by_email; children scoped by officer_email. Every
  entity has an explicit permission decorator.
- My Cases, case detail with notes, tasks, and a status-only checklist with a
  "record receipt" action. The photos/plans category shows "upload coming
  soon".
- #/manager with the analytics and visuals kits and a clear
  "Connect your semantic model" state. No connector, no measures in code, no
  fake data.
- A disabled "Generate handoff brief" panel. No Functions project and no
  secrets.
- Browser-side seeding as the signed-in user: auto-seed on first sign-in
  behind a "Preparing data" progress screen, and #/seed with a non-destructive
  Restore and a confirmed "Reset my lab cases". Deterministic UUIDs; treat a
  primary-key conflict as already present. Seed the attendee's eight cases and
  HL-1103 for morgan.lee@contoso.example. Never mark HL-1042's photos/plans item
  Received.

Also build data/generator (fixed seed, stable UUIDs, explicit as-of date in a
manifest) producing data/portfolio-seed.sql and the starter's fixture file
from the same source, with HL-1042, HL-1088, and HL-1103 exactly as described,
including HL-1042's planted note contradiction. Add the two synthetic samples
in data/samples. Add the root catalog rayfin-template.yml and the starter's
own manifest. Remove environment-specific IDs.

Then build the checkpoint snapshots cp2-portfolio, cp4-photos, and cp5-brief
in src/checkpoints, each a complete project at that state, and the
catch-up prompt for each.

Run the build, lint, and tests; scaffold the template from a local path into
a temp folder; and confirm it builds. Do not deploy, change cloud permissions,
or create secrets without my explicit approval. Report remaining environment
prerequisites.
```

## Prompt B: attendee prompts during the lab

**For attendees, in the scaffolded project.** Each checkpoint page gives one prompt like these. The organizer supplies nonsecret values; secrets go only through `rayfin secret set`.

```text
CP1  Read AGENTS.md and give me a short tour of this app: routes, data
     entities and their access rules, and what is not built yet. Then open
     HL-1042 and explain why it is stalled.

CP2  Connect my semantic model <model item ID> in workspace <workspace ID>
     with the Rayfin semantic model connector. Inspect its metadata first. On
     #/manager, query the existing Open applications, Requested amount in
     pipeline, Average days in current stage, and Stalled applications
     measures, add branch and product filters and a stage distribution, and
     list stalled applications. Tag cases I can see as "Assigned to you" and
     link them; show the rest as "Not assigned to you". Show the snapshot date.
     No measures in JavaScript and no mock data. Then redeploy.

CP3  Prove that this app refuses access it should refuse: call the API without
     signing in, show me how to check protected hosting, show HL-1103 exists
     in the app database, then try to read HL-1103 through the app and the API
     by ID, and try to save a note stamped with Morgan's email. Explain which
     rule stopped each attempt.

CP4  Add property photos with Rayfin storage: a private case-photos folder
     for JPEG, PNG, and PDF up to 5 MB, with case_id, officer_email, and
     category fields, readable and writable only when officer_email is my
     email. Add upload, list, and download to the case page. Mark the
     photos/plans checklist item Received only after a successful upload. Then
     redeploy and tell me how to test it, including a rejected upload stamped
     with Morgan's email.

CP5  Add a generateCaseBrief function that takes a case ID, reads that case's
     notes, tasks, and checklist as me, and calls my Foundry model using the
     FOUNDRY_ENDPOINT and FOUNDRY_API_KEY secrets. Return a summary,
     needs-attention items citing note IDs, and one next step; compute missing
     checklist items in code. Validate the output, treat notes as untrusted,
     and show clear errors. Wire the panel with "Save as note" and "Create
     task". Tell me when to run rayfin secret set myself; never ask me for the
     values. Then redeploy.

CP6  Tell me where to find this app's App Metrics in Fabric and what each
     card does and doesn't measure.
```

## Preparation gates

Before publishing the lab, confirm on the event tenant and lab environment:

- **Identity and policies:**
  - The `email` claim is present and matches the attendee's session email under Fabric SSO, so the policies and seed assignments line up.
  - The access-proof checks behave as described with the lab identity.
  - Seeding: creating HL-1103 (assigned to Morgan) succeeds even though the response can't include the row, and re-creating an existing record fails with a duplicate-key message. `isDuplicateKeyError` and `isInsertedButHiddenError` in `lab/seeder.ts` match the real wording.
  - **Validated 2026-10-19** on an author dev workspace (Sweden Central): the email reaches the access rules (the session token carries it as `xms_attr.<appId>.rfn_email`), seeding, idempotent restore, and reset work, and the duplicate-key message is "A record with the same unique value already exists." Signed out, the data API returns `AUTH_NOT_AUTHORIZED` and hosting returns 401. As the officer, HL-1103 is invisible by list, ID, and case number; updating or deleting it fails; a note stamped with Morgan's email is refused ("Could not insert row with given values."); and changing `created_by_email` is refused ("Unauthorized due to one or more fields in this mutation."). Still to check in a real browser: the sign-in flow, the Preparing data screen, and the UI states.
- **Platform availability:**
  - Region and capacity support Fabric Apps, Functions, and experimental Rayfin storage on 1.36.2.
  - The tenant settings needed for Fabric Apps, SQL database, and semantic model queries are on.
  - If storage or Functions is unavailable, revise the lab explicitly; don't substitute browser storage, public files, or mocks.
- **Data path:**
  - "New semantic model" from the SQL database produces a Direct Lake model that the web modeling view and the Rayfin connector can query.
  - The reference measure values are reproducible from `data/portfolio-seed.sql`.
- **Foundry:**
  - The per-attendee resource from `foundry.bicep` deploys in the lab region with enough quota.
  - Attendees can read the endpoint and key in the Foundry portal.
  - The deployed function reaches the model.
- **Timing and recovery:**
  - Part 1 provisioning (first `rayfin up`) fits the tools block.
  - The Functions deploy fits checkpoint 5.
  - Every catch-up snapshot redeploys cleanly onto an app that has seeded data.
- **Monitoring:** App Metrics show part 1 activity by checkpoint 6.
- **Release:** after the freeze, tag `v1.0.0` and complete a full rehearsal in the lab environment.

The lab is complete when an attendee can:

- see the four shared measures on `#/manager`;
- open HL-1042 from the stalled list and upload its missing plan and photo;
- obtain a real, validated Foundry brief and save a reviewed task that survives a reload;
- show that unauthenticated and cross-officer access to HL-1103 is refused;
- read their app's operational metrics without overstating what they cover.

## Production gaps for the wrap-up

- A real manager role (all cases, reassignment) needs a trusted role source and rehearsed role claims; the lab's `#/manager` is only a view.
- Child records are linked to cases without a cross-record check, and an owner could reassign their own records; route writes through a server function that verifies case ownership and blocks reassignment.
- Keyless Foundry access through the app identity (`AudienceType.AzureAI`) instead of an API key.
- Per-officer analytics would need semantic model row-level security, which is separate from app policies.
- Feeding case state back into the analytics snapshot.
- Document intelligence, retention, malware scanning, and compliance workflows.

Production lending compliance, credit checks, automated underwriting, digital signatures, external messaging, and OCR are outside this lab. The sample isn't a production banking reference architecture.

## Technical references

Reviewed on 2026-10-16 against Rayfin 1.36.2 docs. Public documentation is preview guidance; the pinned SDK and the rehearsed event environment decide the lab's actual behavior.

- [Fabric Apps overview](https://learn.microsoft.com/en-us/fabric/apps/overview)
- [Authentication for Fabric Apps](https://learn.microsoft.com/en-us/fabric/apps/authentication)
- [Data permissions](https://learn.microsoft.com/en-us/fabric/apps/data-permissions) and [Rayfin permissions and row-level security](https://rayfin.ai/docs/data/permissions)
- [Rayfin seeding data](https://rayfin.ai/docs/data/seeding) (no scripted path for authenticated entities)
- [Rayfin storage](https://rayfin.ai/docs/storage) (experimental)
- [Rayfin semantic model connector](https://rayfin.ai/docs/connectors/semantic-models)
- [Functions](https://learn.microsoft.com/en-us/fabric/apps/functions) and [Rayfin function secrets](https://rayfin.ai/docs/functions/secrets)
- [Protected static hosting](https://learn.microsoft.com/en-us/fabric/apps/hosting)
- [App Metrics](https://learn.microsoft.com/en-us/fabric/apps/app-metrics)
- [Author and distribute Rayfin templates](https://learn.microsoft.com/en-us/fabric/apps/author-templates)
- [Awesome Rayfin gallery, universal-app template](https://github.com/microsoft/awesome-rayfin/tree/main/templates/universal-app)
- [SQL database in Fabric](https://learn.microsoft.com/en-us/fabric/database/sql/overview)
