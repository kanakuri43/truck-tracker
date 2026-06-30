-- ============================================================
--  ジャーナルデータ全消去スクリプト
--  ※ マスタ（branches / trucks / destinations / courses / course_stops）は残す
--  ※ stop_records は reports の CASCADE で連動削除されるが、明示的に先に消す
--
--  実行方法: Supabase ダッシュボード → SQL Editor に貼り付けて実行
-- ============================================================

TRUNCATE TABLE stop_records RESTART IDENTITY CASCADE;
TRUNCATE TABLE reports      RESTART IDENTITY CASCADE;
