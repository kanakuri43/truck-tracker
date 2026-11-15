-- Phase 7-1: 配達順おすすめ用の緯度経度列を追加
-- 配達先: 住所から国土地理院APIで取得した座標と、照合された住所表記
ALTER TABLE public.destinations ADD COLUMN IF NOT EXISTS lat numeric;
ALTER TABLE public.destinations ADD COLUMN IF NOT EXISTS lng numeric;
ALTER TABLE public.destinations ADD COLUMN IF NOT EXISTS geocoded_title text;

-- 支店: 出発・帰着地点
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS lat numeric;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS lng numeric;
