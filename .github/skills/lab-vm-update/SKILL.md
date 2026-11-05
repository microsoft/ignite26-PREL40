---
name: lab-vm-update
description: Use when creating, recreating, or porting the tooling that pushes lab files to a Skillable lab VM with one PowerShell command, or when changing which files the VM gets or publishing a VM update. The tooling packages repo files into a self-contained PowerShell script that installs them under C:\LabFiles, uploads it as a secret gist, and prints an `irm <url> | iex` command to run on the VM. Triggers include VM preparation script, VM update script, lab VM setup, push or deploy lab files to the VM, the VM can't clone the repo, C:\LabFiles, secret gist, irm | iex, lab-vm-update. Do not use for writing lab instructions or compiling skillable.md (use lab-instructions), the self-guided workshop (use export-self-guided), setting up the lab outside the VM (Codespaces or attendees' own machines), or checkpoint scripts.
compatibility: The publisher needs Node.js 22+, Git, and the GitHub CLI signed in to an account that can create gists. Local testing needs PowerShell 7 (pwsh). The generated script targets Windows PowerShell 5.1, which every Skillable VM has, and also runs in PowerShell 7.
---

# Lab VM update tooling

Skillable VMs can't clone a private repository, so the lab files ship inside a PowerShell script. The publisher zips the files, embeds the zip as base64 in the VM script, uploads it as a secret gist, and prints one command to paste in PowerShell on the VM.

## Procedure

1. Look for existing tooling (`scripts/publish-*vm-update.mjs`). If there is some, extend it and follow its README instead of copying the assets. PREL40 has its own variant: `scripts/publish-vm-update.mjs`, documented in `scripts/README.md`.
2. Copy [assets/publish-lab-vm-update.mjs](assets/publish-lab-vm-update.mjs) and [assets/lab-vm-update.template.ps1](assets/lab-vm-update.template.ps1) to the lab's `scripts/` folder. Add `/scripts/dist/` to `.gitignore`.
3. Edit only the configuration block at the top of the publisher:
    - `LAB_NAME`: the session code, for example `PREL40`. The publisher finds the lab's earlier gists by this name, so keep it stable.
    - `LAB_ROOT`: keep `C:\LabFiles` unless the lab profile uses another folder.
    - `GROUPS`: ask the author which repo files the VM needs, and where. Add one entry per repo file or folder. Use `required` for files that must exist (it catches a wrong path early), and `keep` for files the lab writes in a target folder that must survive updates, such as progress or state files.
4. Only when the lab needs more than copied files (see Gotchas), add steps in the template's `Lab-specific steps` region. Leave the rest of the template unchanged.
5. Build, then run the generated script locally the way the VM does, in a temporary lab folder:

    ```shell
    node scripts/publish-lab-vm-update.mjs --no-upload
    pwsh -NoProfile -Command '$env:LAB_FILES_DIR = Join-Path ([IO.Path]::GetTempPath()) "labfiles-test"; Get-Content -Raw scripts/dist/lab-vm-update.ps1 | Invoke-Expression'
    ```

    Every row of the results table must show `OK`. Check the files in the target folders it lists, then delete the test folder.
6. Publish with `node scripts/publish-lab-vm-update.mjs`. Its only stdout is the VM command: give it to the author to paste in a PowerShell window on the VM, where every row must show `OK`. Windows PowerShell 5.1 can't be tested anywhere else, so a new lab isn't done until it has run once on the VM.
7. Document in the lab's `scripts/README.md` what each group installs and where, and how to publish an update (steps 5 and 6).

## Gotchas

- The VM script runs through `irm | iex` in the author's PowerShell session. Never call `exit`, because it closes the window. Keep everything inside the `& { }` block, keep the output ASCII (5.1 garbles emoji), and avoid syntax that only works in PowerShell 7, such as `??`, `?:`, `&&`, `||`, `ForEach-Object -Parallel`, `ConvertFrom-Json -AsHashtable`, and `Join-Path` with three arguments.
- Inside an `Invoke-Update` scriptblock, don't use variables named `$Group`, `$Target`, or `$Action`: the function's parameters shadow them, since variable names ignore case. Don't use `.GetNewClosure()` either, because it hides the script's helper functions.
- Keep the `[Net.ServicePointManager]::SecurityProtocol='Tls12'` prefix in the command, because Windows PowerShell 5.1 may default to TLS 1.0, which GitHub refuses.
- A secret gist is unlisted, not private: anyone with the URL can download it. Never package secrets or credentials. Once the VM image is final, delete the last gist with `gh gist delete <id> --yes`. Changing `LAB_NAME` orphans the earlier gists, so delete those by hand too.
- Only files that Git tracks or doesn't ignore are packaged, including uncommitted changes (the publisher warns about them). Keep the payload to a few MB at most: leave out `node_modules` and build output, and let the lab install dependencies.
- Folder targets are replaced, not merged. Files that attendees or the lab create in a target folder are deleted on each update, unless they're listed in `keep`. Content elsewhere in the lab folder is left untouched.
- To install skills for the GitHub Copilot app, package them as a group (for example, target `skills/check-setup`). Then, in the lab-specific region, copy that folder to `Join-Path $HOME '.copilot\skills\check-setup'`. To change a Copilot setting, such as `defaultPermissionMode` set to `allow-all`, read `%USERPROFILE%\.copilot\settings.json`, change only that key, and write it back as UTF-8 without BOM. Never overwrite the whole file. Tell the author to restart the app afterwards. PREL40's `scripts/vm-update.template.ps1` does both.
