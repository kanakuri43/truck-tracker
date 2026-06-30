-- マスタテーブルの name カラムに UNIQUE 制約を追加
-- 既存の同名制約がある場合は一旦削除してから追加し直す
-- trucks・courses は支店が異なれば同名を許可（複合ユニーク）

-- branches
ALTER TABLE public.branches DROP CONSTRAINT IF EXISTS branches_name_key;
ALTER TABLE public.branches ADD CONSTRAINT branches_name_key UNIQUE (name);

-- trucks（支店単位でユニーク）
ALTER TABLE public.trucks DROP CONSTRAINT IF EXISTS trucks_name_key;
ALTER TABLE public.trucks DROP CONSTRAINT IF EXISTS trucks_branch_id_name_key;
ALTER TABLE public.trucks ADD CONSTRAINT trucks_branch_id_name_key UNIQUE (branch_id, name);

-- destinations
ALTER TABLE public.destinations DROP CONSTRAINT IF EXISTS destinations_name_key;
ALTER TABLE public.destinations ADD CONSTRAINT destinations_name_key UNIQUE (name);

-- courses（支店単位でユニーク）
ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_name_key;
ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_branch_id_name_key;
ALTER TABLE public.courses ADD CONSTRAINT courses_branch_id_name_key UNIQUE (branch_id, name);
