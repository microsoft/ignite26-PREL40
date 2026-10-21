# Lab writing style

Open this file before writing or reviewing a page in `docs/instructions/`. Derived from the LAB514 lab, with sentence-case headings per this repo's rules.

## Pages

- One page per file: `NN-kebab-slug.md`, two-digit order starting at `00`.
- `00-intro.md` starts with `@lab.Title`, then `# Get started`: VM sign-in, scenario, and what attendees will build. It ends with `Select **Next →** to start the lab.`
- Each following page is one exercise. The last page is a short conclusion.

## Page skeleton

````markdown
# Exercise N: Verb-led title

One or two sentences: where this exercise fits in the scenario and why it matters.

## Task 1: Verb-led title

One sentence stating the outcome of the task.

1. In <where>, <do what> to <why>.

1. Run the following command:

    ```shell
    npx rayfin up
    ```

    > [!TIP]
    > Short supporting detail.

1. Confirm that <expected result>.

---

## Knowledge check

@lab.Activity(QuestionName)

Select **Next →** to <what the next exercise does>.
````

- The closing `---` section (verification or knowledge check) is optional.
- Long exercises may add a `By completing this exercise, you will:` bullet list after the intro.
- Mark optional tasks `## Task N (Optional): …`.

## Steps

- Use `1.` for every step, with a blank line between steps.
- One action per step; combine two only when they're part of the same action. Use complete sentences.
- Order each step where → what → why: "In the Fabric portal, select **Workspaces**, then select **+ New workspace**."
- Verbs: "select" for UI elements, "enter" for typed values, "run" for commands, "open" for files and apps. Not "click" or "hit".
- After an important action, say what the attendee should see.
- Indent anything that belongs to a step (code, images, alerts, sub-lists) with 4 spaces.
- Use sub-lists for expected results or explanations, not for extra actions.
- Prefix optional steps with `*(Optional)*`.

## Formatting

| Element | Format | Example |
| --- | --- | --- |
| UI labels, buttons, menus, keys | Bold | Select **View > Terminal**, press **Enter** |
| Files, folders, entities, app names | Bold | Open **AGENTS.md** in **field-services-app** |
| Short commands, URLs, values to type, `@lab` tokens | Inline code | Run `copilot`, name it `PREL40-@lab.LabInstance.Id` |
| Multi-line or long commands | ```` ```shell ```` block | |
| Prompts or text to paste into Copilot | ```` ```text ```` block | |
| Placeholders | `<kebab-case>` inside code | `--workspace-uri <workspace-uri>` |

## Alerts

- `> [!TIP]`: a shortcut or helpful context.
- `> [!NOTE]`: background or an expected variation ("Your entity name may differ").
- `> [!IMPORTANT]`: something that breaks the lab if missed.
- Keep them to one to three lines, placed under the step they support.

## Images

- Add a screenshot only when the UI is hard to describe; at most one per step.
- Save to the root `img/` with a unique kebab-case name prefixed by product (`fabric-`, `vscode-`, `rayfin-`).
- Reference it as `![Descriptive alt text](../../img/name.png)`, indented under the step text.

## Voice

- Second person, present tense, active voice, short sentences.
- Sentence-case headings that start with a verb.
- Full product names (Microsoft Fabric, Visual Studio Code, GitHub Copilot CLI), not abbreviations.
- Frame the scenario (company, persona) in page intros, not in every step.
- No filler such as "simply", "just", or "easy".
