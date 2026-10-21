# Skillable syntax for lab instructions

Open this file when a step needs a Skillable feature: lab tokens, credentials, type or copy text, activities, alert blocks, image sizing, dialog links, or code-block modifiers.
Official reference: [Creating instructions with Markdown syntax](https://docs.skillable.com/docs/creating-instructions-with-markdown-syntax) and [Replacement tokens](https://docs.skillable.com/docs/replacement-tokens).

## What the compiler converts

Write the left column in `docs/instructions/*.md`. `scripts/compile_skillable.py` produces the right column in `docs/skillable.md`.

| Source (renders on GitHub) | Compiled for Skillable |
| --- | --- |
| One file per page, sorted by file name | Pages joined with a `===` page break |
| `![Alt text](../../img/name.png "Optional title")` | `!IMAGE[Alt text](instructions360463/name.png "Optional title")` |
| `` `@lab.LabInstance.Id` `` (inline code containing `@lab.`) | `+++@lab.LabInstance.Id+++` (type-text) |

Left untouched: fenced code blocks, remote image URLs, double-backtick code spans, and everything below.

## Write these directly in the sources

### Replacement tokens

Skillable replaces these at launch. Wrap a token in backticks when the attendee must enter it (the compiler makes it type-text); leave it bare when it's only displayed.

| Token | Use |
| --- | --- |
| `@lab.Title` | First line of `00-intro.md`; renders the lab title |
| `@lab.LabInstance.Id` | Unique per attendee; use in resource names, e.g. `` `PREL40-@lab.LabInstance.Id` `` |
| `@lab.VirtualMachine(Name).Username` / `.Password` | VM sign-in |
| `@lab.CloudPortalCredential(User1).Username` / `.Password` | Cloud account sign-in; LAB514 also used `.AccessToken` for the Temporary Access Pass |
| `@lab.User.FirstName`, `@lab.User.Email` | Attendee profile values |
| `@lab.Activity(Name)` | On its own line; inserts a question or automated check defined in the lab profile |
| `@lab.TextBox(name)` / `@lab.MaskedTextBox(name)` | Input box that stores a value the attendee enters |
| `@lab.Variable(name)` | Recalls a stored value later in the lab |

VM names, credential names (`User1`), activity names, and variable names must match the Skillable lab profile. Never invent them; ask the user.

### Copy and type text

| Syntax | Behavior | GitHub rendering |
| --- | --- | --- |
| `` `text` `` | Code, copyable | Code |
| `++text++` | Copies to the clipboard on select | Literal `++` |
| `+++text+++` | Types into the VM on select | Literal `+++` |
| `++++text++++` | Copies and types | Literal `++++` |

Prefer backticks. Use `+++…+++` directly only for non-token text that must be typed into the VM.

### Alert blocks

```markdown
> [!TIP]
> One or two lines.
```

- `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`: used in LAB514, render on GitHub and Skillable. Use these by default.
- `[!Knowledge]` (collapses after 4 lines), `[!Alert]`, `[!Hint]`, `[!Help]`: Skillable-only; plain quotes on GitHub.
- Expandable variants `[+Hint]`, `[+Note]`, `[+Alert]`, `[+Help]`: first line visible, the following `>` lines after an empty `>` line are hidden until expanded.

### Images

- Append a size after the image: `![Alt](../../img/name.png){400}` (width) or `{400x300}`. Shows as literal text on GitHub, so use only when the default size is unreadable.
- Video: `!video[Text](https://youtube-url)` embeds YouTube videos.

### Links

| Syntax | Opens |
| --- | --- |
| `[text](https://url)` | New browser window |
| `^[text](https://url)` | Dialog over the lab |
| `<[text](https://url)` | Lab portal window (or new window) |

Relative links (other pages, repository files) don't resolve in Skillable; the compiler warns. Name the page in prose ("Exercise 3") or use an absolute GitHub URL.

### Code blocks

Append a modifier to the language: ```` ```shell-nocopy ````, `-wrap` (wrap long lines), `-linenums`, `-notab` (hide language tab), `-nocolor`, `-nocode` (plain, not copyable). GitHub loses syntax highlighting with a modifier, so use them only when needed.

### Page structure

- `===` is a page break. The compiler adds one between files; don't add it to the sources.
- `---` is a horizontal rule within a page.
- Indent content nested under a list step with 4 spaces, never tabs.
