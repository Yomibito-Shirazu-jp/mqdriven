-- ============================================================
-- 2026-03-12 経費分析ビュー作成
-- v_expense_lines / v_expense_by_month_account / supplier / project
-- ============================================================

-- ========================================
-- 1. v_expense_lines: 費用科目の仕訳明細（1行=1レコード）
-- ========================================
DROP VIEW IF EXISTS public.v_expense_lines CASCADE;
CREATE OR REPLACE VIEW public.v_expense_lines AS
SELECT
  jl.id                                    AS journal_line_id,
  je.entry_date                            AS occurred_on,
  jl.project_id,
  p.project_code,
  a.id                                     AS account_id,
  a.code                                   AS account_code,
  a.name                                   AS account_name,
  (jl.debit - jl.credit)                   AS amount,
  COALESCE(pr.id, NULL)                    AS supplier_id,
  COALESCE(pr.company_name, pr.recipient_name) AS supplier_name,
  je.id                                    AS journal_entry_id,
  jb.id                                    AS journal_batch_id,
  jb.status                                AS batch_status,
  jb.posted_at                             AS batch_posted_at,
  jl.description,
  je.description                           AS entry_description
FROM accounting.journal_lines jl
JOIN accounting.journal_entries je         ON je.id = jl.journal_entry_id
JOIN accounting.accounts a                ON a.id  = jl.account_id
JOIN accounting.journal_batches jb        ON jb.id = je.batch_id
LEFT JOIN public.projects p               ON p.id  = jl.project_id
LEFT JOIN accounting.payables ap          ON ap.journal_line_id = jl.id
LEFT JOIN public.payment_recipients pr    ON pr.id = ap.supplier_id
WHERE a.account_type = 'expense'
   OR (a.account_type IS NULL AND LEFT(a.code, 1) IN ('5','6','7','8'));

GRANT SELECT ON public.v_expense_lines TO authenticated;
GRANT SELECT ON public.v_expense_lines TO anon;

-- ========================================
-- 2. v_expense_by_month_account: 月×勘定科目別集計
-- ========================================
DROP VIEW IF EXISTS public.v_expense_by_month_account CASCADE;
CREATE OR REPLACE VIEW public.v_expense_by_month_account AS
SELECT
  date_trunc('month', je.entry_date)::date AS month,
  a.id                                     AS account_id,
  a.code                                   AS account_code,
  a.name                                   AS account_name,
  COUNT(*)                                 AS line_count,
  SUM(jl.debit - jl.credit)               AS total_amount
FROM accounting.journal_lines jl
JOIN accounting.journal_entries je         ON je.id = jl.journal_entry_id
JOIN accounting.accounts a                ON a.id  = jl.account_id
JOIN accounting.journal_batches jb        ON jb.id = je.batch_id
WHERE (a.account_type = 'expense'
   OR (a.account_type IS NULL AND LEFT(a.code, 1) IN ('5','6','7','8')))
GROUP BY date_trunc('month', je.entry_date)::date, a.id, a.code, a.name
ORDER BY month DESC, total_amount DESC;

GRANT SELECT ON public.v_expense_by_month_account TO authenticated;
GRANT SELECT ON public.v_expense_by_month_account TO anon;

-- ========================================
-- 3. v_expense_by_month_supplier: 月×仕入先別集計
-- ========================================
DROP VIEW IF EXISTS public.v_expense_by_month_supplier CASCADE;
CREATE OR REPLACE VIEW public.v_expense_by_month_supplier AS
SELECT
  date_trunc('month', je.entry_date)::date AS month,
  COALESCE(pr.id, NULL)                    AS supplier_id,
  COALESCE(pr.company_name, pr.recipient_name, '(仕入先未設定)') AS supplier_name,
  COUNT(*)                                 AS line_count,
  SUM(jl.debit - jl.credit)               AS total_amount
FROM accounting.journal_lines jl
JOIN accounting.journal_entries je         ON je.id = jl.journal_entry_id
JOIN accounting.accounts a                ON a.id  = jl.account_id
JOIN accounting.journal_batches jb        ON jb.id = je.batch_id
LEFT JOIN accounting.payables ap          ON ap.journal_line_id = jl.id
LEFT JOIN public.payment_recipients pr    ON pr.id = ap.supplier_id
WHERE (a.account_type = 'expense'
   OR (a.account_type IS NULL AND LEFT(a.code, 1) IN ('5','6','7','8')))
GROUP BY date_trunc('month', je.entry_date)::date, pr.id, pr.company_name, pr.recipient_name
ORDER BY month DESC, total_amount DESC;

GRANT SELECT ON public.v_expense_by_month_supplier TO authenticated;
GRANT SELECT ON public.v_expense_by_month_supplier TO anon;

-- ========================================
-- 4. v_expense_by_month_project: 月×プロジェクト別集計
-- ========================================
DROP VIEW IF EXISTS public.v_expense_by_month_project CASCADE;
CREATE OR REPLACE VIEW public.v_expense_by_month_project AS
SELECT
  date_trunc('month', je.entry_date)::date AS month,
  jl.project_id,
  COALESCE(p.project_code, '(プロジェクト未設定)') AS project_code,
  COALESCE(p.project_name, '(プロジェクト未設定)') AS project_name,
  COUNT(*)                                 AS line_count,
  SUM(jl.debit - jl.credit)               AS total_amount
FROM accounting.journal_lines jl
JOIN accounting.journal_entries je         ON je.id = jl.journal_entry_id
JOIN accounting.accounts a                ON a.id  = jl.account_id
JOIN accounting.journal_batches jb        ON jb.id = je.batch_id
LEFT JOIN public.projects p               ON p.id  = jl.project_id
WHERE (a.account_type = 'expense'
   OR (a.account_type IS NULL AND LEFT(a.code, 1) IN ('5','6','7','8')))
GROUP BY date_trunc('month', je.entry_date)::date, jl.project_id, p.project_code, p.project_name
ORDER BY month DESC, total_amount DESC;

GRANT SELECT ON public.v_expense_by_month_project TO authenticated;
GRANT SELECT ON public.v_expense_by_month_project TO anon;

-- スキーマキャッシュ更新
NOTIFY pgrst, 'reload schema';
