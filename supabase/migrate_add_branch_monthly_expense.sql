-- ============================================================
--  マイグレーション: 支店マスタに月次経費（固定額）列を追加
--  2026-07-08
--  Supabase SQL Editor で実行してください
--  ※ マスタ管理UIは無し。金額の登録・変更はDBを直接更新する。
-- ============================================================

ALTER TABLE public.branches
    ADD COLUMN IF NOT EXISTS monthly_expense integer DEFAULT 0 NOT NULL;
