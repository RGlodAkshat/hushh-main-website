#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const REQUIRED_FIELDS = [
  "source_record_id",
  "individual_nmls_id",
  "first_name",
  "last_name",
  "company_name",
  "company_nmls_id",
  "business_email",
  "business_phone",
  "office_city",
  "office_state",
  "office_zip",
  "licensed_states",
  "active_status",
  "source_updated_at",
];

const EXPECTED_NEXA_COMPANY_NMLS = "1660690";

function usage() {
  console.error(
    "Usage: node scripts/nexa/normalize-roster.mjs <authorized-roster.csv> [output-dir]"
  );
  process.exit(1);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }

  return rows.filter((r) => r.some((value) => value.trim() !== ""));
}

function rowsToObjects(rows) {
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((row) => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] ?? "";
    });
    return obj;
  });
}

function clean(value) {
  return String(value ?? "").trim();
}

function digits(value) {
  return clean(value).replace(/\D/g, "");
}

function normalizeEmail(value) {
  return clean(value).toLowerCase();
}

function normalizePhone(value) {
  const d = digits(value);
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  if (d.length >= 8 && d.length <= 15) return `+${d}`;
  return clean(value);
}

function normalizeZip(value) {
  const raw = clean(value);
  const d = raw.replace(/\D/g, "");
  if (d.length === 5) return d;
  if (d.length === 9) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return raw;
}

function normalizeState(value) {
  return clean(value).toUpperCase();
}

function normalizeStates(value) {
  return [...new Set(
    clean(value)
      .split(/[;,|/]+/)
      .map((v) => normalizeState(v))
      .filter(Boolean)
  )];
}

function normalizeActiveStatus(value) {
  const v = clean(value).toLowerCase();
  if (["active", "current", "yes", "true", "1"].includes(v)) return "active";
  if (["inactive", "former", "no", "false", "0", "terminated"].includes(v)) {
    return "inactive";
  }
  return v || "unknown";
}

function safeTimestamp(value) {
  const raw = clean(value);
  const ms = Date.parse(raw);
  return Number.isNaN(ms) ? raw : new Date(ms).toISOString();
}

function checksum(record) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(record))
    .digest("hex");
}

function normalizeRecord(raw, importBatchId) {
  const normalized = {
    source_record_id: clean(raw.source_record_id),
    individual_nmls_id: digits(raw.individual_nmls_id),
    first_name: clean(raw.first_name),
    middle_name: clean(raw.middle_name),
    last_name: clean(raw.last_name),
    preferred_display_name: clean(raw.preferred_display_name),
    company_name: clean(raw.company_name),
    company_nmls_id: digits(raw.company_nmls_id),
    job_title: clean(raw.job_title),
    business_email: normalizeEmail(raw.business_email),
    business_phone: normalizePhone(raw.business_phone),
    profile_url: clean(raw.profile_url),
    office_address_1: clean(raw.office_address_1),
    office_address_2: clean(raw.office_address_2),
    office_city: clean(raw.office_city),
    office_state: normalizeState(raw.office_state),
    office_zip: normalizeZip(raw.office_zip),
    licensed_states: normalizeStates(raw.licensed_states),
    active_status: normalizeActiveStatus(raw.active_status),
    source_updated_at: safeTimestamp(raw.source_updated_at),
    languages: clean(raw.languages),
    specialties: clean(raw.specialties),
    loan_programs: clean(raw.loan_programs),
    service_zips: clean(raw.service_zips),
    service_counties: clean(raw.service_counties),
    headshot_url: clean(raw.headshot_url),
    biography: clean(raw.biography),
    directory_category: "Money",
    directory_profession: "Mortgage broker / Loan officer",
    affiliation: "NEXA Lending",
    claim_status: "unclaimed",
    source_name: "nexa_authorized_roster",
    import_batch_id: importBatchId,
  };

  normalized.row_checksum = checksum(normalized);
  return normalized;
}

function validateRecord(raw, normalized) {
  const errors = [];
  const warnings = [];

  for (const field of REQUIRED_FIELDS) {
    if (clean(raw[field]) === "") errors.push(`missing_required:${field}`);
  }

  if (!/^\d+$/.test(normalized.individual_nmls_id)) {
    errors.push("invalid_individual_nmls_id");
  }

  if (normalized.company_nmls_id !== EXPECTED_NEXA_COMPANY_NMLS) {
    errors.push(
      `company_nmls_mismatch:expected_${EXPECTED_NEXA_COMPANY_NMLS}:received_${normalized.company_nmls_id || "blank"}`
    );
  }

  if (!normalized.business_email.includes("@")) {
    warnings.push("business_email_format_needs_review");
  }

  if (!/^\+\d{8,15}$/.test(normalized.business_phone)) {
    warnings.push("business_phone_format_needs_review");
  }

  if (!/^[A-Z]{2}$/.test(normalized.office_state)) {
    warnings.push("office_state_needs_review");
  }

  if (!/^\d{5}(-\d{4})?$/.test(normalized.office_zip)) {
    warnings.push("office_zip_needs_review");
  }

  if (normalized.licensed_states.length === 0) {
    errors.push("missing_licensed_states_after_normalization");
  }

  if (!["active", "inactive"].includes(normalized.active_status)) {
    warnings.push("active_status_needs_review");
  }

  if (normalized.headshot_url) {
    warnings.push("headshot_present_confirm_reuse_authorization");
  }

  if (normalized.biography) {
    warnings.push("biography_present_confirm_reuse_authorization");
  }

  return { errors, warnings };
}

function writeJsonl(filePath, records) {
  const content = records.map((r) => JSON.stringify(r)).join("\n");
  fs.writeFileSync(filePath, content ? `${content}\n` : "", "utf8");
}

const inputPath = process.argv[2];
if (!inputPath) usage();

const outputDir = process.argv[3] || path.join(process.cwd(), "tmp", "nexa-import");
const absoluteInput = path.resolve(inputPath);
const absoluteOutput = path.resolve(outputDir);

if (!fs.existsSync(absoluteInput)) {
  console.error(`Input file not found: ${absoluteInput}`);
  process.exit(1);
}

fs.mkdirSync(absoluteOutput, { recursive: true });

const sourceText = fs.readFileSync(absoluteInput, "utf8");
const parsed = rowsToObjects(parseCsv(sourceText));
const importBatchId = `nexa_${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}_${crypto
  .createHash("sha1")
  .update(sourceText)
  .digest("hex")
  .slice(0, 8)}`;

const accepted = [];
const rejected = [];
const needsReview = [];
const seenNmls = new Map();

for (const raw of parsed) {
  const normalized = normalizeRecord(raw, importBatchId);
  const validation = validateRecord(raw, normalized);

  if (normalized.individual_nmls_id) {
    if (seenNmls.has(normalized.individual_nmls_id)) {
      validation.errors.push(
        `duplicate_individual_nmls_id:first_row_${seenNmls.get(normalized.individual_nmls_id)}`
      );
    } else {
      seenNmls.set(normalized.individual_nmls_id, seenNmls.size + 1);
    }
  }

  const staged = {
    raw_source_record: raw,
    normalized_record: normalized,
    validation_errors: validation.errors,
    validation_warnings: validation.warnings,
    validation_status:
      validation.errors.length > 0
        ? "rejected"
        : validation.warnings.length > 0
          ? "needs_review"
          : "accepted",
    publish_status: "staged",
  };

  if (validation.errors.length > 0) rejected.push(staged);
  else if (validation.warnings.length > 0) needsReview.push(staged);
  else accepted.push(staged);
}

const report = {
  import_batch_id: importBatchId,
  source_file: path.basename(absoluteInput),
  generated_at: new Date().toISOString(),
  received: parsed.length,
  accepted: accepted.length,
  needs_review: needsReview.length,
  rejected: rejected.length,
  unique_nmls_ids: seenNmls.size,
  expected_company_nmls_id: EXPECTED_NEXA_COMPANY_NMLS,
  publication_ready: rejected.length === 0 && needsReview.length === 0,
  note:
    "This script stages and normalizes an authorized NEXA roster. It does not publish records to the live directory.",
};

writeJsonl(path.join(absoluteOutput, "accepted.jsonl"), accepted);
writeJsonl(path.join(absoluteOutput, "needs-review.jsonl"), needsReview);
writeJsonl(path.join(absoluteOutput, "rejected.jsonl"), rejected);
fs.writeFileSync(
  path.join(absoluteOutput, "reconciliation-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8"
);

console.log(JSON.stringify(report, null, 2));
