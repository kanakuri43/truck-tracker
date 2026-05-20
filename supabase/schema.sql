-- ============================================================
--  Truck Tracker — DB Schema
--  Generated from backup_truck_tracker_20260512.sql
--  Run this in the Supabase SQL Editor of a new project.
-- ============================================================

-- ── テーブル ──────────────────────────────────────────────

CREATE TABLE public.branches (
    id   uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL
);

CREATE TABLE public.trucks (
    id        uuid DEFAULT gen_random_uuid() NOT NULL,
    name      text NOT NULL,
    branch_id uuid,
    max_load  numeric
);

CREATE TABLE public.destinations (
    id                  uuid DEFAULT gen_random_uuid() NOT NULL,
    name                text NOT NULL,
    address             text,
    sales_customer_code text
);

CREATE TABLE public.courses (
    id          uuid DEFAULT gen_random_uuid() NOT NULL,
    name        text NOT NULL,
    branch_id   uuid,
    day_of_week smallint[]
);

CREATE TABLE public.course_stops (
    id             uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id      uuid NOT NULL,
    destination_id uuid NOT NULL,
    stop_order     smallint NOT NULL
);

CREATE TABLE public.reports (
    id          uuid DEFAULT gen_random_uuid() NOT NULL,
    truck_id    uuid,
    course_id   uuid NOT NULL,
    date        date DEFAULT CURRENT_DATE NOT NULL,
    status      text DEFAULT 'active' NOT NULL,
    depart_odo  numeric(8,1),
    arrive_odo  numeric(8,1),
    volume_rate smallint,
    created_at  timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reports_status_check CHECK ((status = ANY (ARRAY['planned'::text, 'active'::text, 'completed'::text, 'aborted'::text])))
);

CREATE TABLE public.stop_records (
    id              uuid DEFAULT gen_random_uuid() NOT NULL,
    report_id       uuid NOT NULL,
    course_stop_id  uuid,
    destination_name text NOT NULL,
    stop_number     smallint NOT NULL,
    departed_at     timestamp with time zone,
    arrived_at      timestamp with time zone,
    weight_kg       numeric(6,1),
    status          text,
    CONSTRAINT stop_records_status_check CHECK ((status = ANY (ARRAY['planned'::text, 'completed'::text, 'skipped'::text])))
);

-- ── ビュー ────────────────────────────────────────────────

CREATE VIEW public.active_reports_today AS
 SELECT r.id AS report_id,
    r.date,
    r.status,
    t.name AS truck_name,
    c.name AS course_name,
    b.name AS branch_name,
    sr.destination_name AS current_destination,
        CASE
            WHEN ((sr.arrived_at IS NOT NULL) AND (sr.departed_at IS NOT NULL)) THEN '到着済み'::text
            WHEN ((sr.arrived_at IS NULL) AND (sr.departed_at IS NOT NULL)) THEN '移動中'::text
            ELSE '出庫前'::text
        END AS current_status,
    COALESCE(sr.departed_at, sr.arrived_at, r.created_at) AS last_action_at
   FROM ((((public.reports r
     JOIN public.trucks t ON ((t.id = r.truck_id)))
     JOIN public.courses c ON ((c.id = r.course_id)))
     LEFT JOIN public.branches b ON ((b.id = t.branch_id)))
     LEFT JOIN LATERAL ( SELECT stop_records.id,
            stop_records.report_id,
            stop_records.course_stop_id,
            stop_records.destination_name,
            stop_records.stop_number,
            stop_records.departed_at,
            stop_records.arrived_at,
            stop_records.weight_kg
           FROM public.stop_records
          WHERE (stop_records.report_id = r.id)
          ORDER BY stop_records.stop_number DESC
         LIMIT 1) sr ON (true))
  WHERE ((r.date = CURRENT_DATE) AND (r.status = 'active'::text));

-- ── PRIMARY KEY ───────────────────────────────────────────

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.destinations
    ADD CONSTRAINT destinations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.trucks
    ADD CONSTRAINT trucks_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.course_stops
    ADD CONSTRAINT course_stops_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.course_stops
    ADD CONSTRAINT course_stops_course_id_stop_order_key UNIQUE (course_id, stop_order);

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.stop_records
    ADD CONSTRAINT stop_records_pkey PRIMARY KEY (id);

-- ── FOREIGN KEY ───────────────────────────────────────────

ALTER TABLE ONLY public.trucks
    ADD CONSTRAINT trucks_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.course_stops
    ADD CONSTRAINT course_stops_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.course_stops
    ADD CONSTRAINT course_stops_destination_id_fkey FOREIGN KEY (destination_id) REFERENCES public.destinations(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_truck_id_fkey FOREIGN KEY (truck_id) REFERENCES public.trucks(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.stop_records
    ADD CONSTRAINT stop_records_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.stop_records
    ADD CONSTRAINT stop_records_course_stop_id_fkey FOREIGN KEY (course_stop_id) REFERENCES public.course_stops(id) ON DELETE SET NULL;

-- ── インデックス ──────────────────────────────────────────

CREATE INDEX course_stops_course_id_stop_order_idx ON public.course_stops USING btree (course_id, stop_order);

CREATE INDEX idx_reports_date_status ON public.reports USING btree (date, status);

CREATE INDEX reports_status_idx ON public.reports USING btree (status);

CREATE INDEX reports_truck_id_date_idx ON public.reports USING btree (truck_id, date DESC);

CREATE INDEX stop_records_report_id_idx ON public.stop_records USING btree (report_id);

-- ── RLS ───────────────────────────────────────────────────

ALTER TABLE public.branches     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trucks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stop_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY allow_all ON public.branches     TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY allow_all ON public.courses      TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY allow_all ON public.destinations TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY allow_all ON public.trucks       TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY allow_all ON public.course_stops TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY allow_all ON public.reports      TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY allow_all ON public.stop_records TO authenticated, anon USING (true) WITH CHECK (true);

-- ── Realtime ──────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.reports;
ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.stop_records;
