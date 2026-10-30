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
| `6` | Exercises 2 to 6: everything in checkpoint 4, plus the semantic model connector and the portfolio page in the app, committed and deployed again | Exercise 7 |
| `7` | Exercises 2 to 7: everything in checkpoint 6, plus private file storage and the case files panel in the app, committed and deployed again. It doesn't upload HL-1042's files | Exercise 8 |
| `8` | Exercises 2 to 8: everything in checkpoint 7, plus Rayfin Functions and the AI handoff brief in the app, committed and deployed again, and the FOUNDRY_ENDPOINT and FOUNDRY_API_KEY secrets | The conclusion |

## /lab-checkpoint list

Also when there's no argument, or the argument isn't a checkpoint in the table.

Reply with the table above, then: "Run `/lab-checkpoint <checkpoint>` to set the lab to that checkpoint, for example `/lab-checkpoint 3`." Don't run anything.

## /lab-checkpoint &lt;checkpoint&gt;

1. Ask the user to confirm with the ask_user tool, with the choices "Yes, run it" and "No, cancel". In the question, say:
   - which exercises the checkpoint completes,
   - that it skips the steps already done; if the portfolio data or the semantic model don't match the lab, it resets them, so changes made to them by hand are lost,
   - for checkpoint 4 and later: that it installs the rayfin plugin, and creates the app in `%USERPROFILE%\home-loan-desk`, or reuses the folder if it already exists, then adds it as a project in the GitHub Copilot app if it isn't one yet,
   - for checkpoint 6 and later: that it adds the code changes of the exercises from Exercise 6 on to the app as Git commits, then deploys it again. It stops if the app already has other changes to the same files,
   - for checkpoint 8: that it sets the Foundry endpoint and API key secrets of the app, from the gpt-6-luna deployment it finds in Azure,
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
   - With "doesn't apply": the user changed the app's code themselves. Explain that, and ask with the ask_user tool whether to replace their app changes with the checkpoint's, with the choices "Keep my changes" and "Replace them". Their commits are kept in a backup branch. If they pick "Replace them", run the same command again with `--redo code` added. Otherwise, stop.
   - With anything else: show the error line, and say "Run `/lab-checkpoint <checkpoint>` again, or ask a lab proctor for help." Stop there.

4. When it ends with **Done** or **Already at checkpoint**, reply with a short summary and the links it printed. If it printed a WARN line for the plugin, tell the user to install the rayfin plugin from the app, as in Exercise 4, Task 1. For checkpoint 4 and later:
   - Make sure the app folder it printed is a project in the GitHub Copilot app: list the projects with the list_repositories tool, and if none has that folder as its path, add it with the add_repository tool and its `path`. Don't ask first, and don't tell the user to add it themselves. If adding fails, tell the user to add the folder as a project, as in Exercise 4.
   - Tell the user to create a new session in the **home-loan-desk** project, and change **New worktree** to **Current checkout**.
   - If it says to restart the app, tell the user to restart the GitHub Copilot app first, so it loads the rayfin plugin.
   - For checkpoint 8: if it printed that the Foundry secrets aren't set, tell the user to set them as in Exercise 8, Task 1, in a terminal they open themselves, then run `/lab-checkpoint 8` again. Never ask for the endpoint or API key in the chat, and never pass them in a command.
   - For checkpoint 7 and later: tell the user the checkpoint didn't upload HL-1042's files, and give the two file paths it printed. To have them, they upload them in the app's HL-1042 case, as in Exercise 7, Task 3.

   End with: "Continue with <exercise> in the lab instructions."

## Gotchas

- Don't change the script, the lab files, or the app to work around an error, and don't run other diagnostics.
- Don't add `--skip-seed`, `--force`, `--redo`, or other options unless the user asks for them. If the user says a step that was skipped is broken, offer to run the same command again with `--redo <step>` (steps: `database`, `seed`, `model`, `plugin`, `app`, `deploy`, `code`, `secrets`).
- The script writes its progress to stderr. That's expected, not an error.
