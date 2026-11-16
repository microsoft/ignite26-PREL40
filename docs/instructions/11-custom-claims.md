# Exercise 10: Control AI brief generation with a custom claim

Not every loan officer needs access to AI-assisted tools. In this exercise, you add a custom claim that controls who can generate a handoff brief, without changing who can read or edit a case. You use the same signed-in account to test permission changes.

By completing this exercise, you will:

- Mint a `canGenerateBrief` claim from a trusted, server-side allowlist.
- Enforce that permission in the handoff function, not only in the frontend.
- Grant and revoke permission, then refresh your session to see the change.
- Confirm that **HL-1103** remains inaccessible throughout.

> [!IMPORTANT]
> Dynamic auth claims require support in the installed Rayfin packages and in your workspace's region. This exercise's hosted flow has not yet been verified for the lab tenants. If support isn't available, stop this exercise and continue to Exercise 11. Never replace a missing claim with a browser-controlled permission.

## Task 1: Check custom claims support

Start with the version-matched documentation before changing the app.

1. In the GitHub Copilot app, open a new session in the **home-loan-desk** project, and make sure it uses **Current checkout**.

1. Enter the following prompt, then press **Enter**:

    ```text
    Check whether the installed Rayfin packages support dynamic auth claims for this deployed Fabric app. Don't change any files yet.
    Read the installed Rayfin authentication and Functions documentation.
    Explain how to define a udf.authClaims provider, read its claims in a regular function and the frontend, and refresh a session.
    Identify the backend enablement prerequisite, and distinguish documented SDK support from verified support in this workspace.
    Don't upgrade packages, change authentication, or assume a successful deployment proves that claims are being minted.
    If the installed packages don't support the feature, stop and explain what's missing.
    ```

1. Review the answer. The documented flow should use one `udf.authClaims` provider, enable **dynamicClaims** and **Functions**, and mint claims at sign-in or session refresh.

    > [!NOTE]
    > This exercise uses a deployment secret as its trusted permission source. It doesn't need provider SQL or changes to the app's managed database.

## Task 2: Add the claim and enforce it on the server

An empty allowlist grants nobody permission to generate briefs. It doesn't prevent officers from signing in or working on their own cases.

1. In the same session, enter the following prompt, then press **Enter**:

    ```text
    Prepare a server-only BRIEF_ALLOWED_EMAILS deployment secret for this exercise.
    Its value will be a JSON array of allowed email addresses. Open a terminal so I can set it with the installed Rayfin CLI.
    Don't ask for the value in chat, print it, or put it in source code or a frontend environment variable.
    Don't change the app yet.
    ```

1. At the terminal's secret-value prompt, enter `[]`, then press **Enter**.

1. In the same session, switch to **Plan** mode, enter the following prompt, then press **Enter**:

    ```text
    Add a custom permission for generating AI handoff briefs, using the installed Rayfin documentation.
    - Enable dynamic auth claims and define exactly one inline udf.authClaims provider with the explicit return type Promise<{ canGenerateBrief: boolean }>.
    - Read BRIEF_ALLOWED_EMAILS on the server using the documented secret API for the provider context. Validate it as a JSON array of nonempty email strings. Compare trimmed, case-insensitive addresses with the host-verified ctx.auth.email, never an identity supplied by the browser.
    - Return false for an empty list or a caller not on the list. A missing caller email must never grant permission. A missing or malformed secret must fail closed, not grant access.
    - Generate the claims contract and types with the installed tooling, and include the generated declarations wherever needed.
    - In generateCaseBrief, require ctx.getClaims().canGenerateBrief === true before reading case data or calling Foundry. Return a clear permission error otherwise.
    - After that check, keep reading the case, notes, tasks, and checklist as the signed-in officer. Keep all existing entity and storage rules unchanged. This claim must never grant access to another officer's case.
    - In the frontend, read client.auth.getClaims(). The boolean claim arrives there as a string: enable Generate handoff brief only when canGenerateBrief === 'true'.
    - Show the permission state and add Refresh permissions, which calls client.auth.refreshSession(), then rereads claims and updates the UI without a full reload. Handle missing claims and refresh failures explicitly; never treat them as permission.
    - Keep existing case editing, Portfolio access, saved notes, and tasks unchanged. Don't add a self-service permission editor or change the loan-officer boundaries in AGENTS.md.
    - Never expose the allowlist or access tokens in the UI or logs.
    Preserve the existing handoff function and its human-review safeguards. Don't deploy yet.
    ```

1. Review the proposed changes in the *Plan* canvas. Confirm that the function checks the claim on the server, and that no case or storage access rule is broadened.

1. Select **Approve and implement this plan**, then wait for the agent to finish.

1. Ask the agent to redeploy the app to the same Fabric workspace. Confirm the existing target when prompted.

## Task 3: Confirm that the empty allowlist denies generation

The frontend explains the restriction, but the server must enforce it even if someone bypasses the button.

1. In the browser, open the deployed app, then sign out and sign in again to get a new session.

1. Confirm that the app reports that you don't have permission to generate briefs, and that **Generate handoff brief** is disabled on **HL-1042**.

    > [!IMPORTANT]
    > If the claim is missing, or sign-in fails, return the safe error to Copilot. If backend enablement is unavailable, stop here. Ask Copilot to remove only this exercise's changes and redeploy the previous app, preserving all earlier features. Don't accept a hard-coded frontend claim as a fix.

1. Confirm that you can still open **HL-1042** and read its existing notes, tasks, and checklist.

1. In the same Copilot session, enter the following prompt, then press **Enter**:

    ```text
    Help me invoke generateCaseBrief for my assigned case HL-1042 through the normal authenticated function client, bypassing only the disabled UI button.
    Use the app's existing case ID lookup and signed-in browser session. Don't copy tokens to chat, use provider SQL, or alter the deployed code or permission.
    Show the safe function error and confirm that it is the custom-permission refusal, not an unrelated authentication or configuration failure.
    ```

1. Confirm that the function refuses generation with the permission error, and returns no brief.

## Task 4: Grant permission and refresh your session

Changing the allowlist doesn't rewrite an access token that has already been issued. A refreshed session gets a new claim.

1. In the same Copilot session, ask the agent to reopen the terminal to update **BRIEF_ALLOWED_EMAILS**, without displaying its current value.

1. At the secret-value prompt, enter a JSON array containing only the email address shown in your signed-in app account. Use the form `["<your-signed-in-email>"]`, replacing the placeholder with your actual address.

1. Ask the agent to redeploy to the same Fabric workspace so the updated deployment secret is available to the provider. Confirm the existing target when prompted.

1. In the deployed app, select **Refresh permissions**.

1. Confirm that the permission state allows generation and that **Generate handoff brief** is enabled on **HL-1042**.

1. Select **Generate handoff brief**. Confirm that a real brief appears with its citations and administrative next step. You don't need to save another note or task.

1. In the header, enter `HL-1103` in the **Go to case** box, then press **Enter**.

1. Confirm that the app still shows **Case HL-1103 isn't available to you**.

1. In the same Copilot session, enter the following prompt, then press **Enter**:

    ```text
    Verify through the normal signed-in data and function clients, without changing code, that my canGenerateBrief permission does not let me read HL-1103 or generate its brief.
    Use the real seeded case ID; don't guess one. If it isn't available to my session, guide me to find only that ID in the Fabric database preview as in Exercise 9.
    Show safe results without exposing tokens or case contents. The case read must return no record or an authorization error, and generateCaseBrief must refuse it without returning a brief.
    ```

1. Confirm both refusals. The custom claim enables a capability; the existing case-access rules still decide whose data it can use.

## Task 5: Revoke permission and verify the result

Remove the grant and check that the server refuses generation again after a refresh.

1. In the same Copilot session, ask the agent to reopen the terminal to update **BRIEF_ALLOWED_EMAILS**.

1. At the secret-value prompt, enter `[]`, then press **Enter**.

1. Ask the agent to redeploy to the same Fabric workspace. Confirm the existing target when prompted.

1. In the deployed app, select **Refresh permissions**.

1. Open **HL-1042**. Confirm that generation is disabled again, while its existing notes and tasks remain available.

1. Ask Copilot to repeat the direct function invocation from Task 3. Confirm that the server refuses generation and returns no brief.

    > [!NOTE]
    > Revocation takes effect when a new access token is minted. An already-issued token can retain its permission until refresh or expiry; this isn't an immediate-revocation mechanism. Refreshing this session doesn't refresh another browser's session.

1. Select the **Commit** button at the top of the session area, then wait for the agent to confirm the commit. The allowlist value stays outside Git.

---

## Check your understanding

Why isn't disabling **Generate handoff brief** enough? The frontend is a convenience, not an authorization boundary. The server function must check the trusted claim, and the data API must still enforce the officer's case-access rules.

Select **Next →** to review your app's metrics in Microsoft Fabric.
