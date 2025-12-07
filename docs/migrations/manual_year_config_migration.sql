-- ============================================================================
-- Manual Migration: Assessment Year Config and Indicator Snapshots
-- ============================================================================
-- Run this SQL directly in Supabase SQL Editor if the Alembic migration
-- times out due to Supabase's statement timeout limit.
--
-- This migration adds:
-- 1. assessment_year_configs table
-- 2. assessment_indicator_snapshots table
-- 3. assessment_year columns to assessments and assessment_responses tables
-- 4. indicator_version column to assessment_responses table
-- ============================================================================

-- Step 1: Create assessment_year_configs table
CREATE TABLE IF NOT EXISTS assessment_year_configs (
    id SERIAL PRIMARY KEY,
    current_assessment_year INTEGER NOT NULL,
    assessment_period_start TIMESTAMP NOT NULL,
    assessment_period_end TIMESTAMP NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    activated_at TIMESTAMP,
    activated_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    deactivated_at TIMESTAMP,
    deactivated_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ix_assessment_year_configs_current_assessment_year
    ON assessment_year_configs(current_assessment_year);
CREATE INDEX IF NOT EXISTS ix_assessment_year_configs_id
    ON assessment_year_configs(id);
CREATE INDEX IF NOT EXISTS ix_assessment_year_configs_is_active
    ON assessment_year_configs(is_active);

-- Step 2: Create assessment_indicator_snapshots table
CREATE TABLE IF NOT EXISTS assessment_indicator_snapshots (
    id SERIAL PRIMARY KEY,
    assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    indicator_id INTEGER NOT NULL REFERENCES indicators(id) ON DELETE CASCADE,
    indicator_version INTEGER NOT NULL,
    assessment_year INTEGER NOT NULL,
    indicator_code VARCHAR(50),
    name VARCHAR NOT NULL,
    description VARCHAR,
    is_active BOOLEAN NOT NULL,
    is_auto_calculable BOOLEAN NOT NULL,
    is_profiling_only BOOLEAN NOT NULL,
    is_bbi BOOLEAN NOT NULL DEFAULT FALSE,
    validation_rule VARCHAR(50) NOT NULL,
    form_schema_resolved JSONB,
    calculation_schema_resolved JSONB,
    remark_schema_resolved JSONB,
    technical_notes_resolved TEXT,
    checklist_items_resolved JSONB,
    governance_area_id INTEGER NOT NULL,
    parent_id INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_assessment_indicator_snapshots_assessment_id
    ON assessment_indicator_snapshots(assessment_id);
CREATE INDEX IF NOT EXISTS ix_assessment_indicator_snapshots_id
    ON assessment_indicator_snapshots(id);
CREATE INDEX IF NOT EXISTS ix_assessment_indicator_snapshots_indicator_id
    ON assessment_indicator_snapshots(indicator_id);

-- Step 3: Add columns to assessment_responses table
-- Run these one at a time if timeouts occur
ALTER TABLE assessment_responses
    ADD COLUMN IF NOT EXISTS indicator_version INTEGER;

ALTER TABLE assessment_responses
    ADD COLUMN IF NOT EXISTS assessment_year INTEGER;

-- Step 4: Add column to assessments table
ALTER TABLE assessments
    ADD COLUMN IF NOT EXISTS assessment_year INTEGER;

CREATE INDEX IF NOT EXISTS ix_assessments_assessment_year
    ON assessments(assessment_year);

-- Step 5: Insert the initial year configuration for 2025
-- Uncomment and run this to create the active year config
/*
INSERT INTO assessment_year_configs (
    current_assessment_year,
    assessment_period_start,
    assessment_period_end,
    is_active,
    description,
    activated_at
) VALUES (
    2025,
    '2025-01-01 00:00:00',
    '2025-10-31 23:59:59',
    TRUE,
    'Assessment Year 2025 - Initial Configuration',
    NOW()
);
*/

-- Step 6: Update alembic_version to mark migration as complete
-- Run this ONLY after all above steps complete successfully
/*
INSERT INTO alembic_version (version_num)
VALUES ('1bcfb685ada1')
ON CONFLICT (version_num) DO NOTHING;
*/
