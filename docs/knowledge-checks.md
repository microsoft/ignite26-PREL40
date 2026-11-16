# Knowledge checks

Questions for the Skillable activities in the lab instructions. Create each one in the lab profile as a multiple-choice question with a single correct answer, using the alias shown, so the `@lab.Activity(alias)` reference in the instructions resolves.

## Data and semantic model

Used on the [Knowledge check: Data and semantic model](instructions/04-knowledge-check-data.md) page.

### Question 1

- **Alias:** `DataCheckReplication`
- **Question:** What happens to data you write to a SQL database in Fabric?
- **Answers:**
    - It stays in the database until you export it
    - It's copied to OneLake once a day
    - <!-- ✅ --> It's replicated to OneLake automatically
    - You need a pipeline to copy it to OneLake
- **Explanation:** Fabric replicates every SQL database's tables to OneLake automatically.

### Question 2

- **Alias:** `DataCheckEndpoint`
- **Question:** What can you do with the SQL analytics endpoint of a SQL database in Fabric?
- **Answers:**
    - Insert and update rows
    - <!-- ✅ --> Run read-only queries on the OneLake copy
    - Create tables
    - Change the database schema
- **Explanation:** The endpoint is read-only. Writes go to the SQL database, which replicates to OneLake.

### Question 3

- **Alias:** `DataCheckMeasures`
- **Question:** Why define metrics as measures in the semantic model?
- **Answers:**
    - Measures store precomputed results in the database
    - Measures can update the source data
    - Measures are required for relationships
    - <!-- ✅ --> Every report, agent, and app gets the same result from one definition
- **Explanation:** A measure is defined once, in the model, and every consumer queries it.

## Securing and extending the app

Used on the [Knowledge check: Securing and extending the app](instructions/13-knowledge-check-app.md) page.

### Question 1

- **Alias:** `AppCheckRayfin`
- **Question:** What does Rayfin manage for your app?
- **Answers:**
    - The semantic model and its measures
    - <!-- ✅ --> The backend: sign-in, database, storage, functions, and hosting
    - Only the frontend hosting
    - A separate Azure subscription for the app
- **Explanation:** Rayfin runs the app's backend in Fabric, so you write entities and rules instead of infrastructure.

### Question 2

- **Alias:** `AppCheckFunctions`
- **Question:** Why call the Foundry model from a Rayfin function?
- **Answers:**
    - <!-- ✅ --> The endpoint and API key stay in deployment secrets, out of the browser and source code
    - Functions can read cases assigned to any officer
    - The browser can't send requests to Microsoft Foundry
    - Functions store the generated brief automatically
- **Explanation:** Secrets stay on the server, and case data is read as you, so access rules still apply.

### Question 3

- **Alias:** `AppCheckPolicies`
- **Question:** HL-1103 is in the app's database, but the app won't show it to you. Why?
- **Answers:**
    - The frontend hides cases that aren't assigned to you
    - The case wasn't replicated to the app yet
    - Only the semantic model can read cases assigned to other officers
    - <!-- ✅ --> The data API checks the case's access rule against your email on every request
- **Explanation:** Owning the workspace doesn't grant access in the app. The data API enforces access rules on every request.
