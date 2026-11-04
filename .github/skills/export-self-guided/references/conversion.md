# Conversion rules: Skillable lab to self-guided MOAW workshop

Open this file before converting any page. It has three parts: the output format, the syntax conversions, and the substitutions for attendees who bring their own resources (BYO).

## Output format

- One file: `docs/self-guided/workshop.md`. MOAW reads a single Markdown file; sections (pages) are separated by a line with `---`, with a blank line before and after.
- One section per source page, in file name order. Each section starts with the page's `# ` heading.
- Inside a section, never write a `---` line: it would start a new section. Drop the source's horizontal rules (for example before "Verify your setup" or the knowledge check activity).
- Keep the lab's voice, wording (including "lab"), step numbering (`1.` everywhere), 4-space indentation, headings, prompts, code, and expected values. Change only what the rules below require, and use "workshop" only in text you add.
- Start the file with this front matter, then the marker line, then the first section:

```markdown
---
published: false
type: workshop
title: Build data-rich apps in Microsoft Fabric
short_title: Data-rich apps in Fabric
description: Build a secure, AI-assisted app with Microsoft Fabric, Rayfin, and GitHub Copilot, from a SQL database and a semantic model to a deployed and monitored app, using your own resources.
level: intermediate
authors:
  - Yohan Lasorsa
contacts:
  - '@sinedied'
duration_minutes: 180
tags: fabric, rayfin, github copilot, semantic model, sql, foundry, ai
navigation_levels: 2
navigation_numbering: false
---

<!-- export-self-guided: source=<full commit sha> -->
```

## Syntax conversions

| Skillable source | MOAW output |
| --- | --- |
| `@lab.Title` and `# Get Started` (start of `00-intro.md`) | Replace both with `# Build data-rich apps in Microsoft Fabric`. |
| `> [!TIP]` block | `<div class="tip" data-title="Tip">`, blank line, the quote lines without the `[!TIP]` line, blank line, `</div>` |
| `> [!NOTE]`, `> [!INFO]` | Same, with `class="info"` and `data-title="Note"` |
| `> [!IMPORTANT]` | Same, with `class="important"` and `data-title="Important"` |
| `> [!WARNING]`, `> [!CAUTION]` | Same, with `class="warning"` and `data-title="Warning"` |
| `+++text+++`, `++text++` | `` `text` `` |
| `![Alt](../../img/name.png)` | `![Alt](https://raw.githubusercontent.com/microsoft/ignite26-PREL40/main/img/name.png)` |
| Relative link to a repository file | `https://github.com/microsoft/ignite26-PREL40/blob/main/<path>` |
| `@lab.ActivityGroup(id)`, `@lab.Activity(id)` | The questions from `docs/knowledge-checks.md`, see below |
| `Select **Next →** to <do something>.` | `In the next section, you'll <do something>.` When the source only says "to continue", name the next section's goal instead, for example `In the next section, you'll add property photos to the app.` Drop it from the last section. |
| **Ctrl** keyboard shortcuts | Add the macOS key to each one: **Ctrl+C** (**Cmd+C** on macOS). |

An alert under a list step keeps the step's 4-space indentation on every line, including `<div>` and `</div>`:

```markdown
1. Select **Run**.

    <div class="tip" data-title="Tip">

    > The SQL analytics endpoint is read-only.

    </div>
```

### Knowledge checks

Replace the activity line with the questions of the matching section in `docs/knowledge-checks.md` (the section names the page it's used on). Keep the answers in their source order, drop the `<!-- ✅ -->` marker, and put the correct answer and the explanation in a collapsed block:

```markdown
### Question 1

What happens to data you write to a SQL database in Fabric?

- It stays in the database until you export it
- It's copied to OneLake once a day
- It's replicated to OneLake automatically
- You need a pipeline to copy it to OneLake

<details>
<summary>Show the answer</summary>

**It's replicated to OneLake automatically.** Fabric replicates every SQL database's tables to OneLake automatically.

</details>
```

## BYO substitutions

The self-guided workshop is for attendees who use their own GitHub Copilot, Microsoft Fabric, and Azure resources, in GitHub Codespaces or on their own machine. Keep the GitHub Copilot app as the tool in every step: the setup guide, `docs/setup.md`, maps it to Visual Studio Code.

Link to the setup guide with absolute URLs: `https://github.com/microsoft/ignite26-PREL40/blob/main/docs/setup.md` followed by one of these anchors. If an anchor no longer matches a heading in `docs/setup.md`, use the current heading.

| Anchor | Use it for |
| --- | --- |
| `#use-your-own-resources` | Prerequisites, and getting GitHub Copilot, Fabric, and Foundry |
| `#microsoft-fabric` | Fabric capacity, trial, and the **Fabric Apps (preview)** tenant setting |
| `#microsoft-foundry` | Deploying the `gpt-6-luna` model |
| `#set-up-github-codespaces`, `#set-up-your-own-machine` | Preparing the environment and the lab folder |
| `#agent-tool-approvals` | Allowing the agent to run tools without asking |
| `#use-visual-studio-code-instead-of-the-github-copilot-app` | Visual Studio Code equivalents of the app steps |
| `#upload-the-sample-files-from-a-codespace` | Exercise 7 uploads from GitHub Codespaces |
| `#catch-up-with-checkpoints` | Checkpoints |
| `#troubleshooting` | Anything that fails |
| `#clean-up` | Removing the resources at the end |

| Skillable source | Self-guided output |
| --- | --- |
| "Sign into Windows" section, `@lab.VirtualMachine(...)` tokens, the `+++icon+++` tip | Remove. Right after the intro title, add an "About this workshop" info note (the self-guided version of the Microsoft Ignite 2026 lab PREL40, using your own resources; Visual Studio Code users map the app steps with the setup guide) and, after "Lab overview", a `## Prerequisites` list with a cost reminder: a GitHub account with GitHub Copilot, a Microsoft Fabric capacity (F2 or larger, or a trial) with **Fabric Apps (preview)** enabled in the tenant, an Azure subscription for Microsoft Foundry, and GitHub Codespaces or your own machine. |
| Pre-configured VM and its pre-installed tools | A task to prepare the environment with the setup guide (`#set-up-github-codespaces` or `#set-up-your-own-machine`, then `#agent-tool-approvals`), and a task to deploy the Foundry model (`#microsoft-foundry`) early, so it's ready for Exercise 8. Don't list the GitHub Copilot app among the tools the setup provides: GitHub Codespaces uses Visual Studio Code. |
| GitHub SSO portal (`skillable-events`), enterprise account story | Remove. Sign in with your own GitHub account that has GitHub Copilot. |
| `@lab.CloudPortalCredential(User1).Username`, `.AccessToken`, Temporary Access Pass | "your Microsoft Fabric account". Remove TAP mentions and "already signed in through SSO" tips. |
| `@lab.LabInstance.Id` | `<your-alias>`, explained once in Exercise 1 as your alias or another short name that makes the workspace name unique. Keep the `PREL40-homeloans-` prefix: the checkpoints find the workspace by it. A name with a placeholder is in inline code, not bold: `PREL40-homeloans-<your-alias>`. |
| Workspace creation (Exercise 1) | After the **Workspace type** step, add: "Under **License mode**, select **Fabric capacity** and pick your capacity, or select **Trial**." Link to `#microsoft-fabric`. |
| `C:\LabFiles` paths | `<lab-folder>` paths with forward slashes, for example `<lab-folder>/template/home-loan-desk`. The first time, explain that `<lab-folder>` is the full path of the **.workspace** folder in the repository, printed by the setup (`/workspaces/ignite26-PREL40/.workspace` in GitHub Codespaces). Prompts need the full path, because a new chat doesn't start in the repository. Always put `<lab-folder>` in code formatting: elsewhere it renders as an HTML tag. |
| `%USERPROFILE%`, "my user profile folder" | `<lab-folder>`, for example `<lab-folder>/home-loan-desk` |
| File Explorer and Notepad steps | Open the file in the editor, for example `<lab-folder>/data/portfolio-seed.sql` in Visual Studio Code. |
| Uploading files from `C:\LabFiles\data\samples` | `<lab-folder>/data/samples`, plus a tip for GitHub Codespaces (`#upload-the-sample-files-from-a-codespace`). |
| Microsoft Foundry "one project listed" (lab-provisioned) | Open the Foundry project you deployed during setup. Keep the `gpt-6-luna` deployment name. |
| Keychain error "because of the VM environment" | "in GitHub Codespaces, dev containers, and some Linux distributions" |
| "Ask a lab proctor" | Link to `#troubleshooting`. |
| `/check-setup`, `/lab-checkpoint` | Keep: the setup installs both skills. |
| Conclusion page | Add a `## Clean up resources` section before `## Learn more`: a cost reminder, the resources to remove (the Fabric workspace, the Foundry resource group, the codespace or the lab folder and skills), and a link to `#clean-up`. |
