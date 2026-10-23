# Exercise 2: Create and seed the portfolio database

Caldova Home Loans keeps a snapshot of its loan application pipeline in a SQL database. In this exercise, you create that database in Microsoft Fabric, load 200 synthetic loan applications into it, and run a test query to confirm the data is ready for the semantic model.

By completing this exercise, you will:

- Create a SQL database in your Fabric workspace.
- Load the portfolio data with a T-SQL script.
- Query the data to find a stalled application.
- Check that the data is replicated to OneLake and available from the SQL analytics endpoint.

## Task 1: Create the SQL database

Create an empty SQL database to hold the portfolio data.

1. In the Microsoft Fabric portal, select **Workspaces** in the left-hand navigation pane, then select the lab workspace you created in Exercise 1.

1. In the workspace, select **+ New item**, enter +++SQL database+++ in the search box, then select **SQL database**.

1. Name the database +++CaldovaHomeLoans+++, then select **Create**.

1. Wait for the database to be provisioned. When it's ready, the database home page opens with the **Explorer** pane on the left.

## Task 2: Load the portfolio data

Run the seed script to create the four portfolio tables and fill them with data.

1. On the virtual machine, open **File Explorer**, enter `C:\LabFiles\data` in the address bar, and press **Enter**.

1. Right-click **portfolio-seed.sql** then select **Edit in Notepad**

1. In Notepad, press **Ctrl+A** to select the whole script, then press **Ctrl+C** to copy it.

    > [!NOTE]
    > The script creates the **Branch**, **LoanProduct**, **Date**, and **LoanApplication** tables. If they already exist, it drops and re-creates them, so it's safe to run again. All branches, amounts, and applications are synthetic.

1. Return to the **CaldovaHomeLoans** database in Microsoft Edge and select **New Query** in the toolbar.

1. Select the query editor, then press **Ctrl+V** to paste the script.

1. Select **Run** to run the whole script. It takes a few seconds.

1. Confirm that the **Results** tab shows one row per application stage, with these counts:

    | CurrentStage | Applications |
    | --- | --- |
    | Closed | 16 |
    | Document collection | 53 |
    | Internal review | 38 |
    | Offer issued | 23 |
    | Property assessment | 32 |
    | Submitted | 26 |
    | Withdrawn | 12 |

1. In the **Explorer** pane, select the **Refresh** button, then expand **CaldovaHomeLoans** > **dbo** > **Tables**. Confirm that you see the **Branch**, **Date**, **LoanApplication**, and **LoanProduct** tables.

## Task 3: Run a test query

We'll look up one application with its branch and product to confirm that the tables join correctly.

1. Select **New Query** in the toolbar.

1. Paste the following query into the new query tab:

    ```sql
    SELECT
        a.CaseNumber,
        b.BranchName,
        p.ProductCategory,
        a.CurrentStage,
        a.RequestedAmount,
        DATEDIFF(day, a.StageStartDate, a.SnapshotDate) AS DaysInCurrentStage
    FROM dbo.LoanApplication AS a
    JOIN dbo.Branch AS b ON b.BranchId = a.BranchId
    JOIN dbo.LoanProduct AS p ON p.ProductId = a.ProductId
    WHERE a.CaseNumber = N'HL-1042';
    ```

1. Select **Run**.

1. Confirm that the **Results** tab shows one row for **HL-1042**: **Seattle Downtown**, **Home improvement**, **Document collection**, a requested amount of **85000.00**, and **11** days in its current stage.

    > [!NOTE]
    > HL-1042 is a home-improvement application that has been in Document collection for 11 days, past the operations desk's 7-day threshold, so it counts as stalled. You'll meet this case again in the app.

## Task 4: Check the data in OneLake

Every SQL database in Fabric replicates its data to OneLake. The semantic model you'll build after reads this copy through the SQL analytics endpoint.

1. Look for the  **Replication** tab next to **Home** and select it, then select **Monitor replication**.

1. Confirm that the four tables are listed as replicated. If a table is still pending, wait a few seconds and select **Refresh**.

1. Close the **Monitor replication** page.

1. In the dropdown at the top right of the editor, switch from **SQL database** to **SQL analytics endpoint**.

1. In the **Explorer** pane, expand **CaldovaHomeLoans** > **Schemas** > **dbo** > **Tables**, then select **LoanApplication**.

1. Confirm that a preview of the loan applications appears. This data is read from the OneLake copy, not from the database itself.

    > [!TIP]
    > The SQL analytics endpoint is read-only. Changes always go to the SQL database, and Fabric replicates them to OneLake automatically.

Select **Next →** to continue with the next exercise.
