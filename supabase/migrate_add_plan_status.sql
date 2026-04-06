-- ============================================================
--  マイグレーション: 事前計画機能
--  2026-04-06
-- ============================================================

-- 1. reports.truck_id: NULL 許容に変更（計画作成時はトラック未定）
ALTER TABLE reports ALTER COLUMN truck_id DROP NOT NULL;

-- 2. reports.status: CHECK 制約に 'planned' / 'aborted' を追加
ALTER TABLE reports DROP CONSTRAINT reports_status_check;
ALTER TABLE reports ADD CONSTRAINT reports_status_check
  CHECK (status IN ('planned', 'active', 'completed', 'aborted'));

-- 3. stop_records に status 列追加
--    NULL          = フリーモード（既存レコードの後方互換）
--    'planned'     = 事前計画（未出発）
--    'completed'   = 到着完了
--    'skipped'     = スキップ
ALTER TABLE stop_records ADD COLUMN IF NOT EXISTS status text
  CHECK (status IN ('planned', 'completed', 'skipped'));

-- インデックス（計画取得時に使用）
CREATE INDEX IF NOT EXISTS idx_reports_date_status ON reports (date, status);
