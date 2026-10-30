# Exercise 10: Review your app's metrics in Microsoft Fabric

Your app is deployed, and you've used it throughout the lab. Before you hand it to other loan officers, you need to know whether it's used, whether its data requests fail, and how long they take. In this exercise, you open the built-in **App Metrics** of your app in the Microsoft Fabric portal, and learn what they do and don't measure.

By completing this exercise, you will:

- Open the **Metrics** view of your deployed app.
- Read the six built-in metrics, and the reporting window they cover.
- Understand which questions these metrics can answer, and which they can't.

You don't need to add any code to get these metrics: they're collected on the server for every deployed app.

> [!NOTE]
> App Metrics is in preview. The cards and their names may differ slightly from these instructions.

## Task 1: Open your app's metrics

App Metrics is part of the app's management view, in the Microsoft Fabric portal.

1. In the browser, open the Microsoft Fabric tab, then go to your **PREL40-homeloans-@lab.LabInstance.Id** workspace.

1. In the workspace item list, select the **home-loan-desk** app to open it.

1. If the running app opens, select **Manage app**.

1. In the left navigation, select **Metrics**.

1. In the time range list, select **Last 24 hours**. The default is **Last 30 days**.

1. Confirm that the page shows six cards, each with a summary value for the selected range and a chart of activity over that range.

## Task 2: Read the metrics

Each card answers a different question. Look at each one, and compare it with what you did in the lab.

1. Look at the **Sign ins count** card. It counts sign-in activity, including silent sign-ins, such as when the app reused your session. It doesn't count unique users.

1. Look at the **App loads** card. It counts the loads of the app's **index.html** page. It doesn't count unique visitors, or every file the browser downloads.

1. Look at the **Query count** card. It counts the GraphQL data requests the app processed, including the ones that failed. Notice the activity from the hours when you seeded, browsed, and changed your cases.

1. Look at the **Query error count** and **Query error rate** cards. They count the data requests that failed, and their percentage of all requests.

    > [!TIP]
    > A GraphQL response can contain errors even when its HTTP status is **200 OK**. These cards count those failures too, so use them rather than HTTP status codes alone.

1. Look at the **Duration - average** card. It shows the average time the server took to process data requests. It isn't the time your browser takes to load or display the app.

1. Notice the time axis of the charts. Charts use UTC time, and **Last 24 hours** ends at the start of the current hour: activity from the last few minutes doesn't show yet.

    > [!NOTE]
    > If a card shows **No metric data is available for this time range**, no data was returned for that range. A value of `0` next to this message doesn't confirm that nothing happened. Activity from the first part of the lab is old enough to appear.

## Task 3: Know what the metrics don't cover

App Metrics gives you a quick view of your app's health, from the server side. It's important to know its limits before you rely on it.

1. Review what's out of scope for App Metrics:

    | You won't find in App Metrics | Where to look instead |
    | --- | --- |
    | Browser load and rendering times | Browser performance tools |
    | Individual errors or request traces | Your app's own logging |
    | Calls to your Microsoft Foundry model, and their token usage | Microsoft Foundry |
    | Semantic model query activity | The semantic model, in Microsoft Fabric |
    | Capacity units consumed by the app | The Microsoft Fabric Capacity Metrics app |

1. *(Optional)* In the GitHub Copilot app, open a new session in the **home-loan-desk** project, and enter the following prompt, then press **Enter**:

    ```text
    Where do I find this app's App Metrics in Microsoft Fabric, and what does each card measure and not measure? Don't change any code.
    ```

    Compare the agent's answer with what you saw in the portal.

    > [!NOTE]
    > The App Metrics are operational metrics about the app itself. They're unrelated to the portfolio measures from your semantic model, such as **Open applications** or **Stalled applications**.

Select **Next →** to check your knowledge of what you built.
