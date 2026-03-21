-- 消費税集計 VIEW（初期プレースホルダー）
-- 実集計は後続マイグレーション 20260321130000_v_tax_summary_aggregate.sql が上書きする。
-- （履歴互換のため本ファイルは残す）

DROP VIEW IF EXISTS public.v_tax_summary CASCADE;

CREATE OR REPLACE VIEW public.v_tax_summary AS
SELECT
  NULL::date AS period,
  NULL::numeric AS tax_rate,
  NULL::numeric AS taxable_sales,
  NULL::numeric AS output_tax,
  NULL::numeric AS taxable_purchases,
  NULL::numeric AS input_tax
WHERE false;

GRANT SELECT ON public.v_tax_summary TO authenticated;
GRANT SELECT ON public.v_tax_summary TO anon;
