# Lab checkpoints

Checkpoints complete earlier lab exercises for you in one command. Use them if you're behind and want to catch up, or if you want to jump straight to a later part of the lab. Lab authors and testers use them too, so they don't have to repeat the same steps by hand on every run.

Each checkpoint gives the same result as doing the exercises yourself. The lab instructions don't change.

All checkpoints run with the same script, [`checkpoint.mjs`](checkpoint.mjs). Pick how far it goes with `--to`:

| Command | Completes | Then continue with |
| --- | --- | --- |
| `node checkpoint.mjs --to 3` | Exercises 2 and 3: the SQL database, its data, and the semantic model | Exercise 4 |
| `node checkpoint.mjs --to 4` | Exercises 2 to 4: everything above, plus the Rayfin plugin and the Home Loan Operations Desk app, created and deployed | Exercise 5 |

Each checkpoint also completes the ones before it.

## From the GitHub Copilot app

On the lab VM, the easiest way to run a checkpoint is the `/lab-checkpoint` skill. The lab instructions don't mention it: proctors share it with attendees who need to catch up, and self-paced attendees can use it too. In a new chat in the GitHub Copilot app:

- `/lab-checkpoint list` shows the checkpoints.
- `/lab-checkpoint <checkpoint>`, for example `/lab-checkpoint 4`, asks you to confirm, then installs the dependencies if needed and runs the checkpoint. For checkpoint 4, it also offers to add the app as a project.

The skill never runs on its own: only when you type the command. To run a checkpoint from a terminal instead, read on.

## Before you start

You need:

- Node.js 22 or later. It's already installed on the lab VM.
- The Fabric workspace from Exercise 1, named `PREL40-homeloans-...`. If you haven't created it yet, pass `--workspace <name>` and the checkpoint creates it, like Exercise 1 does. See [Checkpoint 3](#checkpoint-3-database-and-semantic-model).

On the lab VM, the checkpoints are in `C:\LabFiles\checkpoints`. Open a terminal there and install the dependencies once:

```powershell
cd C:\LabFiles\checkpoints
npm install
```

From a clone of this repository, run the same commands in `scripts/checkpoints`.

To sign in, checkpoints use the Azure CLI if you're signed in with `az login`. Otherwise they open a browser window: sign in with your lab account.

## Checkpoint 3: database and semantic model

Run:

```powershell
node checkpoint.mjs --to 3
```

In your workspace, the checkpoint:

1. Finds your workspace: the one whose name starts with `PREL40-homeloans`, or the one you pass with `--workspace`. If no workspace has the name you pass, it creates it on your Fabric capacity, like Exercise 1 does. For example, `node checkpoint.mjs --to 3 --workspace PREL40-homeloans-1234567`.
1. Creates the **CaldovaHomeLoans** SQL database, or reuses it if it exists.
1. Runs `portfolio-seed.sql` and checks the number of applications in each stage.
1. Waits for the four tables to replicate to OneLake.
1. Creates the **CaldovaPortfolio** Direct Lake semantic model, or updates it if it exists. The model matches Exercise 3: four tables, three relationships, a marked date table, and the four measures with their formats and descriptions.
1. Refreshes the model and runs the Exercise 3 DAX checks against the reference values.

It takes about two minutes on a new workspace, and under a minute when you run it again. When it ends with **Done**, continue with Exercise 4.

> [!NOTE]
> You can run the checkpoint again, even after doing some of the steps by hand. The seed script drops and re-creates the tables, which resets the portfolio data. The semantic model is replaced with the one in this folder, so any edits you made to it in the browser are lost.

## Checkpoint 4: the app, created and deployed

Run:

```powershell
node checkpoint.mjs --to 4
```

The checkpoint does everything in checkpoint 3, then:

1. Installs the **rayfin** plugin from the **awesome-copilot** marketplace in the GitHub Copilot app, or enables it if it's disabled. It uses the Copilot CLI (`copilot plugin install rayfin@awesome-copilot`), or runs it with `npx` if the CLI isn't installed.
1. Creates the **home-loan-desk** Rayfin app in your user profile folder (`%USERPROFILE%\home-loan-desk` on the VM) from the lab template in `C:\LabFiles\template\home-loan-desk`, and installs its dependencies.
1. Initializes a Git repository and makes an initial commit.
1. Signs you in to Rayfin. If you aren't signed in yet, a browser window opens: pick your lab account. If Rayfin can't use the OS keychain to store its sign-in tokens, the checkpoint retries with `--encryption-fallback-enabled`, which stores them in a plain file instead.
1. Deploys the app to your workspace and checks that the hosted app responds.

If the app folder already exists, the checkpoint keeps it as is and only deploys it again. It takes about five minutes the first time. When it ends with **Done**, it shows the hosted app URL. Before you continue with Exercise 5, do these steps from Exercise 4 in the GitHub Copilot app:

1. If the checkpoint installed the plugin, restart the app so it loads it.
1. Add the `home-loan-desk` folder as a project.
1. Create a new session in the **home-loan-desk** project, and change **New worktree** to **Current checkout**.

If the plugin install fails, the checkpoint shows a warning and deploys the app anyway. Install the plugin from the app, as in Exercise 4, Task 1.

## Options

| Option | What it does |
| --- | --- |
| `--to <checkpoint>` | Required. How far to go: `3` or `4`. |
| `-w`, `--workspace <name\|id>` | Use this workspace, or create it if no workspace has this name. By default, the checkpoint picks the one workspace whose name starts with `PREL40-homeloans`. |
| `--capacity <name\|id>` | Create the workspace on this capacity. By default, the checkpoint uses your one active Fabric capacity, and stops if you have several. |
| `-t`, `--tenant <id>` | Sign in to this Microsoft Entra tenant. Use it when your Azure CLI default tenant isn't the lab tenant. |
| `--app-dir <path>` | Create or reuse the app in this folder (checkpoint 4). By default, it's `home-loan-desk` in your user profile folder. |
| `--sql <path>` | Use another seed script. By default, the checkpoint uses `../data/portfolio-seed.sql` on the VM or `data/portfolio-seed.sql` in the repository. |
| `--skip-seed` | Keep the existing data and only deploy and check the semantic model. |
| `-h`, `--help` | Show the checkpoints and options. |

## For lab authors

### Change the semantic model

Edit the TMDL files in [`CaldovaPortfolio.SemanticModel/definition/`](CaldovaPortfolio.SemanticModel/definition/), and keep them in line with [Exercise 3](../../docs/instructions/03-create-semantic-model.md). The checkpoint replaces `{{WORKSPACE_ID}}` and `{{SQL_DATABASE_ID}}` in `expressions.tmdl` when it deploys the model. The reference values come from [`data/generator/manifest.json`](../../data/generator/manifest.json), which the VM update copies into this folder.

### Change the app checkpoint

Checkpoint 4 runs `rayfin init` from the lab template with the Rayfin CLI version pinned in `RAYFIN_CLI` in [`checkpoint.mjs`](checkpoint.mjs). Keep it in line with the template's `@microsoft/rayfin-cli` version. On the VM it uses `C:\LabFiles\template\home-loan-desk`. From the repository, it copies only the files Git tracks in [`src/home-loan-desk`](../../src/home-loan-desk/) to a temp folder first, so local state like `rayfin/.env` or `node_modules` doesn't end up in the app.

### Add a checkpoint

- Add an entry to `CHECKPOINTS` in [`checkpoint.mjs`](checkpoint.mjs) and a stage in `main()` that runs after the earlier ones. Add a row and section for it in this README, and a row to the table in the [`/lab-checkpoint` skill](../vm-skills/lab-checkpoint/SKILL.md).
- Make it safe to run again, whether the attendee did none, some, or all of the steps by hand.
- End with a check that proves the result matches the instructions, and say which exercise to continue with.
- Everything in this folder (except `node_modules`) ships to `C:\LabFiles\checkpoints` with the VM update. If a checkpoint needs files from elsewhere in the repository, add them to `GROUPS` in [`publish-vm-update.mjs`](../publish-vm-update.mjs).
