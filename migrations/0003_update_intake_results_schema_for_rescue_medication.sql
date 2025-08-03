-- Migration number: 0003 	 2025-08-02T16:56:22.598Z
-- Update intake_results table schema to match new requirements
-- Changes:
-- 1. Simplify schema structure to match provided specification

-- Step 1: Create new table with updated schema
CREATE TABLE intake_results_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_log_id INTEGER NOT NULL,
  alert_rule_id INTEGER NOT NULL,
  intake_status TEXT NOT NULL,
  FOREIGN KEY (activity_log_id) REFERENCES activity_logs(id),
  FOREIGN KEY (alert_rule_id) REFERENCES alert_rules(id)
);

-- Step 2: Copy existing data
INSERT INTO intake_results_new (id, activity_log_id, alert_rule_id, intake_status)
SELECT id, activity_log_id, alert_rule_id, intake_status
FROM intake_results;

-- Step 3: Drop old table
DROP TABLE intake_results;

-- Step 4: Rename new table
ALTER TABLE intake_results_new RENAME TO intake_results;
