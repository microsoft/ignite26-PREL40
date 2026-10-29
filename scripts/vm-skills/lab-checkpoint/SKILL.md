---
name: lab-checkpoint
description: Sets the PREL40 lab to a checkpoint by running C:\LabFiles\checkpoints\checkpoint.mjs. Run only when the user invokes /lab-checkpoint; never use it on your own, even if the user is behind or stuck in the lab.
disable-model-invocation: true
allowed-tools: "*"
---

# Lab checkpoint

Checkpoints complete earlier lab exercises in one run, so the user can catch up or skip ahead.

| Checkpoint | Completes | Then continue with |
| --- | --- | --- |
| `3` | Exercises 2 and 3: the CaldovaHomeLoans SQL database with its data, and the CaldovaPortfolio semantic model | Exercise 4 |
| `4` | Exercises 2 to 4: everything in checkpoint 3, plus the rayfin plugin and the home-loan-desk app, created in `%USERPROFILE%\home-loan-desk` and deployed | Exercise 5 |

## /lab-checkpoint list

Also when there's no argument, or the argument isn't a checkpoint in the table.

Reply with the table above, then: "Run `/lab-checkpoint <checkpoint>` to set the lab to that checkpoint, for example `/lab-checkpoint 3`." Don't run anything.

## /lab-checkpoint &lt;checkpoint&gt;

1. Ask the user to confirm with the ask_user tool, with the choices "Yes, run it" and "No, cancel". In the question, say:
   - which exercises the checkpoint completes,
   - that it skips the steps already done; if the portfolio data or the semantic model don't match the lab, it resets them, so changes made to them by hand are lost,
   - for checkpoint 4: that it installs the rayfin plugin, and creates the app in `%USERPROFILE%\home-loan-desk`, or reuses the folder if it already exists,
   - that a browser window may open to sign in: pick the lab account,
   - that it takes a few minutes.

   If the user doesn't confirm, stop.

2. If the `C:\LabFiles\checkpoints\node_modules` folder doesn't exist, install the dependencies first:

   ```shell
   npm install --prefix "C:\LabFiles\checkpoints" --no-audit --no-fund
   ```

   Then run this once, replacing `<checkpoint>`. Wait until it ends: it can take up to 10 minutes. Don't stop it or start it again while it runs.

   ```shell
   node "C:\LabFiles\checkpoints\checkpoint.mjs" --to <checkpoint>
   ```

3. If it fails:
   - With "No workspace found" or "Several workspaces match": show the workspaces it lists, and ask the user which one is their lab workspace, or which name to give a new one. Exercise 1 names it `PREL40-homeloans-<lab instance ID>`, as shown in the lab instructions. Run the same command again with `--workspace "<name>"` added: if no workspace has that name, the script creates it.
   - With "Several Fabric capacities": show the capacities it lists, ask the user which one to use, and run the same command again with `--capacity "<name>"` added.
   - With anything else: show the error line, and say "Run `/lab-checkpoint <checkpoint>` again, or ask a lab proctor for help." Stop there.

4. When it ends with **Done** or **Already at checkpoint**, reply with a short summary and the links it printed. If it printed a WARN line for the plugin, tell the user to install the rayfin plugin from the app, as in Exercise 4, Task 1. For checkpoint 4:
   - Offer to add the app folder as a project in the GitHub Copilot app, and do it if the user agrees.
   - Tell the user to create a new session in the **home-loan-desk** project, and change **New worktree** to **Current checkout**.
   - If it says to restart the app, tell the user to restart the GitHub Copilot app first, so it loads the rayfin plugin.

   End with: "Continue with <exercise> in the lab instructions."

## Gotchas

- Don't change the script, the lab files, or the app to work around an error, and don't run other diagnostics.
- Don't add `--skip-seed`, `--force`, `--redo`, or other options unless the user asks for them. If the user says a step that was skipped is broken, offer to run the same command again with `--redo <step>` (steps: `database`, `seed`, `model`, `plugin`, `app`, `deploy`).
- The script writes its progress to stderr. That's expected, not an error.
