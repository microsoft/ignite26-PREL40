# Set up your lab environment

The PREL40 lab, **Build data-rich apps in Microsoft Fabric**, is designed for a Skillable virtual machine (VM) at Microsoft Ignite 2026. You can also follow it in GitHub Codespaces or on your own machine, with the resources of your Skillable lab or with your own. This guide explains how to set up each option.

## Choose your path

Pick where you work and whose resources you use. The table shows which instructions to follow.

| Where you work | With your Skillable lab resources | With your own resources |
| --- | --- | --- |
| Skillable VM | The lab instructions in Skillable. You don't need this guide. | Not available. |
| GitHub Codespaces | The lab instructions in Skillable, and this guide. | The [self-guided workshop](https://aka.ms/ws?src=gh:microsoft/ignite26-PREL40/main/docs/self-guided/), and this guide. |
| Your own machine | The lab instructions in Skillable, and this guide. | The [self-guided workshop](https://aka.ms/ws?src=gh:microsoft/ignite26-PREL40/main/docs/self-guided/), and this guide. |

Then follow these steps:

1. [Get your lab resources](#get-your-lab-resources).
1. Set up [GitHub Codespaces](#set-up-github-codespaces) or [your own machine](#set-up-your-own-machine).
1. [Check your setup](#check-your-setup).
1. While you follow the lab, [replace the lab VM paths](#replace-the-lab-vm-paths) and, if you use Visual Studio Code, [map the GitHub Copilot app steps](#use-visual-studio-code-instead-of-the-github-copilot-app).

> [!NOTE]
> The self-guided workshop is the same lab, adapted to your own resources. Its source is [self-guided/workshop.md](self-guided/workshop.md).

## Get your lab resources

The lab uses three resources. You can mix them, for example your own GitHub Copilot with the Microsoft Fabric tenant and Microsoft Foundry model of your Skillable lab.

| Resource | What the lab uses it for |
| --- | --- |
| GitHub Copilot | The coding agent that builds and deploys the app. |
| Microsoft Fabric | The workspace, the SQL database, the semantic model, and the deployed app. |
| Microsoft Foundry | The `gpt-6-luna` model that writes the handoff brief, in Exercise 8. |

### Use your Skillable lab resources

Launch your lab in Skillable as usual. The instructions pane shows your lab credentials: keep it open and follow the instructions there. You don't need to use the VM, but keep the lab running: its resources are removed when the lab ends.

> [!TIP]
> Use a private browser window or a separate browser profile for the lab accounts, so they don't mix with your own Microsoft and GitHub accounts.

| Resource | How to use it outside the VM |
| --- | --- |
| GitHub Copilot | Sign in to the GitHub SSO portal as in Exercise 1, Task 1, then sign in to GitHub Copilot with that account: in the GitHub Copilot app as in Exercise 1, Task 2, or in Visual Studio Code from the **Accounts** menu. In GitHub Codespaces, see [Sign in to GitHub Copilot](#sign-in-to-github-copilot). |
| Microsoft Fabric | Sign in to the Fabric portal with the lab email and Temporary Access Pass, as in Exercise 1, Task 3. When Rayfin opens a browser window to sign in, pick the same account. |
| Microsoft Foundry | Sign in to Microsoft Foundry with the same account, as in Exercise 8, Task 1. |

### Use your own resources

You need a GitHub account with GitHub Copilot, a Microsoft Fabric capacity, and an Azure subscription. Running the lab with your own resources may incur costs on your Fabric capacity and Azure subscription. When you're done, [clean up](#clean-up).

#### GitHub Copilot

- A GitHub account with access to GitHub Copilot.
- The lab uses the **Claude Sonnet 5.5** model. If it isn't available with your plan, pick another model in the model picker.

#### Microsoft Fabric

- A Fabric capacity, F2 or larger, or a [Fabric trial](https://learn.microsoft.com/fabric/fundamentals/fabric-trial).
- Fabric apps enabled in your tenant. A Fabric administrator enables **Fabric Apps (preview)** in the admin portal, under **Tenant settings**, for the whole organization or a security group you belong to. The change takes a few minutes to apply.
- Fabric apps in your capacity's region. They aren't available in every region: check the [region availability](https://learn.microsoft.com/fabric/admin/region-availability).
- Permission to create workspaces and items. You create the lab workspace in Exercise 1 of the self-guided workshop.

To learn more, see [What are Fabric apps?](https://learn.microsoft.com/fabric/apps/overview).

#### Microsoft Foundry

The handoff brief in Exercise 8 calls a `gpt-6-luna` model deployment in Microsoft Foundry. Deploy one with the Bicep template in [infra/foundry](../infra/foundry/README.md), in a region that supports the model. With the Azure CLI, from the repository root:

```shell
az login
az group create --name rg-prel40 --location <azure-region>
az deployment group create --resource-group rg-prel40 --template-file infra/foundry/foundry.bicep
```

In GitHub Codespaces, sign in with `az login --use-device-code`. The deployment creates a Foundry project with the `gpt-6-luna` deployment and API key access, which you use in Exercise 8.

## Set up GitHub Codespaces

The repository includes a dev container that installs the lab tools and lab files for you. With a personal GitHub account, codespaces use your monthly free quota.

1. Open the repository on GitHub, select **Code**, select the **Codespaces** tab, then select **Create codespace on main**. You can also use this button:

    [![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/microsoft/ignite26-PREL40?quickstart=1)

1. Wait for the codespace to be ready. The dev container:

    - Installs Node.js 24, Git, the GitHub CLI, and the Azure CLI.
    - Runs `node scripts/setup-lab.mjs --allow-all`, which creates the lab folder in **/workspaces/ignite26-PREL40/.workspace**, with the same files as `C:\LabFiles` on the VM, and installs the `/check-setup` and `/lab-checkpoint` skills.
    - Turns on auto-approval of the agent's tool calls, like on the VM. See [Agent tool approvals](#agent-tool-approvals).

1. Open the codespace in Visual Studio Code desktop: open the Command Palette (**F1**) and run **Codespaces: Open in VS Code Desktop**.

    > [!IMPORTANT]
    > Rayfin signs you in with a browser window that redirects to a `localhost` address. This works when you connect to the codespace from Visual Studio Code desktop. In the browser-based editor, see [Rayfin sign-in fails in the browser](#rayfin-sign-in-fails-in-the-browser).

1. [Sign in to GitHub Copilot](#sign-in-to-github-copilot).

1. [Check your setup](#check-your-setup).

### Sign in to GitHub Copilot

A codespace belongs to the GitHub account that created it, and GitHub Copilot uses this account by default. Create the codespace with your own account: lab accounts may not be allowed to create codespaces for this repository.

To use the GitHub Copilot license of your Skillable lab instead:

1. Sign in to the GitHub SSO portal with the lab account, as in Exercise 1, Task 1.
1. In Visual Studio Code, select the **Accounts** menu, then sign in to GitHub with the lab account.
1. Select **Accounts** > **Manage Extension Account Preferences** > **GitHub Copilot Chat**, then select the lab account.

If GitHub Copilot doesn't pick up the lab account in your codespace, use your own account.

### Upload the sample files from a codespace

In Exercise 7, you upload two sample files from the browser on your computer, so they must be on your computer, not in the codespace. In the **Explorer** view, open **.workspace/data/samples**, right-click **HL-1042-floor-plan.pdf** and select **Download**. Do the same for **HL-1042-kitchen-current.jpg**.

## Set up your own machine

Install these tools first:

- [Git](https://git-scm.com/downloads).
- [Node.js](https://nodejs.org/) 24. Rayfin also supports versions 20 and 22.
- The GitHub Copilot app, like on the lab VM, or [Visual Studio Code](https://code.visualstudio.com/) with GitHub Copilot.
- The [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli), to deploy your own Microsoft Foundry model and to sign in for the checkpoints.

Then set up the lab files:

1. Clone the repository and open a terminal in it:

    ```shell
    git clone https://github.com/microsoft/ignite26-PREL40.git
    cd ignite26-PREL40
    ```

1. Run the lab setup:

    ```shell
    node scripts/setup-lab.mjs
    ```

    It creates the lab folder in **.workspace** in the repository, with the same files as `C:\LabFiles` on the VM, and installs the `/check-setup` and `/lab-checkpoint` skills in **~/.copilot/skills**. It ends with the full path of your lab folder: you use it in place of `C:\LabFiles`. To pick another folder, add `--lab-dir <path>`.

1. Restart the GitHub Copilot app or Visual Studio Code, so it loads the skills.

1. Set up [agent tool approvals](#agent-tool-approvals).

1. [Check your setup](#check-your-setup).

If you pull new changes of the repository later, run `node scripts/setup-lab.mjs` again to update the lab folder. It keeps your checkpoint progress and your app.

### Agent tool approvals

On the lab VM, the agent runs every tool without asking for approval, so the long tasks of the lab don't stop. The lab instructions assume this.

- In GitHub Codespaces, the dev container turns on `chat.tools.global.autoApprove`. The first time, Visual Studio Code asks you to confirm it. The agent can then run any command in the codespace without asking: to turn it off, set `chat.tools.global.autoApprove` to `false` in your settings.
- On your own machine, the setup script doesn't change your settings. Approve the agent's tool calls as they come, or allow all tools for your lab sessions: select **Allow all** in the chat permissions picker in Visual Studio Code, or set the permission mode in the GitHub Copilot app settings. Running `node scripts/setup-lab.mjs --allow-all` sets the GitHub Copilot default permission mode to allow-all, like on the VM.

## Check your setup

In the GitHub Copilot app or in Visual Studio Code, start a new chat and enter:

```text
/check-setup
```

It checks Node.js, npm, Git, and the lab files, and confirms that your setup is ready.

## Replace the lab VM paths

The lab instructions in Skillable use the paths of the Windows VM. Replace them with these. `<lab-folder>` is the full path printed by the setup script: **/workspaces/ignite26-PREL40/.workspace** in GitHub Codespaces, or **.workspace** in your clone of the repository.

| Lab instructions (VM) | GitHub Codespaces or your own machine |
| --- | --- |
| `C:\LabFiles` | `<lab-folder>` |
| Exercise 2: open `C:\LabFiles\data` in File Explorer, then **portfolio-seed.sql** in Notepad | Open `<lab-folder>/data/portfolio-seed.sql` in your editor, then select all and copy. |
| Exercise 4: the template in `C:\LabFiles\template\home-loan-desk` | `<lab-folder>/template/home-loan-desk` |
| Exercise 4: the app in "my user profile folder" | `<lab-folder>/home-loan-desk` |
| Exercise 7: the sample files in `C:\LabFiles\data\samples` | `<lab-folder>/data/samples`. In GitHub Codespaces, [download them first](#upload-the-sample-files-from-a-codespace). |
| **Ctrl** keyboard shortcuts | **Cmd** on macOS |

In Exercise 4, Task 2, use this prompt instead, with your lab folder path:

```text
Create a new Rayfin app named home-loan-desk in <lab-folder>, using the lab template at <lab-folder>/template/home-loan-desk. When it's ready, initialize a Git repository and make an initial commit. Then open the folder as a project in the GitHub Copilot app.
```

In Visual Studio Code, remove the last sentence of the prompt, then open the app folder yourself, as shown in the next section.

## Use Visual Studio Code instead of the GitHub Copilot app

The lab instructions use the GitHub Copilot app. In Visual Studio Code, including GitHub Codespaces, do this instead:

| Lab instructions (GitHub Copilot app) | Visual Studio Code |
| --- | --- |
| Sign in to the GitHub Copilot app (Exercise 1) | Select **Sign in to use Copilot** in the Status Bar, or sign in from the **Accounts** menu. In GitHub Codespaces, you're already signed in. |
| Restart the GitHub Copilot app | Run **Developer: Reload Window** from the Command Palette. |
| **Customize** tab, search for `rayfin`, then **Install** (Exercise 4) | Run **Chat: Open Customizations** from the Command Palette, select **Browse**, search for `rayfin` in the **awesome-copilot** marketplace, then select **Install** and confirm that you trust it. |
| Start a new chat, or open a new session | In the **Chat** view, select **New Chat** (**+**). |
| Model picker: **Claude Sonnet 5.5** with **Medium** effort | The model picker in the chat input. |
| Open the folder as a project, create a session in the **home-loan-desk** project, and change **New worktree** to **Current checkout** (Exercise 4) | Select **File** > **Open Folder**, open `<lab-folder>/home-loan-desk`, then start a new chat. Visual Studio Code works in the open folder, so there's no worktree to change. Start every later session from this folder. |
| Trust the repository when asked | Trust the folder when Visual Studio Code asks. |
| Switch from **Interactive** to **Plan** mode | Select **Plan** in the agent picker of the chat input, or start the prompt with `/plan`. |
| **Approve and implement this plan** in the *Plan* canvas | Select **Implement Plan** or **Start Implementation** under the plan. |
| **Changes** button above the chat input | The list of changed files in the chat, or the **Source Control** view. |
| **Commit** button | In the **Source Control** view, enter a message and select **Commit**, or ask Copilot to commit your changes. |
| **Toggle panel**, then the **Files** panel (Exercise 5) | The **Explorer** view. |
| **Open in VS Code** | You're already in Visual Studio Code. |
| The agent opens a terminal in the canvas view to set the secrets (Exercise 8) | The agent runs the commands in the integrated terminal: select it to enter the values at the prompts. If it can't, ask the agent for the commands, then run them yourself in **Terminal** > **New Terminal**. |
| `/check-setup` and `/lab-checkpoint` | The same commands, in the chat. |

## Catch up with checkpoints

Checkpoints complete earlier exercises for you in one command, if you're behind or want to skip ahead. In a new chat, enter `/lab-checkpoint list` to see them, then `/lab-checkpoint <checkpoint>` to run one. You can also run them from a terminal: see the [checkpoints guide](../scripts/checkpoints/README.md#run-on-your-own-machine).

Checkpoints sign in with the Azure CLI when you're signed in with it, otherwise with a browser window. In GitHub Codespaces, run `az login --use-device-code` first, with the same account as your Fabric workspace.

## Troubleshooting

### Rayfin sign-in fails with a keychain error

Rayfin can't use an OS keychain in GitHub Codespaces, dev containers, and some Linux distributions. When the agent asks, allow it to sign in with plaintext token storage (`rayfin login --encryption-fallback-enabled`), as Exercise 4 explains.

### Rayfin sign-in fails in the browser

In the browser-based editor of GitHub Codespaces, the Rayfin sign-in redirects to a `localhost` address that your browser can't reach. Prefer Visual Studio Code desktop: run **Codespaces: Open in VS Code Desktop**. If you need to stay in the browser, try this workaround:

1. Sign in in the browser window that Rayfin opens. It ends on an error page with a `localhost` address.
1. Copy the full URL from the address bar.
1. In a new terminal of the codespace, run `curl "<copied-url>"`. The Rayfin sign-in then completes.

### `/check-setup` isn't available

Reload Visual Studio Code or restart the GitHub Copilot app. If it's still missing, check that **~/.copilot/skills/check-setup** exists, and run `node scripts/setup-lab.mjs` again.

## Clean up

When you're done with the lab, remove what you created:

- **Microsoft Fabric**: in your workspace settings, remove the `PREL40-homeloans-...` workspace. It deletes the database, the semantic model, and the app.
- **Microsoft Foundry**: delete the resource group with `az group delete --name rg-prel40`.
- **GitHub Codespaces**: delete your codespace from [your codespaces](https://github.com/codespaces).
- **Your own machine**: delete the **.workspace** folder of the repository, and the **check-setup** and **lab-checkpoint** folders in **~/.copilot/skills**. To remove the Rayfin plugin, uninstall it from the GitHub Copilot app or Visual Studio Code.

Your Skillable lab resources are removed when the lab ends.
