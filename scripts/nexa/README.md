# NEXA roster staging

This folder prepares an authorized NEXA Lending mortgage-professional roster for review before any live 🤫 Connections publication.

## Files

- `nexa-roster-template.csv` — requested roster schema
- `normalize-roster.mjs` — dependency-free CSV staging, normalization, validation, deduplication, and reconciliation report

## Run

```bash
node scripts/nexa/normalize-roster.mjs /path/to/authorized-nexa-roster.csv
```

Optional output directory:

```bash
node scripts/nexa/normalize-roster.mjs /path/to/authorized-nexa-roster.csv /path/to/output
```

Default output is `tmp/nexa-import/`.

Outputs:

- `accepted.jsonl`
- `needs-review.jsonl`
- `rejected.jsonl`
- `reconciliation-report.json`

## Important

The script does not scrape NEXA or NMLS and does not publish anything to the live directory. It is intentionally the staging boundary for a roster that NEXA has authorized hussh to receive and display.

The live publisher should only consume reviewed rows from a source with written display permission, preserve source timestamps and removal controls, and never describe an unclaimed listing as a hussh employee, agent, partner, endorsement, or paid placement.
