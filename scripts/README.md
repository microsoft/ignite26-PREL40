# Lab VM update scripts

The Skillable VM can't clone this private repository, so lab files are pushed to it with a single PowerShell command. For lab authors only: attendees never run these scripts, except the [checkpoints](checkpoints/README.md).

| Path | What it is |
| --- | --- |
| [`publish-vm-update.mjs`](publish-vm-update.mjs) | Packages the lab files, publishes the VM update script as a secret gist, and prints the command to run on the VM. |
| [`vm-update.template.ps1`](vm-update.template.ps1) | The update script that runs on the VM. The publish script embeds the package in a copy of it. |
| [`vm-skills/check-setup/`](vm-skills/check-setup/) | The `/check-setup` skill attendees run in the GitHub Copilot app to check their environment. |
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

Each group's folder is deleted and copied fresh. Other content in `C:\LabFiles` and other keys in `settings.json` are left untouched.

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

## Notes

- A secret gist is unlisted, not private: anyone with the URL can download it. Once the VM image is final, delete the last gist with `gh gist delete <id> --yes`.
- The permission setting (`defaultPermissionMode`, see `copilot help config`) makes new GitHub Copilot sessions run every tool without asking for approval. If a new session still asks, set the default permission mode to allow-all in the app settings.
- To try the update script outside the VM, set `PREL40_LABFILES` and `PREL40_COPILOT_HOME` to temporary folders, then run the generated script with `pwsh`. The check script also reads `PREL40_LABFILES`.
