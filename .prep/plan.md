# PREL40 lab instructions plan

Overview of the hands-on pages in `docs/instructions/`, based on [scenario.md](scenario.md). Pages 00–06 are part 1 (data and deployed starter), pages 07–15 are part 2 (building the Home Loan Operations Desk). Checkpoint pages that change code end with a catch-up prompt.

Legend: ✅ done, 🚧 in progress, ⬜ not started.

- ✅ `00-intro.md`: Sign in to the VM and get the lab overview: Caldova Home Loans, stalled applications, and what you'll build.
- ✅ `01-setup.md`: Sign in to GitHub, the GitHub Copilot app, and Fabric, then create the `PREL40-homeloans` workspace.
- ✅ `02-create-sql-database.md`: Create the `CaldovaHomeLoans` SQL database, run `portfolio-seed.sql`, and check the data in OneLake.
- ✅ `03-create-semantic-model.md`: Create the Direct Lake semantic model with relationships, a date table, and the four shared measures, then check the reference values.
- ✅ `04-knowledge-check-data.md`: Knowledge check on SQL database replication, the SQL analytics endpoint, and measures.
- ✅ `05-bootstrap.md`: Scaffold the Home Loan Operations Desk starter from the pinned template with the Rayfin plugin, and deploy it with `npm run rayfin:up` (using the GH Copilot app).
- ✅ `06-explore-app.md`: Open the deployed app and watch **Preparing data** seed your cases, then ask Copilot for a tour of the starter (routes, entities, access rules, what's missing) and open HL-1042 to see why it's stalled.
- ✅ `07-portfolio-analytics.md`: Connect the semantic model and show the four measures, filters, stage distribution, and stalled list tagged **Assigned to you** on `#/manager`.
- ⬜ `08-property-photos.md`: Add a private `case-photos` storage folder with an access rule, upload HL-1042's plan and photo, and see the checklist turn to Received.
- ⬜ `09-ai-handoff-brief.md`: Set the Foundry secrets, add the `generateCaseBrief` function, generate a brief that flags HL-1042's contradiction, and save a reviewed task.
- ⬜ `10-access-control.md`: Prove access control: unauthenticated API call, protected hosting, HL-1103 in the database but not in the app, and no impersonation.
- ⬜ `11-rbac.md`: Add a manager role with Rayfin RBAC so only managers can open the portfolio page (`#/manager`). Waiting for RBAC/custom claims in the published Rayfin packages. => work will be done in a separate branch
- ⬜ `12-monitoring.md`: Tour the app's App Metrics in Fabric and learn what they do and don't measure.
- ⬜ `13-knowledge-check-app.md`: Knowledge check on access policies, roles, storage rules, functions, and secrets.
- ⬜ `14-bonus.md`: **Optional bonus:** try upcoming Rayfin features, such as the data lake connector and link sharing (more ideas to come). Or Freeform rayfin experiments: other changes, create new app from scratch.
- ⬜ `15-conclusion.md`: Recap the app end to end, responsible-AI points (HL-1088), and production gaps.
