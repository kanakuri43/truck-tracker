-- 面積率（積載容積率）列を reports テーブルに追加
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS volume_rate smallint;
