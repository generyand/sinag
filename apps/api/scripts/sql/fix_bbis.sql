-- Fix BBIs with null governance_area_id
-- Option A: Set them to a default governance area (e.g., ID 1)
UPDATE bbis
SET governance_area_id = 1
WHERE governance_area_id IS NULL;

-- Option B: Delete BBIs with null governance_area_id
-- DELETE FROM bbis WHERE governance_area_id IS NULL;

-- Verify the fix
SELECT id, name, governance_area_id FROM bbis WHERE governance_area_id IS NULL;
-- Should return 0 rows
