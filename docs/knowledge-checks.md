# Knowledge checks

Questions for the Skillable activities in the lab instructions. Create each one in the lab profile as a multiple-choice question with a single correct answer, using the alias shown, so the `@lab.Activity(alias)` reference in the instructions resolves.

## Data and semantic model

Used on the [Knowledge check: Data and semantic model](instructions/04-knowledge-check-data.md) page.

### Question 1

- **Alias:** `DataCheckReplication`
- **Question:** What happens to data you write to a SQL database in Fabric?
- **Answers:**
    - ✅ It's replicated to OneLake automatically
    - It stays in the database until you export it
    - It's copied to OneLake once a day
    - You need a pipeline to copy it to OneLake
- **Explanation:** Fabric replicates every SQL database's tables to OneLake automatically.

### Question 2

- **Alias:** `DataCheckEndpoint`
- **Question:** What can you do with the SQL analytics endpoint of a SQL database in Fabric?
- **Answers:**
    - ✅ Run read-only queries on the OneLake copy
    - Insert and update rows
    - Create tables
    - Change the database schema
- **Explanation:** The endpoint is read-only. Writes go to the SQL database, which replicates to OneLake.

### Question 3

- **Alias:** `DataCheckMeasures`
- **Question:** Why define metrics as measures in the semantic model?
- **Answers:**
    - ✅ Every report, agent, and app gets the same result from one definition
    - Measures store precomputed results in the database
    - Measures can update the source data
    - Measures are required for relationships
- **Explanation:** A measure is defined once, in the model, and every consumer queries it.

## Securing and extending the app

Used on the [Knowledge check: Securing and extending the app](instructions/12-knowledge-check-app.md) page.

### Question 1

- **Alias:** `AppCheckPolicies`
- **Question:** As the workspace owner, you can see case HL-1103 in the app's SQL database, but the app says it isn't available to you. Why?
- **Answers:**
    - ✅ The data API checks the case's access rule against your email on every request
    - The frontend hides cases that aren't assigned to you
    - The case wasn't replicated to the app yet
    - Only the semantic model can read cases assigned to other officers
- **Explanation:** Managing the platform isn't the same as being authorized in the app. The data API enforces the entity's access rule for every request, whatever the frontend does.

### Question 2

- **Alias:** `AppCheckStorage`
- **Question:** What protects the files uploaded to the case-photos storage folder?
- **Answers:**
    - ✅ The folder's access rule, checked by the storage service on every request
    - The case prefix each file is stored under
    - The upload panel on the case page
    - The allowed file types and maximum size
- **Explanation:** Prefixes only organize files. The folder's access rule is the authorization boundary for every upload, list, download, and delete.

### Question 3

- **Alias:** `AppCheckFunctions`
- **Question:** Why does the handoff brief call the Microsoft Foundry model from a Rayfin function?
- **Answers:**
    - ✅ The endpoint and API key stay in deployment secrets, out of the browser and source code
    - Functions can read cases assigned to any officer
    - The browser can't send requests to Microsoft Foundry
    - Functions store the generated brief automatically
- **Explanation:** The function reads its secrets on the server, and reads case data as the signed-in officer, so the access rules still apply. A human saves the brief.
