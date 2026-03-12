-- ============================================================
-- 2026-03-11 請求書OCR対応スキーマ拡張 + 会計VIEW修正
-- ============================================================

-- ========================================
-- 1. expense_invoices: OCR全フィールド対応
-- ========================================
ALTER TABLE public.expense_invoices
  ADD COLUMN IF NOT EXISTS document_type text,
  ADD COLUMN IF NOT EXISTS image_no text,
  ADD COLUMN IF NOT EXISTS closing_date date,
  ADD COLUMN IF NOT EXISTS supplier_postal_code text,
  ADD COLUMN IF NOT EXISTS supplier_address text,
  ADD COLUMN IF NOT EXISTS supplier_contact text,
  ADD COLUMN IF NOT EXISTS recipient_name text,
  ADD COLUMN IF NOT EXISTS recipient_postal_code text,
  ADD COLUMN IF NOT EXISTS recipient_address text,
  ADD COLUMN IF NOT EXISTS recipient_contact text,
  ADD COLUMN IF NOT EXISTS withholding_tax numeric(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_offset numeric(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_amount numeric(18,2),
  ADD COLUMN IF NOT EXISTS bank_account_raw text,
  ADD COLUMN IF NOT EXISTS notes text;

COMMENT ON COLUMN public.expense_invoices.document_type IS '書類種別 (請求書, 納品書, 稟議書 等)';
COMMENT ON COLUMN public.expense_invoices.image_no IS 'OCR画像No (ソース参照)';
COMMENT ON COLUMN public.expense_invoices.closing_date IS '締日';
COMMENT ON COLUMN public.expense_invoices.supplier_postal_code IS '請求元 郵便番号';
COMMENT ON COLUMN public.expense_invoices.supplier_address IS '請求元 住所';
COMMENT ON COLUMN public.expense_invoices.supplier_contact IS '請求元 連絡先';
COMMENT ON COLUMN public.expense_invoices.recipient_name IS '請求先 名称';
COMMENT ON COLUMN public.expense_invoices.recipient_postal_code IS '請求先 郵便番号';
COMMENT ON COLUMN public.expense_invoices.recipient_address IS '請求先 住所';
COMMENT ON COLUMN public.expense_invoices.recipient_contact IS '請求先 連絡先';
COMMENT ON COLUMN public.expense_invoices.withholding_tax IS '源泉徴収税';
COMMENT ON COLUMN public.expense_invoices.discount_offset IS '値引き・繰越相殺';
COMMENT ON COLUMN public.expense_invoices.net_amount IS '差引請求額 (実支払額)';
COMMENT ON COLUMN public.expense_invoices.bank_account_raw IS '振込先 OCR生テキスト';
COMMENT ON COLUMN public.expense_invoices.notes IS '備考';

-- ========================================
-- 2. accounting.accounts: account_type / normal_balance_side 追加
-- ========================================
ALTER TABLE accounting.accounts
  ADD COLUMN IF NOT EXISTS account_type text,
  ADD COLUMN IF NOT EXISTS normal_balance_side text;

COMMENT ON COLUMN accounting.accounts.account_type IS '科目区分 (asset, liability, equity, revenue, expense)';
COMMENT ON COLUMN accounting.accounts.normal_balance_side IS '通常増加側 (debit or credit)';

-- category_code から account_type / normal_balance_side を自動設定
UPDATE accounting.accounts SET
  account_type = CASE
    WHEN category_code IN ('1','10','11','12','13','14','15','16','17','18','19') THEN 'asset'
    WHEN category_code IN ('2','20','21','22','23','24','25','26','27','28','29') THEN 'liability'
    WHEN category_code IN ('3','30','31','32','33') THEN 'equity'
    WHEN category_code IN ('4','40','41','42','43','44','45','46','47','48','49') THEN 'revenue'
    WHEN category_code IN ('5','50','51','52','53','54','55','6','60','61','62','63','64','65','66','67','68','69','7','70','71','72','73','74','75','76','77','78','79','8','80','81','82','83') THEN 'expense'
    ELSE NULL
  END,
  normal_balance_side = CASE
    WHEN category_code IN ('1','10','11','12','13','14','15','16','17','18','19') THEN 'debit'
    WHEN category_code IN ('2','20','21','22','23','24','25','26','27','28','29') THEN 'credit'
    WHEN category_code IN ('3','30','31','32','33') THEN 'credit'
    WHEN category_code IN ('4','40','41','42','43','44','45','46','47','48','49') THEN 'credit'
    WHEN category_code IN ('5','50','51','52','53','54','55','6','60','61','62','63','64','65','66','67','68','69','7','70','71','72','73','74','75','76','77','78','79','8','80','81','82','83') THEN 'debit'
    ELSE NULL
  END
WHERE account_type IS NULL;

-- code先頭1桁でもフォールバック
UPDATE accounting.accounts SET
  account_type = CASE LEFT(code, 1)
    WHEN '1' THEN 'asset'
    WHEN '2' THEN 'liability'
    WHEN '3' THEN 'equity'
    WHEN '4' THEN 'revenue'
    WHEN '5' THEN 'expense'
    WHEN '6' THEN 'expense'
    WHEN '7' THEN 'expense'
    WHEN '8' THEN 'expense'
    WHEN '9' THEN 'expense'
    ELSE 'expense'
  END,
  normal_balance_side = CASE LEFT(code, 1)
    WHEN '1' THEN 'debit'
    WHEN '2' THEN 'credit'
    WHEN '3' THEN 'credit'
    WHEN '4' THEN 'credit'
    WHEN '5' THEN 'debit'
    WHEN '6' THEN 'debit'
    WHEN '7' THEN 'debit'
    WHEN '8' THEN 'debit'
    WHEN '9' THEN 'debit'
    ELSE 'debit'
  END
WHERE account_type IS NULL;

-- public.accounts VIEW も更新
DROP VIEW IF EXISTS public.accounts CASCADE;
CREATE OR REPLACE VIEW public.accounts AS
SELECT id, code, name, category_code, is_active, sort_order,
       created_at, updated_at, mq_code, account_type, normal_balance_side
FROM accounting.accounts;
GRANT SELECT ON public.accounts TO authenticated;
GRANT SELECT ON public.accounts TO anon;

-- ========================================
-- 3. v_accounting_base VIEW 作成
--    journal_lines + journal_entries + accounts を結合
-- ========================================
DROP VIEW IF EXISTS public.v_accounting_base CASCADE;
CREATE OR REPLACE VIEW public.v_accounting_base AS
SELECT
  jl.id,
  je.entry_date AS date,
  a.code,
  a.name,
  a.account_type,
  a.normal_balance_side,
  jl.debit AS debit_amount,
  jl.credit AS credit_amount,
  jl.description AS line_description,
  je.description AS entry_description,
  jb.status,
  jb.id AS batch_id,
  jb.source_application_id,
  je.id AS entry_id
FROM accounting.journal_lines jl
JOIN accounting.journal_entries je ON je.id = jl.journal_entry_id
JOIN accounting.journal_batches jb ON jb.id = je.batch_id
JOIN accounting.accounts a ON a.id = jl.account_id;

GRANT SELECT ON public.v_accounting_base TO authenticated;
GRANT SELECT ON public.v_accounting_base TO anon;

-- ========================================
-- 4. v_journal_book VIEW 作成
--    仕訳帳用: エントリ単位で借方/貸方をまとめる
-- ========================================
DROP VIEW IF EXISTS public.v_journal_book CASCADE;
CREATE OR REPLACE VIEW public.v_journal_book AS
SELECT
  je.id,
  je.entry_date AS date,
  je.description,
  jb.status,
  jb.id AS batch_id,
  jb.source_application_id,
  jb.created_by,
  je.created_at,
  -- 借方科目（複数あれば最大金額のもの）
  (SELECT a.name FROM accounting.journal_lines dl
   JOIN accounting.accounts a ON a.id = dl.account_id
   WHERE dl.journal_entry_id = je.id AND dl.debit > 0
   ORDER BY dl.debit DESC LIMIT 1) AS debit_account_name,
  (SELECT a.code FROM accounting.journal_lines dl
   JOIN accounting.accounts a ON a.id = dl.account_id
   WHERE dl.journal_entry_id = je.id AND dl.debit > 0
   ORDER BY dl.debit DESC LIMIT 1) AS debit_account_code,
  (SELECT SUM(dl.debit) FROM accounting.journal_lines dl
   WHERE dl.journal_entry_id = je.id AND dl.debit > 0) AS debit_total,
  -- 貸方科目
  (SELECT a.name FROM accounting.journal_lines cl
   JOIN accounting.accounts a ON a.id = cl.account_id
   WHERE cl.journal_entry_id = je.id AND cl.credit > 0
   ORDER BY cl.credit DESC LIMIT 1) AS credit_account_name,
  (SELECT a.code FROM accounting.journal_lines cl
   JOIN accounting.accounts a ON a.id = cl.account_id
   WHERE cl.journal_entry_id = je.id AND cl.credit > 0
   ORDER BY cl.credit DESC LIMIT 1) AS credit_account_code,
  (SELECT SUM(cl.credit) FROM accounting.journal_lines cl
   WHERE cl.journal_entry_id = je.id AND cl.credit > 0) AS credit_total
FROM accounting.journal_entries je
JOIN accounting.journal_batches jb ON jb.id = je.batch_id;

GRANT SELECT ON public.v_journal_book TO authenticated;
GRANT SELECT ON public.v_journal_book TO anon;

-- ========================================
-- 5. v_general_ledger VIEW 作成
--    総勘定元帳用: 科目別明細+相手科目
-- ========================================
DROP VIEW IF EXISTS public.v_general_ledger CASCADE;
CREATE OR REPLACE VIEW public.v_general_ledger AS
SELECT
  jl.id,
  je.entry_date AS date,
  a.id AS account_id,
  a.code AS account_code,
  a.name AS account_name,
  a.account_type,
  a.normal_balance_side,
  jl.debit,
  jl.credit,
  COALESCE(jl.description, je.description) AS description,
  jb.status,
  je.id AS entry_id,
  jb.id AS batch_id,
  -- 相手科目
  (SELECT pa.name FROM accounting.journal_lines pl
   JOIN accounting.accounts pa ON pa.id = pl.account_id
   WHERE pl.journal_entry_id = je.id AND pl.id <> jl.id
   ORDER BY pl.debit + pl.credit DESC LIMIT 1) AS partner_account_name,
  (SELECT pa.code FROM accounting.journal_lines pl
   JOIN accounting.accounts pa ON pa.id = pl.account_id
   WHERE pl.journal_entry_id = je.id AND pl.id <> jl.id
   ORDER BY pl.debit + pl.credit DESC LIMIT 1) AS partner_account_code
FROM accounting.journal_lines jl
JOIN accounting.journal_entries je ON je.id = jl.journal_entry_id
JOIN accounting.journal_batches jb ON jb.id = je.batch_id
JOIN accounting.accounts a ON a.id = jl.account_id;

GRANT SELECT ON public.v_general_ledger TO authenticated;
GRANT SELECT ON public.v_general_ledger TO anon;

-- ========================================
-- 6. v_trial_balance VIEW 作成 (存在しなければ)
-- ========================================
DROP VIEW IF EXISTS public.v_trial_balance CASCADE;
CREATE OR REPLACE VIEW public.v_trial_balance AS
SELECT
  a.id AS account_id,
  a.code,
  a.name,
  a.account_type,
  a.normal_balance_side,
  a.category_code,
  COALESCE(SUM(jl.debit), 0) AS total_debit,
  COALESCE(SUM(jl.credit), 0) AS total_credit,
  CASE
    WHEN a.normal_balance_side = 'debit' THEN COALESCE(SUM(jl.debit), 0) - COALESCE(SUM(jl.credit), 0)
    ELSE COALESCE(SUM(jl.credit), 0) - COALESCE(SUM(jl.debit), 0)
  END AS balance
FROM accounting.accounts a
LEFT JOIN accounting.journal_lines jl ON jl.account_id = a.id
LEFT JOIN accounting.journal_entries je ON je.id = jl.journal_entry_id
LEFT JOIN accounting.journal_batches jb ON jb.id = je.batch_id AND jb.status = 'posted'
WHERE a.is_active = true
GROUP BY a.id, a.code, a.name, a.account_type, a.normal_balance_side, a.category_code
ORDER BY a.code;

GRANT SELECT ON public.v_trial_balance TO authenticated;
GRANT SELECT ON public.v_trial_balance TO anon;

-- ========================================
-- 7. get_general_ledger RPC を科目種別対応に修正
-- ========================================
CREATE OR REPLACE FUNCTION public.get_general_ledger(
    p_account_id uuid,
    p_start_date date,
    p_end_date date
)
RETURNS TABLE (
    id uuid,
    date date,
    voucher_no uuid,
    description text,
    partner text,
    debit numeric,
    credit numeric,
    balance numeric
)
LANGUAGE sql
AS $$
WITH account_info AS (
    SELECT normal_balance_side FROM accounting.accounts WHERE id = p_account_id
),
opening_balance AS (
    SELECT
        CASE (SELECT normal_balance_side FROM account_info)
            WHEN 'debit'  THEN COALESCE(SUM(jl.debit - jl.credit), 0)
            ELSE                COALESCE(SUM(jl.credit - jl.debit), 0)
        END AS amount
    FROM accounting.journal_lines jl
    JOIN accounting.journal_entries je ON jl.journal_entry_id = je.id
    WHERE jl.account_id = p_account_id
      AND je.entry_date < p_start_date
),
transactions AS (
    SELECT
        jl.id,
        je.entry_date AS date,
        je.id AS voucher_no,
        je.description,
        jl.debit,
        jl.credit,
        (
            SELECT a.name
            FROM accounting.journal_lines AS partner_jl
            JOIN accounting.accounts AS a ON a.id = partner_jl.account_id
            WHERE partner_jl.journal_entry_id = je.id
              AND partner_jl.id <> jl.id
            ORDER BY partner_jl.debit + partner_jl.credit DESC
            LIMIT 1
        ) AS partner
    FROM accounting.journal_lines jl
    JOIN accounting.journal_entries je ON jl.journal_entry_id = je.id
    WHERE jl.account_id = p_account_id
      AND je.entry_date >= p_start_date
      AND je.entry_date <= p_end_date
),
cumulative_balance AS (
    SELECT
        t.*,
        (SELECT amount FROM opening_balance) +
        SUM(
            CASE (SELECT normal_balance_side FROM account_info)
                WHEN 'debit'  THEN t.debit - t.credit
                ELSE               t.credit - t.debit
            END
        ) OVER (ORDER BY t.date, t.id) AS running_balance
    FROM transactions t
)
SELECT
    gen_random_uuid() as id,
    (p_start_date - INTERVAL '1 day')::date as date,
    null::uuid as voucher_no,
    '前月繰越' as description,
    null::text as partner,
    null::numeric as debit,
    null::numeric as credit,
    (SELECT amount FROM opening_balance) as balance
UNION ALL
SELECT
    cb.id,
    cb.date,
    cb.voucher_no,
    cb.description,
    cb.partner,
    cb.debit,
    cb.credit,
    cb.running_balance as balance
FROM cumulative_balance cb
ORDER BY date;
$$;

-- スキーマキャッシュ更新
NOTIFY pgrst, 'reload schema';
