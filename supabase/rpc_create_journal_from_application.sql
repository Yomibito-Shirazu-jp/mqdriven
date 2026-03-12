-- supabase/rpc_create_journal_from_application.sql
-- 申請データから仕訳バッチを生成するRPC
-- OCRで抽出された勘定科目名(account)を優先的に使用
CREATE OR REPLACE FUNCTION public.create_journal_from_application(
    p_application_id uuid,
    p_user_id uuid
)
RETURNS uuid -- 作成されたバッチIDを返す
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_application record;
    v_batch_id uuid;
    v_entry_id uuid;
    v_debit_account_id uuid;
    v_credit_account_id uuid;
    v_amount numeric;
    v_amount_text text;
    v_description text;
    v_entry_date date;
    v_tmp_name text;
    v_tmp_category text;
    v_tmp_code text;
BEGIN
    -- 1. 申請内容を取得
    SELECT * INTO v_application
    FROM public.applications
    WHERE id = p_application_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Application not found: %', p_application_id;
    END IF;

    -- 2. 既に仕訳が作成済みかチェック
    SELECT id INTO v_batch_id
    FROM accounting.journal_batches
    WHERE source_application_id = p_application_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_batch_id IS NOT NULL THEN
        RETURN v_batch_id;
    END IF;

    -- 3. 金額を取得 (netAmount=差引請求額を優先)
    v_amount_text := COALESCE(
        v_application.form_data->>'netAmount',
        v_application.form_data->>'totalAmount',
        v_application.form_data->>'amount',
        v_application.form_data->>'requestedAmount',
        v_application.form_data->'invoice'->>'totalGross',
        v_application.form_data->'invoice'->>'totalNet'
    );
    v_amount := NULLIF(regexp_replace(COALESCE(v_amount_text, ''), '[^0-9.-]', '', 'g'), '')::numeric;

    IF v_amount IS NULL OR v_amount <= 0 THEN
        RAISE EXCEPTION 'Could not determine a valid amount from application form_data.';
    END IF;

    v_description := COALESCE(
        v_application.form_data->>'description',
        v_application.form_data->>'title',
        v_application.form_data->>'subject',
        '承認済み申請'
    );
    v_entry_date := COALESCE(
        (v_application.form_data->>'invoiceDate')::date,
        (v_application.form_data->>'paymentDate')::date,
        CURRENT_DATE
    );

    -- 4. 借方科目を決定
    -- 4a. OCR/AIで指定された勘定科目名から検索
    DECLARE
        v_app_code text;
        v_ocr_account text;
    BEGIN
        v_ocr_account := v_application.form_data->>'account';

        -- OCR由来の勘定科目名でaccounting.accountsを検索 (名前一致)
        IF v_ocr_account IS NOT NULL AND v_ocr_account <> '' THEN
            SELECT id INTO v_debit_account_id
            FROM accounting.accounts
            WHERE name LIKE '%' || v_ocr_account || '%'
              AND is_active = true
            ORDER BY CASE WHEN name = v_ocr_account THEN 0 ELSE 1 END, code
            LIMIT 1;
        END IF;

        -- account_itemsマスタからも検索してaccounting.accountsに自動作成
        IF v_debit_account_id IS NULL AND v_ocr_account IS NOT NULL AND v_ocr_account <> '' THEN
            SELECT ai.code, ai.name, ai.category_code
            INTO v_tmp_code, v_tmp_name, v_tmp_category
            FROM public.account_items ai
            WHERE ai.name LIKE '%' || v_ocr_account || '%'
            ORDER BY CASE WHEN ai.name = v_ocr_account THEN 0 ELSE 1 END, ai.code
            LIMIT 1;

            IF v_tmp_code IS NOT NULL THEN
                INSERT INTO accounting.accounts (code, name, category_code, is_active, sort_order, account_type, normal_balance_side)
                VALUES (v_tmp_code, v_tmp_name, v_tmp_category, true, 0,
                        CASE LEFT(v_tmp_code, 1)
                            WHEN '1' THEN 'asset' WHEN '2' THEN 'liability'
                            WHEN '3' THEN 'equity' WHEN '4' THEN 'revenue'
                            ELSE 'expense'
                        END,
                        CASE LEFT(v_tmp_code, 1)
                            WHEN '1' THEN 'debit' WHEN '2' THEN 'credit'
                            WHEN '3' THEN 'credit' WHEN '4' THEN 'credit'
                            ELSE 'debit'
                        END)
                ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, is_active = true
                RETURNING id INTO v_debit_account_id;
            END IF;
        END IF;

        -- 4b. フォールバック: 申請コードに基づくデフォルト科目
        IF v_debit_account_id IS NULL THEN
            SELECT code INTO v_app_code
            FROM public.application_codes
            WHERE id = v_application.application_code_id;

            v_tmp_code := CASE v_app_code
                WHEN 'EXP' THEN '6201'  -- 日常交際費
                WHEN 'APL' THEN '5100'  -- 購入原価
                ELSE '6200'             -- 経費
            END;

            SELECT id INTO v_debit_account_id FROM accounting.accounts WHERE code = v_tmp_code;

            IF v_debit_account_id IS NULL THEN
                SELECT name, category_code INTO v_tmp_name, v_tmp_category
                FROM public.account_items WHERE code = v_tmp_code;
                IF v_tmp_name IS NOT NULL THEN
                    INSERT INTO accounting.accounts (code, name, category_code, is_active, sort_order, account_type, normal_balance_side)
                    VALUES (v_tmp_code, v_tmp_name, v_tmp_category, true, 0, 'expense', 'debit')
                    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, is_active = true
                    RETURNING id INTO v_debit_account_id;
                END IF;
            END IF;
        END IF;

        -- 5. 貸方科目: 買掛金(2110)または未払金(2120)
        v_tmp_code := CASE
            WHEN v_app_code = 'APL' THEN '2110'
            ELSE '2120'
        END;

        SELECT id INTO v_credit_account_id FROM accounting.accounts WHERE code = v_tmp_code;
        IF v_credit_account_id IS NULL THEN
            SELECT name, category_code INTO v_tmp_name, v_tmp_category
            FROM public.account_items WHERE code = v_tmp_code;
            IF v_tmp_name IS NOT NULL THEN
                INSERT INTO accounting.accounts (code, name, category_code, is_active, sort_order, account_type, normal_balance_side)
                VALUES (v_tmp_code, v_tmp_name, v_tmp_category, true, 0, 'liability', 'credit')
                ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, is_active = true
                RETURNING id INTO v_credit_account_id;
            END IF;
        END IF;

        IF v_debit_account_id IS NULL OR v_credit_account_id IS NULL THEN
            RAISE EXCEPTION 'Could not determine accounts. app_code=%, ocr_account=%. (Ensure required codes exist in public.account_items)', v_app_code, v_ocr_account;
        END IF;
    END;

    -- 6. 仕訳バッチ・ヘッダ・明細を作成
    INSERT INTO accounting.journal_batches (source_application_id, status, created_by)
    VALUES (p_application_id, 'draft', p_user_id)
    RETURNING id INTO v_batch_id;

    INSERT INTO accounting.journal_entries (batch_id, entry_date, description)
    VALUES (v_batch_id, v_entry_date, v_description)
    RETURNING id INTO v_entry_id;

    -- 借方
    INSERT INTO accounting.journal_lines (journal_entry_id, account_id, debit, description)
    VALUES (v_entry_id, v_debit_account_id, v_amount, v_description);

    -- 貸方
    INSERT INTO accounting.journal_lines (journal_entry_id, account_id, credit, description)
    VALUES (v_entry_id, v_credit_account_id, v_amount, v_description);

    -- 7. 申請テーブルのステータスを更新
    UPDATE public.applications
    SET accounting_status = 'draft'
    WHERE id = p_application_id;

    -- 8. 作成したバッチIDを返す
    RETURN v_batch_id;

END;
$$;
