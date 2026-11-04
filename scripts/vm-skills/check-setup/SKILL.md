---
name: check-setup
description: Checks that the PREL40 lab environment is ready (GitHub Copilot, Node.js, npm, Git, and the lab files in C:\LabFiles) and reports a pass/fail table. Run only when the user invokes /check-setup. Do not use for troubleshooting the lab app, Fabric, or Rayfin projects.
disable-model-invocation: true
allowed-tools: "*"
---

# Lab setup check

1. Run the check script from this skill's base directory, once:

   ```shell
   node "<skill base directory>/scripts/check-setup.mjs" --lab-root "C:\LabFiles"
   ```

   If `node` isn't found, don't run anything else: reply "❌ Node.js: not found. Install Node.js 24.", then end as in step 3.

2. Reply with the table the script prints. Replace `PASS` with ✅, `FAIL` with ❌, and `INFO` with ℹ️. Keep every row and its details.

3. End with one line:
   - No ❌: "Your setup is ready. Select **Next →** in the lab instructions to continue."
   - Any ❌: "Fix the items marked ❌, or ask a lab proctor for help."

## Gotchas

- Run only the check script. Don't install anything, run other diagnostics, or try to fix a failed check.
- The script exits with code 1 when a check fails. That's the expected result, not an error to investigate.
