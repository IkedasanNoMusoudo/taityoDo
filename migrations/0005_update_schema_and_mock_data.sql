-- Update database schema to match the new design and insert mock data

-- Clear existing data first
DELETE FROM records;
DELETE FROM users;
DELETE FROM accounts;

-- Reset auto-increment counters
DELETE FROM sqlite_sequence WHERE name IN ('accounts', 'users', 'records');

-- Insert test accounts
INSERT INTO accounts (email, hashed_password, line_id) VALUES 
('test.patient@example.com', 'hashed_password_123', 'line_user_001'),
('patient2@example.com', 'hashed_password_456', 'line_user_002');

-- Insert test users
INSERT INTO users (name, account_id) VALUES 
('田中太郎', 1),
('佐藤花子', 2);

-- Insert health condition records with current table structure (user_id based)
-- Using timestamps in the past 14 days to simulate realistic data
INSERT INTO records (user_id, condition, form) VALUES 
-- 2週間前 (調子悪い期間)
(1, '×', '全然眠れなかった。不安が強い'),
(1, '×', '朝起きるのがとても辛い'),
(1, '△', '少し気分が重い'),
(1, '×', '薬を飲むのを忘れてしまった'),
(1, '△', '夜中に目が覚める'),
-- 1週間前 (回復傾向)
(1, '△', '少しずつ良くなってる気がする'),
(1, '○', 'よく眠れた！初めて'),
(1, '△', '昨日よりは少しマシ'),
(1, '○', 'よく眠れた！'),
(1, '○', '気分が軽くなってきた'),
-- 最近 (安定期)
(1, '○', '朝の調子が良い'),
(1, '○', '調子いいです'),
(1, '○', '朝すっきり起きられた'),
(1, '△', '少し疲れ気味だけど大丈夫'),
(1, '○', '今日は頑張れそう'),
(1, '○', 'お昼も元気です'),
(1, '○', '夜も調子が良い'),
(1, '○', '薬のおかげか安定してる'),
(1, '△', '少し眠気があるけど大丈夫'),
(1, '○', '今日も一日頑張れました'),
-- 今日の記録
(1, '○', '朝から調子が良い'),
(1, '○', '今日も元気に過ごせています');

-- User 2のデータも少し追加
INSERT INTO records (user_id, condition, form) VALUES 
(2, '△', '最近少し調子が悪い'),
(2, '○', '今日は良い感じ'),
(2, '△', 'まあまあの調子');