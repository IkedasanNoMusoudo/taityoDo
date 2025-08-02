-- Migration number: 0003 	 2025-08-02T16:56:22.598Z
-- Update intake_results table to support rescue medication (tonpuku)
-- Changes:
-- 1. alert_rule_id: NOT NULL UNIQUE -> UNIQUE (allow NULL for rescue medication)
-- 2. Add taken_at column for rescue medication timestamp

-- Step 1: Create new table with updated schema
CREATE TABLE intake_results_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_log_id INTEGER NOT NULL,
  alert_rule_id INTEGER UNIQUE,  -- Changed: removed NOT NULL, allow NULL for rescue medication
  intake_status TEXT CHECK (intake_status IN (
    '多く飲んだ', '飲めた', '少なめに飲んだ', '飲んでない'
  )) NOT NULL,
  taken_at TEXT,  -- New: timestamp for rescue medication (e.g., '14:35')
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
