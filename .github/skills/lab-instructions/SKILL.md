---
name: lab-instructions
description: Use when writing, editing, reviewing, or restructuring the hands-on lab instructions in docs/instructions/*.md, or when compiling them into docs/skillable.md to paste into Skillable. Covers Skillable Markdown (@lab tokens, credentials, type-text, !IMAGE, alert blocks, activities, page breaks), the lab writing style, and the compile script. Triggers include lab instructions, lab steps, exercise or task page, Skillable, skillable.md, compile or build the instructions, @lab token, lab screenshot. Do not use for the root README or session metadata (initialize/finalize workflows), the app code in src/, or slides.
compatibility: The compile script needs Python 3.8+ (standard library only) and must run from the repository root.
---

# Lab instructions

Sources are `docs/instructions/NN-slug.md`: GitHub-readable Markdown, one file per Skillable page.
`docs/skillable.md` is generated and gitignored. Never edit it; change the sources and recompile.

## Procedure

1. Before writing or reviewing steps, open [references/style-guide.md](references/style-guide.md).
2. When a step needs a Skillable feature (tokens, credentials, activities, type or copy text, alert types, image sizing, dialog links), open [references/skillable-syntax.md](references/skillable-syntax.md). Prefer GitHub-friendly Markdown; the compiler converts images and `@lab` code spans.
3. Save screenshots in the root `img/` and reference them as `![Alt text](../../img/name.png)`, indented under their step.
4. When adding, removing, or reordering a page: keep the `NN-` prefixes sequential, renumber `# Exercise N` headings and in-text references ("in Exercise 4"), and update the index in `docs/README.md`.
5. Compile from the repository root:

    ```shell
    python3 .github/skills/lab-instructions/scripts/compile_skillable.py
    ```

    Options: `--strict` exits 1 on any warning; `--image-folder <id>` overrides the Skillable image folder (default `instructions360463`); `--src` and `--out` override the paths.
6. Fix every `path:line: warning:` in the sources, then recompile until no warnings remain.
7. Report the page count and list the images from the JSON `images` field that are new or changed, so the user uploads them to the Skillable image folder.

## Gotchas

- Don't add `===` between files; the compiler inserts page breaks.
- Indent nested content with 4 spaces, never tabs, or Skillable breaks the list numbering.
- Put values attendees must type (`@lab` tokens, credentials) in single backticks so they compile to `+++…+++`. Tokens inside fenced code blocks are not converted.
- `00-intro.md` must keep `@lab.Title` as its first line.
- Relative links to other pages or repository files don't resolve in Skillable. Name the page in prose or use an absolute GitHub URL.
- Image names must be unique across the lab, because the Skillable image folder is flat.
- VM names, credential names (`User1`), and `@lab.Activity(Name)` IDs must match the Skillable lab profile. Never invent them, or any URL; ask the user.
- Skillable-only syntax (`[!Knowledge]`, `++copy++`, `{400}` image sizing) looks broken on GitHub; use it only when the lab needs it.
