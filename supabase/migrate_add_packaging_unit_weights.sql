-- ============================================================
--  マイグレーション: 封筒・段ボール 単位重量マスタ追加
--  2026-07-02
--  Supabase SQL Editor で実行してください
-- ============================================================

CREATE TABLE IF NOT EXISTS public.packaging_unit_weights (
    id             uuid DEFAULT gen_random_uuid() NOT NULL,
    code           text NOT NULL,
    label          text NOT NULL,
    unit_weight_kg numeric(6,2) DEFAULT 0 NOT NULL,
    sort_order     smallint DEFAULT 0 NOT NULL
);

ALTER TABLE ONLY public.packaging_unit_weights
    ADD CONSTRAINT packaging_unit_weights_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.packaging_unit_weights
    ADD CONSTRAINT packaging_unit_weights_code_key UNIQUE (code);

ALTER TABLE public.packaging_unit_weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY allow_all ON public.packaging_unit_weights
    TO authenticated, anon USING (true) WITH CHECK (true);

-- 現在コード上（admin.js の PACKAGING_UNIT_WEIGHTS）に記載されている値を初期登録
INSERT INTO public.packaging_unit_weights (code, label, unit_weight_kg, sort_order) VALUES
    ('envelope',    '封筒',         5,  1),
    ('cardboard_l', '段ボール(大)', 15, 2),
    ('cardboard_m', '段ボール(中)', 10, 3),
    ('cardboard_s', '段ボール(小)', 5,  4)
ON CONFLICT (code) DO NOTHING;
