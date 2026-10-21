# {{PROJECT_NAME}}: Home Loan Operations Desk

The lab starter for **PREL40: Build data-rich apps in Microsoft Fabric** (Microsoft Ignite 2026).

Home Loan Operations Desk is an internal Fabric App for loan officers at the fictional Contoso Home Loans. It connects shared portfolio metrics to private case work. This starter is a working, secure app that you extend during the lab with the GitHub Copilot app and the Rayfin plugin.

> All applicants, amounts, and documents are synthetic. The app supports administrative case processing only: it doesn't assess creditworthiness, recommend approval or rejection, or make lending decisions.

## What's in the starter

| Area | Ready now | Added during the lab |
| --- | --- | --- |
| Sign-in and hosting | Fabric sign-in, protected static hosting, responsive shell | — |
| My cases (`#/cases`) | Your assigned cases, stalled cases first | — |
| Case workspace (`#/cases/HL-1042`) | Notes, tasks, review status, and a status-only document checklist | Property photos and plans (Rayfin storage) |
| Access control | Every record is scoped to the signed-in officer's email by server-side rules | You prove it: no sign-in, wrong officer, impersonation |
| Portfolio (`#/manager`) | Layout and measure definitions, with a "Connect your semantic model" state | Semantic model connector, the four shared measures, filters, stalled list |
| Handoff brief | Missing checklist items computed in code; disabled AI panel | Server function, Foundry model call, secrets, human review |
| Lab data (`#/seed`) | Auto-setup on first sign-in, Restore, and Reset | — |

The app uses hash routes (`#/cases/HL-1042`), so links work standalone and inside the Fabric portal.

## The lab cases

On first sign-in the app shows **Preparing data** and creates your lab cases in the browser, as you, so the access rules apply from the start:

- **HL-1042 (Alex Rivera):** a home-improvement loan stalled for 11 days in document collection. The renovation plans and current-state photos are missing, and the notes contradict each other about whether they were sent.
- **HL-1088 (Jordan Chen):** every document received, waiting for internal review. A complete checklist is not an approval.
- **HL-1103 (Casey Brooks):** assigned to a colleague, Morgan Lee, who never signs in. You can log this case at intake, but you can't read, change, or delete it afterwards.
- Six more cases assigned to you, across stages.

Stage and time in stage come from the portfolio snapshot. Notes, tasks, and checklists are live. Open **Lab data** to restore missing records or reset your cases.

## Workspace layout

```text
.
├── package.json                 # Root commands, workspace members, and applied packs
├── rayfin/rayfin.yml            # Rayfin services: auth, data, connectors, static hosting
├── packages/
│   ├── shared/                  # Record contracts, labels, limits, and the lab colleague
│   ├── data/                    # Entities and their access rules
│   └── frontend/                # React + Vite app
│       └── src/
│           ├── pages/           # My cases, case workspace, portfolio, lab data
│           ├── services/        # Case data access (runs as the signed-in officer)
│           └── lab/             # Generated fixtures and the browser-side seeder
└── scripts/                     # Capability-pack tooling
```

Applied capability packs: `data-modeling`, `connectors`, `analytics`, `visuals`. The `functions` pack is applied during the lab.

## Commands

Run from the workspace root:

| Command | What it does |
| --- | --- |
| `npm run dev` | Runs the frontend locally against your app's Fabric backend. |
| `npm run rayfin:up` | Deploys the app and applies the data schema to Fabric. |
| `npm run typecheck` | Type-checks the workspace projects. |
| `npm run build` | Builds shared contracts, entities, and the frontend. |
| `npm run lint` | Lints the frontend. |
| `npm test` | Runs the frontend tests. |
| `npm run pack:add -- <pack>` | Applies a capability pack. |

Every `@microsoft/rayfin-*` package is pinned to the version this lab was tested with. Don't upgrade them during the lab.

## Prerequisites

- Node.js 20, 22, or 24
- A Fabric workspace with capacity where Fabric Apps are enabled
- Sign in with `npx rayfin login` before the first deploy

## Need help?

Follow the lab instructions in the PREL40 repository. For Rayfin APIs, ask Copilot: the project ships version-matched Rayfin skills and docs.
