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

To run them on your own machine instead, see [Run on your own machine](#run-on-your-own-machine).

To sign in, checkpoints use the Azure CLI if you're signed in with `az login`. Otherwise they open a browser window: sign in with your lab account.

## Run on your own machine

Checkpoints run on Windows, macOS, or Linux. Outside the lab VM, pick a lab folder: it plays the part of `C:\LabFiles`, and holds the app and the checkpoint progress. From a clone of this repository:

```shell
cd scripts/checkpoints
npm install
node checkpoint.mjs --to 4 --lab-dir ~/prel40-lab
```

The checkpoint creates the folder if it doesn't exist, and the app in `<lab folder>/home-loan-desk`. It takes the lab files it needs (the seed script, the semantic model, and the app template) from `<lab folder>/data`, `checkpoints` and `template` if they're there, like on the VM. Otherwise, it takes them from the repository.

Instead of passing `--lab-dir` on every run, set the `PREL40_LABFILES` environment variable. The checkpoint picks the lab folder in this order:

1. `--lab-dir`.
1. The `PREL40_LABFILES` environment variable.
1. The folder above the script, if the script is installed there by the VM update. For example, `C:\LabFiles` for `C:\LabFiles\checkpoints\checkpoint.mjs`.
1. `C:\LabFiles`, if it exists.

Otherwise, it stops and asks for `--lab-dir`.

To get the same lab files and skills as on the VM, run the VM update with the same environment variable. It installs the files in the lab folder, and points the `/lab-checkpoint` and `/check-setup` skills to it. `/check-setup` needs PowerShell (`pwsh`) on macOS and Linux.

```shell
PREL40_LABFILES=~/prel40-lab pwsh -NoProfile -File scripts/dist/prel40-vm-update.ps1
```

Build `scripts/dist/prel40-vm-update.ps1` first with `node scripts/publish-vm-update.mjs --no-upload`.

For a lab instance inside this repository, use `.workspace` at its root as the lab folder: Git ignores it. From the repository root:

```shell
node scripts/publish-vm-update.mjs --no-upload
PREL40_LABFILES="$PWD/.workspace" pwsh -NoProfile -File scripts/dist/prel40-vm-update.ps1
npm install --prefix .workspace/checkpoints
node .workspace/checkpoints/checkpoint.mjs --to 4
```

The checkpoint finds the lab folder from its own location, and creates the app in `.workspace/home-loan-desk`, with its own Git repository. The template and data in `.workspace` are copies: run the update again after you change them in the repository.

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

It takes about two minutes on a new workspace. When it ends with **Done**, continue with Exercise 4.

> [!NOTE]
> You can run the checkpoint after doing some of the steps by hand: it skips what's already in place. If the stage counts or the measures don't match the lab, it runs the seed script again, which resets the portfolio data, or replaces the semantic model with the one in this folder, which loses any edits you made to it in the browser.

## Checkpoint 4: the app, created and deployed

Run:

```powershell
node checkpoint.mjs --to 4
```

The checkpoint does everything in checkpoint 3, then:

1. Installs the **rayfin** plugin from the **awesome-copilot** marketplace in the GitHub Copilot app, or enables it if it's disabled. It uses the Copilot CLI (`copilot plugin install rayfin@awesome-copilot`), or runs it with `npx` if the CLI isn't installed.
1. Creates the **home-loan-desk** Rayfin app from the lab template in `C:\LabFiles\template\home-loan-desk`, and installs its dependencies. On the VM, it's in your user profile folder (`%USERPROFILE%\home-loan-desk`). With another lab folder, it's in `<lab folder>/home-loan-desk`.
1. Initializes a Git repository and makes an initial commit.
1. Signs you in to Rayfin. If you aren't signed in yet, a browser window opens: pick your lab account. If Rayfin can't use the OS keychain to store its sign-in tokens, the checkpoint retries with `--encryption-fallback-enabled`, which stores them in a plain file instead.
1. Deploys the app to your workspace and checks that the hosted app responds.

If the app folder already exists, the checkpoint keeps it as is, and deploys it again only if it has new commits since the last deployment. It takes about five minutes the first time. When it ends with **Done**, it shows the hosted app URL. Before you continue with Exercise 5, do these steps from Exercise 4 in the GitHub Copilot app:

1. If the checkpoint installed the plugin, restart the app so it loads it.
1. Add the `home-loan-desk` folder as a project.
1. Create a new session in the **home-loan-desk** project, and change **New worktree** to **Current checkout**.

If the plugin install fails, the checkpoint shows a warning and deploys the app anyway. Install the plugin from the app, as in Exercise 4, Task 1.

## Run a checkpoint again

Each run saves its progress for each workspace in `.state.json`, in the lab folder's `checkpoints` folder (`C:\LabFiles\checkpoints\.state.json` on the VM). When you run a checkpoint again:

- If the workspace is already at that checkpoint, the script shows the links and stops: `Already at checkpoint 4 in this workspace: nothing to do.` For checkpoint 4, that's only if the app folder is the same and has no new commits since the last deployment.
- Otherwise, it skips the steps done in an earlier run, and starts from the first step that isn't done. For example, after `--to 3`, `--to 4` starts with the Rayfin plugin.
- Steps that aren't in `.state.json` yet, for example because you did them by hand, are checked: the script skips them if the result already matches the lab.

The state file is local: it doesn't notice changes made in the browser or in another folder. To run steps again anyway:

- `--redo <step,...>` runs the steps you list, even if they're done. The steps are `database`, `seed`, `model`, `plugin`, `app` and `deploy`. For example, `--redo seed` resets the portfolio data, and then refreshes the semantic model. `--redo database` and `--redo app` reuse the database or app folder if it exists: they never delete anything.
- `--force` runs every step up to the checkpoint, as if it were the first run.

To start over in a workspace, delete its entry from `.state.json`, or delete the file. The VM update keeps the file.

## Options

| Option | What it does |
| --- | --- |
| `--to <checkpoint>` | Required. How far to go: `3` or `4`. |
| `-w`, `--workspace <name\|id>` | Use this workspace, or create it if no workspace has this name. By default, the checkpoint picks the one workspace whose name starts with `PREL40-homeloans`. |
| `--capacity <name\|id>` | Create the workspace on this capacity. By default, the checkpoint uses your one active Fabric capacity, and stops if you have several. |
| `-t`, `--tenant <id>` | Sign in to this Microsoft Entra tenant. Use it when your Azure CLI default tenant isn't the lab tenant. |
| `--lab-dir <path>` | Use this lab folder, for the lab files, the app and the checkpoint progress. By default, it's `C:\LabFiles` on the VM. See [Run on your own machine](#run-on-your-own-machine). |
| `--app-dir <path>` | Create or reuse the app in this folder (checkpoint 4). By default, it's `%USERPROFILE%\home-loan-desk` on the VM, and `<lab folder>/home-loan-desk` elsewhere. |
| `--sql <path>` | Use another seed script. By default, the checkpoint uses `data/portfolio-seed.sql` in the lab folder, or in the repository. |
| `--skip-seed` | Keep the existing data and only deploy and check the semantic model. |
| `--redo <step,...>` | Run these steps again, even if an earlier run did them: `database`, `seed`, `model`, `plugin`, `app`, `deploy`. See [Run a checkpoint again](#run-a-checkpoint-again). |
| `--force` | Run every step again, as if it were the first run. |
| `-h`, `--help` | Show the checkpoints and options. |

## For lab authors

### Change the semantic model

Edit the TMDL files in [`CaldovaPortfolio.SemanticModel/definition/`](CaldovaPortfolio.SemanticModel/definition/), and keep them in line with [Exercise 3](../../docs/instructions/03-create-semantic-model.md). The checkpoint replaces `{{WORKSPACE_ID}}` and `{{SQL_DATABASE_ID}}` in `expressions.tmdl` when it deploys the model. The reference values come from [`data/generator/manifest.json`](../../data/generator/manifest.json), which the VM update copies into this folder.

### Change the app checkpoint

Checkpoint 4 runs `rayfin init` from the lab template with the Rayfin CLI version pinned in `RAYFIN_CLI` in [`checkpoint.mjs`](checkpoint.mjs). Keep it in line with the template's `@microsoft/rayfin-cli` version. It uses `template/home-loan-desk` in the lab folder (`C:\LabFiles\template\home-loan-desk` on the VM). If the lab folder doesn't have it, it copies only the files Git tracks in [`src/home-loan-desk`](../../src/home-loan-desk/) to a temp folder first, so local state like `rayfin/.env` or `node_modules` doesn't end up in the app.

### Save the app changes of a later exercise

From Exercise 6 on, the exercises change the app. Store those changes as Git patches in [`app/`](app/), one per checkpoint: `app/<NN>-<slug>.patch`. [`app-patches.mjs`](app-patches.mjs) captures, applies, and checks them. Each app keeps `lab/checkpoint-<N>` Git tags to know which patches it has.

1. Get an app at checkpoint 4, for example with `node checkpoint.mjs --to 4`. If you already captured earlier patches, bring it up to the checkpoint before yours: `npm run patch:apply -- <N-1>`.
1. Do the exercise as an attendee would, and commit the app changes, in one commit or several.
1. Capture them:

    ```shell
    npm run patch:capture -- <N>
    ```

    It saves the commits since the previous `lab/checkpoint-*` tag (or since the initial commit) as `app/<NN>-<slug>.patch`, and tags the app's HEAD `lab/checkpoint-<N>`. It replaces workspace-specific values with placeholders: `{{WORKSPACE_ID}}`, `{{TENANT_ID}}`, `{{HOSTING_URL}}` and `{{APP_ITEM_ID}}` from the app's last deployment (`rayfin/.deployments.json`), and `{{SQL_DATABASE_ID}}` and `{{SEMANTIC_MODEL_ID}}` from `.state.json`. If the changes add another GUID, `fabricapps.net` URL or publishable key, the capture stops: replace it with `--placeholder NAME=<value>`, or keep it with `--allow <value>` if it's the same for everyone. Changes you haven't committed aren't captured, and the script lists them.

1. Check the patches on a fresh app:

    ```shell
    npm run patch:verify
    ```

    It creates an app from the lab template in a temp folder, like checkpoint 4, applies all the patches with dummy values, and runs the app's `typecheck`, `build` and `test` scripts. Add a checkpoint number to stop at that patch, and `--keep` to keep the app. It takes under a minute.

1. Commit the patch file.

To apply the patches to another app at checkpoint 4 or later, run `npm run patch:apply -- <N>`. It applies the patches after the app's latest `lab/checkpoint-*` tag, up to `<N>`, with that app's values, and tags each one. If the app has uncommitted changes, it stops, except for the redirect URIs that `rayfin up` adds to `rayfin.yml`, which it keeps. If a patch doesn't apply, it puts the app back as it was.

To change a patch, apply the patches up to the one before it, redo the changes, and capture again with the same number: it replaces the patch, and keeps its name unless you pass `--name <slug>`. Then capture the later patches again on top, or check they still apply with `npm run patch:verify`.

All commands take `--lab-dir <path>` and `--app-dir <path>`, with the same defaults as checkpoint 4. Run `node app-patches.mjs --help` for the options. The checkpoint script doesn't apply the patches yet.

### Add a checkpoint

- Add an entry to `CHECKPOINTS` in [`checkpoint.mjs`](checkpoint.mjs) and a stage in `main()` that runs after the earlier ones. Add a row and section for it in this README, and a row to the table in the [`/lab-checkpoint` skill](../vm-skills/lab-checkpoint/SKILL.md).
- Add its steps to `STEPS`, and give each one a check, so a run with no state skips what's already done. Make it safe to run again, whether the attendee did none, some, or all of the steps by hand.
- End with a check that proves the result matches the instructions, and say which exercise to continue with.
- Everything in this folder (except `node_modules`) ships to `C:\LabFiles\checkpoints` with the VM update. If a checkpoint needs files from elsewhere in the repository, add them to `GROUPS` in [`publish-vm-update.mjs`](../publish-vm-update.mjs).
