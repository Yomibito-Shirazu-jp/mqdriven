# 技術負債・プレースホルダ焼き払い計画

**次のエージェント向けの実行ハンドオフ（ファイルアンカー・T1–T12・検証コマンド）:** [`docs/HANDOFF_NEXT_AGENT.md`](./HANDOFF_NEXT_AGENT.md)

会計モジュールの原則（参照専用・0 埋め禁止・VIEW 集計）は `AGENTS.md` を正とする。本書は **残タスクをフェーズ別に追跡**する。

## 完了済み（本ドキュメント作成時点で実施）

- `v_tax_summary`: プレースホルダ `WHERE false` を、勘定「仮受消費税」「仮払消費税」＋`v_accounting_base` ベースの実集計に差し替え（マイグレーション `20260321130000_*`）。
- 未使用 `components/accounting/Accounting.tsx` とルート `components/JournalLedger.tsx` の削除（エントリは `components/Accounting.tsx` のみ）。
- 会計タブの OCR 経費計上: 税抜・税込・OCR 税額を優先するロジックを `components/Accounting.tsx` に統一。
- `addProject`: `projects` への実 insert（AI 案件作成が no-op にならないよう修正）。
- `getAnalysisHistory` / `addAnalysisHistory`: ブラウザ `localStorage` 永続化（サーバテーブルなしでも履歴が消えない）。
- `createInvoiceFromJobs`: 税率を `STANDARD_CONSUMPTION_TAX_RATE` に集約（RPC 化は下記フェーズ 2）。
- `.env.example` / 複数 `scripts/*.ts` から **本番 URL・JWT のハードコードを除去**（環境変数必須）。
- 事業計画データ `businessPlanData.ts` の G 行 `totalValue` を累計データと整合。
- 署名生成失敗時の **特定社名ハードコードフォールバック**を汎用メッセージに変更（`utils.ts`）。
- `components/accounting/JournalReviewPage_OLD.tsx` を削除し、旧レビュー画面の重複を解消。
- `accountingApplicationFilter` の二重定義を整理（`components/accounting/accountingApplicationFilter.ts` を正として統一）。
- `Dashboard` / `UnhandledItemsPage` / `WorkflowNavigator` の実体を `components/accounting/*` 側へ移設し、`src/components/accounting/*` の重複実装を削除。

## フェーズ 1 — 会計データモデル強化（優先）

| 項目 | 内容 | 完了条件 |
|------|------|----------|
| 税区分・税率 | `accounting.journal_lines` に税率／税区分列（または税用補助）を追加 | `v_tax_summary` が複数税率・軽減税率に対応 |
| 仮受／仮払以外 | 売上・仕入の課税標準を税額からの逆算ではなく明細から集計 | 監査に耐える定義をマイグレーションコメントに記載 |

## フェーズ 2 — 請求・案件まわり

| 項目 | 内容 | 完了条件 |
|------|------|----------|
| `createInvoiceFromJobs` | RPC または Edge Function でトランザクション化 | `dataService` のプレースホルダコメント削除、番号採番を DB 側へ |
| `addProject` 添付 | AI 案件のファイルを Storage に上げ `attachments` 等と紐付け | `ProjectCreationPage` のファイルが DB／ストレージに残る |

## フェーズ 3 — 分析・財務フォールバック

| 項目 | 内容 | 完了条件 |
|------|------|----------|
| `getTopExpensesForStatement` 等 | `FINANCIAL_RPC_FALLBACK_*` 依存を廃止 | RPC 成功時のみ返す、または会計年度パラメータ化 |
| `AnythingAnalysisPage` 履歴 | `localStorage` → Supabase テーブル（任意） | 複数端末同期が必要なら DB 化 |

## フェーズ 4 — UI 分割の整理

| 項目 | 内容 | 完了条件 |
|------|------|----------|
| `components/accounting/*` と `src/components/accounting/*` | 単一ディレクトリに集約 | import パスとドキュメントを一本化 |
| `INTEGRATION_MANIFESTO` / `MOCK_CLIENTS` | 実マスタ取得または削除 | `constants.ts` の「プロトタイプ固定値」を解消 |

## フェーズ 5 — セキュリティ・運用

| 項目 | 内容 | 完了条件 |
|------|------|----------|
| リポジトリ監査 | 過去コミットに漏れたキーがないか `git log -S` で確認 | 漏れていればローテーション |
| MCP / 分析ページ | 接続情報は常に環境変数経由 | ハードコード ref なし |

---

更新ルール: フェーズの項目を潰したら本書を更新し、`AGENTS.md` の「直近の改善候補」と相互参照を合わせる。
