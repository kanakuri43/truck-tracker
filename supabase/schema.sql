-- ============================================================
--  Truck Tracker — DB Schema
--  Supabase (PostgreSQL)
-- ============================================================

-- ── 支店 ──────────────────────────────────────────────────
CREATE TABLE branches (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL
);

-- ── 車輌 ──────────────────────────────────────────────────
CREATE TABLE trucks (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name      text NOT NULL,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL
);

-- ── 配達先 ────────────────────────────────────────────────
CREATE TABLE destinations (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name    text NOT NULL,
  address text
);

-- ── 配送コース ────────────────────────────────────────────
CREATE TABLE courses (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name      text NOT NULL,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL
);

-- ── コース配達先（順番） ──────────────────────────────────
CREATE TABLE course_stops (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id      uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  destination_id uuid NOT NULL REFERENCES destinations(id) ON DELETE RESTRICT,
  stop_order     smallint NOT NULL,
  UNIQUE (course_id, stop_order)
);

-- ── 日報 ──────────────────────────────────────────────────
--  status: 'active' | 'completed'
--  depart_odd: 出庫時ODDメーター（前回帰社時ODDを引き継いでセット）
--  arrive_odd:  帰社時ODDメーター（入力後に次回のdepart_oddとなる）
CREATE TABLE reports (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  truck_id   uuid NOT NULL REFERENCES trucks(id)  ON DELETE RESTRICT,
  course_id  uuid NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
  date       date NOT NULL DEFAULT CURRENT_DATE,
  status     text NOT NULL DEFAULT 'active'
               CHECK (status IN ('active', 'completed')),
  depart_odd numeric(8,1),
  arrive_odd numeric(8,1),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── 配達記録明細 ─────────────────────────────────────────
--  destination_name: マスタ変更に備えてスナップショット保持
--  stop_number: 実際に配達した順番（コース順と異なる場合あり）
--  course_stop_id: コース配達先を削除しても実績は残す（SET NULL）
CREATE TABLE stop_records (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id        uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  course_stop_id   uuid REFERENCES course_stops(id) ON DELETE SET NULL,
  destination_name text NOT NULL,
  stop_number      smallint NOT NULL,
  departed_at      timestamptz,
  arrived_at       timestamptz,
  weight_kg        numeric(6,1)
);

-- ============================================================
--  Row Level Security（認証なし → anon に全操作を許可）
-- ============================================================
ALTER TABLE branches     ENABLE ROW LEVEL SECURITY;
ALTER TABLE trucks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports      ENABLE ROW LEVEL SECURITY;
ALTER TABLE stop_records ENABLE ROW LEVEL SECURITY;

-- anon・authenticated 両ロールに全操作を許可
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'branches','trucks','destinations',
    'courses','course_stops','reports','stop_records'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY allow_all ON %I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)',
      tbl
    );
  END LOOP;
END;
$$;

-- ============================================================
--  インデックス
-- ============================================================
CREATE INDEX ON reports      (truck_id, date DESC);
CREATE INDEX ON reports      (status);
CREATE INDEX ON stop_records (report_id);
CREATE INDEX ON course_stops (course_id, stop_order);

-- ============================================================
--  ビュー: 本日のアクティブ日報（ダッシュボード向け）
-- ============================================================
CREATE VIEW active_reports_today AS
SELECT
  r.id          AS report_id,
  r.date,
  r.status,
  t.name        AS truck_name,
  c.name        AS course_name,
  b.name        AS branch_name,
  -- 最後のアクション
  sr.destination_name AS current_destination,
  CASE
    WHEN sr.arrived_at IS NOT NULL AND sr.departed_at IS NOT NULL THEN '到着済み'
    WHEN sr.arrived_at IS NULL    AND sr.departed_at IS NOT NULL THEN '移動中'
    ELSE '出庫前'
  END           AS current_status,
  COALESCE(sr.departed_at, sr.arrived_at, r.created_at) AS last_action_at
FROM reports r
JOIN trucks       t  ON t.id = r.truck_id
JOIN courses      c  ON c.id = r.course_id
LEFT JOIN branches b ON b.id = t.branch_id
LEFT JOIN LATERAL (
  SELECT * FROM stop_records
  WHERE report_id = r.id
  ORDER BY stop_number DESC
  LIMIT 1
) sr ON true
WHERE r.date = CURRENT_DATE
  AND r.status = 'active';
