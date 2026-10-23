---
name: lab-check-setup
description: Checks that the PREL40 lab environment is ready (GitHub Copilot app, Node.js, npm, Git, and the lab files in C:\LabFiles) and reports a pass/fail table. Run only when the user invokes /lab-check-setup. Do not use for troubleshooting the lab app, Fabric, or Rayfin projects.
disable-model-invocation: true
allowed-tools: "*"
---

# Lab setup check

1. Run the check script from this skill's base directory, once, in a new Windows PowerShell process:

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File "<skill base directory>\check-setup.ps1"
   ```

   If `powershell` isn't available, run the same command with `pwsh`.

2. Reply with the table the script prints. Replace `PASS` with ✅, `FAIL` with ❌, and `INFO` with ℹ️. Keep every row and its details.

3. End with one line:
   - No ❌: "Your setup is ready. Select **Next →** in the lab instructions to continue."
   - Any ❌: "Fix the items marked ❌, or ask a lab proctor for help."

## Gotchas

- Run only the check script. Don't install anything, run other diagnostics, or try to fix a failed check.
- The script exits with code 1 when a check fails. That's the expected result, not an error to investigate.
- Don't call the script with `&` or `.\`: the VM's execution policy can block it.
