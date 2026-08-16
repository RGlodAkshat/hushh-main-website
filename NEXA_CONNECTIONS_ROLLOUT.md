# NEXA Lending → 🤫 Connections rollout

## Goal

Make the active NEXA Lending mortgage-professional roster discoverable in 🤫 Connections while preserving the directory promise: real records, source-verifiable data, no paid placement, claimable profiles, correction/removal controls, and no false implication that an unclaimed professional is employed by or endorsed by hussh.

Treat “3,700” as the current commercial target, not as a hard-coded database count. The importer must publish the exact accepted active count from the authorized source file or feed.

## Approved profile language

- Affiliation: NEXA Lending
- Category: Money → Mortgage broker / Loan officer
- Network status before claim: Public professional profile — unclaimed
- Source: NEXA-authorized roster, dated
- License note: Confirm with NMLS Consumer Access or the applicable state regulator before relying on the listing
- Relationship to hussh: Listed in 🤫 Connections; not a hussh employee, endorsement, paid placement, or advertising relationship

After the professional claims and verification succeeds, the network status may become:

- Claimed by professional
- Regulator-verified

Do not call an unclaimed profile a “hussh agent,” “hussh mortgage broker,” “partner,” or “member.”

## Data-source rule

Preferred source order:

1. NEXA-authorized CSV export
2. NEXA-authorized API
3. NEXA-authorized SFTP feed
4. Individually claimed professional data

Do not bulk-copy a restricted regulator registry. Do not scrape NEXA’s directory unless NEXA gives written permission for the exact source and fields.

## Roster contract

Required columns:

- source_record_id
- individual_nmls_id
- first_name
- middle_name
- last_name
- preferred_display_name
- company_name
- company_nmls_id
- job_title
- business_email
- business_phone
- profile_url
- office_address_1
- office_address_2
- office_city
- office_state
- office_zip
- licensed_states
- active_status
- source_updated_at

Optional columns:

- languages
- specialties
- loan_programs
- service_zips
- service_counties
- headshot_url, only if reuse is authorized
- biography, only if reuse is authorized

Expected company NMLS for NEXA Lending: 1660690. Validate rather than silently forcing this value.

## Staging model

Every import must be staged before public publication.

Track at minimum:

- import_batch_id
- source_name
- source_received_at
- source_updated_at
- row_checksum
- raw_source_record
- normalized_record
- validation_status
- validation_errors
- publish_status
- published_at
- deactivated_at

Lifecycle statuses:

- staged
- active
- inactive
- removed
- claimed
- needs_review
- license_mismatch
- duplicate_candidate

## Identity and deduplication

Primary key for a human professional:

- individual NMLS ID

Secondary duplicate detection for manual review:

- normalized full name + state + business phone
- normalized full name + state + business email
- source profile URL

Never merge two different NMLS IDs automatically because the names happen to match.

## Normalization rules

- trim whitespace
- uppercase state abbreviations
- normalize ZIP to five digits plus optional ZIP+4
- normalize phone to E.164 when possible
- lowercase email for matching while preserving the supplied display value
- split `licensed_states` on commas, semicolons, pipes, or spaces and deduplicate
- preserve the source’s spelling of the professional’s legal/display name in the source layer
- geocode only authorized business addresses
- never infer or expose a residential address

## Directory ranking

NEXA affiliation must not buy or create ranking priority.

Ranking continues to follow the normal 🤫 Connections rules such as:

- relevance to the user’s need
- licensure / eligibility evidence
- named practitioner over an administrative entity when appropriate
- distance from the user’s ZIP/location

Partner cohort filters may narrow the result set but must not alter underlying rank economics.

## Claim flow

A professional can claim using an authorized business email, verified business domain, or NMLS identity evidence.

At claim time require confirmation of:

- identity
- individual NMLS ID
- business contact details
- current affiliation
- licensed states
- profile visibility

Store source-supplied data separately from claimant edits so corrections remain auditable.

Correction and removal must remain available even when the person does not create an account.

## Outreach rule

Do not automatically send SMS or place calls to the roster.

Any email claim campaign must be approved by NEXA and should:

- identify hussh clearly
- explain why the listing exists
- link to the source / verification context
- allow claim, correction, and removal
- include a working opt-out
- avoid implying employment, endorsement, or paid partnership

## Rollout

### Phase 0 — authorization

Obtain written confirmation from NEXA covering:

- right to receive the roster
- right to display the approved fields
- whether headshots and biographies may be reused
- update cadence
- deactivation/removal rules
- permission to invite professionals to claim their profiles

### Phase 1 — 100-profile dry run

Import 100 geographically diverse active professionals.

Do not index publicly until product/compliance review and NEXA review are complete.

Review:

- field quality
- duplicates
- address safety
- category mapping
- search quality
- disclosure language
- claim/remove UX

### Phase 2 — full active roster

Import the full authorized roster.

Publish the exact accepted active count from the batch rather than assuming 3,700.

Launch claim invitations in NEXA-approved waves.

### Phase 3 — operating loop

Run delta reconciliation on the agreed cadence.

Deactivate departures instead of silently deleting historical source records.

Track:

- rows received
- rows accepted
- rows rejected
- duplicates
- active published profiles
- inactive/deactivated profiles
- claimed profiles
- removal requests
- stale records
- license mismatches
- search appearances
- profile opens
- connection requests

## Acceptance criteria

- written NEXA authorization is on file before full publication
- 100-profile dry run passes review before broad indexing
- every public NEXA profile has an individual NMLS ID
- every public NEXA profile has a source timestamp
- every public NEXA profile is claimable, correctable, and removable
- zero known duplicate individual NMLS IDs are published
- no residential address is exposed
- no unclaimed profile is described as employed by, partnered with, endorsed by, or working for hussh
- search supports need, ZIP/distance, name, NMLS ID, company, and licensed state
- every import generates a reconciliation report
- roster count is data-driven, never hard-coded

## Immediate dependency

Request the authorized active NEXA roster and display permission from the NEXA contact already connected with Manish. Ask for CSV/API/SFTP, field-level usage permission, update cadence, and approval for a reversible 100-profile pilot.