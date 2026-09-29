-- 为笔记表添加新字段
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS cover_image text;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS location jsonb;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS recommended_products text[] DEFAULT '{}'::text[];

COMMENT ON COLUMN public.notes.cover_image IS '封面图片URL，如果有多张图片可以指定封面';
COMMENT ON COLUMN public.notes.location IS '位置信息，包含经纬度和地址名称';
COMMENT ON COLUMN public.notes.recommended_products IS '推荐的商品SKU代码数组';
