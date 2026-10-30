# Bonus: Explore more with Rayfin

You've built the Home Loan Operations Desk app end to end. If you have time left, pick any of the following tasks to go further. They're independent from each other, and you can do them in any order.

> [!NOTE]
> Tasks 3 and 4 use Rayfin features that are in preview, and are rolling out gradually. They may not be available in your lab environment yet. If Copilot reports that a feature or package isn't available, skip that task: don't accept a workaround.

## Task 1: Compare with a complete case

The handoff brief must never turn into a lending decision, even when a case looks ready. Case **HL-1088** for Jordan Chen has every document received, and is waiting for internal review.

1. In the browser, go to the tab with the deployed app, and open **HL-1088** with the **Go to case** box.

1. In the **Document checklist** panel, confirm that every item is **Received**.

1. In the **Handoff brief** panel, select **Generate handoff brief**.

1. Confirm that the brief:

    - Reports no missing documents.
    - Suggests moving the case to the internal review as the next step.
    - Doesn't recommend approving, rejecting, or pricing the loan.

    A complete checklist means that the documents were received, not that their contents were verified, or that the loan should be approved. A person makes that decision.

## Task 2: Customize the app

Make the app your own with a small change, and deploy it.

1. In the GitHub Copilot app, open a new session in the **home-loan-desk** project, and make sure it uses **Current checkout**.

1. Enter a prompt describing a small change you'd like, then press **Enter**. For example:

    ```text
    On My cases, add a filter to show only stalled cases, and show the number of open tasks for each case.
    Reuse the existing components and design tokens, and don't change the access rules.
    Then redeploy this app to the same Fabric workspace, without running prior checks or dry run.
    ```

1. Wait for the agent to finish, then reload the deployed app and try your change.

1. *(Optional)* Select the **Commit** button at the top of the session area to save your change in Git.

## Task 3 (Preview): Read portfolio tables directly

In Exercise 6, you connected a semantic model to read shared measures. Rayfin connectors can also read tables from Microsoft Fabric SQL sources, such as a lakehouse SQL analytics endpoint, a warehouse, or a SQL database, and expose them in the app as typed entities. A connector reads data where it lives: nothing is copied into the app's own database.

1. In the GitHub Copilot app, open a new session in the **home-loan-desk** project, and make sure it uses **Current checkout**.

1. Switch to **Plan** mode, enter the following prompt, then press **Enter**:

    ```text
    Use a Rayfin connector to read the Branch table of my CaldovaHomeLoans SQL database, in my Fabric workspace.
    - Find the source with rayfin connector search, use the connector type that matches it, and allow only the read operation.
    - Use delegated authentication, so queries run as me, and give the generated entities an explicit access rule.
    - On the Portfolio page, show the list of branches with their region.
    If this connector isn't available in this Rayfin version, stop and tell me, without a workaround.
    Then redeploy this app to the same Fabric workspace, without running prior checks or dry run.
    ```

1. Review the plan in the *Plan* canvas, then select **Approve and implement this plan**.

1. Wait for the agent to finish, then reload the deployed app and select **Portfolio**.

1. Confirm that the five Caldova Home Loans branches are listed, with their region.

    > [!NOTE]
    > The semantic model connector runs DAX queries over shared measures. SQL source connectors return table rows as typed entities, with their own access rules, which suits reference data like branches.

## Task 4 (Preview): Share a link to a case

Your app runs inside the Microsoft Fabric portal too. With deep linking, the app can store its current view in the portal's URL, so an officer can share a link that reopens the same case. The portal owns the URL, so the app exchanges its state with the Fabric host through the `@microsoft/rayfin-app-state-fabric` package.

1. In the GitHub Copilot app, open a new session in the **home-loan-desk** project, and make sure it uses **Current checkout**.

1. Switch to **Plan** mode, enter the following prompt, then press **Enter**:

    ```text
    Add Fabric deep linking with @microsoft/rayfin-app-state-fabric, at the same version as the other Rayfin packages, so the current route, such as #/cases/HL-1042, is stored in the Fabric portal URL.
    - Create one app state client, and read the launch state before the first render.
    - Accept only known app routes from the launch state, and preserve the route through sign-in.
    - Check isSupported() first, and keep the app working unchanged when it runs standalone.
    If the package isn't available for this Rayfin version, stop and tell me, without a workaround.
    Then redeploy this app to the same Fabric workspace, without running prior checks or dry run.
    ```

1. Review the plan in the *Plan* canvas, then select **Approve and implement this plan**.

1. Wait for the agent to finish.

1. In the browser, open the Microsoft Fabric tab, go to your **PREL40-homeloans-@lab.LabInstance.Id** workspace, and select the **home-loan-desk** app to run it inside the portal.

1. In the app, open **HL-1042**, then copy the URL from the browser's address bar.

1. Open a new browser tab, paste the URL, then press **Enter**. Confirm that the app opens directly on **HL-1042**.

    > [!NOTE]
    > A shared link only carries the view, never the data. Whoever opens it still needs access to the app, signs in, and goes through the same access rules: if Morgan opened your link to HL-1042, the app would show that the case isn't available.

## Task 5: Build your own app

Start a new Rayfin app from scratch, with the same tools.

1. In the GitHub Copilot app, open a new session in the **home-loan-desk** project.

1. Enter a prompt describing the app you'd like to build, then press **Enter**. For example:

    ```text
    Using the rayfin plugin, create a new Rayfin app in a new folder next to this project: a team equipment booking app, where signed-in users can book shared equipment, and see only their own bookings.
    Explain your plan first, then deploy it to my Fabric workspace, without running prior checks or dry run.
    ```

1. Follow the agent's plan, and test your new app once it's deployed.

Select **Next →** to wrap up the lab.
