-- アカウントテーブル
CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  hashed_password TEXT NOT NULL
);

-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  account_id INTEGER NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- 診断予定テーブル
CREATE TABLE IF NOT EXISTS diagnosis_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  next_date TEXT NOT NULL,  -- 例: '2025-08-20'
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 自由記録の通知ルール（1日複数回）
CREATE TABLE IF NOT EXISTS record_reminder_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  alert_time TEXT NOT NULL,     -- 例: '08:00'
  enabled INTEGER NOT NULL DEFAULT 1, -- 0: 無効, 1: 有効
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- アクティビティログ（共通の記録親）
CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  occurred_at TEXT NOT NULL,    -- 例: '2025-08-02T07:00'
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 自由記録テーブル
CREATE TABLE IF NOT EXISTS records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_log_id INTEGER NOT NULL,
  condition TEXT CHECK (condition IN ('〇', '△', '×')) NOT NULL,
  form TEXT,
  FOREIGN KEY (activity_log_id) REFERENCES activity_logs(id)
);

-- 薬マスタテーブル
CREATE TABLE IF NOT EXISTS medications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);

-- 薬の通知ルール（1:1対応の服薬通知）
CREATE TABLE IF NOT EXISTS alert_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  medication_id INTEGER NOT NULL,
  alert_time TEXT NOT NULL,    -- 例: '07:00'
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (medication_id) REFERENCES medications(id)
);

-- 服薬実績テーブル（1:1でalert_rulesと対応）
CREATE TABLE IF NOT EXISTS intake_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_log_id INTEGER NOT NULL,
  alert_rule_id INTEGER NOT NULL UNIQUE,  -- 1:1 対応
  intake_status TEXT CHECK (intake_status IN (
    '多く飲んだ', '飲めた', '少なめに飲んだ', '飲んでない'
  )) NOT NULL,
  FOREIGN KEY (activity_log_id) REFERENCES activity_logs(id),
  FOREIGN KEY (alert_rule_id) REFERENCES alert_rules(id)
);