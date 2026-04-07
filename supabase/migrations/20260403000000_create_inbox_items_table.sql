-- ============================================================
-- 2026-04-03 請求書OCR受信トレイ用テーブル
-- ============================================================

CREATE TABLE IF NOT EXISTS public.inbox_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
    status TEXT NOT NULL DEFAULT 'processing',
    extracted_data JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT inbox_items_status_check
        CHECK (status IN ('processing', 'pending_review', 'approved', 'error'))
);

CREATE INDEX IF NOT EXISTS inbox_items_status_idx ON public.inbox_items (status);
CREATE INDEX IF NOT EXISTS inbox_items_created_at_idx ON public.inbox_items (created_at DESC);

-- updated_at 自動更新トリガー
CREATE TRIGGER set_inbox_items_updated_at
BEFORE UPDATE ON public.inbox_items
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp();

-- RLS ポリシー
ALTER TABLE public.inbox_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage inbox items"
ON public.inbox_items
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Supabase Storage バケット作成（既存の場合はスキップ）
INSERT INTO storage.buckets (id, name, public)
VALUES ('inbox', 'inbox', true)
ON CONFLICT (id) DO NOTHING;

-- Storage ポリシー
CREATE POLICY "Public read access for inbox" ON storage.objects
FOR SELECT TO public USING (bucket_id = 'inbox');

CREATE POLICY "Authenticated upload to inbox" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'inbox');

CREATE POLICY "Authenticated delete from inbox" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'inbox');

NOTIFY pgrst, 'reload schema';
