-- ============================================================
--  Migration: course_stop_id を ON DELETE SET NULL に変更
--
--  目的: コース配達先（course_stops）を削除した際に、
--        過去の配送実績（stop_records）を残せるようにする。
--        destination_name はスナップショット済みのため実績データは失われない。
--
--  Supabase ダッシュボード > SQL Editor で実行する
-- ============================================================

ALTER TABLE stop_records ALTER COLUMN course_stop_id DROP NOT NULL;

ALTER TABLE stop_records DROP CONSTRAINT stop_records_course_stop_id_fkey;

ALTER TABLE stop_records
  ADD CONSTRAINT stop_records_course_stop_id_fkey
  FOREIGN KEY (course_stop_id) REFERENCES course_stops(id) ON DELETE SET NULL;
