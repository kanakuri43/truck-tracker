-- ============================================================
--  Migration: rename depart_odd / arrive_odd → depart_odo / arrive_odo
--  Supabase SQL Editor で実行してください
-- ============================================================

ALTER TABLE reports RENAME COLUMN depart_odd TO depart_odo;
ALTER TABLE reports RENAME COLUMN arrive_odd TO arrive_odo;
