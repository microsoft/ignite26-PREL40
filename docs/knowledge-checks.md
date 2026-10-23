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
