# PREL40 scenario: Home Loan Operations Desk

**Session:** PREL40 - Build data-rich apps in Microsoft Fabric  
**Event:** Microsoft Ignite 2026  
**Audience:** Developers and data professionals building internal business applications.  
**Status:** Proposed lab scenario and template brief, not an implemented app or a slide outline.

The confirmed direction is an internal workspace for loan officers and operations managers. The fictional organization, dataset, and implementation boundaries below are proposals for that story.

## The story

Contoso Home Loans has enough data to report on its application pipeline, but its staff still move between reports, document folders, and case notes to get work done. Managers can see a backlog without knowing which administrative steps are holding it up. Loan officers have to reconstruct a case before handing it to a colleague.

Attendees turn a working but deliberately incomplete Rayfin template into **Home Loan Operations Desk**: an app that connects shared portfolio metrics to private case work, supporting documents, and an AI-assisted handoff brief.

**The central question:** Which applications are stalled, and what information does the team need to move their administrative processing forward?

**The takeaway:** A semantic model gives an app consistent business metrics; Rayfin supplies the application behavior that lets people act on those insights.

This is not a loan underwriting system. It does not calculate creditworthiness, recommend approval or rejection, set interest rates, or offer personalized financial advice. All applicants, documents, and loan amounts are synthetic. AI summarizes authorized case material for a human; it never makes or executes a lending decision.

## The running example

Use the same three cases throughout the lab rather than inventing new examples for each feature.

| Case | Planted situation | What it demonstrates |
| --- | --- | --- |
| **HL-1042: Alex Rivera** | A fictional USD 320,000 home-purchase application has spent 11 calendar days in document collection. Income and purchase-agreement documents are recorded as received, but proof of deposit is missing. Assigned to the participant's loan-officer identity. | Find a stalled case, inspect its checklist, upload the missing synthetic document, generate a handoff brief, and save a human-reviewed follow-up task. |
| **HL-1088: Jordan Chen** | All required documents are present; the case is awaiting an internal document review. | A complete checklist must not be presented as a lending approval. The AI must not invent a missing-document request. |
| **HL-1103: Casey Brooks** | A case assigned to a different loan officer. | The first officer cannot retrieve its private case data, documents, or AI brief by changing an ID or calling an API directly. An authorized manager can access it. |

The manager sees that document collection contains an unusually large share of stalled applications. The officer opens HL-1042 and understands the specific missing item. After attaching the supplied proof-of-deposit sample, the officer generates a brief and creates a task to review the newly received document.

**The final action is a saved administrative task, not an approved loan.** Uploading a file means a document was received, not that its contents were verified.

## What attendees start with and finish with

The template must be a useful running application, not an empty project and not the finished lab hidden behind switches.

| Surface | Prepared in the starter template | Added or completed with the GitHub Copilot app agent |
| --- | --- | --- |
| App shell | Fabric sign-in, navigation, responsive layout, reusable charts and grids, loading/empty/error states. | A focused customization, such as a branch filter or a stalled-case worklist. |
| Case workspace | Typed case entities, an assigned-case list, case details, a deterministic document checklist, and persistent notes/tasks. A least-privilege owner-only baseline. | Officer/manager RBAC, manager-only assignment changes, and access-denied experiences. |
| Portfolio page | Layout and analytical components based on the Rayfin `dataapp` patterns. A visible "Connect your semantic model" state, not fake live charts. | Semantic model connector, shared measures, filters, and drill-through into authorized cases. |
| Documents | Metadata model, upload-panel layout, synthetic text files, and clear extension points. Upload/download actions remain unavailable until connected. | Real Rayfin storage upload and authorized download, metadata persistence, and checklist updates. |
| AI brief | A disabled brief panel, a typed output contract, and a scaffolded Functions project without a working Foundry call. | Server-side case retrieval, secret-store integration, the Foundry model call, source references, and human review. |
| Deployment | Known-good project configuration, protected hosting baseline, pinned dependencies, and setup instructions. | Deploy the completed app, check app access, and inspect platform metrics. |

Prepare the schema, components, sample files, and small integration seams before the event. Attendees should not spend the 90-minute app block inventing authentication, data schemas, or a design system.

## Data story

### Two data responsibilities

Keep the analytical source and the app's working records explicit:

1. **Existing portfolio data:** create a standalone SQL database in Fabric and populate it before building the semantic model. Its data replicates into OneLake. The semantic model supplies portfolio measures to the app through the semantic model connector.
2. **Application state:** the Rayfin app's managed SQL database holds private case workspaces, notes, tasks, and document metadata. File contents go into Rayfin storage. The app writes through its generated APIs; the AI function uses caller-authorized access to retrieve case material.

These are two database responsibilities, not two names for the same database. Do not point Rayfin's managed-schema service at the standalone source database. Connect them logically through stable application IDs; no distributed transaction or automatic cross-database synchronization is required.

The portfolio is a dated, pseudonymous snapshot. Private case work changes immediately in the app, but those changes do **not** automatically update the source snapshot or its semantic model. Show the portfolio's as-of date and keep it distinct from the live document checklist. Feeding operational changes back into analytics is a possible extension, not a hidden requirement of this lab.

### Source SQL database and semantic model

Target roughly **200 applications across 5 branches, 3 loan products, and 90 days**. Use one currency, USD, and calendar-day durations. Keep the model small enough to understand in a single lab block.

| Table | Grain and useful fields |
| --- | --- |
| `LoanApplication` | One row per application at the dataset's as-of date: stable UUID, case number, branch/product IDs, submission date, current stage, stage-start date, requested amount, snapshot date. No document text or borrower financial profile. |
| `Branch` | One row per branch: UUID, display name, region. |
| `LoanProduct` | One row per product: UUID and category, such as home purchase, refinance, or home improvement. |
| `Date` | One row per calendar date for submission-date filtering and grouping. |

Use a simple star model: Branch, LoanProduct, and Date each filter LoanApplication through one-to-many relationships. Submission date is the active date relationship. Use the stored stage-start and snapshot dates for duration measures; do not add a second date-role exercise to the core lab.

| Required measure | Definition |
| --- | --- |
| **Open applications** | Count of applications not in Closed or Withdrawn at the snapshot date. |
| **Requested amount in pipeline** | Sum of requested amounts for those open applications. This is requested lending volume, not revenue or an approved commitment. |
| **Average days in current stage** | Average calendar-day difference between stage-start date and snapshot date for open applications. |
| **Stalled applications** | Open applications with more than 7 calendar days in their current stage. Seven days is a fictional operations threshold, not a lending rule. |

Define measures, names, and number formats once in the semantic model. Copilot queries those measures rather than recreating them in JavaScript or asking the AI model to calculate them. A stage distribution is a snapshot, not a conversion funnel or a historical trend.

Use the lab-validated browser modeling path through the SQL analytics endpoint and the replicated OneLake data. Freeze the supported storage mode in the final lab instructions after rehearsal; do not require Power BI Desktop or make attendees choose a mode during the exercise.

### App-owned records and storage

| Entity | Purpose |
| --- | --- |
| `CaseWorkspace` | Stable link to the source application UUID, synthetic applicant label, assigned user ID, and administrative review status. No duplicated portfolio-measure calculations. |
| `CaseNote` | Case-linked notes with author and timestamp. A saved AI brief is explicitly labeled AI-generated and records who reviewed it. |
| `CaseTask` | A case-linked administrative action with owner, due date, and Open/Done state. |
| `CaseDocument` | Case ID, document category, private storage object ID, original filename, content type, size, upload time, and uploader. File bytes are not stored here. |

Keep required document categories in the prepared checklist configuration. Determine what is missing from that configuration and the received-document records, not from an AI guess. Carry case authorization through every child entity and file operation; a document ID alone never grants access.

For the core lab, use clearly labeled synthetic `.txt` documents of at most 100 KB each. This makes storage and source-grounded AI demonstrable without adding OCR, scanned PDFs, document intelligence, or an indexing service. PDFs and richer document processing are optional future work.

### Repeatable sample generation

Provide one deterministic generator, with stable IDs, a fixed random seed, and an explicit as-of date recorded in a manifest. It produces both the source SQL dataset and matching app-case fixtures, including the three canonical cases.

- **Before part 1:** the setup command creates/populates the standalone SQL database without depending on a running Rayfin frontend or a semantic model. Provide a preseeded recovery checkpoint if provisioning runs long.
- **When the app starts:** use the same fixture contract to initialize an empty participant app database. Bind fictional officer assignments to the supplied lab identities through a trusted setup path; do not invent identity claims.
- **When regeneration is needed:** expose the prepared generator through an explicit, authorized lab-setup action. Scope it to the participant's lab data; make repeated runs idempotent and do not overwrite notes, tasks, or uploaded documents.
- Seed the baseline received documents into private storage once storage is connected. Leave HL-1042's proof-of-deposit fixture on the participant's machine for the upload exercise.
- Never generate substitute data because a SQL query, connector request, authorization check, or Foundry call failed. Show the actual error.

## Feature demonstrations

### RBAC, app access, and protected content

Use two application roles plus a negative-test identity:

| Capability | Loan officer | Operations manager | Signed-in user without an app role |
| --- | --- | --- | --- |
| View the shared pseudonymous portfolio | Yes, with model access | Yes, with model access | No |
| Read private cases, notes, tasks, and documents | Assigned cases only | All lab cases | No |
| Add notes/tasks, upload documents, generate briefs | Assigned cases only | All lab cases | No |
| Reassign a case | No | Yes | No |
| Grant themselves a role | No | No | No |

Application roles come from a trusted, lab-provisioned identity/role mapping. They are not Fabric workspace roles and must not be selected by a client-side dropdown. A manager is not automatically an app deployer or Fabric administrator.

Demonstrate the layers separately: Fabric item permission controls who can run the app; protected static hosting restricts retrieval of frontend assets; backend role/row/field policies control private records and operations. An officer must not change an assignee field to take over another case.

For this lab, portfolio data is deliberately shared and pseudonymous; officer-specific analytics are **not** claimed. Keep applicant labels, documents, and notes out of the semantic model. Semantic model permissions and any RLS are separate from Rayfin policies. If the final design requires private per-officer analytics, explicitly add and rehearse semantic-model RLS rather than assuming it inherits app RBAC.

Use actual consumer identities for the permission demonstration, not only the workspace owner/contributor. Verify direct API and private-file access as well as hidden or disabled UI controls.

### Storage

The officer attaches HL-1042's supplied proof-of-deposit sample. The app stores it privately, persists its metadata, and updates the live checklist to Received. Reloading the page preserves the attachment. The officer can retrieve that file but not HL-1103's files.

Validate file size/type, authorize the case before reading or writing bytes, and do not expose permanent public URLs. Failures must not mark a document as received or leave a metadata entry pointing at a nonexistent object. Reassignment must change access to the case's documents as well as its rows.

Storage is an explicit requirement of this scenario. Its deployed API and authorization behavior must be verified on the lab's pinned Rayfin version; the public sources below are not enough to specify exact storage calls. If it is unavailable in the event environment, surface that blocker before publishing the lab. Do not quietly replace it with local browser storage or public static files.

### Functions + secret store + a model in Foundry

Add a server-side **Generate case brief** function. It accepts a case ID, verifies the caller's access, and retrieves the authorized case notes, task context, checklist, and bounded text from that case's stored documents. It does not accept arbitrary storage paths or external URLs from the browser.

The function calls the organizer-provided model deployment in Microsoft Foundry. For the secret-store demonstration, use a server-only `FOUNDRY_API_KEY`; configure the endpoint and deployment name separately. Use the existing `foundry.bicep` as the starting deployment asset, but validate the actual model, region, endpoint, and quota before the event. Do not hard-code a model identifier into the app template.

Deploy the app before configuring its remote secret. Use the same secret name in local and deployed function environments, never put the value in Copilot prompts or frontend environment variables, and fail clearly if it is missing. Keep API-key authentication distinct from Rayfin's platform-provided resource-token path; do not assume an owner's external-resource permissions authorize access to every borrower's case.

The brief contains:

- A concise administrative summary with references to the supporting document/note IDs.
- Missing checklist items, computed by application code and presented separately from model-generated prose.
- Uncertainties or conflicting statements that require a person to check the source.
- An optional draft follow-up message, never sent automatically.

Treat document text as untrusted input, not instructions. Give the model no write tools. Validate the output shape and that cited IDs belong to the authorized input set; still require human review for factual accuracy. A failure or refusal must remain visible, not become a canned success response. Bound request size and execution time, and show when a brief was generated so later document changes cannot masquerade as already-reviewed material.

The officer reviews the brief and explicitly saves it as a note or creates a task. The model cannot approve, reject, rank applicants by creditworthiness, or change an application stage on its own. Checklists track receipt and administrative completeness, not document authenticity or lending eligibility.

### Monitoring

Close the loop by inspecting the deployed app's built-in App Metrics: sign-ins, app loads, GraphQL query volume, query errors, and average server-side query duration. Distinguish these operational metrics from the home-loan metrics in the semantic model.

Prepare activity in the presenter's reference app before the last completed UTC hour. Current App Metrics exclude incomplete reporting intervals, so a request made on stage need not appear immediately. Use the Last 24 hours view and explain the timestamps. Do not present these cards as browser timings, Foundry token usage, semantic-model query telemetry, or individual function traces. If showing function logs separately, use only the supported surface and redact document text, prompts, secrets, and personal data.

## Session flow

| Duration | Format | Participant outcome |
| --- | --- | --- |
| 45 minutes | Slides and short walkthrough | Understand the business problem and the distinct roles of Fabric, OneLake, the semantic model, Rayfin, and Foundry. See the starter versus the finished reference app. |
| 60 minutes | Hands-on, part 1 | Set up the GitHub Copilot app and Rayfin plugin, create/seed the SQL database, create the semantic model, and verify the four measures. |
| 15 minutes | Break and catch-up | Reach the same model-ready checkpoint. |
| 90 minutes | Hands-on, part 2 | Complete the story-specific app template with Copilot: connector, role policies, storage, AI brief, customization, and deployment. |
| 15 minutes | Slides/walkthrough | Revisit the case end to end, demonstrate access denial and App Metrics, and explain the production gaps. |

The listed blocks total **225 minutes (3h45)**, including the break. Reserve another **15 minutes** for recovery and overrun within a four-hour slot.

Suggested part 1 split: tools/access 15 minutes, SQL creation/seed and OneLake inspection 15, model relationships/measures 25, checkpoint 5. Capacity, tenant switches, test identities, and Foundry resources must already be prepared; attendees do not administer a tenant in this block.

Suggested part 2 checkpoints:

| Time | Checkpoint | Visible proof |
| --- | --- | --- |
| 10 minutes | Open the starter and map the case | Sign-in succeeds, assigned cases and notes persist, and unimplemented features are clearly labeled. |
| 20 minutes | Connect portfolio analytics | The four measures match part 1; branch/product filters work; select HL-1042 from a stalled-case list. |
| 15 minutes | Add role-based behavior | Officer and manager have different backend-enforced access; the cross-case negative test fails safely. |
| 15 minutes | Connect document storage | Upload proof of deposit, reload, retrieve it, and confirm another officer cannot retrieve it. |
| 20 minutes | Add the Foundry brief | A real function call returns a source-linked brief; a human saves a note/task. Missing-secret and unauthorized-case errors are handled. |
| 10 minutes | Customize and deploy | Complete one small UI change, deploy, and open the protected app as a consumer. |

This timing assumes prepared components and integration seams, not unconstrained app generation. Provide a known-good recovery checkpoint after each feature, and rehearse the complete sequence with the pinned versions. Monitoring can be demonstrated on the presenter's previously exercised app in the wrap-up.

## Prompt A: prepare or adapt the starter template

**For the lab authors, in the intended Rayfin app-template repository, not this presentation repository.** If a story template already exists, adapt it rather than scaffolding over it. The template URL and implementation have not been inspected as part of this scenario draft.

```text
Prepare the starter template for PREL40, "Build data-rich apps in Microsoft
Fabric", at Microsoft Ignite 2026. Use the attached scenario.md as the lab
contract. The app is Home Loan Operations Desk, an internal workspace for
loan officers and operations managers at the fictional Contoso Home Loans.
It assists administrative case processing, not loan eligibility decisions.

First inspect the existing repository, AGENTS.md, and the installed,
version-matched Rayfin skill/docs through the Rayfin plugin. Reuse an existing
story template where present. Otherwise start from the supported dataapp
foundation. Preserve CLI-managed agent context and authentication. Identify
unsupported requirements before building workarounds. Do not guess SDK APIs.

Create a working, deliberately incomplete starter:
- Fabric sign-in, protected-hosting configuration, and a responsive shell
  with Portfolio and My Cases pages and a case-detail workspace.
- Rayfin-managed CaseWorkspace, CaseNote, CaseTask, and CaseDocument entities.
  Provide functional assigned-case browsing, persistent notes/tasks, and a
  deterministic document checklist. Start with server-enforced owner-only
  access; do not grant all authenticated users access to all cases.
- Reusable analytical visuals/grids and an explicit unconnected Portfolio
  state. Do not implement the semantic model connector or duplicate the four
  business measures in frontend code.
- A document panel and synthetic text fixtures, but no working upload or
  download integration yet. Do not ship fake links or public document assets.
- A scaffolded Functions project, typed brief-result contract, and disabled
  AI panel, but no implemented Foundry call or secret retrieval yet.
- Clear, small extension points for the officer/manager RBAC exercise,
  private storage, the semantic connector, and the Foundry brief.

Prepare repeatable setup data separately from those unfinished features:
- About 200 pseudonymous applications, 5 branches, 3 products, and 90 days in
  a standalone Fabric SQL database: LoanApplication, Branch, LoanProduct,
  and Date. Use stable UUIDs, a fixed seed, USD, and an explicit as-of date.
- Source setup must run before the app/model exists. Generate matching
  app-case fixtures from the same generator and bind assignment IDs to the
  supplied lab identities through a trusted setup path.
- Include HL-1042, stalled for 11 days and missing proof of deposit;
  HL-1088, documents present but awaiting human review; and HL-1103, assigned
  to a different officer. Package only plainly synthetic text documents.
- Support explicit, scoped, idempotent lab-data initialization without
  overwriting participant work. Never seed to hide a connection failure.
- Keep the source portfolio snapshot distinct from live case notes, tasks,
  and document metadata. Explain that app changes do not refresh the source.

Package the starter using the supported Rayfin custom-template manifest.
Pin the tested dependency/template versions, remove environment-specific
IDs, and document prerequisites and the four model measures from scenario.md.
Supply small checks and expected results for each integration checkpoint.
Do not ship the completed exercises as dormant implementations or a single
"enable everything" switch; keep any instructor solution separate.

Inspect the supported role-assignment and storage authorization mechanisms
before documenting them. Missing support is a blocker to report, not a reason
to emulate RBAC in the browser or replace private storage with public files.
Keep secrets out of the repo, frontend, prompts, generated fixtures, and logs.

Show a concise plan identifying what exists and what must change, then build
only this starter. Run the existing build and relevant checks, test a fresh
scaffold, and report remaining lab-environment prerequisites. Do not implement
the attendee feature work, change cloud permissions, or deploy resources
without the author's explicit approval.
```

## Prompt B: complete the app during the lab

**For attendees, in the project created from the published starter.** The organizer supplies the template's pinned location, workspace/model IDs, lab personas, and nonsecret Foundry configuration. Secret values go through the prescribed secure setup, not into this prompt.

```text
Help me complete the PREL40 Home Loan Operations Desk lab using the GitHub
Copilot app and Rayfin plugin. This project is the prepared story template.
Do not rebuild it or implement the whole lab in one pass.

Read AGENTS.md, the lab instructions, and the installed version-matched
Rayfin skill/docs. Inspect the current implementation and identify the next
unfinished checkpoint. Preserve working features, authentication, generated
types, and the template's components. Explain a short plan for that checkpoint,
implement it, run the relevant checks, and stop before the next checkpoint.
Ask for genuinely missing nonsecret configuration; never invent IDs or APIs.

The story is administrative home-loan case processing using synthetic data.
The officer works assigned cases; the manager can work all lab cases and
reassign them. No role can be self-selected or self-granted. AI is a read-only
assistant, not an underwriter, credit scorer, or financial adviser.

Work through these checkpoints when I ask you to continue:

1. Baseline: verify Fabric sign-in, assigned-case browsing, and note/task
   persistence. Use the prepared initializer only for missing lab fixtures;
   preserve existing work. Find HL-1042 and explain the incomplete features.

2. Analytics: add the semantic model connector using the supplied model.
   Inspect its metadata before writing DAX. Query its existing Open
   applications, Requested amount in pipeline, Average days in current stage,
   and Stalled applications measures. Reuse model format strings and the
   template visuals. Add branch/product filters and a bounded stalled-case
   list linking to cases. Compare results with the part 1 reference values.
   Use one connector data path; do not call the REST API directly, calculate
   substitute measures in JavaScript, or fall back to mock query results.
   Label the portfolio snapshot date separately from live case state.

3. RBAC: use the prepared trusted role mapping and supported backend policies
   for officer-assigned access, manager-wide access, and manager-only
   reassignment. Protect child records and assignment fields as well as case
   rows. Deny users without an app role. Keep Fabric item permissions, app
   roles, and semantic-model permissions distinct. The pseudonymous portfolio
   is shared; it does not imply access to private case material. Verify the
   real consumer identities and direct cross-case requests, not a UI role
   switch or only the workspace owner's session.

4. Storage: implement real private Rayfin storage using the installed SDK.
   Seed the baseline received-document fixtures through the authorized lab
   setup. Let me upload the supplied synthetic proof-of-deposit text file
   for HL-1042, persist its metadata, update Received status, reload, and
   retrieve it. Enforce the prepared 100 KB text-only limit and case access
   on file and metadata operations. Do not mark a failed upload as received.
   Verify HL-1103's private bytes cannot be retrieved by the first officer.
   Receiving a document does not verify its authenticity or approve a loan.

5. AI brief: implement a typed server-side function taking a case ID. Resolve
   caller-authorized notes, checklist, task context, and stored text on the
   server. Do not trust client-supplied role claims, document paths, or URLs.
   Use FOUNDRY_API_KEY from the function secret store with the supplied model
   deployment/endpoint; never expose or request the key in chat or frontend
   code. Ensure the app is deployed before remote-secret setup.
   Call the actual Foundry model with bounded inputs and no write tools.
   Return a source-linked administrative summary, explicit uncertainties,
   and an optional draft follow-up. Compute missing checklist items in code.
   Treat documents as untrusted data, validate the output and source IDs,
   and require human review before saving a note or creating a task. Show
   generation time and invalidate stale briefs when case material changes.
   Handle missing secrets, access denial, throttling, and malformed output
   explicitly. No automatic messages, status changes, approval, or rejection.

6. Finish: make one small customization I choose, run the build and relevant
   checks, then guide deployment to my supplied Fabric workspace. Keep static
   assets protected and check the hosted app with a consumer account. Explain
   where App Metrics are found and that they use completed reporting windows,
   not instant per-request traces or Foundry usage metrics. Obtain my approval
   before changing app sharing or other cloud permissions.

Do not change lending outcomes, add OCR/search infrastructure, broaden access
to make a test pass, expose documents publicly, or replace a failed integration
with successful-looking sample output. Report blockers clearly. Start with the
next unfinished checkpoint only.
```

## Preparation gates and completion criteria

Before publishing the lab, confirm:

- The template repository/ref, tested Rayfin version, GitHub Copilot app/plugin setup, and exact starter-to-solution checkpoints. None is established by this document alone.
- Fabric capacity/region support, workload enablement, SQL creation rights, semantic-model Execute Queries tenant setting, and required model Build/Read permissions.
- A supported and rehearsed role-assignment path, private storage behavior, and real consumer identities for the positive and negative access tests. Include a user without an app role.
- Foundry deployment availability and class-wide quota, secure credential delivery, local Functions prerequisites, and successful calls from the deployed app, not just the author's machine. Account for the documented Functions publishing cooldown in checkpoints.
- SQL/OneLake replication readiness, the chosen model storage mode, reproducible reference measure values, and a clearly explained snapshot boundary.
- A pre-exercised reference deployment for App Metrics and known-good recovery checkpoints. If a required preview feature is missing, revise the lab explicitly before the event.

The finished lab is demonstrated when an attendee can query the four shared measures, open HL-1042, attach its missing synthetic document, obtain a real source-linked Foundry brief, and save a human-reviewed task that survives reload. A second identity proves private case/file/function access is denied, while a manager can work across lab cases. The deployed frontend is protected, and the presenter can explain the app's operational metrics without overstating their scope.

Production lending compliance, real customer onboarding, credit checks, automated underwriting, digital signatures, external messaging, document OCR, and production-grade retention/malware-scanning workflows are outside this lab. The sample is not a production banking reference architecture.

## Technical references

Reviewed on 2026-10-15. Public documentation is preview guidance; the pinned SDK and the rehearsed event environment determine the actual lab APIs and availability.

- [Fabric Apps overview](https://learn.microsoft.com/en-us/fabric/apps/overview)
- [Semantic model connector and data app template](https://learn.microsoft.com/en-us/fabric/apps/data-apps-template)
- [Connectors and supported read/write operations](https://learn.microsoft.com/en-us/fabric/apps/connectors)
- [SQL database in Fabric and OneLake replication](https://learn.microsoft.com/en-us/fabric/database/sql/overview)
- [Data permissions and role policies](https://learn.microsoft.com/en-us/fabric/apps/data-permissions)
- [Functions](https://learn.microsoft.com/en-us/fabric/apps/functions) and [external-resource identity](https://learn.microsoft.com/en-us/fabric/apps/functions-connect-external-resources)
- [Function secrets](https://learn.microsoft.com/en-us/fabric/apps/manage-function-secrets)
- [Protected static hosting](https://learn.microsoft.com/en-us/fabric/apps/hosting)
- [App Metrics, scope, and reporting windows](https://learn.microsoft.com/en-us/fabric/apps/app-metrics)
- [Author and distribute Rayfin templates](https://learn.microsoft.com/en-us/fabric/apps/author-templates)
