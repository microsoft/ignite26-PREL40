#!/usr/bin/env bash
# Rebuilds docs/skillable.md and publishes the lab VM update in one go.
# Extra arguments go to publish-vm-update.mjs (for example --no-upload).
set -euo pipefail
cd "$(dirname "$0")"

echo "Compiling lab instructions into docs/skillable.md..." >&2
python3 .github/skills/lab-instructions/scripts/compile_skillable.py

echo >&2
echo "Publishing the lab VM update..." >&2
node scripts/publish-vm-update.mjs "$@"
