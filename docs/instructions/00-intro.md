@lab.Title

# Get Started

> [!TIP]
> As you follow the instructions in this pane, whenever you see a +++icon+++, you can use it to copy text from the instruction pane into the virtual machine interface.

## Sign into Windows

In the virtual machine, sign into Windows using the following credentials:

- Username: +++@lab.VirtualMachine(Win11-Pro-Base).Username+++
- Password: +++@lab.VirtualMachine(Win11-Pro-Base).Password+++

## Lab overview

This lab demonstrates how to build a data-rich internal application with Microsoft Fabric, the Rayfin SDK, and the GitHub Copilot app. You'll combine consistent portfolio metrics from a Fabric semantic model with secure operational data and application behavior managed by Rayfin.

The scenario centers on **Caldova Home Loans**. Its operations staff can see the loan application backlog, but they still move between reports, shared folders, and case notes to understand why an application is stalled and what administrative work should happen next. You'll grow a secure starter into **Home Loan Operations Desk**, an app that helps a loan officer:

- Review shared portfolio metrics and identify stalled applications
- Work with private case notes, tasks, and document checklists
- Upload property photos and plans to protected storage
- Generate an AI-assisted handoff brief from authorized case information
- Save a human-reviewed administrative task to move a case forward

Through the exercises, you'll:

- Create and populate a Fabric SQL database, then build a Direct Lake semantic model with shared pipeline measures
- Deploy and extend a Rayfin app with authentication, protected hosting, a managed SQL database, and private file storage
- Connect the app to the semantic model to explore the portfolio and find cases that need attention
- Prove that Rayfin access policies protect case records and files from unauthenticated or unauthorized access
- Use a server function, secrets, and a model in Microsoft Foundry to create a validated handoff brief
- Review the deployed app's operational metrics in Microsoft Fabric

You'll walk in the shoes of a loan officer at Caldova Home Loans who is responsible for keeping applications moving. You'll use portfolio insights to find stalled cases, secure case tools to gather missing information, and an AI-assisted handoff brief to prepare the next administrative action for human review.

Complete the exercises in order because each one builds on the app, data model, deployment, and resources created in the previous exercises.

Select **Next →** to start the lab.
