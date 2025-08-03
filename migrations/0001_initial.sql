-- accounts
CREATE TABLE accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  hashed_password TEXT NOT NULL
);

-- users
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  account_id INTEGER NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- diagnosis_schedules（次回診察予定）
CREATE TABLE diagnosis_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  next_date TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- record_reminder_rules（自由記録の通知ルール）
CREATE TABLE record_reminder_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  alert_time TEXT NOT NULL,
  enabled INTEGER NOT NULL CHECK (enabled IN (0, 1)),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- activity_logs（全記録の親）
CREATE TABLE activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  occurred_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- activity_feedbacks（活動記録に基づいたフィードバック）
CREATE TABLE activity_feedbacks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_log_id INTEGER NOT NULL UNIQUE,
  feedback TEXT NOT NULL,
  FOREIGN KEY (activity_log_id) REFERENCES activity_logs(id)
);

-- records（自由記録：体調や内容）
CREATE TABLE records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_log_id INTEGER NOT NULL,
  condition TEXT CHECK (condition IN ('〇', '△', '×')),
  form TEXT,
  FOREIGN KEY (activity_log_id) REFERENCES activity_logs(id)
);

-- medications（薬マスタ）
CREATE TABLE medications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);

-- alert_rules（服薬通知ルール）
CREATE TABLE alert_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  medication_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  alert_time TEXT NOT NULL,
  dosage TEXT NOT NULL,
  FOREIGN KEY (medication_id) REFERENCES medications(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- intake_results（服薬実績）
CREATE TABLE intake_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_log_id INTEGER NOT NULL,
  alert_rule_id INTEGER NOT NULL,
  intake_status TEXT NOT NULL,
  FOREIGN KEY (activity_log_id) REFERENCES activity_logs(id),
  FOREIGN KEY (alert_rule_id) REFERENCES alert_rules(id)
);