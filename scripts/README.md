# Lab VM update scripts

The Skillable VM can't clone this private repository, so lab files are pushed to it with a single PowerShell command. For lab authors only: attendees never run these scripts, except the [checkpoints](checkpoints/README.md), and [`setup-lab.mjs`](setup-lab.mjs) when they follow the lab outside the VM.

| Path | What it is |
| --- | --- |
| [`publish-vm-update.mjs`](publish-vm-update.mjs) | Packages the lab files, publishes the VM update script as a secret gist, and prints the command to run on the VM. |
| [`vm-update.template.ps1`](vm-update.template.ps1) | The update script that runs on the VM. The publish script embeds the package in a copy of it. |
| [`lab-files.mjs`](lab-files.mjs) | The list of lab files, shared by the publish script and `setup-lab.mjs`. |
| [`setup-lab.mjs`](setup-lab.mjs) | Installs the same lab files outside the VM, in GitHub Codespaces or on your own machine, with Node.js only. See [Set up the lab outside the VM](#set-up-the-lab-outside-the-vm). |
| [`vm-skills/check-setup/`](vm-skills/check-setup/) | The `/check-setup` skill attendees run in the GitHub Copilot app to check their environment. Its check script runs with Node.js. |
| [`vm-skills/lab-checkpoint/`](vm-skills/lab-checkpoint/) | The `/lab-checkpoint` skill that runs a checkpoint from the GitHub Copilot app. It's for lab authors, proctors, and self-paced attendees, and the lab instructions don't mention it. |
| [`checkpoints/`](checkpoints/) | Scripts that complete earlier exercises in one command, for attendees who are behind or want to jump ahead, and for testers. See its [README](checkpoints/README.md). |

## What the update installs

| Group | From this repo | On the VM |
| --- | --- | --- |
| Rayfin template | `src/home-loan-desk` (files ignored by Git, such as `node_modules`, are left out) | `C:\LabFiles\template\home-loan-desk` |
| Lab data | `data/portfolio-seed.sql`, `data/samples/` | `C:\LabFiles\data\` |
| Checkpoints | `scripts/checkpoints/` (without `node_modules`), plus `data/generator/manifest.json` | `C:\LabFiles\checkpoints\` |
| check-setup skill | `scripts/vm-skills/check-setup/` | `%USERPROFILE%\.copilot\skills\check-setup` (the update also removes the old `lab-check-setup` skill) |
| lab-checkpoint skill | `scripts/vm-skills/lab-checkpoint/` | `%USERPROFILE%\.copilot\skills\lab-checkpoint` |
| Copilot permissions | — | `"defaultPermissionMode": "allow-all"` in `%USERPROFILE%\.copilot\settings.json` |
| Version stamp | Commit and build time | `C:\LabFiles\lab-files.json` |

Each group's folder is deleted and copied fresh, except the checkpoint progress (`checkpoints\.state.json`). Other content in `C:\LabFiles` and other keys in `settings.json` are left untouched.

Attendees scaffold from the template by passing its full path to the Rayfin CLI, for example `--template C:\LabFiles\template\home-loan-desk`. No template registry entry is needed.

## Update the VM

You need Node.js 22 or later, and the GitHub CLI signed in to an account that can create gists (`gh auth status`).

1. From the repository root, run:

    ```bash
    node scripts/publish-vm-update.mjs
    ```

    The script packages your working tree, including uncommitted changes (it warns you when there are some). It uploads the update script as a secret gist, deletes the gist from the previous run, and prints a command like this:

    ```powershell
    [Net.ServicePointManager]::SecurityProtocol='Tls12'; irm https://gist.githubusercontent.com/<user>/<id>/raw | iex
    ```

1. On the VM, paste the command in a PowerShell window and run it. It works in Windows PowerShell 5.1 and PowerShell 7, and ends with a table showing whether each group was updated.

1. Restart the GitHub Copilot app, start a new chat, and run `/check-setup` to confirm the setup.

To build the package without uploading, run `node scripts/publish-vm-update.mjs --no-upload`. The files are written to `scripts/dist/` (ignored by Git).

To also recompile `docs/skillable.md` in the same step, run `./update-skillable.sh` from the repository root instead. Extra arguments, such as `--no-upload`, are passed to the publish script.

## Set up the lab outside the VM

To follow the lab in GitHub Codespaces or on your own machine, attendees run [`setup-lab.mjs`](setup-lab.mjs) from the repository root. The dev container runs it automatically. See [Set up your lab environment](../docs/setup.md) for the attendee guide.

```shell
node scripts/setup-lab.mjs
```

It installs the same files as the VM update, in the same layout, straight from your working tree: no package, no PowerShell. The lab folder is `.workspace` at the repository root, which Git ignores, unless you pass `--lab-dir <path>` or set `PREL40_LABFILES`. The skills go to `~/.copilot/skills` (or `PREL40_COPILOT_HOME`, then `COPILOT_HOME`), and point to the lab folder instead of `C:\LabFiles`. It ends with the same table as the VM update, and exits with code 1 if a group fails.

Unlike the VM update, it leaves the Copilot permission mode in `settings.json` unchanged, since it may run on a personal machine. Pass `--allow-all` to set it like on the VM: the dev container does.

To change which files the lab gets, edit `GROUPS` in [`lab-files.mjs`](lab-files.mjs): both the VM update and `setup-lab.mjs` use it.

## Notes

- A secret gist is unlisted, not private: anyone with the URL can download it. Once the VM image is final, delete the last gist with `gh gist delete <id> --yes`.
- The permission setting (`defaultPermissionMode`, see `copilot help config`) makes new GitHub Copilot sessions run every tool without asking for approval. If a new session still asks, set the default permission mode to allow-all in the app settings.
- Outside the VM, use [`setup-lab.mjs`](setup-lab.mjs). To test the VM update script itself on another machine, set `PREL40_LABFILES` to the lab folder and, optionally, `PREL40_COPILOT_HOME` to another `.copilot` folder, then run the generated script with `pwsh`. The update points the installed skills to that lab folder instead of `C:\LabFiles`. The check script and the checkpoints also read `PREL40_LABFILES`.
