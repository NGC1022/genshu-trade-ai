-- 修改举报理由字段为数组类型，以便支持多选
ALTER TABLE public.note_reports ALTER COLUMN reason TYPE text[] USING array[reason];

-- 如果之前没有设置默认值，现在设置
ALTER TABLE public.note_reports ALTER COLUMN reason SET DEFAULT '{}';
