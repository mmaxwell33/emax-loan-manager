-- ══════════════════════════════════════════════════════════
-- E-MAX LOAN MANAGER — Phase 3 Migration: Paper-form parity
-- Run this ONCE in Supabase → SQL Editor → New Query
-- Safe to re-run (uses IF NOT EXISTS for every column)
-- ══════════════════════════════════════════════════════════

-- ─── BORROWERS: add paper-form fields ─────────────────────
ALTER TABLE borrowers ADD COLUMN IF NOT EXISTS reference_number  varchar(50);
ALTER TABLE borrowers ADD COLUMN IF NOT EXISTS nationality       varchar(100) DEFAULT 'Ghanaian';
ALTER TABLE borrowers ADD COLUMN IF NOT EXISTS marital_status    varchar(50);    -- Single / Married / Divorced / Widowed
ALTER TABLE borrowers ADD COLUMN IF NOT EXISTS spouse_name       varchar(255);
ALTER TABLE borrowers ADD COLUMN IF NOT EXISTS spouse_phone      varchar(50);
ALTER TABLE borrowers ADD COLUMN IF NOT EXISTS next_of_kin_name         varchar(255);
ALTER TABLE borrowers ADD COLUMN IF NOT EXISTS next_of_kin_relationship varchar(100);
ALTER TABLE borrowers ADD COLUMN IF NOT EXISTS next_of_kin_phone        varchar(50);
ALTER TABLE borrowers ADD COLUMN IF NOT EXISTS postal_address       text;
ALTER TABLE borrowers ADD COLUMN IF NOT EXISTS residential_address  text;
ALTER TABLE borrowers ADD COLUMN IF NOT EXISTS nearest_landmark     text;
-- `address` (existing) is kept for backward compatibility; new code writes `residential_address`.

-- ─── LOANS: add paper-form fields ─────────────────────────
ALTER TABLE loans ADD COLUMN IF NOT EXISTS amount_in_words     varchar(500);
ALTER TABLE loans ADD COLUMN IF NOT EXISTS purpose             varchar(500);
ALTER TABLE loans ADD COLUMN IF NOT EXISTS commencement_date   date;      -- alias of start_date for paper-form clarity
ALTER TABLE loans ADD COLUMN IF NOT EXISTS expiry_date         date;      -- alias of end_date for paper-form clarity
ALTER TABLE loans ADD COLUMN IF NOT EXISTS applicant_confirmed_at   timestamptz;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS guarantor_confirmed_at   timestamptz;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS late_penalty_percent     numeric(5,2) DEFAULT 20.00;
  -- 20% on paper. Editable in Settings. Stored per-loan so historical loans keep their original rate
  -- even if the global default is changed later.

-- ─── AGENTS: add configurable late-penalty default ─────────
ALTER TABLE agents ADD COLUMN IF NOT EXISTS default_late_penalty_percent numeric(5,2) DEFAULT 20.00;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS default_processing_fee_percent numeric(5,2) DEFAULT 4.00;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS default_interest_rate_percent  numeric(5,2) DEFAULT 10.00;

-- ─── Backfill: copy existing dates into new aliases ───────
UPDATE loans SET commencement_date = start_date WHERE commencement_date IS NULL;
UPDATE loans SET expiry_date       = end_date   WHERE expiry_date       IS NULL;

-- ─── Indexes for the new searchable fields ────────────────
CREATE INDEX IF NOT EXISTS borrowers_reference_idx   ON borrowers (reference_number);
CREATE INDEX IF NOT EXISTS borrowers_landmark_idx    ON borrowers USING gin (to_tsvector('simple', coalesce(nearest_landmark, '')));

-- ─── Verification query (run this after migration) ────────
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name IN ('borrowers','loans','agents')
-- ORDER BY table_name, ordinal_position;

-- Done. Existing data is preserved. Existing columns are untouched.
