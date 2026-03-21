-- 請求書作成をDB側トランザクションで実行するRPC
-- 目的: ヘッダ(invoices)と明細(invoice_items)を一括で作成し、途中失敗時の不整合を防ぐ

DROP FUNCTION IF EXISTS public.create_invoice_from_projects(uuid[]);

CREATE OR REPLACE FUNCTION public.create_invoice_from_projects(p_project_ids uuid[])
RETURNS TABLE(invoice_id uuid, invoice_no text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_id uuid;
  v_invoice_no text;
  v_customer_name text;
  v_subtotal numeric := 0;
  v_tax numeric := 0;
  v_total numeric := 0;
  v_input_count integer := 0;
  v_found_count integer := 0;
  v_customer_count integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_project_ids IS NULL OR COALESCE(array_length(p_project_ids, 1), 0) = 0 THEN
    RAISE EXCEPTION 'No project ids provided';
  END IF;

  WITH input_ids AS (
    SELECT DISTINCT unnest(p_project_ids) AS id
  ),
  selected_projects AS (
    SELECT p.id, p.customer_name, COALESCE(p.amount, 0)::numeric AS amount
    FROM public.projects p
    INNER JOIN input_ids i ON i.id = p.id
    FOR UPDATE
  )
  SELECT
    (SELECT COUNT(*) FROM input_ids),
    (SELECT COUNT(*) FROM selected_projects),
    (SELECT COUNT(DISTINCT customer_name) FROM selected_projects),
    (SELECT MIN(customer_name) FROM selected_projects),
    COALESCE((SELECT SUM(amount) FROM selected_projects), 0)
  INTO
    v_input_count,
    v_found_count,
    v_customer_count,
    v_customer_name,
    v_subtotal;

  IF v_found_count = 0 THEN
    RAISE EXCEPTION 'No valid projects found for invoicing';
  END IF;

  IF v_found_count <> v_input_count THEN
    RAISE EXCEPTION 'Some project ids were not found';
  END IF;

  IF v_customer_count <> 1 THEN
    RAISE EXCEPTION 'All projects must belong to the same customer';
  END IF;

  v_tax := v_subtotal * 0.1;
  v_total := v_subtotal + v_tax;

  LOOP
    v_invoice_no := format(
      'INV-%s-%s',
      to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS'),
      lpad((floor(random() * 1000))::int::text, 3, '0')
    );
    BEGIN
      INSERT INTO public.invoices (
        invoice_no,
        invoice_date,
        customer_name,
        subtotal_amount,
        tax_amount,
        total_amount,
        status
      )
      VALUES (
        v_invoice_no,
        current_date,
        v_customer_name,
        v_subtotal,
        v_tax,
        v_total,
        'draft'
      )
      RETURNING id INTO v_invoice_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      -- まれな採番衝突時のみ再試行
      CONTINUE;
    END;
  END LOOP;

  INSERT INTO public.invoice_items (
    invoice_id,
    job_id,
    description,
    quantity,
    unit,
    unit_price,
    line_total,
    sort_index
  )
  SELECT
    v_invoice_id,
    p.id,
    format('Job #%s', p.id),
    1,
    '式',
    p.amount,
    p.amount,
    ROW_NUMBER() OVER (ORDER BY p.id) - 1
  FROM (
    SELECT p.id, COALESCE(p.amount, 0)::numeric AS amount
    FROM public.projects p
    WHERE p.id = ANY(p_project_ids)
  ) p;

  RETURN QUERY
  SELECT v_invoice_id, v_invoice_no;
END;
$$;

COMMENT ON FUNCTION public.create_invoice_from_projects(uuid[])
IS 'Create one invoice header + items from projects atomically.';

REVOKE ALL ON FUNCTION public.create_invoice_from_projects(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_invoice_from_projects(uuid[]) TO authenticated;
