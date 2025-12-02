-- Delete Old Format Indicators (JSON Schema - Epic 1.0/2.0)
-- This script identifies and deletes indicators using the old JSON Schema format
-- SAFETY: Only deletes old format indicators if their governance area has at least 1 new format indicator
-- The old format has: {"type": "object", "properties": {...}, "required": [...]}
-- The new format has: {"fields": [...]} or {"sections": [...]}

-- Step 1: Show all indicators by governance area and format
SELECT
    ga.id as governance_area_id,
    ga.name as governance_area_name,
    COUNT(CASE
        WHEN i.form_schema::jsonb ? 'type'
             AND NOT (i.form_schema::jsonb ? 'fields')
             AND NOT (i.form_schema::jsonb ? 'sections')
        THEN 1
    END) as old_format_count,
    COUNT(CASE
        WHEN i.form_schema::jsonb ? 'sections' OR i.form_schema::jsonb ? 'fields'
        THEN 1
    END) as new_format_count,
    COUNT(*) as total_indicators
FROM governance_areas ga
LEFT JOIN indicators i ON ga.id = i.governance_area_id
GROUP BY ga.id, ga.name
ORDER BY ga.id;

-- Step 2: Show specific indicators that will be deleted
-- (Only old format indicators from governance areas that have new format ones)
SELECT
    i.id,
    i.code,
    i.name,
    i.governance_area_id,
    ga.name as governance_area_name,
    'OLD FORMAT (will be deleted)' as status
FROM indicators i
JOIN governance_areas ga ON i.governance_area_id = ga.id
WHERE i.form_schema::jsonb ? 'type'
    AND NOT (i.form_schema::jsonb ? 'fields')
    AND NOT (i.form_schema::jsonb ? 'sections')
    AND EXISTS (
        -- Only delete if governance area has at least 1 new format indicator
        SELECT 1 FROM indicators i2
        WHERE i2.governance_area_id = i.governance_area_id
        AND (i2.form_schema::jsonb ? 'sections' OR i2.form_schema::jsonb ? 'fields')
    )
ORDER BY i.governance_area_id, i.id;

-- Step 3: Delete cascade dependencies
-- IMPORTANT: Only deletes old format indicators from governance areas that have new format ones
-- Delete feedback comments
DELETE FROM feedback_comments
WHERE response_id IN (
    SELECT ar.id FROM assessment_responses ar
    WHERE ar.indicator_id IN (
        SELECT id FROM indicators i
        WHERE i.form_schema::jsonb ? 'type'
            AND NOT (i.form_schema::jsonb ? 'fields')
            AND NOT (i.form_schema::jsonb ? 'sections')
            AND EXISTS (
                SELECT 1 FROM indicators i2
                WHERE i2.governance_area_id = i.governance_area_id
                AND (i2.form_schema::jsonb ? 'sections' OR i2.form_schema::jsonb ? 'fields')
            )
    )
);

-- Delete assessment responses
DELETE FROM assessment_responses
WHERE indicator_id IN (
    SELECT id FROM indicators i
    WHERE i.form_schema::jsonb ? 'type'
        AND NOT (i.form_schema::jsonb ? 'fields')
        AND NOT (i.form_schema::jsonb ? 'sections')
        AND EXISTS (
            SELECT 1 FROM indicators i2
            WHERE i2.governance_area_id = i.governance_area_id
            AND (i2.form_schema::jsonb ? 'sections' OR i2.form_schema::jsonb ? 'fields')
        )
);

-- Delete indicator history
DELETE FROM indicators_history
WHERE indicator_id IN (
    SELECT id FROM indicators i
    WHERE i.form_schema::jsonb ? 'type'
        AND NOT (i.form_schema::jsonb ? 'fields')
        AND NOT (i.form_schema::jsonb ? 'sections')
        AND EXISTS (
            SELECT 1 FROM indicators i2
            WHERE i2.governance_area_id = i.governance_area_id
            AND (i2.form_schema::jsonb ? 'sections' OR i2.form_schema::jsonb ? 'fields')
        )
);

-- Step 4: Delete the old format indicators
-- SAFETY: Only deletes if governance area has at least 1 new format indicator remaining
DELETE FROM indicators i
WHERE i.form_schema::jsonb ? 'type'
    AND NOT (i.form_schema::jsonb ? 'fields')
    AND NOT (i.form_schema::jsonb ? 'sections')
    AND EXISTS (
        SELECT 1 FROM indicators i2
        WHERE i2.governance_area_id = i.governance_area_id
        AND (i2.form_schema::jsonb ? 'sections' OR i2.form_schema::jsonb ? 'fields')
    );

-- Step 5: Show summary of remaining indicators by governance area
SELECT
    ga.id as governance_area_id,
    ga.name as governance_area_name,
    COUNT(CASE
        WHEN i.form_schema::jsonb ? 'type'
             AND NOT (i.form_schema::jsonb ? 'fields')
             AND NOT (i.form_schema::jsonb ? 'sections')
        THEN 1
    END) as old_format_count,
    COUNT(CASE
        WHEN i.form_schema::jsonb ? 'sections' OR i.form_schema::jsonb ? 'fields'
        THEN 1
    END) as new_format_count,
    COUNT(*) as total_indicators
FROM governance_areas ga
LEFT JOIN indicators i ON ga.id = i.governance_area_id
GROUP BY ga.id, ga.name
ORDER BY ga.id;

-- Step 6: Show summary by format type
SELECT
    CASE
        WHEN form_schema::jsonb ? 'sections'
        THEN 'Epic 3.0 (sections-based)'
        WHEN form_schema::jsonb ? 'fields'
        THEN 'Epic 4.0 (fields-based)'
        WHEN form_schema::jsonb ? 'type'
        THEN 'OLD FORMAT (Epic 1.0/2.0 - JSON Schema)'
        ELSE 'OTHER'
    END as format_type,
    COUNT(*) as count
FROM indicators
GROUP BY format_type
ORDER BY format_type;

-- Step 7: Show total count
SELECT 'Total Indicators Remaining' as summary, COUNT(*) as count FROM indicators;
