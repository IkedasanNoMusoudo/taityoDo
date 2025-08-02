#!/bin/bash

# RAG機能テストスクリプト
BASE_URL="http://localhost:8787/api"

echo "=== RAG機能テスト開始 ==="

echo ""
echo "1. 新しい体調記録を投稿してRAGフィードバックを確認"
echo "POST ${BASE_URL}/records"

curl -X POST "${BASE_URL}/records" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "condition": "〇",
    "form": "今日はとても調子が良いです！朝からすっきり起きられました。",
    "occurred_at": "2025-08-02T14:00:00"
  }' | jq .

echo ""
echo "2. 医師向けレポート生成テスト"
echo "POST ${BASE_URL}/reports/generate"

curl -X POST "${BASE_URL}/reports/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "start_date": "2025-07-19",
    "end_date": "2025-08-02"
  }' | jq .

echo ""
echo "3. レポートプレビューテスト"
echo "GET ${BASE_URL}/reports/preview/1/2025-07-19/2025-08-02"

curl -X GET "${BASE_URL}/reports/preview/1/2025-07-19/2025-08-02" | jq .

echo ""
echo "=== RAG機能テスト完了 ==="