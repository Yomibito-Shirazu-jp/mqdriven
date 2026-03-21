-- ============================================================
-- 2026-03-21 仕訳ルールの頻度集計用 VIEW
-- ============================================================

DROP VIEW IF EXISTS public.v_journal_account_rules CASCADE;
CREATE OR REPLACE VIEW public.v_journal_account_rules AS
SELECT 
  a.application_code_id,
  ac.code AS application_code_code,
  ac.name AS application_code_name,
  COALESCE(
    NULLIF(TRIM(a.form_data->'invoice'->>'supplierName'), ''), 
    NULLIF(TRIM(a.form_data->>'supplierName'), ''), 
    NULLIF(TRIM(a.form_data->>'paymentDestination'), ''), 
    ''
  ) AS supplier_name,
  jl_debit.account_id AS debit_account_id,
  jl_credit.account_id AS credit_account_id,
  acc_debit.code AS debit_account_code,
  acc_debit.name AS debit_account_name,
  acc_credit.code AS credit_account_code,
  acc_credit.name AS credit_account_name,
  COUNT(*) AS usage_count
FROM public.applications a
JOIN public.application_codes ac ON ac.id = a.application_code_id
JOIN accounting.journal_batches b ON b.source_application_id = a.id AND b.status = 'posted'
JOIN accounting.journal_entries e ON e.batch_id = b.id
JOIN accounting.journal_lines jl_debit ON jl_debit.journal_entry_id = e.id AND jl_debit.debit > 0
JOIN accounting.journal_lines jl_credit ON jl_credit.journal_entry_id = e.id AND jl_credit.credit > 0
JOIN accounting.accounts acc_debit ON acc_debit.id = jl_debit.account_id
JOIN accounting.accounts acc_credit ON acc_credit.id = jl_credit.account_id
WHERE a.accounting_status = 'posted'
GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10;

GRANT SELECT ON public.v_journal_account_rules TO authenticated;
GRANT SELECT ON public.v_journal_account_rules TO anon;

NOTIFY pgrst, 'reload schema';
