-- ============================================================
--  マイグレーション: stop_records に紙・封筒・段ボール列を追加
--  2026-07-07
--  Supabase SQL Editor で実行してください
-- ============================================================

ALTER TABLE public.stop_records
    ADD COLUMN IF NOT EXISTS paper_kg           numeric(6,1),
    ADD COLUMN IF NOT EXISTS envelope_count      smallint,
    ADD COLUMN IF NOT EXISTS cardboard_l_count   smallint,
    ADD COLUMN IF NOT EXISTS cardboard_m_count   smallint,
    ADD COLUMN IF NOT EXISTS cardboard_s_count   smallint;
