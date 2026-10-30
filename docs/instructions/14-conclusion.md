# You're done 🎉

Congratulations! In this lab, you built a data-rich app in Microsoft Fabric, from the data to a secured, monitored, AI-assisted app. You:

1. Created and seeded the **CaldovaHomeLoans** SQL database, and checked its OneLake copy through the SQL analytics endpoint.

1. Built a Direct Lake semantic model with relationships, a date table, and shared measures.

1. Bootstrapped and deployed the Home Loan Operations Desk app with Rayfin, using the GitHub Copilot app and the Rayfin plugin.

1. Added portfolio analytics that read the same measures as the semantic model, instead of computing them again in the app.

1. Added property photo uploads, protected by a storage access rule on each case folder.

1. Generated an AI-assisted handoff brief with Microsoft Foundry, from a server-side function that keeps the API key out of the browser.

1. Proved that the app refuses unauthorized access, and reviewed its metrics in Microsoft Fabric.

## Using AI responsibly

The handoff brief was designed to assist a person, not to replace one:

- **A person stays in the loop.** The brief is a draft. Nothing is saved automatically: the loan officer reviews it, then decides to save it as a note labeled **AI-generated**, or to create a task from the suggested next step.
- **Facts come from code, not from the model.** The list of missing documents is computed in code, never by the model. Notes are treated as untrusted content, the model gets no tools, and every note it cites is checked against the notes it received.
- **No lending decisions.** Even when every document is received, the brief suggests the next step, never an approval, a rejection, or a price.

## From lab to production

This lab is a learning scenario, not a production banking reference architecture. Before a similar app goes to production, you'd also need to plan for:

- **A real manager role.** The Portfolio page shows aggregated data to every signed-in user. Seeing all cases or reassigning them requires roles from a trusted source.
- **Cross-record checks.** An access rule checks one record at a time: it can confirm that a note carries your email, but not that its case is assigned to you. Create child records through a server function that checks case ownership first.
- **Keyless AI access.** Call Microsoft Foundry with the app's identity instead of an API key.
- **Row-level security for analytics.** Per-officer analytics require row-level security in the semantic model, which is separate from the app's access rules.
- **Closing the data loop.** Feed the case state from the app back into the analytics snapshot.
- **Document handling.** Add document intelligence, retention policies, malware scanning, and the compliance workflows required for lending.

## Learn more

- Rayfin documentation: `https://rayfin.ai/docs`
- Fabric apps overview: `https://learn.microsoft.com/fabric/apps/overview`
- Community templates for Rayfin apps: `https://github.com/microsoft/awesome-rayfin`

Thank you for joining this lab! We hope it gave you ideas for your own data-rich apps in Microsoft Fabric.
