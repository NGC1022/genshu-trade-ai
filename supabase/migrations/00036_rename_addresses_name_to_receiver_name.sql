-- 前端地址编辑/列表/订单快照统一使用 receiver_name，数据库列名对齐
ALTER TABLE public.addresses RENAME COLUMN name TO receiver_name;
