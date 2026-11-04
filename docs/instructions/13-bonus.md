# (Optional) Explore more with Rayfin

You've built the Home Loan Operations Desk app end to end. If you have time left, you can pick any of the following tasks to go further. They're independent from each other, and you can do them in any order.

## Task 1: Customize the app

Make the app your own with a small change, and deploy it.

1. In the GitHub Copilot app, open a new session in the **home-loan-desk** project, and make sure it uses **Current checkout**.

1. Enter a prompt describing a small change you'd like, then press **Enter**. For example:

    ```text
    On My cases, add a filter to show only stalled cases, and show the number of open tasks for each case.
    Reuse the existing components and design tokens, and don't change the access rules.
    Then redeploy this app to the same Fabric workspace, without running prior checks or dry run.
    ```

1. Wait for the agent to finish, then reload the deployed app and try your change.

## Task 2: Read portfolio tables directly (Preview)

In Exercise 6, you connected a semantic model to read shared measures. Rayfin connectors can also read tables from Microsoft Fabric SQL sources, such as a lakehouse SQL analytics endpoint, a warehouse, or a SQL database, and expose them in the app as typed entities. A connector reads data where it lives: nothing is copied into the app's own database.

1. In the GitHub Copilot app, open a new session in the **home-loan-desk** project, and make sure it uses **Current checkout**.

1. Switch to **Plan** mode, enter the following prompt, then press **Enter**:

    ```text
    Read directly the Branch table from my CaldovaHomeLoans SQL database that's in my Fabric workspace.
    - Allow only read operations.
    - On the Portfolio page, show the list of branches with their region.
    Then redeploy this app to the same Fabric workspace, without running prior checks or dry run.
    ```

1. Review the plan in the *Plan* and check that it proposes to use a SQL source connector for the Branch table, then select **Approve and implement this plan**.

1. Wait for the agent to finish, then reload the deployed app and select **Portfolio**.

1. Confirm that the five Caldova Home Loans branches are listed with their region.

    > [!NOTE]
    > The semantic model connector runs DAX queries over shared measures. SQL source connectors return table rows as typed entities, with their own access rules, which suits reference data like branches.

## Task 3: Share a link to a case within Fabric portal (Preview)

Your app runs inside the Microsoft Fabric portal too. With deep linking, the app can store its current view in the portal's URL, so an officer can share a link that reopens the same case. The portal owns the URL, so the app exchanges its state with the Fabric host through the `@microsoft/rayfin-app-state-fabric` package.

1. In the GitHub Copilot app, open a new session in the **home-loan-desk** project, and make sure it uses **Current checkout**.

1. Switch to **Plan** mode, enter the following prompt, then press **Enter**:

    ```text
    I'd like to share links to cases with my colleagues. When the app runs in the Fabric portal, keep the case I'm viewing in the portal's URL, so that the link reopens the same case.
    - The app must keep working the same when it's opened outside of Fabric.
    - Someone opening a link must still sign in, and only see the cases they have access to.
    Then redeploy this app to the same Fabric workspace, without running prior checks or dry run.
    ```

1. Review the plan in the *Plan* canvas and check that it proposes to use Rayfin's Fabric deep linking support, then select **Approve and implement this plan**.

1. Wait for the agent to finish.

1. In the browser, open the Microsoft Fabric tab, go to your **PREL40-homeloans-@lab.LabInstance.Id** workspace, and select the **home-loan-desk** app to run it inside the portal.

1. In the app, open **HL-1042**, then copy the URL from the browser's address bar.

1. Open a new browser tab, paste the URL, then press **Enter**. Confirm that the app opens directly on **HL-1042**.

    > [!TIP]
    > A shared link only carries the view, never the data. Whoever opens it still needs access to the app, signs in, and goes through the same access rules: if Morgan opened your link to HL-1042, the app would show that the case isn't available.

## Task 4: Build your own app

Go wild and be creative! Start a new Rayfin app from scratch, with the same tools.

1. In the GitHub Copilot app, open a new session.

1. Enter a prompt describing the app you'd like to build, then press **Enter**. For example:

    ```text
    I want to build a Rayfin app for team equipment booking, where signed-in users can book shared equipment, and see only their own bookings. Create a new project for it, and add it to the GitHub Copilot app.
    When it's ready, deploy it to my Fabric workspace.
    ```

1. Wait for the agent to finish, and test your new app once it's deployed.

Select **Next →** to wrap up the lab.
