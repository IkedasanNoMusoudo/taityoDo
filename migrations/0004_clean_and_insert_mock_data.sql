-- Clean existing data and insert fresh mock data for testing RAG functionality

-- Clear existing data
DELETE FROM intake_results;
DELETE FROM records;
DELETE FROM activity_logs;
DELETE FROM alert_rules;
DELETE FROM record_reminder_rules;
DELETE FROM diagnosis_schedules;
DELETE FROM medications;
DELETE FROM users;
DELETE FROM accounts;

-- Reset auto-increment counters
DELETE FROM sqlite_sequence WHERE name IN ('accounts', 'users', 'medications', 'alert_rules', 'record_reminder_rules', 'diagnosis_schedules', 'activity_logs', 'records', 'intake_results');

-- Insert test accounts
INSERT INTO accounts (email, hashed_password, line_id) VALUES 
('test.patient@example.com', 'hashed_password_123', 'line_user_001'),
('patient2@example.com', 'hashed_password_456', 'line_user_002');

-- Insert test users
INSERT INTO users (name, account_id) VALUES 
('田中太郎', 1),
('佐藤花子', 2);

-- Insert test medications
INSERT INTO medications (name) VALUES 
('セルトラリン25mg'),
('エスシタロプラム10mg'),
('ロラゼパム0.5mg');

-- Insert medication schedules for user 1
INSERT INTO alert_rules (user_id, medication_id, alert_time) VALUES 
(1, 1, '08:00'),
(1, 2, '20:00'),
(1, 3, '22:00');

-- Insert diagnosis schedule
INSERT INTO diagnosis_schedules (user_id, next_date) VALUES 
(1, '2025-08-15'),
(2, '2025-08-20');

-- Insert record reminder rules
INSERT INTO record_reminder_rules (user_id, alert_time, enabled) VALUES 
(1, '08:00', 1),
(1, '12:00', 1),
(1, '20:00', 1);

-- Insert activity logs with realistic timeline (last 14 days)
INSERT INTO activity_logs (user_id, occurred_at) VALUES 
-- 2週間前
(1, '2025-07-19T08:00:00'),
(1, '2025-07-19T20:00:00'),
(1, '2025-07-19T22:00:00'),
-- 13日前
(1, '2025-07-20T08:00:00'),
(1, '2025-07-20T20:00:00'),
(1, '2025-07-20T22:00:00'),
-- 12日前
(1, '2025-07-21T08:00:00'),
(1, '2025-07-21T20:00:00'),
(1, '2025-07-21T22:00:00'),
-- 11日前
(1, '2025-07-22T08:00:00'),
(1, '2025-07-22T20:00:00'),
(1, '2025-07-22T22:00:00'),
-- 10日前
(1, '2025-07-23T08:00:00'),
(1, '2025-07-23T20:00:00'),
(1, '2025-07-23T22:00:00'),
-- 9日前
(1, '2025-07-24T08:00:00'),
(1, '2025-07-24T20:00:00'),
(1, '2025-07-24T22:00:00'),
-- 8日前
(1, '2025-07-25T08:00:00'),
(1, '2025-07-25T20:00:00'),
(1, '2025-07-25T22:00:00'),
-- 7日前
(1, '2025-07-26T08:00:00'),
(1, '2025-07-26T20:00:00'),
(1, '2025-07-26T22:00:00'),
-- 6日前
(1, '2025-07-27T08:00:00'),
(1, '2025-07-27T20:00:00'),
(1, '2025-07-27T22:00:00'),
-- 5日前
(1, '2025-07-28T08:00:00'),
(1, '2025-07-28T20:00:00'),
(1, '2025-07-28T22:00:00'),
-- 4日前
(1, '2025-07-29T08:00:00'),
(1, '2025-07-29T20:00:00'),
(1, '2025-07-29T22:00:00'),
-- 3日前
(1, '2025-07-30T08:00:00'),
(1, '2025-07-30T20:00:00'),
(1, '2025-07-30T22:00:00'),
-- 2日前
(1, '2025-07-31T08:00:00'),
(1, '2025-07-31T20:00:00'),
(1, '2025-07-31T22:00:00'),
-- 昨日
(1, '2025-08-01T08:00:00'),
(1, '2025-08-01T20:00:00'),
(1, '2025-08-01T22:00:00'),
-- 今日
(1, '2025-08-02T08:00:00'),
(1, '2025-08-02T12:00:00'),
(1, '2025-08-02T20:00:00');

-- Insert health condition records with varied patterns
INSERT INTO records (activity_log_id, condition, form) VALUES 
-- 2週間前 (調子悪い期間)
(1, '×', '全然眠れなかった。不安が強い'),
(4, '×', '朝起きるのがとても辛い'),
(7, '△', '少し気分が重い'),
(10, '×', '薬を飲むのを忘れてしまった'),
(13, '△', '夜中に目が覚める'),
(16, '△', '少しずつ良くなってる気がする'),
(19, '○', 'よく眠れた！初めて'),
-- 1週間前 (回復傾向)
(22, '△', '昨日よりは少しマシ'),
(25, '○', 'よく眠れた！'),
(28, '○', '気分が軽くなってきた'),
(31, '○', '朝の調子が良い'),
(34, '○', '調子いいです'),
(37, '○', '朝すっきり起きられた'),
-- 最近 (安定期)
(40, '△', '少し疲れ気味だけど大丈夫'),
(43, '○', '今日は頑張れそう'),
(44, '○', 'お昼も元気です');

-- Insert medication intake records with realistic adherence patterns
INSERT INTO intake_results (activity_log_id, alert_rule_id, intake_status) VALUES 
-- 2週間前 (服薬不安定)
(1, 1, '飲んでない'),
(2, 2, '少なめに飲んだ'),
(3, 3, '飲んでない'),
(4, 1, '少なめに飲んだ'),
(5, 2, '飲めた'),
(6, 3, '飲めた'),
(7, 1, '飲んでない'),
(8, 2, '飲めた'),
(9, 3, '少なめに飲んだ'),
-- 改善期
(10, 1, '飲めた'),
(11, 2, '飲めた'),
(12, 3, '飲めた'),
(13, 1, '飲めた'),
(14, 2, '飲めた'),
(15, 3, '飲めた'),
(16, 1, '飲めた'),
(17, 2, '飲めた'),
(18, 3, '飲めた'),
(19, 1, '飲めた'),
(20, 2, '飲めた'),
(21, 3, '飲めた'),
-- 1週間前から安定
(22, 1, '飲めた'),
(23, 2, '飲めた'),
(24, 3, '飲めた'),
(25, 1, '飲めた'),
(26, 2, '飲めた'),
(27, 3, '飲めた'),
(28, 1, '飲めた'),
(29, 2, '飲めた'),
(30, 3, '飲めた'),
(31, 1, '飲めた'),
(32, 2, '飲めた'),
(33, 3, '飲めた'),
(34, 1, '飲めた'),
(35, 2, '飲めた'),
(36, 3, '飲めた'),
(37, 1, '飲めた'),
(38, 2, '飲めた'),
(39, 3, '飲めた'),
-- 最近
(40, 1, '飲めた'),
(41, 2, '飲めた'),
(42, 3, '飲めた'),
(43, 1, '飲めた'),
(45, 2, '飲めた');