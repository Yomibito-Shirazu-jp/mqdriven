-- 消費税集計 VIEW（勘定科目ベースの実集計）
-- 前提: 標準税率 10% のみを tax_rate 列で表す。複数税率は journal_lines に税区分が載ったら VIEW を差し替える。
-- 仮受消費税・仮払消費税の勘定名は v_accounting_base.name と完全一致（未計上の月は行なし＝UI は未集計）。

DROP VIEW IF EXISTS public.v_tax_summary CASCADE;

CREATE OR REPLACE VIEW public.v_tax_summary AS
WITH posted AS (
  SELECT
    date_trunc('month', b.date)::date AS period,
    b.name,
    b.debit_amount,
    b.credit_amount
  FROM public.v_accounting_base b
  WHERE b.status = 'posted'
    AND b.name IN ('仮受消費税', '仮払消費税')
),
agg AS (
  SELECT
    period,
    SUM(CASE WHEN name = '仮受消費税' THEN credit_amount - debit_amount ELSE 0 END) AS output_tax,
    SUM(CASE WHEN name = '仮払消費税' THEN debit_amount - credit_amount ELSE 0 END) AS input_tax
  FROM posted
  GROUP BY period
)
SELECT
  period,
  10::numeric AS tax_rate,
  CASE
    WHEN output_tax IS NULL OR output_tax = 0 THEN 0::numeric
    ELSE round((output_tax / 0.1)::numeric, 2)
  END AS taxable_sales,
  COALESCE(output_tax, 0)::numeric AS output_tax,
  CASE
    WHEN input_tax IS NULL OR input_tax = 0 THEN 0::numeric
    ELSE round((input_tax / 0.1)::numeric, 2)
  END AS taxable_purchases,
  COALESCE(input_tax, 0)::numeric AS input_tax
FROM agg;

GRANT SELECT ON public.v_tax_summary TO authenticated;
GRANT SELECT ON public.v_tax_summary TO anon;

COMMENT ON VIEW public.v_tax_summary IS '月次・標準税率10%前提。仮受/仮払消費税勘定から集計。';
