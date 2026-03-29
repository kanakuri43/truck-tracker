-- ============================================================
--  Migration: destinations に sales_customer_code を追加
--  Supabase SQL Editor で実行してください
-- ============================================================

ALTER TABLE destinations ADD COLUMN sales_customer_code text;
