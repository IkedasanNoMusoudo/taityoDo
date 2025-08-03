# RAG機能実装ドキュメント

## 概要
メンタルヘルスケアアプリケーションにRAG（Retrieval-Augmented Generation）機能を実装しました。患者の過去の記録を参照してパーソナライズされた応答を生成します。

## 実装機能

### 1. 日々のフィードバック機能
- **エンドポイント**: `POST /api/records`
- **機能**: 体調記録投稿時にAIが過去7日間の記録を参照して励ましメッセージを生成
- **レスポンス例**:
```json
{
  "message": "Record created successfully",
  "feedback": "今日も元気に過ごせて良かったですね！薬をきちんと飲んで、安定しているのは素晴らしいです。"
}
```

### 2. 医師向けレポート生成機能
- **エンドポイント**: `POST /api/reports/generate`
- **機能**: 指定期間の記録から客観的要約と医師向け重要事項を生成
- **パラメータ**:
```json
{
  "user_id": 1,
  "start_date": "2025-07-19",
  "end_date": "2025-08-02"
}
```

### 3. レポートプレビュー機能
- **エンドポイント**: `GET /api/reports/preview/{userId}/{startDate}/{endDate}`
- **機能**: レポート生成前にデータ確認

## 技術構成

### アーキテクチャ
- **Cloudflare Workers**: サーバーレス実行環境
- **D1 Database**: データストレージ
- **Google Gemini API**: LLMによるテキスト生成

### 主要ファイル
- `src/services/rag.ts`: RAGサービスの実装
- `src/routes/reports.ts`: レポート生成API
- `src/routes/records.ts`: フィードバック機能付き記録API
- `migrations/0006_simple_mock_data.sql`: テスト用データ

## セットアップ手順

### 1. 依存関係のインストール
```bash
npm install @google/generative-ai
```

### 2. 環境変数の設定
```bash
# wrangler.tomlに以下を追加（ローカル開発用）
[vars]
GEMINI_API_KEY = "your-google-gemini-api-key"
```

### 3. データベースのセットアップ
```bash
# マイグレーション実行
npx wrangler d1 execute after-care-db --local --file=./migrations/0001_initial.sql
npx wrangler d1 execute after-care-db --local --file=./migrations/0002_add_line_id_to_accounts_table.sql
npx wrangler d1 execute after-care-db --local --file=./migrations/0006_simple_mock_data.sql
```

### 4. 開発サーバー起動
```bash
npx wrangler dev src/index.ts --local
```

## テスト方法

### テストスクリプトの実行
```bash
chmod +x test_rag.sh
./test_rag.sh
```

### 手動テスト
```bash
# フィードバック機能テスト
curl -X POST "http://localhost:8787/api/records" \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "condition": "〇", "form": "今日は調子が良いです"}'

# レポート生成テスト
curl -X POST "http://localhost:8787/api/reports/generate" \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "start_date": "2025-07-19", "end_date": "2025-08-02"}'
```

## セキュリティ考慮事項

### 機密情報の管理
- Google Gemini APIキーは環境変数で管理
- 本番環境ではCloudflare Workersの環境変数機能を使用
- APIキーをGitにコミットしないよう注意

### ハルシネーション対策
- プロンプトで事実と推論を明確に区別
- 医師向けレポートでは客観的記述を重視
- エラー時のフォールバックメッセージを実装

## 今後の改善点

1. **ベクトル検索の導入**: より高度なRAG機能
2. **ファインチューニング**: 医療ドメイン特化モデル
3. **多言語対応**: 国際化対応
4. **リアルタイム更新**: WebSocketによるライブフィードバック