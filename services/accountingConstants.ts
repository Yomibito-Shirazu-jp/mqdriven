/**
 * 会計・税まわりの単一ソース定数（暫定ロジック・UI で共有）
 * 税率マスタや仕訳明細の税区分列が DB に載ったら、参照先を差し替えること。
 */

/** 標準税率（例: 10%）。インボイス／暫定請求・OCR 補完で共通利用 */
export const STANDARD_CONSUMPTION_TAX_RATE = 0.1;

/** get_financial_statements RPC 失敗時の広いフォールバック期間（要: RPC 安定化後に削除） */
export const FINANCIAL_RPC_FALLBACK_START_DATE = '2000-01-01';
export const FINANCIAL_RPC_FALLBACK_END_DATE = '2099-12-31';
