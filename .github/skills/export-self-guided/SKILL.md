---
name: export-self-guided
description: Use when creating, exporting, updating, or syncing the self-guided MOAW workshop in docs/self-guided/workshop.md from the Skillable lab instructions in docs/instructions/*.md and docs/knowledge-checks.md, for example after the lab instructions changed. Converts Skillable Markdown to the MOAW format and swaps the lab VM, credentials, and Skillable resources for the attendee's own (bring your own resources). Triggers include self-guided, MOAW, workshop.md, export the lab, sync or update the self-guided workshop, BYO or own-resources version, run the lab outside Ignite. Do not use for writing or editing docs/instructions (use lab-instructions), compiling docs/skillable.md, or editing docs/setup.md on its own.
compatibility: Needs Git. The optional preview needs Node.js and network access for npx.
---

# Export the self-guided workshop

`docs/instructions/*.md` and `docs/knowledge-checks.md` are the source of truth for the Skillable lab. Never edit them here. The output, `docs/self-guided/workshop.md`, is derived from them, then adapted for attendees who bring their own resources.

## Procedure

1. Pick the mode from the marker line `<!-- export-self-guided: source=<sha> -->` in `docs/self-guided/workshop.md`:
    - No file or no marker: **full export**. Convert every source page in order.
    - Marker: **incremental update**. Run `git diff <sha> HEAD -- docs/instructions docs/knowledge-checks.md` and apply only those changes to the matching sections. Keep everything else as is, including earlier BYO adaptations. If the diff is empty, report that the workshop is in sync and stop.
2. Open [references/conversion.md](references/conversion.md) and apply its output format, syntax conversions, and BYO substitutions to every new or changed line.
3. If a changed step adds something specific to the lab VM that `docs/setup.md` doesn't cover yet (a `C:\LabFiles` path, a GitHub Copilot app action, a Skillable resource), update its "Replace the lab VM paths" or "Use Visual Studio Code instead of the GitHub Copilot app" table too. Attendees who follow the Skillable instructions outside the VM rely on them.
4. Set the marker to the output of `git rev-parse HEAD`.
5. Validate:
    - `git status --porcelain -- docs/instructions docs/knowledge-checks.md` lists nothing you changed.
    - This search returns no lines:

        ```shell
        grep -nE '@lab\.|\+\+\+|> \[!|\.\./\.\./img|C:\\LabFiles|%USERPROFILE%|Select \*\*Next|^===' docs/self-guided/workshop.md
        ```

    - The number of sections (`---` separators plus one) equals the number of files in `docs/instructions/`.
    - Every image URL points to a file that exists in `img/`.
    - Optional: preview with `npx @moaw/cli serve docs/self-guided` and check the changed sections.
6. Report the mode, the sections you changed, any `docs/setup.md` changes, and new images (they show only once pushed to `main`).

## Gotchas

- Export from committed sources only: the marker can't record uncommitted changes. If `git status --porcelain -- docs/instructions docs/knowledge-checks.md` isn't empty, ask the user to commit first.
- A stray `---` inside a section splits it into two MOAW pages.
- MOAW only rewrites `assets/` paths. Images use absolute `raw.githubusercontent.com/.../main/img/` URLs, and links to repository files use absolute `github.com/.../blob/main/` URLs.
- Keep the knowledge check answers in their source order; the correct answer goes only in the collapsed block.
- Don't copy the Skillable-only story (VM sign-in, SSO enterprise, TAP, proctors) into the self-guided workshop, even when a changed source step mentions it.
