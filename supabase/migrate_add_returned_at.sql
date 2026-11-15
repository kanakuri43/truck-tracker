-- 帰社時刻列を reports テーブルに追加（帰社ボタン押下時に記録）
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS returned_at timestamp with time zone;
