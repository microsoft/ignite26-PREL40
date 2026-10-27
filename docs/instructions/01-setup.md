# Exercise 1: Set up your environment

Before you can build, deploy, and explore the Home Loan Operations Desk app, you need to get your environment ready by signing in to GitHub, GitHub Copilot, and Microsoft Fabric.

This lab uses a pre-configured virtual machine with all necessary tools installed. The already pre-installed tools include:

- GitHub Copilot app
- Node.js 24
- npm

## Task 1: Sign in to GitHub through the lab SSO portal

In this exercise, you will sign in to GitHub through Caldova Home Loans' enterprise SSO portal. Caldova Home Loans purchases GitHub Enterprise for its organization, which includes managed access to GitHub Copilot for employees through the company's enterprise plan.

1. In the virtual machine, open Microsoft Edge and navigate to: `https://github.com/enterprises/skillable-events/sso`

1. On the Single Sign-On page, select **Continue** and sign in using the following credentials:

    - **Email**: `@lab.CloudPortalCredential(User1).Username`
    - **TAP**: `@lab.CloudPortalCredential(User1).AccessToken`

1. After a successful sign-in, you will be redirected to the GitHub homepage. **Keep this browser tab open** as you will need this active session for the next steps.

## Task 2: Sign in to the GitHub Copilot app

1. In the virtual machine, open the **GitHub Copilot app** from the taskbar.

1. In the GitHub Copilot app, select **Sign in to GitHub**. This will copy the device code to your clipboard and open a browser window for authentication.

1. In the browser window that opens, use the active GitHub SSO session from Task 1 to complete the sign-in if asked, then paste your device code when prompted with CTRL+V and press **Enter**.

1. Return to the GitHub Copilot app and confirm that it is ready for you to start a conversation.

## Task 3: Sign in to Microsoft Fabric

1. In a new tab on the browser, navigate to the Microsoft Fabric portal at: `https://app.fabric.microsoft.com`.

1. When prompted to sign in, use the following credentials:

    - **Email**: `@lab.CloudPortalCredential(User1).Username`
    - **TAP**: `@lab.CloudPortalCredential(User1).AccessToken`

    > [!TIP]
    > Since you already used these credentials to sign in to the GitHub SSO portal, you may not be prompted to enter them again and will be signed in automatically.

1. After a successful sign-in, you will land on the Microsoft Fabric homepage. **Keep this browser tab open** as you will need this active session for the next steps.

    > [!IMPORTANT]
    > If the page title and icon in the bottom left corner of the page say "Power BI", you need to switch to the Fabric portal. Select the **Power BI** icon in the bottom left corner, then select **Fabric** to switch to the Microsoft Fabric portal.

## Task 4: Create a workspace in Microsoft Fabric

This lab creates the portfolio database, the semantic model, and the Home Loan Operations Desk app in a Microsoft Fabric workspace.

A workspace is a container for all the Fabric items related to your project, such as databases, semantic models, and deployed apps.

1. In the Fabric portal, select **Workspaces** from the left-hand navigation pane. Then select **+ New workspace**.

1. Name the workspace `PREL40-homeloans-@lab.LabInstance.Id`.

1. Expand the **Advanced** section and scroll to the **Workspace type** setting and ensure that **Fabric** is selected.

1. Select **Apply** to create the workspace.

---

## Verify your setup

In the GitHub Copilot app, start a new chat and enter this prompt:

```text
/lab-check-setup
```

This command will check all prerequisites for the lab and confirm that your setup is correct.

Select **Next →** to start the second exercise.
