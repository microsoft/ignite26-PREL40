# Data

Synthetic data for the PREL40 lab. All applicants, branches, amounts, and documents are fictional.

| Path | What it is |
| --- | --- |
| [`portfolio-seed.sql`](portfolio-seed.sql) | Creates and fills the `ContosoHomeLoans` SQL database in Fabric: `LoanApplication`, `Branch`, `LoanProduct`, and `Date`. Run the whole script in the database's query editor. It's safe to run again. |
| [`samples/`](samples/) | Files for HL-1042's missing checklist item, uploaded during the storage step: a floor plan (PDF) and a current-state kitchen image (JPEG). |
| [`generator/`](generator/) | The scripts that produce the files above and the app's lab fixtures. Attendees never run them. |

## Reference values

At the snapshot date (2026-10-30), the semantic model's measures return:

| Measure | Value |
| --- | --- |
| Open applications | 172 |
| Requested amount in pipeline | USD 52,776,000 |
| Average days in current stage | 5.95 |
| Stalled applications | 48 |

Document collection holds 31 of the 48 stalled applications. Per-stage counts are in [`generator/manifest.json`](generator/manifest.json).

## Regenerating the data

For lab authors only. From the repository root:

```bash
node data/generator/generate.mjs   # SQL, manifest, and src/home-loan-desk lab fixtures
node data/generator/samples.mjs    # floor-plan PDF
node --test data/generator/*.test.mjs
```

The generator uses a fixed seed and name-based UUIDs, so its output is byte-for-byte reproducible. The tests fail if a committed file no longer matches the generator.

The kitchen image is an interim illustration drawn by `generator/kitchen_illustration.py` (requires Pillow). Replace it with an AI-generated photo, stamped the same way, when an image-model key is available.
