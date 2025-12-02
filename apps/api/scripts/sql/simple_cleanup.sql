-- Simple SQL script to cleanup test data
-- Run this in your Supabase SQL Editor or via psql

-- Step 1: Delete all cascade dependencies for test governance areas
DELETE FROM feedback_comments
WHERE response_id IN (
  SELECT ar.id FROM assessment_responses ar
  JOIN indicators i ON ar.indicator_id = i.id
  JOIN governance_areas ga ON i.governance_area_id = ga.id
  WHERE ga.name LIKE '%Test Governance Area%'
);

DELETE FROM assessment_responses
WHERE indicator_id IN (
  SELECT i.id FROM indicators i
  JOIN governance_areas ga ON i.governance_area_id = ga.id
  WHERE ga.name LIKE '%Test Governance Area%'
);

DELETE FROM indicators_history
WHERE indicator_id IN (
  SELECT i.id FROM indicators i
  JOIN governance_areas ga ON i.governance_area_id = ga.id
  WHERE ga.name LIKE '%Test Governance Area%'
);

DELETE FROM indicators
WHERE governance_area_id IN (
  SELECT id FROM governance_areas
  WHERE name LIKE '%Test Governance Area%'
);

DELETE FROM governance_areas
WHERE name LIKE '%Test Governance Area%';

-- Step 2: Delete duplicate/test indicators
DELETE FROM feedback_comments
WHERE response_id IN (
  SELECT id FROM assessment_responses
  WHERE indicator_id IN (
    SELECT id FROM indicators
    WHERE name LIKE '%Ind A%'
       OR name LIKE '%Test Indicator%'
       OR name = 'TEST'
       OR name = 'test'
       OR name = 'Asnari'
  ) AND indicator_id != 278  -- Keep MOV Upload Test Indicator
);

DELETE FROM assessment_responses
WHERE indicator_id IN (
  SELECT id FROM indicators
  WHERE (name LIKE '%Ind A%'
     OR name LIKE '%Test Indicator%'
     OR name = 'TEST'
     OR name = 'test'
     OR name = 'Asnari')
  AND id != 278  -- Keep MOV Upload Test Indicator
);

DELETE FROM indicators_history
WHERE indicator_id IN (
  SELECT id FROM indicators
  WHERE (name LIKE '%Ind A%'
     OR name LIKE '%Test Indicator%'
     OR name = 'TEST'
     OR name = 'test'
     OR name = 'Asnari')
  AND id != 278  -- Keep MOV Upload Test Indicator
);

DELETE FROM indicators
WHERE (name LIKE '%Ind A%'
   OR name LIKE '%Test Indicator%'
   OR name = 'TEST'
   OR name = 'test'
   OR name = 'Asnari')
AND id != 278;  -- Keep MOV Upload Test Indicator

-- Show what remains
SELECT 'Governance Areas' as table_name, COUNT(*) as count FROM governance_areas
UNION ALL
SELECT 'Indicators', COUNT(*) FROM indicators
UNION ALL
SELECT 'Assessment Responses', COUNT(*) FROM assessment_responses;
